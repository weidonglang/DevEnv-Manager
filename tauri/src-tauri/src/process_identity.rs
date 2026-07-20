use serde::Deserialize;
use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;

const CATALOG_JSON: &str = include_str!("../resources/process-identities.v1.json");

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessIdentityCatalog {
    pub schema_version: u32,
    pub catalog_version: String,
    pub updated_at: String,
    pub entries: Vec<ProcessIdentityEntry>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessIdentityEntry {
    pub id: String,
    pub display_name_zh: String,
    pub display_name_en: String,
    pub category: String,
    pub ecosystem: String,
    #[serde(default)]
    pub executable_names: Vec<String>,
    #[serde(default)]
    pub service_names: Vec<String>,
    #[serde(default)]
    pub service_display_names: Vec<String>,
    #[serde(default)]
    pub product_names: Vec<String>,
    #[serde(default)]
    pub file_descriptions: Vec<String>,
    #[serde(default)]
    pub company_names: Vec<String>,
    #[serde(default)]
    pub publishers: Vec<String>,
    #[serde(default)]
    pub path_patterns: Vec<String>,
    #[serde(default)]
    pub command_line_patterns: Vec<String>,
    #[serde(default)]
    pub parent_process_names: Vec<String>,
    #[serde(default)]
    pub child_process_names: Vec<String>,
    #[serde(default)]
    pub common_ports: Vec<u16>,
    #[serde(default)]
    pub strong_ports: Vec<u16>,
    #[serde(default)]
    pub configuration_hints: Vec<String>,
    pub default_handling: String,
    #[serde(default)]
    pub risk_notes: Vec<String>,
    #[serde(default)]
    pub aliases: Vec<String>,
    pub documentation_key: String,
    #[serde(default)]
    pub requires_context: bool,
}

#[derive(Debug, Default)]
pub struct IdentityObservation<'a> {
    pub process_name: &'a str,
    pub process_path: &'a str,
    pub command_line: &'a str,
    pub parent_process_name: &'a str,
    pub service_names: &'a [String],
    pub service_display_names: &'a [String],
    pub product_name: &'a str,
    pub file_description: &'a str,
    pub company_name: &'a str,
    pub publisher: &'a str,
    pub port: u16,
}

#[derive(Debug, Clone)]
pub struct IdentityMatch {
    pub identity_id: String,
    pub display_name_zh: String,
    pub display_name_en: String,
    pub category: String,
    pub ecosystem: String,
    pub confidence: u8,
    pub confidence_level: String,
    pub evidence: Vec<String>,
    pub conflicts: Vec<String>,
    pub default_handling: String,
    pub catalog_version: String,
}

pub fn identify(observation: &IdentityObservation<'_>) -> IdentityMatch {
    let catalog = match catalog() {
        Ok(catalog) => catalog,
        Err(error) => return unknown_match(vec![format!("identity catalog unavailable: {error}")]),
    };
    identify_with_catalog(catalog, observation)
}

fn catalog() -> Result<&'static ProcessIdentityCatalog, String> {
    static CATALOG: OnceLock<Result<ProcessIdentityCatalog, String>> = OnceLock::new();
    CATALOG
        .get_or_init(|| parse_catalog(CATALOG_JSON))
        .as_ref()
        .map_err(Clone::clone)
}

fn parse_catalog(text: &str) -> Result<ProcessIdentityCatalog, String> {
    let catalog: ProcessIdentityCatalog = serde_json::from_str(text)
        .map_err(|error| format!("process identity catalog is invalid JSON: {error}"))?;
    validate_catalog(&catalog)?;
    Ok(catalog)
}

