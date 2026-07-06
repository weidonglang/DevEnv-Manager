use serde::{Deserialize, Serialize};
use std::ffi::OsStr;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[derive(Debug, Clone)]
pub struct PowerShellRequest {
    pub script: String,
    pub args: Vec<String>,
    pub cwd: Option<PathBuf>,
    pub timeout_seconds: u64,
    pub risk_level: String,
    pub requires_admin: bool,
    pub allow_network: bool,
    pub confirmation_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PowerShellResult {
    pub success: bool,
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    pub elapsed_ms: u128,
    pub timed_out: bool,
    pub executable: String,
    pub killed_process_tree: bool,
}

impl PowerShellRequest {
    pub fn read_only(script: impl Into<String>, timeout_seconds: u64) -> Self {
        Self {
            script: script.into(),
            args: Vec::new(),
            cwd: None,
            timeout_seconds,
            risk_level: "low".to_string(),
            requires_admin: false,
            allow_network: false,
            confirmation_token: None,
        }
    }
}

pub fn run_powershell_script(
    script: impl Into<String>,
    args: Vec<String>,
    timeout_seconds: u64,
) -> Result<PowerShellResult, String> {
    let mut request = PowerShellRequest::read_only(script, timeout_seconds);
    request.args = args;
    run_powershell(request)
}

pub fn run_powershell(request: PowerShellRequest) -> Result<PowerShellResult, String> {
    let risk = request.risk_level.trim().to_ascii_lowercase();
    if matches!(risk.as_str(), "medium" | "high" | "critical")
        && request
            .confirmation_token
            .as_deref()
            .unwrap_or("")
            .trim()
            .is_empty()
    {
        return Err("PowerShell 写入类请求缺少 confirmation token".to_string());
    }
    if request.requires_admin && !is_elevated() {
        return Err(
            "该 PowerShell 操作需要管理员权限，请在确认后由系统 UAC 提示授权。".to_string(),
        );
    }
    let _allow_network = request.allow_network;
    let timeout_seconds = request.timeout_seconds.clamp(1, 300);
    let executable = powershell_executable();
    let mut script_file = tempfile::Builder::new()
        .suffix(".ps1")
        .tempfile()
        .map_err(|err| format!("创建 PowerShell 临时脚本失败：{err}"))?;
    script_file
        .write_all(request.script.as_bytes())
        .map_err(|err| format!("写入 PowerShell 临时脚本失败：{err}"))?;
    let script_path = script_file.into_temp_path();
    let mut command = Command::new(&executable);
    hide_command_window(&mut command);
    command
        .args([
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
        ])
        .arg(script_path.as_os_str())
        .args(request.args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Some(cwd) = request.cwd {
        command.current_dir(cwd);
    }
    let start = Instant::now();
    let mut child = command
        .spawn()
        .map_err(|err| format!("启动 PowerShell 失败：{err}"))?;
    let mut timed_out = false;
    loop {
        if child
            .try_wait()
            .map_err(|err| format!("等待 PowerShell 失败：{err}"))?
            .is_some()
        {
            break;
        }
        if start.elapsed() >= Duration::from_secs(timeout_seconds) {
            timed_out = true;
            break;
        }
        thread::sleep(Duration::from_millis(50));
    }
    let mut killed_process_tree = false;
    if timed_out {
        killed_process_tree = kill_process_tree(child.id());
        let _ = child.kill();
    }
    let output = child
        .wait_with_output()
        .map_err(|err| format!("读取 PowerShell 输出失败：{err}"))?;
    let stdout = decode_output(&output.stdout);
    let stderr = decode_output(&output.stderr);
    Ok(PowerShellResult {
        success: output.status.success() && !timed_out,
        exit_code: output.status.code(),
        stdout,
        stderr,
        elapsed_ms: start.elapsed().as_millis(),
        timed_out,
        executable,
        killed_process_tree,
    })
}

pub fn powershell_executable() -> String {
    for executable in ["pwsh.exe", "powershell.exe"] {
        let probe = Command::new(executable)
            .args([
                "-NoLogo",
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "$PSVersionTable.PSVersion.ToString()",
            ])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
        if probe.is_ok_and(|status| status.success()) {
            return executable.to_string();
        }
    }
    "powershell.exe".to_string()
}

pub fn decode_output(bytes: &[u8]) -> String {
    if bytes.len() >= 2 {
        let little_endian = bytes[0] == 0xff && bytes[1] == 0xfe;
        let nul_heavy =
            bytes.len() > 4 && bytes.iter().skip(1).step_by(2).take(12).any(|b| *b == 0);
        if little_endian || nul_heavy {
            let start = if little_endian { 2 } else { 0 };
            let units = bytes[start..]
                .chunks_exact(2)
                .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
                .collect::<Vec<_>>();
            return String::from_utf16_lossy(&units);
        }
    }
    String::from_utf8_lossy(bytes).to_string()
}

fn kill_process_tree(pid: u32) -> bool {
    Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/T", "/F"])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .is_ok_and(|status| status.success())
}

fn is_elevated() -> bool {
    false
}

fn hide_command_window(command: &mut Command) {
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    #[cfg(not(windows))]
    {
        let _ = command;
    }
}

#[allow(dead_code)]
fn _assert_os_str(_: impl AsRef<OsStr>) {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_utf16le_output() {
        let bytes = [b'h', 0, b'i', 0, 0x0a, 0];
        assert_eq!(decode_output(&bytes), "hi\n");
    }

    #[test]
    fn high_risk_request_requires_token() {
        let request = PowerShellRequest {
            script: "Write-Output ok".to_string(),
            args: Vec::new(),
            cwd: None,
            timeout_seconds: 1,
            risk_level: "high".to_string(),
            requires_admin: false,
            allow_network: false,
            confirmation_token: None,
        };
        assert!(run_powershell(request).is_err());
    }

    #[test]
    #[cfg(windows)]
    fn timeout_marks_result_and_kills_process() {
        let result = run_powershell_script("Start-Sleep -Seconds 3", Vec::new(), 1).unwrap();
        assert!(result.timed_out);
        assert!(!result.success);
    }
}
