use serde::Deserialize;
use std::collections::HashSet;

pub const DEFAULT_RECORD_LIMIT: usize = 4_000;
pub const MAX_DIAGNOSTIC_CHARS: usize = 480;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScanScope {
    Recommended,
    Full,
}

impl ScanScope {
    pub fn parse(value: Option<&str>) -> Self {
        if value.is_some_and(|item| item.eq_ignore_ascii_case("full")) {
            Self::Full
        } else {
            Self::Recommended
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Recommended => "recommended",
            Self::Full => "full",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PortSeed {
    pub protocol: String,
    pub local_address: String,
    pub local_port: u16,
    pub remote_address: String,
    pub state: String,
    pub pid: u32,
}

#[derive(Debug, Clone)]
pub struct ParsedPortSeeds {
    pub source: String,
    pub raw_count: usize,
    pub filtered_count: usize,
    pub truncated: bool,
    pub seeds: Vec<PortSeed>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct StructuredPayload {
    #[serde(default)]
    total_count: usize,
    #[serde(default)]
    filtered_count: usize,
    #[serde(default)]
    truncated: bool,
    #[serde(default)]
    records: Vec<StructuredRow>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct StructuredRow {
    protocol: String,
    local_address: Option<String>,
    local_port: Option<u16>,
    remote_address: Option<String>,
    remote_port: Option<u16>,
    state: Option<String>,
    owning_process: Option<u32>,
}

pub fn powershell_snapshot_script(scope: ScanScope, limit: usize) -> String {
    let include_all = matches!(scope, ScanScope::Full);
    format!(
        r#"$ErrorActionPreference = 'Stop'
$includeAll = ${include_all}
$limit = {limit}
$tcpAll = @(Get-NetTCPConnection -ErrorAction Stop)
$udpAll = @()
try {{ $udpAll = @(Get-NetUDPEndpoint -ErrorAction Stop) }} catch {{}}
$tcp = @($tcpAll | Where-Object {{
  $_.OwningProcess -gt 0 -and ($includeAll -or $_.State -in @('Listen','Bound','Established'))
}} | ForEach-Object {{
  [pscustomobject]@{{
    Protocol = 'TCP'; LocalAddress = [string]$_.LocalAddress; LocalPort = [int]$_.LocalPort
    RemoteAddress = [string]$_.RemoteAddress; RemotePort = [int]$_.RemotePort
    State = [string]$_.State; OwningProcess = [int]$_.OwningProcess
  }}
}})
$udp = @($udpAll | Where-Object {{ $_.OwningProcess -gt 0 }} | ForEach-Object {{
  [pscustomobject]@{{
    Protocol = 'UDP'; LocalAddress = [string]$_.LocalAddress; LocalPort = [int]$_.LocalPort
    RemoteAddress = ''; RemotePort = 0; State = 'Bound'; OwningProcess = [int]$_.OwningProcess
  }}
}})
$filtered = @($tcp) + @($udp)
$records = @($filtered | Sort-Object Protocol,LocalAddress,LocalPort,OwningProcess,State -Unique | Select-Object -First $limit)
[pscustomobject]@{{
  SchemaVersion = 1
  TotalCount = $tcpAll.Count + $udpAll.Count
  FilteredCount = $filtered.Count
  Truncated = ($filtered.Count -gt $records.Count)
  Records = @($records)
}} | ConvertTo-Json -Compress -Depth 4
"#,
        include_all = if include_all { "true" } else { "false" },
        limit = limit.clamp(1, DEFAULT_RECORD_LIMIT),
    )
}

pub fn parse_structured_json(
    text: &str,
    scope: ScanScope,
    limit: usize,
) -> Result<ParsedPortSeeds, String> {
    let payload: StructuredPayload = serde_json::from_str(text.trim())
        .map_err(|error| format!("structured port output was invalid JSON: {error}"))?;
    let mut seeds = payload
        .records
        .into_iter()
        .filter_map(|row| {
            let protocol = row.protocol.trim().to_ascii_uppercase();
            let pid = row.owning_process.unwrap_or(0);
            let local_port = row.local_port.unwrap_or(0);
            let state = row.state.unwrap_or_default();
            if !is_supported_protocol(&protocol)
                || local_port == 0
                || !should_include(&protocol, &state, pid, scope)
            {
                return None;
            }
            let remote_address = remote_endpoint(
                row.remote_address.as_deref().unwrap_or_default(),
                row.remote_port.unwrap_or(0),
            );
            Some(PortSeed {
                protocol,
                local_address: normalized_address(row.local_address.as_deref().unwrap_or("*")),
                local_port,
                remote_address,
                state: normalized_state(&state, &row.protocol),
                pid,
            })
        })
        .collect::<Vec<_>>();
    let before_dedupe = seeds.len();
    let filtered_count = payload.filtered_count.max(before_dedupe);
    deduplicate(&mut seeds, scope);
    let limit = limit.clamp(1, DEFAULT_RECORD_LIMIT);
    let truncated = payload.truncated || seeds.len() > limit;
    seeds.truncate(limit);
    Ok(ParsedPortSeeds {
        source: "powershell-json".to_string(),
        raw_count: payload.total_count.max(before_dedupe),
        filtered_count,
        truncated,
        seeds,
    })
}

pub fn parse_netstat(text: &str, scope: ScanScope, limit: usize) -> ParsedPortSeeds {
    let mut raw_count = 0_usize;
    let mut seeds = Vec::new();
    for line in text.lines() {
        let columns = line.split_whitespace().collect::<Vec<_>>();
        if columns.len() < 4 {
            continue;
        }
        let protocol = columns[0].to_ascii_uppercase();
        if !is_supported_protocol(&protocol) {
            continue;
        }
        raw_count += 1;
        let (local, remote, state, pid_text) = if protocol == "TCP" && columns.len() >= 5 {
            (columns[1], columns[2], columns[3], columns[4])
        } else if protocol == "UDP" {
            (columns[1], columns[2], "Bound", columns[3])
        } else {
            continue;
        };
        let Some((local_address, local_port)) = parse_socket(local) else {
            continue;
        };
        let pid = pid_text.parse::<u32>().unwrap_or(0);
        if !should_include(&protocol, state, pid, scope) {
            continue;
        }
        seeds.push(PortSeed {
            protocol: protocol.clone(),
            local_address,
            local_port,
            remote_address: remote.to_string(),
            state: normalized_state(state, &protocol),
            pid,
        });
    }
    deduplicate(&mut seeds, scope);
    let filtered_count = seeds.len();
    let limit = limit.clamp(1, DEFAULT_RECORD_LIMIT);
    let truncated = filtered_count > limit;
    seeds.truncate(limit);
    ParsedPortSeeds {
        source: "netstat".to_string(),
        raw_count,
        filtered_count,
        truncated,
        seeds,
    }
}

pub fn select_snapshot_output(
    netstat_output: Result<&str, String>,
    fallback_output: Result<&str, String>,
    scope: ScanScope,
    limit: usize,
) -> Result<ParsedPortSeeds, String> {
    let netstat_summary = match netstat_output {
        Ok(text) => {
            let parsed = parse_netstat(text, scope, limit);
            if parsed.raw_count > 0 || text.trim().is_empty() {
                return Ok(parsed);
            }
            "netstat returned no parseable records".to_string()
        }
        Err(error) => error,
    };
    match fallback_output {
        Ok(text) => parse_structured_json(text, scope, limit).map_err(|error| {
            bounded_diagnostic(&format!(
                "source=netstat summary={netstat_summary}; source=powershell-json summary={error}"
            ))
        }),
        Err(error) => Err(bounded_diagnostic(&format!(
            "source=netstat summary={netstat_summary}; source=powershell-json summary={error}"
        ))),
    }
}

pub fn bounded_diagnostic(value: &str) -> String {
    let flattened = value
        .replace(['\r', '\n'], " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    let redacted = flattened
        .split_whitespace()
        .map(redact_token)
        .collect::<Vec<_>>()
        .join(" ");
    if redacted.chars().count() <= MAX_DIAGNOSTIC_CHARS {
        redacted
    } else {
        format!(
            "{}... [truncated]",
            redacted
                .chars()
                .take(MAX_DIAGNOSTIC_CHARS)
                .collect::<String>()
        )
    }
}

fn should_include(protocol: &str, state: &str, pid: u32, scope: ScanScope) -> bool {
    if pid == 0 {
        return false;
    }
    if protocol.eq_ignore_ascii_case("UDP") {
        return true;
    }
    if matches!(scope, ScanScope::Full) {
        return true;
    }
    matches!(
        state.trim().to_ascii_lowercase().as_str(),
        "listen" | "listening" | "bound" | "established"
    )
}

fn is_supported_protocol(protocol: &str) -> bool {
    protocol == "TCP" || protocol == "UDP"
}

fn normalized_state(state: &str, protocol: &str) -> String {
    if protocol.eq_ignore_ascii_case("UDP") {
        return "BOUND".to_string();
    }
    match state.trim().to_ascii_lowercase().as_str() {
        "listen" | "listening" => "LISTENING".to_string(),
        "bound" => "BOUND".to_string(),
        "established" => "ESTABLISHED".to_string(),
        other => other.to_ascii_uppercase(),
    }
}

fn normalized_address(value: &str) -> String {
    let value = value.trim();
    if value.is_empty() {
        "*".to_string()
    } else {
        value.to_string()
    }
}

fn remote_endpoint(address: &str, port: u16) -> String {
    let address = normalized_address(address);
    if port == 0 || address == "*" {
        return address;
    }
    if address.contains(':') && !address.starts_with('[') {
        format!("[{address}]:{port}")
    } else {
        format!("{address}:{port}")
    }
}

fn deduplicate(seeds: &mut Vec<PortSeed>, scope: ScanScope) {
    let mut seen = HashSet::new();
    seeds.retain(|seed| {
        let remote = if matches!(scope, ScanScope::Full) {
            seed.remote_address.as_str()
        } else {
            ""
        };
        seen.insert(format!(
            "{}\0{}\0{}\0{}\0{}\0{}",
            seed.protocol, seed.local_address, seed.local_port, seed.pid, seed.state, remote
        ))
    });
}

fn parse_socket(value: &str) -> Option<(String, u16)> {
    let value = value.trim();
    if let Some(address) = value.strip_prefix('[') {
        let (address, port) = address.rsplit_once("]:")?;
        return Some((address.to_string(), port.parse().ok()?));
    }
    let (address, port) = value.rsplit_once(':')?;
    Some((normalized_address(address), port.parse().ok()?))
}

fn redact_token(token: &str) -> String {
    let trimmed = token.trim_matches(|character: char| {
        matches!(character, ',' | ';' | '(' | ')' | '[' | ']' | '"' | '\'')
    });
    if trimmed.parse::<std::net::IpAddr>().is_ok_and(|address| {
        !address.is_loopback() && !address.is_unspecified() && !is_private_address(address)
    }) {
        return token.replace(trimmed, "<public-address>");
    }
    if trimmed.to_ascii_lowercase().starts_with("c:\\users\\") {
        return "<user-path>".to_string();
    }
    token.to_string()
}

fn is_private_address(address: std::net::IpAddr) -> bool {
    match address {
        std::net::IpAddr::V4(value) => value.is_private() || value.is_link_local(),
        std::net::IpAddr::V6(value) => value.is_unique_local() || value.is_unicast_link_local(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recommended_netstat_filters_transient_and_pid_zero_records() {
        let mut fixture = String::new();
        fixture.push_str("TCP 127.0.0.1:8080 0.0.0.0:0 LISTENING 120\n");
        fixture.push_str("TCP [::1]:5173 [::]:0 LISTENING 121\n");
        fixture.push_str("TCP 127.0.0.1:9229 0.0.0.0:0 BOUND 124\n");
        fixture.push_str("UDP 0.0.0.0:5353 *:* 122\n");
        fixture.push_str("TCP 10.0.0.2:5000 1.1.1.1:443 ESTABLISHED 123\n");
        fixture.push_str("TCP 10.0.0.2:5001 1.1.1.1:443 ESTABLISHED 0\n");
        fixture.push_str("TCP malformed partial row\n");
        for index in 0..5_000 {
            fixture.push_str(&format!(
                "TCP 10.0.0.2:{} 93.184.216.34:443 TIME_WAIT 0\n",
                10_000 + (index % 1_000)
            ));
        }
        let parsed = parse_netstat(&fixture, ScanScope::Recommended, DEFAULT_RECORD_LIMIT);
        assert_eq!(parsed.raw_count, 5_007);
        assert_eq!(parsed.seeds.len(), 5);
        assert!(parsed.seeds.iter().all(|item| item.pid > 0));
        assert!(parsed.seeds.iter().all(|item| item.state != "TIME_WAIT"));
        assert!(parsed.seeds.iter().any(|item| item.local_address == "::1"));
    }

    #[test]
    fn full_scope_keeps_active_nonzero_connections_and_deduplicates_exact_rows() {
        let fixture = "TCP 127.0.0.1:8080 1.1.1.1:443 TIME_WAIT 200\nTCP 127.0.0.1:8080 1.1.1.1:443 TIME_WAIT 200\n";
        let parsed = parse_netstat(fixture, ScanScope::Full, DEFAULT_RECORD_LIMIT);
        assert_eq!(parsed.seeds.len(), 1);
        assert_eq!(parsed.seeds[0].state, "TIME_WAIT");
    }

    #[test]
    fn structured_json_tolerates_invalid_rows_and_empty_fields() {
        let fixture = r#"{"TotalCount":5,"Truncated":false,"Records":[{"Protocol":"TCP","LocalAddress":"::1","LocalPort":8080,"RemoteAddress":"","RemotePort":0,"State":"Listen","OwningProcess":42},{"Protocol":"TCP","LocalAddress":"127.0.0.1","LocalPort":0,"State":"Listen","OwningProcess":42},{"Protocol":"TCP","LocalAddress":"127.0.0.1","LocalPort":8081,"State":"TimeWait","OwningProcess":0},{"Protocol":"UDP","LocalAddress":"","LocalPort":5353,"State":"Bound","OwningProcess":43}]}"#;
        let parsed =
            parse_structured_json(fixture, ScanScope::Recommended, DEFAULT_RECORD_LIMIT).unwrap();
        assert_eq!(parsed.raw_count, 5);
        assert_eq!(parsed.seeds.len(), 2);
        assert_eq!(parsed.seeds[0].local_address, "::1");
        assert_eq!(parsed.seeds[1].local_address, "*");
    }

    #[test]
    fn structured_json_preserves_source_counts_and_truncation() {
        let fixture = r#"{"TotalCount":12000,"FilteredCount":4500,"Truncated":true,"Records":[{"Protocol":"TCP","LocalAddress":"127.0.0.1","LocalPort":8080,"RemoteAddress":"","RemotePort":0,"State":"Listen","OwningProcess":42}]}"#;
        let parsed = parse_structured_json(fixture, ScanScope::Recommended, 100).unwrap();
        assert_eq!(parsed.raw_count, 12000);
        assert_eq!(parsed.filtered_count, 4500);
        assert!(parsed.truncated);
        assert_eq!(parsed.seeds.len(), 1);
    }

    #[test]
    fn diagnostics_are_flat_bounded_and_redacted() {
        let value = format!(
            "C:\\Users\\Alice\\project\n{} {}",
            "203.0.113.8 ".repeat(200),
            "tail"
        );
        let bounded = bounded_diagnostic(&value);
        assert!(!bounded.contains("Alice"));
        assert!(!bounded.contains("203.0.113.8"));
        assert!(bounded.contains("<public-address>"));
        assert!(bounded.chars().count() <= MAX_DIAGNOSTIC_CHARS + 15);
    }

    #[test]
    fn powershell_protocol_filters_before_json_serialization() {
        let script = powershell_snapshot_script(ScanScope::Recommended, 500);
        assert!(script.contains("Where-Object"));
        assert!(script.contains("ConvertTo-Json -Compress"));
        assert!(script.contains("Select-Object -First $limit"));
        assert!(script.contains("TotalCount"));
        assert!(script.contains("Truncated"));
    }

    #[test]
    fn timeout_uses_structured_fallback() {
        let fallback = r#"{"TotalCount":1,"FilteredCount":1,"Truncated":false,"Records":[{"Protocol":"TCP","LocalAddress":"127.0.0.1","LocalPort":18765,"RemoteAddress":"","RemotePort":0,"State":"Listen","OwningProcess":4242}]}"#;
        let parsed = select_snapshot_output(
            Err("netstat timed out after 5000 ms".to_string()),
            Ok(fallback),
            ScanScope::Recommended,
            DEFAULT_RECORD_LIMIT,
        )
        .unwrap();
        assert_eq!(parsed.source, "powershell-json");
        assert_eq!(parsed.seeds.len(), 1);
        assert_eq!(parsed.seeds[0].local_port, 18765);
    }

    #[test]
    fn timeout_and_invalid_fallback_return_bounded_error() {
        let error = select_snapshot_output(
            Err("netstat timed out after 5000 ms".to_string()),
            Ok("not-json"),
            ScanScope::Recommended,
            DEFAULT_RECORD_LIMIT,
        )
        .unwrap_err();
        assert!(error.contains("netstat timed out"));
        assert!(error.contains("invalid JSON"));
        assert!(error.chars().count() <= MAX_DIAGNOSTIC_CHARS + 15);
    }
}