fn validate_catalog(catalog: &ProcessIdentityCatalog) -> Result<(), String> {
    if catalog.schema_version != 1 {
        return Err(format!(
            "unsupported schemaVersion {}",
            catalog.schema_version
        ));
    }
    if catalog.catalog_version.trim().is_empty() || catalog.updated_at.trim().is_empty() {
        return Err("catalogVersion and updatedAt are required".to_string());
    }
    let allowed_categories = [
        "database",
        "java",
        "node",
        "python",
        "web",
        "dotnet",
        "native",
        "container",
        "middleware",
        "cloud",
        "ide",
        "system",
        "desktop",
        "unknown",
    ];
    let allowed_handling = ["protected", "service-plan", "strict-plan", "inspect-only"];
    let mut ids = HashSet::new();
    let mut aliases = HashMap::<String, String>::new();
    let mut executable_owners = HashMap::<String, (String, bool)>::new();
    for entry in &catalog.entries {
        let id = entry.id.trim().to_ascii_lowercase();
        if id.is_empty() || !ids.insert(id.clone()) {
            return Err(format!("duplicate or empty catalog id: {}", entry.id));
        }
        if entry.display_name_zh.trim().is_empty() || entry.display_name_en.trim().is_empty() {
            return Err(format!(
                "{} requires Chinese and English display names",
                entry.id
            ));
        }
        if !allowed_categories.contains(&entry.category.as_str()) {
            return Err(format!(
                "{} has invalid category {}",
                entry.id, entry.category
            ));
        }
        if !allowed_handling.contains(&entry.default_handling.as_str()) {
            return Err(format!(
                "{} has invalid defaultHandling {}",
                entry.id, entry.default_handling
            ));
        }
        if entry.documentation_key.trim().is_empty() {
            return Err(format!("{} requires documentationKey", entry.id));
        }
        for pattern in entry
            .path_patterns
            .iter()
            .chain(&entry.command_line_patterns)
            .chain(&entry.parent_process_names)
            .chain(&entry.child_process_names)
            .chain(&entry.configuration_hints)
            .chain(&entry.risk_notes)
        {
            if pattern.trim().is_empty() || pattern.contains(['\r', '\n']) {
                return Err(format!("{} contains an invalid bounded pattern", entry.id));
            }
        }
        for port in entry.common_ports.iter().chain(&entry.strong_ports) {
            if *port == 0 {
                return Err(format!("{} contains an invalid port", entry.id));
            }
        }
        for alias in &entry.aliases {
            let alias = alias.trim().to_ascii_lowercase();
            if alias.is_empty() {
                return Err(format!("{} contains an empty alias", entry.id));
            }
            if let Some(owner) = aliases.insert(alias.clone(), entry.id.clone()) {
                return Err(format!(
                    "alias {alias} conflicts between {owner} and {}",
                    entry.id
                ));
            }
        }
        for executable in &entry.executable_names {
            if executable != &executable.to_ascii_lowercase() || executable.contains(['/', '\\']) {
                return Err(format!(
                    "{} executableNames must be lowercase file names: {executable}",
                    entry.id
                ));
            }
            if let Some((owner, owner_requires_context)) = executable_owners.get(executable) {
                if !entry.requires_context && !owner_requires_context {
                    return Err(format!(
                        "strong executable {executable} conflicts between {owner} and {}",
                        entry.id
                    ));
                }
            } else {
                executable_owners.insert(
                    executable.clone(),
                    (entry.id.clone(), entry.requires_context),
                );
            }
        }
        if entry.default_handling == "protected" && entry.category != "system" {
            return Err(format!(
                "{} protected handling is reserved for system identities",
                entry.id
            ));
        }
    }
    Ok(())
}

