use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

const HIGH_RISK_EXTENSIONS: &[&str] = &[
    ".exe", ".msi", ".reg", ".bat", ".cmd", ".ps1", ".vbs", ".scr",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileAssociationRecord {
    pub extension: String,
    pub category: String,
    pub description: String,
    pub current_prog_id: Option<String>,
    pub current_app_name: Option<String>,
    pub current_command: Option<String>,
    pub executable_path: Option<String>,
    pub executable_exists: bool,
    pub source: FileAssociationSource,
    pub risk: FileAssociationRisk,
    pub can_inspect: bool,
    pub can_suggest_change: bool,
    pub can_apply_automatically: bool,
    pub requires_system_settings: bool,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum FileAssociationSource {
    UserChoice,
    Hkcu,
    Hklm,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum FileAssociationRisk {
    Normal,
    MissingApp,
    Protected,
    HighRisk,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileAssociationReport {
    pub scanned_at: String,
    pub current_user: String,
    pub windows_version: String,
    pub total_extensions: usize,
    pub manageable_extensions: usize,
    pub requires_system_settings: usize,
    pub abnormal_count: usize,
    pub missing_app_count: usize,
    pub high_risk_count: usize,
    pub records: Vec<FileAssociationRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileAssociationPlanRequest {
    pub target_app_name: String,
    pub target_executable: String,
    pub extensions: Vec<String>,
    #[serde(default)]
    pub advanced_high_risk: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileAssociationTarget {
    pub prog_id: String,
    pub app_name: String,
    pub executable: String,
    pub command: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum FileAssociationApplyMode {
    UserLevelRegistry,
    OpenSystemSettings,
    Blocked,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileAssociationChange {
    pub extension: String,
    pub before: FileAssociationRecord,
    pub after: FileAssociationTarget,
    pub apply_mode: FileAssociationApplyMode,
    pub risk: FileAssociationRisk,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileAssociationPlan {
    pub plan_id: String,
    pub created_at: String,
    pub target_app_name: String,
    pub target_executable: String,
    pub changes: Vec<FileAssociationChange>,
    pub backup_path: String,
    pub warnings: Vec<String>,
    pub requires_confirmation_token: bool,
    pub plan_fingerprint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileAssociationApplyItem {
    pub extension: String,
    pub success: bool,
    pub message: String,
    pub requires_system_settings: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileAssociationApplyResult {
    pub success: bool,
    pub message: String,
    pub backup_id: Option<String>,
    pub backup_path: Option<String>,
    pub items: Vec<FileAssociationApplyItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileAssociationBackupSummary {
    pub backup_id: String,
    pub created_at: String,
    pub change_count: usize,
    pub extensions: Vec<String>,
    pub target_app_name: String,
    pub backup_path: String,
    pub rollback_available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileAssociationBackup {
    pub backup_id: String,
    pub created_at: String,
    pub windows_version: String,
    pub user: String,
    pub plan_id: String,
    pub plan_fingerprint: String,
    pub target_app_name: String,
    pub records: Vec<FileAssociationBackupRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileAssociationBackupRecord {
    pub extension: String,
    pub before: FileAssociationRecord,
}

#[derive(Debug, Clone)]
struct ExtensionDefinition {
    extension: &'static str,
    category: &'static str,
    description: &'static str,
}

pub fn scan_file_associations_blocking() -> Result<FileAssociationReport, String> {
    let mut records = Vec::new();
    for definition in extension_definitions() {
        records.push(scan_one(definition)?);
    }
    let manageable_extensions = records
        .iter()
        .filter(|item| item.can_apply_automatically)
        .count();
    let requires_system_settings = records
        .iter()
        .filter(|item| item.requires_system_settings)
        .count();
    let missing_app_count = records
        .iter()
        .filter(|item| item.risk == FileAssociationRisk::MissingApp)
        .count();
    let high_risk_count = records
        .iter()
        .filter(|item| item.risk == FileAssociationRisk::HighRisk)
        .count();
    let abnormal_count = records
        .iter()
        .filter(|item| {
            matches!(
                item.risk,
                FileAssociationRisk::MissingApp
                    | FileAssociationRisk::Protected
                    | FileAssociationRisk::HighRisk
                    | FileAssociationRisk::Unknown
            )
        })
        .count();
    Ok(FileAssociationReport {
        scanned_at: current_timestamp(),
        current_user: std::env::var("USERNAME").unwrap_or_else(|_| "unknown".to_string()),
        windows_version: windows_version(),
        total_extensions: records.len(),
        manageable_extensions,
        requires_system_settings,
        abnormal_count,
        missing_app_count,
        high_risk_count,
        records,
    })
}

pub fn create_file_association_plan_blocking(
    request: FileAssociationPlanRequest,
) -> Result<FileAssociationPlan, String> {
    let target_executable = request.target_executable.trim();
    if target_executable.is_empty() {
        return Err("请选择目标应用程序".to_string());
    }
    let target_path = PathBuf::from(target_executable);
    if !target_path.is_file() {
        return Err(format!("目标应用不存在：{target_executable}"));
    }
    let extensions = normalize_extension_list(&request.extensions)?;
    if extensions.is_empty() {
        return Err("至少选择一个扩展名".to_string());
    }
    let target_app_name = if request.target_app_name.trim().is_empty() {
        target_path
            .file_stem()
            .and_then(|item| item.to_str())
            .unwrap_or("目标应用")
            .to_string()
    } else {
        request.target_app_name.trim().to_string()
    };
    let all_records = scan_file_associations_blocking()?
        .records
        .into_iter()
        .map(|item| (item.extension.clone(), item))
        .collect::<BTreeMap<_, _>>();
    let mut changes = Vec::new();
    let mut warnings = Vec::new();
    for extension in extensions {
        let definition = extension_definition(&extension);
        let before = all_records
            .get(&extension)
            .cloned()
            .unwrap_or_else(|| unknown_record(&extension, definition));
        let high_risk = is_high_risk_extension(&extension);
        if high_risk && (request.extensions.len() > 1 || !request.advanced_high_risk) {
            return Err("高风险扩展名只能在高级模式下单项生成计划".to_string());
        }
        let apply_mode = if high_risk {
            FileAssociationApplyMode::Blocked
        } else if before.requires_system_settings
            || before.source == FileAssociationSource::UserChoice
        {
            FileAssociationApplyMode::OpenSystemSettings
        } else {
            FileAssociationApplyMode::UserLevelRegistry
        };
        let prog_id = format!(
            "DevEnvManager.{}.{}",
            safe_identifier(&target_app_name),
            extension.trim_start_matches('.')
        );
        let command = format!("\"{}\" \"%1\"", target_path.display());
        let mut change_warnings = Vec::new();
        if before.source == FileAssociationSource::UserChoice {
            change_warnings
                .push("Windows 已通过 UserChoice 保护该关联，应用不会直接伪造写入。".to_string());
        }
        if apply_mode == FileAssociationApplyMode::OpenSystemSettings {
            change_warnings.push("该项需要在 Windows 默认应用设置中确认。".to_string());
        }
        if high_risk {
            change_warnings.push("高风险扩展名默认只读，不允许批量静默修改。".to_string());
            warnings.push(format!(
                "{extension} 属于高风险类型，必须单项确认并优先使用系统设置。"
            ));
        }
        changes.push(FileAssociationChange {
            extension: extension.clone(),
            before,
            after: FileAssociationTarget {
                prog_id,
                app_name: target_app_name.clone(),
                executable: target_executable.to_string(),
                command,
            },
            apply_mode,
            risk: if high_risk {
                FileAssociationRisk::HighRisk
            } else {
                FileAssociationRisk::Normal
            },
            warnings: change_warnings,
        });
    }
    let created_at = current_timestamp();
    let plan_id = format!("file-assoc-{}", timestamp_compact());
    let backup_path = backup_dir().join(format!("{plan_id}.json"));
    let requires_confirmation_token = changes.iter().any(|item| {
        item.risk == FileAssociationRisk::HighRisk
            || item.apply_mode == FileAssociationApplyMode::Blocked
    });
    let mut plan = FileAssociationPlan {
        plan_id,
        created_at,
        target_app_name,
        target_executable: target_executable.to_string(),
        changes,
        backup_path: display_path(&backup_path),
        warnings,
        requires_confirmation_token,
        plan_fingerprint: String::new(),
    };
    plan.plan_fingerprint = plan_fingerprint(&plan);
    Ok(plan)
}

pub fn apply_file_association_plan_blocking(
    plan: FileAssociationPlan,
) -> Result<FileAssociationApplyResult, String> {
    validate_plan_fingerprint(&plan)?;
    if plan.changes.is_empty() {
        return Err("计划为空，未执行任何修改".to_string());
    }
    if plan
        .changes
        .iter()
        .any(|item| item.apply_mode == FileAssociationApplyMode::Blocked)
    {
        return Err("计划包含高风险或被阻止项目，请改用 Windows 默认应用设置。".to_string());
    }
    let backup = write_backup(&plan)?;
    let mut items = Vec::new();
    for change in &plan.changes {
        match change.apply_mode {
            FileAssociationApplyMode::UserLevelRegistry => match apply_user_level_change(change) {
                Ok(()) => items.push(FileAssociationApplyItem {
                    extension: change.extension.clone(),
                    success: true,
                    message: "已写入当前用户级文件关联，并已保留备份。".to_string(),
                    requires_system_settings: false,
                }),
                Err(error) => items.push(FileAssociationApplyItem {
                    extension: change.extension.clone(),
                    success: false,
                    message: error,
                    requires_system_settings: false,
                }),
            },
            FileAssociationApplyMode::OpenSystemSettings => items.push(FileAssociationApplyItem {
                extension: change.extension.clone(),
                success: false,
                message: "此项受 Windows 默认应用保护，已生成备份和计划，请在系统设置中确认。"
                    .to_string(),
                requires_system_settings: true,
            }),
            FileAssociationApplyMode::Blocked => {
                unreachable!("blocked changes are rejected before apply")
            }
        }
    }
    let success = items
        .iter()
        .all(|item| item.success || item.requires_system_settings);
    Ok(FileAssociationApplyResult {
        success,
        message: if success {
            "文件关联计划已处理；需要系统确认的项目请在 Windows 默认应用设置中完成。".to_string()
        } else {
            "部分文件关联修改失败，未成功项请查看详情或回滚。".to_string()
        },
        backup_id: Some(backup.backup_id),
        backup_path: Some(display_path(Path::new(&plan.backup_path))),
        items,
    })
}

pub fn rollback_file_association_backup_blocking(
    backup_id: String,
) -> Result<FileAssociationApplyResult, String> {
    let backup = read_backup(&backup_id)?;
    let mut items = Vec::new();
    for record in &backup.records {
        if record.before.source == FileAssociationSource::UserChoice {
            items.push(FileAssociationApplyItem {
                extension: record.extension.clone(),
                success: false,
                message:
                    "原状态来自 UserChoice，应用不会直接伪造写回；请打开 Windows 默认应用设置确认。"
                        .to_string(),
                requires_system_settings: true,
            });
            continue;
        }
        match restore_record(record) {
            Ok(()) => items.push(FileAssociationApplyItem {
                extension: record.extension.clone(),
                success: true,
                message: "已尝试恢复当前用户级关联。".to_string(),
                requires_system_settings: false,
            }),
            Err(error) => items.push(FileAssociationApplyItem {
                extension: record.extension.clone(),
                success: false,
                message: error,
                requires_system_settings: false,
            }),
        }
    }
    let success = items
        .iter()
        .all(|item| item.success || item.requires_system_settings);
    Ok(FileAssociationApplyResult {
        success,
        message: if success {
            "回滚计划已处理。".to_string()
        } else {
            "部分回滚未完成，请查看详情。".to_string()
        },
        backup_id: Some(backup.backup_id),
        backup_path: None,
        items,
    })
}

pub fn list_file_association_backups_blocking() -> Result<Vec<FileAssociationBackupSummary>, String>
{
    let dir = backup_dir();
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut backups = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|err| format!("读取备份目录失败：{err}"))? {
        let entry = entry.map_err(|err| format!("读取备份项失败：{err}"))?;
        let path = entry.path();
        if path.extension().and_then(|item| item.to_str()) != Some("json") {
            continue;
        }
        if let Ok(text) = fs::read_to_string(&path) {
            if let Ok(backup) = serde_json::from_str::<FileAssociationBackup>(&text) {
                backups.push(FileAssociationBackupSummary {
                    backup_id: backup.backup_id,
                    created_at: backup.created_at,
                    change_count: backup.records.len(),
                    extensions: backup
                        .records
                        .into_iter()
                        .map(|item| item.extension)
                        .collect(),
                    target_app_name: backup.target_app_name,
                    backup_path: display_path(&path),
                    rollback_available: true,
                });
            }
        }
    }
    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(backups)
}

pub fn open_default_apps_settings_blocking() -> Result<(), String> {
    open_ms_settings("ms-settings:defaultapps")
}

pub fn open_file_type_settings_blocking() -> Result<(), String> {
    open_ms_settings("ms-settings:defaultapps")
}

pub fn open_file_association_backup_dir_blocking() -> Result<(), String> {
    let dir = backup_dir();
    fs::create_dir_all(&dir).map_err(|err| format!("创建备份目录失败：{err}"))?;
    open_path(&dir)
}

pub fn export_file_association_report_blocking() -> Result<String, String> {
    let report = scan_file_associations_blocking()?;
    let path = backup_root().join(format!(
        "file-association-report-{}.json",
        timestamp_compact()
    ));
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| format!("创建导出目录失败：{err}"))?;
    }
    let text =
        serde_json::to_string_pretty(&report).map_err(|err| format!("生成报告失败：{err}"))?;
    fs::write(&path, text).map_err(|err| format!("写入报告失败：{err}"))?;
    Ok(display_path(path))
}

fn scan_one(definition: ExtensionDefinition) -> Result<FileAssociationRecord, String> {
    let extension = normalize_extension(definition.extension)?;
    let mut notes = Vec::new();
    let high_risk = is_high_risk_extension(&extension);
    let current = read_current_association(&extension);
    let (current_prog_id, source) = current.unwrap_or((None, FileAssociationSource::Unknown));
    let current_command = current_prog_id.as_deref().and_then(read_open_command);
    let executable_path = current_command.as_deref().and_then(command_executable);
    let executable_exists = executable_path
        .as_deref()
        .map(|path| Path::new(path).is_file())
        .unwrap_or(false);
    let current_app_name = executable_path
        .as_deref()
        .and_then(|path| Path::new(path).file_stem())
        .and_then(|name| name.to_str())
        .map(str::to_string)
        .or_else(|| current_prog_id.clone());
    let mut risk = if high_risk {
        FileAssociationRisk::HighRisk
    } else if source == FileAssociationSource::UserChoice {
        FileAssociationRisk::Protected
    } else if current_prog_id.is_none() {
        FileAssociationRisk::Unknown
    } else if current_command.is_some() && !executable_exists {
        FileAssociationRisk::MissingApp
    } else {
        FileAssociationRisk::Normal
    };
    if current_command.is_none() && current_prog_id.is_some() && risk == FileAssociationRisk::Normal
    {
        risk = FileAssociationRisk::Unknown;
    }
    if source == FileAssociationSource::UserChoice {
        notes.push("当前关联由 Windows UserChoice 保护，只读展示，不直接写入。".to_string());
    }
    if high_risk {
        notes.push("高风险类型默认只读，避免脚本、安装包或可执行文件被批量改写。".to_string());
    }
    if risk == FileAssociationRisk::MissingApp {
        notes.push("当前默认程序路径不存在，建议重新选择应用或进入系统设置修复。".to_string());
    }
    Ok(FileAssociationRecord {
        extension,
        category: definition.category.to_string(),
        description: definition.description.to_string(),
        current_prog_id,
        current_app_name,
        current_command,
        executable_path,
        executable_exists,
        source: source.clone(),
        risk: risk.clone(),
        can_inspect: true,
        can_suggest_change: !high_risk,
        can_apply_automatically: !high_risk && source != FileAssociationSource::UserChoice,
        requires_system_settings: source == FileAssociationSource::UserChoice
            || risk == FileAssociationRisk::Protected,
        notes,
    })
}

#[cfg(windows)]
fn read_current_association(extension: &str) -> Option<(Option<String>, FileAssociationSource)> {
    use winreg::{enums::*, RegKey};
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(key) = hkcu.open_subkey(format!(
        r"Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\{}\UserChoice",
        extension
    )) {
        if let Ok(prog_id) = key.get_value::<String, _>("ProgId") {
            return Some((Some(prog_id), FileAssociationSource::UserChoice));
        }
    }
    if let Ok(key) = hkcu.open_subkey(format!(r"Software\Classes\{}", extension)) {
        if let Ok(prog_id) = key.get_value::<String, _>("") {
            if !prog_id.trim().is_empty() {
                return Some((Some(prog_id), FileAssociationSource::Hkcu));
            }
        }
    }
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    if let Ok(key) = hklm.open_subkey(format!(r"Software\Classes\{}", extension)) {
        if let Ok(prog_id) = key.get_value::<String, _>("") {
            if !prog_id.trim().is_empty() {
                return Some((Some(prog_id), FileAssociationSource::Hklm));
            }
        }
    }
    None
}

#[cfg(not(windows))]
fn read_current_association(_extension: &str) -> Option<(Option<String>, FileAssociationSource)> {
    None
}

#[cfg(windows)]
fn read_open_command(prog_id: &str) -> Option<String> {
    use winreg::{enums::*, RegKey};
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(key) = hkcu.open_subkey(format!(r"Software\Classes\{}\shell\open\command", prog_id)) {
        if let Ok(command) = key.get_value::<String, _>("") {
            return Some(command);
        }
    }
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    if let Ok(key) = hklm.open_subkey(format!(r"Software\Classes\{}\shell\open\command", prog_id)) {
        if let Ok(command) = key.get_value::<String, _>("") {
            return Some(command);
        }
    }
    None
}

#[cfg(not(windows))]
fn read_open_command(_prog_id: &str) -> Option<String> {
    None
}

#[cfg(windows)]
fn apply_user_level_change(change: &FileAssociationChange) -> Result<(), String> {
    use winreg::{enums::*, RegKey};
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let classes = hkcu
        .create_subkey(r"Software\Classes")
        .map_err(|err| format!("打开当前用户 Classes 失败：{err}"))?
        .0;
    let extension_key = classes
        .create_subkey(&change.extension)
        .map_err(|err| format!("写入扩展名关联失败：{err}"))?
        .0;
    extension_key
        .set_value("", &change.after.prog_id)
        .map_err(|err| format!("写入 ProgID 失败：{err}"))?;
    let prog_key = classes
        .create_subkey(&change.after.prog_id)
        .map_err(|err| format!("创建 ProgID 失败：{err}"))?
        .0;
    prog_key
        .set_value("", &change.after.app_name)
        .map_err(|err| format!("写入应用名称失败：{err}"))?;
    let command_key = prog_key
        .create_subkey(r"shell\open\command")
        .map_err(|err| format!("创建打开命令失败：{err}"))?
        .0;
    command_key
        .set_value("", &change.after.command)
        .map_err(|err| format!("写入打开命令失败：{err}"))?;
    Ok(())
}

#[cfg(not(windows))]
fn apply_user_level_change(_change: &FileAssociationChange) -> Result<(), String> {
    Err("文件关联修改仅支持 Windows。".to_string())
}

#[cfg(windows)]
fn restore_record(record: &FileAssociationBackupRecord) -> Result<(), String> {
    use winreg::{enums::*, RegKey};
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let classes = hkcu
        .create_subkey(r"Software\Classes")
        .map_err(|err| format!("打开当前用户 Classes 失败：{err}"))?
        .0;
    let extension_key = classes
        .create_subkey(&record.extension)
        .map_err(|err| format!("打开扩展名键失败：{err}"))?
        .0;
    if let Some(prog_id) = &record.before.current_prog_id {
        extension_key
            .set_value("", prog_id)
            .map_err(|err| format!("恢复 ProgID 失败：{err}"))?;
    } else {
        let _ = extension_key.delete_value("");
    }
    Ok(())
}

#[cfg(not(windows))]
fn restore_record(_record: &FileAssociationBackupRecord) -> Result<(), String> {
    Err("文件关联回滚仅支持 Windows。".to_string())
}

fn write_backup(plan: &FileAssociationPlan) -> Result<FileAssociationBackup, String> {
    let backup = FileAssociationBackup {
        backup_id: plan.plan_id.clone(),
        created_at: current_timestamp(),
        windows_version: windows_version(),
        user: std::env::var("USERNAME").unwrap_or_else(|_| "unknown".to_string()),
        plan_id: plan.plan_id.clone(),
        plan_fingerprint: plan.plan_fingerprint.clone(),
        target_app_name: plan.target_app_name.clone(),
        records: plan
            .changes
            .iter()
            .map(|change| FileAssociationBackupRecord {
                extension: change.extension.clone(),
                before: change.before.clone(),
            })
            .collect(),
    };
    let path = PathBuf::from(&plan.backup_path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| format!("创建备份目录失败：{err}"))?;
    }
    let text =
        serde_json::to_string_pretty(&backup).map_err(|err| format!("生成备份失败：{err}"))?;
    fs::write(&path, text).map_err(|err| format!("写入备份失败：{err}"))?;
    Ok(backup)
}

fn read_backup(backup_id: &str) -> Result<FileAssociationBackup, String> {
    let safe = backup_id
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric() || *ch == '-' || *ch == '_')
        .collect::<String>();
    if safe.is_empty() || safe != backup_id {
        return Err("备份编号无效".to_string());
    }
    let path = backup_dir().join(format!("{safe}.json"));
    let text = fs::read_to_string(&path).map_err(|err| format!("读取备份失败：{err}"))?;
    serde_json::from_str(&text).map_err(|err| format!("备份格式错误：{err}"))
}

fn validate_plan_fingerprint(plan: &FileAssociationPlan) -> Result<(), String> {
    let expected = plan_fingerprint(plan);
    if expected != plan.plan_fingerprint {
        return Err("文件关联计划指纹不匹配，已拒绝执行".to_string());
    }
    Ok(())
}

fn plan_fingerprint(plan: &FileAssociationPlan) -> String {
    let mut clone = plan.clone();
    clone.plan_fingerprint.clear();
    let text = serde_json::to_string(&clone).unwrap_or_default();
    let mut hasher = Sha256::new();
    hasher.update(text.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn normalize_extension_list(values: &[String]) -> Result<Vec<String>, String> {
    let mut result = Vec::new();
    for value in values {
        let extension = normalize_extension(value)?;
        if !result.contains(&extension) {
            result.push(extension);
        }
    }
    Ok(result)
}

fn normalize_extension(value: &str) -> Result<String, String> {
    let trimmed = value.trim().trim_start_matches('*').trim();
    if trimmed.is_empty() || trimmed == "." {
        return Err("扩展名不能为空".to_string());
    }
    let extension = if trimmed.starts_with('.') {
        trimmed.to_ascii_lowercase()
    } else {
        format!(".{}", trimmed.to_ascii_lowercase())
    };
    if !extension
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '.' || ch == '_' || ch == '-')
    {
        return Err(format!("扩展名包含不支持的字符：{value}"));
    }
    Ok(extension)
}

fn is_high_risk_extension(extension: &str) -> bool {
    HIGH_RISK_EXTENSIONS.contains(&extension.to_ascii_lowercase().as_str())
}

fn command_executable(command: &str) -> Option<String> {
    let trimmed = command.trim();
    if let Some(rest) = trimmed.strip_prefix('"') {
        return rest.split('"').next().map(str::to_string);
    }
    trimmed.split_whitespace().next().map(str::to_string)
}

fn safe_identifier(value: &str) -> String {
    let id = value
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric())
        .collect::<String>();
    if id.is_empty() {
        "Application".to_string()
    } else {
        id
    }
}

fn unknown_record(extension: &str, definition: ExtensionDefinition) -> FileAssociationRecord {
    FileAssociationRecord {
        extension: extension.to_string(),
        category: definition.category.to_string(),
        description: definition.description.to_string(),
        current_prog_id: None,
        current_app_name: None,
        current_command: None,
        executable_path: None,
        executable_exists: false,
        source: FileAssociationSource::Unknown,
        risk: if is_high_risk_extension(extension) {
            FileAssociationRisk::HighRisk
        } else {
            FileAssociationRisk::Unknown
        },
        can_inspect: true,
        can_suggest_change: !is_high_risk_extension(extension),
        can_apply_automatically: !is_high_risk_extension(extension),
        requires_system_settings: false,
        notes: vec!["自定义扩展名，当前系统关联未识别。".to_string()],
    }
}

fn extension_definition(extension: &str) -> ExtensionDefinition {
    extension_definitions()
        .into_iter()
        .find(|item| item.extension == extension)
        .unwrap_or(ExtensionDefinition {
            extension: ".custom",
            category: "自定义",
            description: "用户输入的自定义扩展名",
        })
}

fn extension_definitions() -> Vec<ExtensionDefinition> {
    vec![
        (".txt", "文本 / 配置", "纯文本文件"),
        (".log", "文本 / 配置", "日志文件"),
        (".md", "文本 / 配置", "Markdown 文档"),
        (".ini", "文本 / 配置", "INI 配置"),
        (".conf", "文本 / 配置", "配置文件"),
        (".config", "文本 / 配置", "应用配置"),
        (".properties", "文本 / 配置", "Java properties"),
        (".env", "文本 / 配置", "环境变量文件"),
        (".csv", "文本 / 配置", "CSV 表格"),
        (".tsv", "文本 / 配置", "TSV 表格"),
        (".json", "文本 / 配置", "JSON 数据"),
        (".jsonc", "文本 / 配置", "JSONC 数据"),
        (".xml", "文本 / 配置", "XML 文档"),
        (".yml", "文本 / 配置", "YAML 配置"),
        (".yaml", "文本 / 配置", "YAML 配置"),
        (".toml", "文本 / 配置", "TOML 配置"),
        (".java", "代码 / 开发", "Java 源码"),
        (".py", "代码 / 开发", "Python 源码"),
        (".js", "代码 / 开发", "JavaScript 源码"),
        (".ts", "代码 / 开发", "TypeScript 源码"),
        (".jsx", "代码 / 开发", "React JSX"),
        (".tsx", "代码 / 开发", "React TSX"),
        (".html", "代码 / 开发", "HTML 页面"),
        (".css", "代码 / 开发", "CSS 样式"),
        (".scss", "代码 / 开发", "SCSS 样式"),
        (".vue", "代码 / 开发", "Vue 组件"),
        (".c", "代码 / 开发", "C 源码"),
        (".cpp", "代码 / 开发", "C++ 源码"),
        (".h", "代码 / 开发", "C/C++ 头文件"),
        (".hpp", "代码 / 开发", "C++ 头文件"),
        (".cs", "代码 / 开发", "C# 源码"),
        (".go", "代码 / 开发", "Go 源码"),
        (".rs", "代码 / 开发", "Rust 源码"),
        (".php", "代码 / 开发", "PHP 源码"),
        (".sql", "代码 / 开发", "SQL 脚本"),
        (".sh", "代码 / 开发", "Shell 脚本"),
        (".bat", "代码 / 开发", "Windows 批处理"),
        (".cmd", "代码 / 开发", "Windows 命令脚本"),
        (".ps1", "代码 / 开发", "PowerShell 脚本"),
        (".png", "图片", "PNG 图片"),
        (".jpg", "图片", "JPEG 图片"),
        (".jpeg", "图片", "JPEG 图片"),
        (".webp", "图片", "WebP 图片"),
        (".gif", "图片", "GIF 图片"),
        (".bmp", "图片", "BMP 图片"),
        (".svg", "图片", "SVG 矢量图"),
        (".ico", "图片", "图标文件"),
        (".pdf", "文档", "PDF 文档"),
        (".doc", "文档", "Word 文档"),
        (".docx", "文档", "Word 文档"),
        (".xls", "文档", "Excel 表格"),
        (".xlsx", "文档", "Excel 表格"),
        (".ppt", "文档", "PowerPoint 演示"),
        (".pptx", "文档", "PowerPoint 演示"),
        (".rtf", "文档", "RTF 文档"),
        (".zip", "压缩包", "ZIP 压缩包"),
        (".rar", "压缩包", "RAR 压缩包"),
        (".7z", "压缩包", "7-Zip 压缩包"),
        (".tar", "压缩包", "TAR 归档"),
        (".gz", "压缩包", "GZip 压缩包"),
        (".bz2", "压缩包", "BZip2 压缩包"),
        (".xz", "压缩包", "XZ 压缩包"),
        (".mp3", "音视频", "MP3 音频"),
        (".wav", "音视频", "WAV 音频"),
        (".flac", "音视频", "FLAC 音频"),
        (".mp4", "音视频", "MP4 视频"),
        (".mkv", "音视频", "MKV 视频"),
        (".avi", "音视频", "AVI 视频"),
        (".mov", "音视频", "MOV 视频"),
        (".wmv", "音视频", "WMV 视频"),
        (".db", "数据 / 开发产物", "数据库文件"),
        (".sqlite", "数据 / 开发产物", "SQLite 数据库"),
        (".sqlite3", "数据 / 开发产物", "SQLite 数据库"),
        (".jar", "数据 / 开发产物", "Java JAR"),
        (".war", "数据 / 开发产物", "Java WAR"),
        (".class", "数据 / 开发产物", "Java class"),
        (".exe", "高风险", "可执行程序"),
        (".msi", "高风险", "Windows 安装包"),
        (".reg", "高风险", "注册表脚本"),
        (".vbs", "高风险", "VBScript 脚本"),
        (".scr", "高风险", "屏幕保护程序"),
    ]
    .into_iter()
    .map(|(extension, category, description)| ExtensionDefinition {
        extension,
        category,
        description,
    })
    .collect()
}

fn backup_root() -> PathBuf {
    dirs::data_dir()
        .or_else(dirs::home_dir)
        .unwrap_or_else(|| PathBuf::from("."))
        .join("DevEnv Manager")
        .join("file-associations")
}

fn backup_dir() -> PathBuf {
    backup_root().join("backups")
}

fn open_ms_settings(uri: &str) -> Result<(), String> {
    Command::new("explorer")
        .arg(uri)
        .spawn()
        .map_err(|err| format!("打开 Windows 设置失败：{err}"))?;
    Ok(())
}

fn open_path(path: &Path) -> Result<(), String> {
    Command::new("explorer")
        .arg(path)
        .spawn()
        .map_err(|err| format!("打开目录失败：{err}"))?;
    Ok(())
}

fn windows_version() -> String {
    std::env::var("OS").unwrap_or_else(|_| "Windows".to_string())
}

fn current_timestamp() -> String {
    let seconds = unix_timestamp();
    format!("{seconds}")
}

fn timestamp_compact() -> String {
    unix_timestamp().to_string()
}

fn unix_timestamp() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn display_path(path: impl AsRef<Path>) -> String {
    path.as_ref().to_string_lossy().replace('\\', "/")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_extensions() {
        assert_eq!(normalize_extension("txt").unwrap(), ".txt");
        assert_eq!(normalize_extension("*.JSON").unwrap(), ".json");
        assert!(normalize_extension("").is_err());
    }

    #[test]
    fn detects_high_risk_extensions() {
        assert!(is_high_risk_extension(".ps1"));
        assert!(is_high_risk_extension(".exe"));
        assert!(!is_high_risk_extension(".txt"));
    }

    #[test]
    fn command_parser_reads_quoted_executable() {
        assert_eq!(
            command_executable(r#""C:\Program Files\App\app.exe" "%1""#).as_deref(),
            Some(r"C:\Program Files\App\app.exe")
        );
    }

    #[test]
    fn plan_rejects_missing_target_exe() {
        let request = FileAssociationPlanRequest {
            target_app_name: "Missing".to_string(),
            target_executable: r"Z:\definitely-missing\missing.exe".to_string(),
            extensions: vec!["txt".to_string()],
            advanced_high_risk: false,
        };
        assert!(create_file_association_plan_blocking(request).is_err());
    }

    #[test]
    fn fingerprint_changes_when_plan_is_tampered() {
        let record = unknown_record(
            ".txt",
            ExtensionDefinition {
                extension: ".txt",
                category: "文本",
                description: "文本",
            },
        );
        let mut plan = FileAssociationPlan {
            plan_id: "p1".to_string(),
            created_at: "1".to_string(),
            target_app_name: "App".to_string(),
            target_executable: "app.exe".to_string(),
            changes: vec![FileAssociationChange {
                extension: ".txt".to_string(),
                before: record,
                after: FileAssociationTarget {
                    prog_id: "DevEnvManager.App.txt".to_string(),
                    app_name: "App".to_string(),
                    executable: "app.exe".to_string(),
                    command: "\"app.exe\" \"%1\"".to_string(),
                },
                apply_mode: FileAssociationApplyMode::OpenSystemSettings,
                risk: FileAssociationRisk::Normal,
                warnings: Vec::new(),
            }],
            backup_path: "backup.json".to_string(),
            warnings: Vec::new(),
            requires_confirmation_token: false,
            plan_fingerprint: String::new(),
        };
        plan.plan_fingerprint = plan_fingerprint(&plan);
        assert!(validate_plan_fingerprint(&plan).is_ok());
        plan.target_app_name = "Other".to_string();
        assert!(validate_plan_fingerprint(&plan).is_err());
    }
}
