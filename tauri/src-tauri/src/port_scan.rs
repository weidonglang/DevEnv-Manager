use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, HashSet};

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

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PortBinding {
    pub local_address: String,
    pub local_endpoint: String,
    pub remote_endpoint: String,
    pub state: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PortEndpointGroup {
    pub protocol: String,
    pub local_port: u16,
    pub state_category: String,
    pub pid: u32,
    pub bindings: Vec<PortBinding>,
    pub binding_count: usize,
    pub remote_connection_count: usize,
    pub source_record_count: usize,
    pub has_ipv4: bool,
    pub has_ipv6: bool,
    pub group_fingerprint: String,
}

#[derive(Debug, Clone)]
pub struct ParsedPortSeeds {
    pub source: String,
    pub source_evidence: Vec<PortSourceEvidence>,
    pub raw_count: usize,
    pub filtered_count: usize,
    pub truncated: bool,
    pub seeds: Vec<PortSeed>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PortSourceEvidence {
    pub source: String,
    pub record_count: usize,
    pub fallback: bool,
    pub conflicts: Vec<String>,
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
                local_address: normalize_address(row.local_address.as_deref().unwrap_or("*")),
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
    let record_count = seeds.len();
    Ok(ParsedPortSeeds {
        source: "powershell-json".to_string(),
        source_evidence: vec![PortSourceEvidence {
            source: "powershell-json".to_string(),
            record_count,
            fallback: true,
            conflicts: Vec::new(),
        }],
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
            remote_address: normalize_endpoint(remote),
            state: normalized_state(state, &protocol),
            pid,
        });
    }
    deduplicate(&mut seeds, scope);
    let filtered_count = seeds.len();
    let limit = limit.clamp(1, DEFAULT_RECORD_LIMIT);
    let truncated = filtered_count > limit;
    seeds.truncate(limit);
    let record_count = seeds.len();
    ParsedPortSeeds {
        source: "netstat".to_string(),
        source_evidence: vec![PortSourceEvidence {
            source: "netstat".to_string(),
            record_count,
            fallback: false,
            conflicts: Vec::new(),
        }],
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
                return Ok(merge_parsed_sources(vec![parsed], scope, limit));
            }
            "netstat returned no parseable records".to_string()
        }
        Err(error) => error,
    };
    match fallback_output {
        Ok(text) => parse_structured_json(text, scope, limit)
            .map(|parsed| merge_parsed_sources(vec![parsed], scope, limit))
            .map_err(|error| {
                bounded_diagnostic(&format!(
                    "source=netstat summary={netstat_summary}; source=powershell-json summary={error}"
                ))
            }),
        Err(error) => Err(bounded_diagnostic(&format!(
            "source=netstat summary={netstat_summary}; source=powershell-json summary={error}"
        ))),
    }
}

pub fn merge_parsed_sources(
    sources: Vec<ParsedPortSeeds>,
    scope: ScanScope,
    limit: usize,
) -> ParsedPortSeeds {
    let mut source_names = BTreeMap::<String, ()>::new();
    let mut raw_count = 0;
    let mut filtered_count = 0;
    let mut truncated = false;
    let mut seeds = Vec::new();
    let mut source_evidence = Vec::new();
    for source in sources {
        source_names.insert(source.source.clone(), ());
        raw_count += source.raw_count;
        filtered_count += source.filtered_count;
        truncated |= source.truncated;
        source_evidence.extend(source.source_evidence);
        seeds.extend(source.seeds);
    }
    let conflicts = endpoint_conflicts(&seeds);
    if !conflicts.is_empty() {
        for evidence in &mut source_evidence {
            evidence.conflicts.extend(conflicts.iter().cloned());
        }
    }
    deduplicate(&mut seeds, scope);
    let limit = limit.clamp(1, DEFAULT_RECORD_LIMIT);
    truncated |= seeds.len() > limit;
    seeds.truncate(limit);
    ParsedPortSeeds {
        source: source_names.into_keys().collect::<Vec<_>>().join("+"),
        source_evidence,
        raw_count,
        filtered_count,
        truncated,
        seeds,
    }
}