fn identify_with_catalog(
    catalog: &ProcessIdentityCatalog,
    observation: &IdentityObservation<'_>,
) -> IdentityMatch {
    let mut candidates = catalog
        .entries
        .iter()
        .filter_map(|entry| score_entry(entry, observation))
        .collect::<Vec<_>>();
    candidates.sort_by(|left, right| {
        right
            .0
            .cmp(&left.0)
            .then_with(|| left.1.id.cmp(&right.1.id))
    });
    let Some((score, entry, evidence, conflicts, verified_evidence)) =
        candidates.into_iter().next()
    else {
        return unknown_match(Vec::new());
    };
    let confidence = score.clamp(0, 100) as u8;
    let confidence_level = if !conflicts.is_empty() && confidence < 35 {
        "conflict"
    } else if confidence >= 90 && verified_evidence {
        "verified"
    } else if confidence >= 60 {
        "high"
    } else if confidence >= 35 {
        "medium"
    } else if confidence > 0 {
        "low"
    } else {
        "unknown"
    };
    IdentityMatch {
        identity_id: entry.id.clone(),
        display_name_zh: entry.display_name_zh.clone(),
        display_name_en: entry.display_name_en.clone(),
        category: entry.category.clone(),
        ecosystem: entry.ecosystem.clone(),
        confidence,
        confidence_level: confidence_level.to_string(),
        evidence,
        conflicts,
        default_handling: entry.default_handling.clone(),
        catalog_version: catalog.catalog_version.clone(),
    }
}

type ScoredEntry<'a> = (
    i32,
    &'a ProcessIdentityEntry,
    Vec<String>,
    Vec<String>,
    bool,
);

fn score_entry<'a>(
    entry: &'a ProcessIdentityEntry,
    observation: &IdentityObservation<'_>,
) -> Option<ScoredEntry<'a>> {
    let process_name = observation.process_name.trim().to_ascii_lowercase();
    let process_path = observation.process_path.to_ascii_lowercase();
    let command_line = observation.command_line.to_ascii_lowercase();
    let parent_name = observation.parent_process_name.trim().to_ascii_lowercase();
    let product_name = observation.product_name.to_ascii_lowercase();
    let file_description = observation.file_description.to_ascii_lowercase();
    let company_name = observation.company_name.to_ascii_lowercase();
    let publisher = observation.publisher.to_ascii_lowercase();
    let services = observation
        .service_names
        .iter()
        .map(|value| value.to_ascii_lowercase())
        .collect::<Vec<_>>();
    let service_displays = observation
        .service_display_names
        .iter()
        .map(|value| value.to_ascii_lowercase())
        .collect::<Vec<_>>();

    let mut score = 0_i32;
    let mut context_score = 0_i32;
    let mut non_port_evidence = false;
    let mut evidence = Vec::new();
    let mut conflicts = Vec::new();
    let executable_match = entry
        .executable_names
        .iter()
        .any(|pattern| wildcard_match(&process_name, pattern));
    if executable_match {
        score += 24;
        non_port_evidence = true;
        evidence.push(format!("executable name matched {}", process_name));
    }
    if any_exact_or_wildcard(&services, &entry.service_names) {
        score += 45;
        context_score += 45;
        non_port_evidence = true;
        evidence.push("Windows service name matched".to_string());
    }
    if any_contains(&service_displays, &entry.service_display_names) {
        score += 28;
        context_score += 28;
        non_port_evidence = true;
        evidence.push("Windows service display name matched".to_string());
    }
    if contains_pattern(&process_path, &entry.path_patterns) {
        score += 22;
        context_score += 22;
        non_port_evidence = true;
        evidence.push("installation path matched".to_string());
    }
    if contains_pattern(&command_line, &entry.command_line_patterns) {
        score += 32;
        context_score += 32;
        non_port_evidence = true;
        evidence.push("command line signature matched".to_string());
    }
    if entry
        .parent_process_names
        .iter()
        .any(|pattern| wildcard_match(&parent_name, pattern))
    {
        score += 10;
        context_score += 10;
        non_port_evidence = true;
        evidence.push("parent process matched".to_string());
    }
    if contains_pattern(&product_name, &entry.product_names) {
        score += 24;
        context_score += 24;
        non_port_evidence = true;
        evidence.push("ProductName metadata matched".to_string());
    }
    if contains_pattern(&file_description, &entry.file_descriptions) {
        score += 18;
        context_score += 18;
        non_port_evidence = true;
        evidence.push("FileDescription metadata matched".to_string());
    }
    if contains_pattern(&company_name, &entry.company_names) {
        score += 20;
        context_score += 20;
        non_port_evidence = true;
        evidence.push("CompanyName metadata matched".to_string());
    }
    if contains_pattern(&publisher, &entry.publishers) {
        score += 35;
        context_score += 35;
        non_port_evidence = true;
        evidence.push("Authenticode publisher matched".to_string());
    }
    if entry.strong_ports.contains(&observation.port) {
        score += 10;
        evidence.push(format!("strong port hint {} matched", observation.port));
    } else if entry.common_ports.contains(&observation.port) {
        score += 4;
        evidence.push(format!("common port hint {} matched", observation.port));
    }

    if executable_match
        && (process_path.contains("\\temp\\") || process_path.contains("\\appdata\\local\\temp\\"))
    {
        score -= 48;
        conflicts.push("matching file name is running from a temporary directory".to_string());
    }
    if !observation.company_name.trim().is_empty()
        && !entry.company_names.is_empty()
        && !contains_pattern(&company_name, &entry.company_names)
    {
        score -= 30;
        conflicts.push("CompanyName conflicts with the catalog identity".to_string());
    }
    if !observation.publisher.trim().is_empty()
        && !entry.publishers.is_empty()
        && !contains_pattern(&publisher, &entry.publishers)
    {
        score -= 42;
        conflicts.push("Authenticode publisher conflicts with the catalog identity".to_string());
    }
    if !non_port_evidence || (entry.requires_context && context_score == 0) {
        return None;
    }
    if evidence.is_empty() || (score <= 0 && conflicts.is_empty()) {
        return None;
    }
    let verified_evidence = evidence
        .iter()
        .any(|item| item.contains("publisher") || item.contains("service name"));
    Some((score.max(1), entry, evidence, conflicts, verified_evidence))
}

fn unknown_match(conflicts: Vec<String>) -> IdentityMatch {
    IdentityMatch {
        identity_id: "unknown".to_string(),
        display_name_zh: "未识别的本地进程".to_string(),
        display_name_en: "Unknown local process".to_string(),
        category: "unknown".to_string(),
        ecosystem: "unknown".to_string(),
        confidence: 0,
        confidence_level: if conflicts.is_empty() {
            "unknown"
        } else {
            "conflict"
        }
        .to_string(),
        evidence: Vec::new(),
        conflicts,
        default_handling: "inspect-only".to_string(),
        catalog_version: "unavailable".to_string(),
    }
}

fn wildcard_match(value: &str, pattern: &str) -> bool {
    let pattern = pattern.trim().to_ascii_lowercase();
    if let Some(inner) = pattern
        .strip_prefix('*')
        .and_then(|value| value.strip_suffix('*'))
    {
        value.contains(inner)
    } else if let Some(prefix) = pattern.strip_suffix('*') {
        value.starts_with(prefix)
    } else if let Some(suffix) = pattern.strip_prefix('*') {
        value.ends_with(suffix)
    } else {
        value == pattern
    }
}

fn contains_pattern(value: &str, patterns: &[String]) -> bool {
    !value.is_empty()
        && patterns
            .iter()
            .any(|pattern| value.contains(&pattern.to_ascii_lowercase()))
}

fn any_contains(values: &[String], patterns: &[String]) -> bool {
    values.iter().any(|value| contains_pattern(value, patterns))
}