fn endpoint_conflicts(seeds: &[PortSeed]) -> Vec<String> {
    let mut observations = BTreeMap::<(String, String, u16, String), HashSet<(u32, String)>>::new();
    for seed in seeds {
        observations
            .entry((
                seed.protocol.to_ascii_uppercase(),
                normalize_address(&seed.local_address),
                seed.local_port,
                normalize_endpoint(&seed.remote_address),
            ))
            .or_default()
            .insert((seed.pid, normalized_state(&seed.state, &seed.protocol)));
    }
    observations
        .into_iter()
        .filter(|(_, values)| values.len() > 1)
        .map(|((protocol, address, port, remote), values)| {
            format!(
                "{protocol} {address}:{port} remote={remote} has conflicting pid/state evidence: {}",
                values
                    .into_iter()
                    .map(|(pid, state)| format!("{pid}/{state}"))
                    .collect::<Vec<_>>()
                    .join(", ")
            )
        })
        .collect()
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

pub fn normalized_state(state: &str, protocol: &str) -> String {
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

pub fn normalize_address(value: &str) -> String {
    let value = value.trim().trim_start_matches('[').trim_end_matches(']');
    if value.is_empty() || value == "*" {
        "*".to_string()
    } else if let Ok(address) = value.parse::<std::net::IpAddr>() {
        address.to_string().to_ascii_lowercase()
    } else {
        value.to_ascii_lowercase()
    }
}

fn remote_endpoint(address: &str, port: u16) -> String {
    let address = normalize_address(address);
    if port == 0 || address == "*" {
        return address;
    }
    if address.contains(':') && !address.starts_with('[') {
        format!("[{address}]:{port}")
    } else {
        format!("{address}:{port}")
    }
}

pub fn normalize_endpoint(value: &str) -> String {
    let value = value.trim();
    if value.is_empty() || value == "*:*" || value == "*" {
        return "*".to_string();
    }
    if let Some((address, port)) = parse_socket(value) {
        return remote_endpoint(&address, port);
    }
    normalize_address(value)
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

pub fn group_seeds(seeds: Vec<PortSeed>) -> Vec<PortEndpointGroup> {
    let mut groups: BTreeMap<(String, u16, u32, String), Vec<PortSeed>> = BTreeMap::new();
    for mut seed in seeds {
        seed.protocol = seed.protocol.trim().to_ascii_uppercase();
        seed.local_address = normalize_address(&seed.local_address);
        seed.remote_address = normalize_endpoint(&seed.remote_address);
        seed.state = normalized_state(&seed.state, &seed.protocol);
        groups
            .entry((
                seed.protocol.clone(),
                seed.local_port,
                seed.pid,
                seed.state.clone(),
            ))
            .or_default()
            .push(seed);
    }

    groups
        .into_iter()
        .map(|((protocol, local_port, pid, state_category), records)| {
            let source_record_count = records.len();
            let mut bindings = records
                .into_iter()
                .map(|record| PortBinding {
                    local_endpoint: format_local_endpoint(&record.local_address, local_port),
                    local_address: record.local_address,
                    remote_endpoint: record.remote_address,
                    state: record.state,
                })
                .collect::<Vec<_>>();
            bindings.sort_by(|left, right| {
                (&left.local_address, &left.remote_endpoint, &left.state).cmp(&(
                    &right.local_address,
                    &right.remote_endpoint,
                    &right.state,
                ))
            });
            bindings.dedup();
            let has_ipv4 = bindings
                .iter()
                .any(|binding| binding.local_address.parse::<std::net::Ipv4Addr>().is_ok());
            let has_ipv6 = bindings
                .iter()
                .any(|binding| binding.local_address.parse::<std::net::Ipv6Addr>().is_ok());
            let remote_connection_count = bindings
                .iter()
                .filter(|binding| binding.remote_endpoint != "*")
                .count();
            let binding_count = bindings.len();
            let group_fingerprint =
                endpoint_group_fingerprint(&protocol, local_port, pid, &state_category, &bindings);
            PortEndpointGroup {
                protocol,
                local_port,
                state_category,
                pid,
                bindings,
                binding_count,
                remote_connection_count,
                source_record_count,
                has_ipv4,
                has_ipv6,
                group_fingerprint,
            }
        })
        .collect()
}

pub fn stable_group_id(group: &PortEndpointGroup, process_start_time: u64) -> String {
    let mut hasher = Sha256::new();
    hasher.update(group.protocol.as_bytes());
    hasher.update(group.local_port.to_le_bytes());
    hasher.update(group.pid.to_le_bytes());
    hasher.update(process_start_time.to_le_bytes());
    hasher.update(group.state_category.as_bytes());
    hasher.update(group.group_fingerprint.as_bytes());
    format!("port-group-{:x}", hasher.finalize())
}

fn endpoint_group_fingerprint(
    protocol: &str,
    local_port: u16,
    pid: u32,
    state: &str,
    bindings: &[PortBinding],
) -> String {
    let mut hasher = Sha256::new();
    hasher.update(protocol.as_bytes());
    hasher.update(local_port.to_le_bytes());
    hasher.update(pid.to_le_bytes());
    hasher.update(state.as_bytes());
    let mut local_addresses = bindings
        .iter()
        .map(|binding| binding.local_address.as_str())
        .collect::<Vec<_>>();
    local_addresses.sort_unstable();
    local_addresses.dedup();
    for local_address in local_addresses {
        hasher.update(b"\0");
        hasher.update(local_address.as_bytes());
    }
    format!("{:x}", hasher.finalize())
}

fn format_local_endpoint(address: &str, port: u16) -> String {
    let address = normalize_address(address);
    if address.contains(':') {
        format!("[{address}]:{port}")
    } else {
        format!("{address}:{port}")
    }
}

fn parse_socket(value: &str) -> Option<(String, u16)> {
    let value = value.trim();
    if let Some(address) = value.strip_prefix('[') {
        let (address, port) = address.rsplit_once("]:")?;
        return Some((normalize_address(address), port.parse().ok()?));
    }
    let (address, port) = value.rsplit_once(':')?;
    let port = if port == "*" { 0 } else { port.parse().ok()? };
    Some((normalize_address(address), port))
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

    #[test]
    fn exact_ipv4_and_ipv6_rows_are_deduplicated_before_grouping() {
        let fixture = "TCP 0.0.0.0:5043 0.0.0.0:0 LISTENING 11116\nTCP 0.0.0.0:5043 0.0.0.0:0 Listen 11116\nTCP [::]:5043 [::]:0 LISTENING 11116\nTCP [::]:5043 [::]:0 LISTENING 11116\n";
        let parsed = parse_netstat(fixture, ScanScope::Recommended, DEFAULT_RECORD_LIMIT);
        assert_eq!(parsed.seeds.len(), 2);
        assert_eq!(parsed.seeds[0].state, "LISTENING");
        assert_eq!(parsed.seeds[1].state, "LISTENING");
    }

    #[test]
    fn ipv4_and_ipv6_bindings_share_one_display_group_without_losing_endpoints() {
        let parsed = parse_netstat(
            "TCP 0.0.0.0:5043 0.0.0.0:0 LISTENING 11116\nTCP [::]:5043 [::]:0 LISTENING 11116\n",
            ScanScope::Recommended,
            DEFAULT_RECORD_LIMIT,
        );
        let groups = group_seeds(parsed.seeds);
        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].binding_count, 2);
        assert!(groups[0].has_ipv4);
        assert!(groups[0].has_ipv6);
        assert_eq!(groups[0].bindings[0].local_endpoint, "0.0.0.0:5043");
        assert_eq!(groups[0].bindings[1].local_endpoint, "[::]:5043");
    }

    #[test]
    fn grouping_keeps_pid_protocol_port_and_state_boundaries() {
        let seeds = vec![
            seed("TCP", "0.0.0.0", 8080, "LISTENING", 10),
            seed("TCP", "::", 8080, "LISTENING", 10),
            seed("TCP", "127.0.0.1", 8081, "LISTENING", 10),
            seed("TCP", "127.0.0.1", 8080, "ESTABLISHED", 10),
            seed("TCP", "127.0.0.1", 8080, "LISTENING", 11),
            seed("UDP", "0.0.0.0", 8080, "BOUND", 10),
        ];
        let groups = group_seeds(seeds);
        assert_eq!(groups.len(), 5);
        assert_eq!(
            groups
                .iter()
                .find(|group| {
                    group.pid == 10
                        && group.local_port == 8080
                        && group.protocol == "TCP"
                        && group.state_category == "LISTENING"
                })
                .unwrap()
                .binding_count,
            2
        );
    }

    #[test]
    fn stable_group_id_changes_for_a_reused_process_instance() {
        let group = group_seeds(vec![seed("TCP", "127.0.0.1", 5173, "LISTENING", 42)]).remove(0);
        assert_eq!(stable_group_id(&group, 100), stable_group_id(&group, 100));
        assert_ne!(stable_group_id(&group, 100), stable_group_id(&group, 101));
    }

    #[test]
    fn full_scope_groups_established_connections_and_counts_remote_endpoints() {
        let mut first = seed("TCP", "127.0.0.1", 50000, "ESTABLISHED", 88);
        first.remote_address = "203.0.113.1:443".to_string();
        let mut second = seed("TCP", "127.0.0.1", 50000, "ESTABLISHED", 88);
        second.remote_address = "203.0.113.2:443".to_string();
        let groups = group_seeds(vec![first, second]);
        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].remote_connection_count, 2);
        assert_eq!(groups[0].binding_count, 2);
    }

    #[test]
    fn netstat_and_powershell_duplicates_merge_by_exact_endpoint_key() {
        let netstat = parse_netstat(
            "TCP 127.0.0.1:5432 0.0.0.0:0 LISTENING 99\n",
            ScanScope::Recommended,
            DEFAULT_RECORD_LIMIT,
        );
        let powershell = parse_structured_json(
            r#"{"TotalCount":1,"FilteredCount":1,"Records":[{"Protocol":"TCP","LocalAddress":"127.0.0.1","LocalPort":5432,"RemoteAddress":"0.0.0.0","RemotePort":0,"State":"Listen","OwningProcess":99}]}"#,
            ScanScope::Recommended,
            DEFAULT_RECORD_LIMIT,
        )
        .unwrap();
        let merged = merge_parsed_sources(
            vec![netstat, powershell],
            ScanScope::Recommended,
            DEFAULT_RECORD_LIMIT,
        );
        assert_eq!(merged.seeds.len(), 1);
        assert_eq!(merged.source, "netstat+powershell-json");
        assert_eq!(merged.source_evidence.len(), 2);
        assert!(merged
            .source_evidence
            .iter()
            .any(|item| item.source == "netstat" && !item.fallback));
        assert!(merged
            .source_evidence
            .iter()
            .any(|item| item.source == "powershell-json" && item.fallback));
        assert!(merged
            .source_evidence
            .iter()
            .all(|item| item.conflicts.is_empty()));
    }

    #[test]
    fn source_merge_preserves_conflicting_owner_evidence() {
        let netstat = parse_netstat(
            "TCP 127.0.0.1:5432 0.0.0.0:0 LISTENING 99\n",
            ScanScope::Recommended,
            DEFAULT_RECORD_LIMIT,
        );
        let powershell = parse_structured_json(
            r#"{"TotalCount":1,"FilteredCount":1,"Records":[{"Protocol":"TCP","LocalAddress":"127.0.0.1","LocalPort":5432,"RemoteAddress":"0.0.0.0","RemotePort":0,"State":"Listen","OwningProcess":100}]}"#,
            ScanScope::Recommended,
            DEFAULT_RECORD_LIMIT,
        )
        .unwrap();
        let merged = merge_parsed_sources(
            vec![netstat, powershell],
            ScanScope::Recommended,
            DEFAULT_RECORD_LIMIT,
        );
        assert_eq!(merged.seeds.len(), 2);
        assert!(merged.source_evidence.iter().all(|item| item
            .conflicts
            .iter()
            .any(|value| value.contains("99/LISTENING") && value.contains("100/LISTENING"))));
    }

    fn seed(protocol: &str, address: &str, port: u16, state: &str, pid: u32) -> PortSeed {
        PortSeed {
            protocol: protocol.to_string(),
            local_address: address.to_string(),
            local_port: port,
            remote_address: "*".to_string(),
            state: state.to_string(),
            pid,
        }
    }
}