fn any_exact_or_wildcard(values: &[String], patterns: &[String]) -> bool {
    values.iter().any(|value| {
        patterns
            .iter()
            .any(|pattern| wildcard_match(value, pattern))
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn observation<'a>(
        name: &'a str,
        path: &'a str,
        command: &'a str,
        port: u16,
    ) -> IdentityObservation<'a> {
        IdentityObservation {
            process_name: name,
            process_path: path,
            command_line: command,
            port,
            ..IdentityObservation::default()
        }
    }

    #[test]
    fn bundled_catalog_passes_quality_validation() {
        let catalog = parse_catalog(CATALOG_JSON).unwrap();
        assert!(catalog.entries.len() >= 30);
        assert_eq!(catalog.schema_version, 1);
    }

    #[test]
    fn file_name_alone_never_marks_postgres_verified() {
        let result = identify(&observation("postgres.exe", "", "", 5432));
        assert_eq!(result.identity_id, "postgresql");
        assert_ne!(result.confidence_level, "verified");
        assert!(matches!(result.confidence_level.as_str(), "low" | "medium"));
    }

    #[test]
    fn official_postgres_path_and_service_raise_confidence() {
        let services = vec!["postgresql-x64-16".to_string()];
        let result = identify(&IdentityObservation {
            process_name: "postgres.exe",
            process_path: r"C:\Program Files\PostgreSQL\16\bin\postgres.exe",
            service_names: &services,
            port: 5432,
            ..IdentityObservation::default()
        });
        assert_eq!(result.identity_id, "postgresql");
        assert!(matches!(
            result.confidence_level.as_str(),
            "high" | "verified"
        ));
    }

    #[test]
    fn renamed_postgres_in_temp_is_conflict_or_low_confidence() {
        let result = identify(&observation(
            "postgres.exe",
            r"C:\Users\Test\AppData\Local\Temp\postgres.exe",
            "",
            5432,
        ));
        assert_eq!(result.identity_id, "postgresql");
        assert!(matches!(
            result.confidence_level.as_str(),
            "conflict" | "low"
        ));
        assert!(!result.conflicts.is_empty());
    }

    #[test]
    fn generic_java_does_not_guess_a_framework() {
        let result = identify(&observation(
            "java.exe",
            r"C:\Java\bin\java.exe",
            "java",
            8080,
        ));
        assert_eq!(result.identity_id, "java-runtime");
    }

    #[test]
    fn command_lines_distinguish_spring_vite_and_uvicorn() {
        let spring = identify(&observation(
            "java.exe",
            r"C:\Java\bin\java.exe",
            "java -jar sample-spring-boot.jar org.springframework.boot.loader.launch.JarLauncher",
            8080,
        ));
        let vite = identify(&observation(
            "node.exe",
            r"C:\Program Files\nodejs\node.exe",
            "node vite --host 127.0.0.1",
            5173,
        ));
        let uvicorn = identify(&observation(
            "python.exe",
            r"C:\Python\python.exe",
            "python -m uvicorn app:main",
            8000,
        ));
        assert_eq!(spring.identity_id, "spring-boot");
        assert_eq!(vite.identity_id, "vite");
        assert_eq!(uvicorn.identity_id, "uvicorn-fastapi");
    }

    #[test]
    fn svchost_uses_service_identity_and_remains_protected() {
        let services = vec!["Dhcp".to_string()];
        let result = identify(&IdentityObservation {
            process_name: "svchost.exe",
            service_names: &services,
            port: 68,
            ..IdentityObservation::default()
        });
        assert_eq!(result.identity_id, "windows-service-host");
        assert_eq!(result.default_handling, "protected");
    }

    #[test]
    fn corrupt_catalog_is_rejected_without_executing_any_input() {
        assert!(parse_catalog("{not-json}").is_err());
        let duplicate = r#"{
          "schemaVersion":1,"catalogVersion":"test","updatedAt":"2026-07-20","entries":[
            {"id":"x","displayNameZh":"x","displayNameEn":"x","category":"unknown","ecosystem":"x","defaultHandling":"inspect-only","aliases":["same"],"documentationKey":"x"},
            {"id":"y","displayNameZh":"y","displayNameEn":"y","category":"unknown","ecosystem":"y","defaultHandling":"inspect-only","aliases":["same"],"documentationKey":"y"}
          ]
        }"#;
        assert!(parse_catalog(duplicate).unwrap_err().contains("alias"));
    }
}
