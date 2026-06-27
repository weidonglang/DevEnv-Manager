#![allow(dead_code)]

pub fn confirmation_level_for(risk: &str) -> &'static str {
    match risk {
        "critical" => "triple",
        "high" | "medium" => "double",
        _ => "none",
    }
}

pub fn requires_triple_confirmation(action: &str) -> bool {
    let action = action.to_ascii_lowercase();
    action.contains("diskpart")
        || action.contains("expand")
        || action.contains("delete_empty_adjacent_partition")
        || action.contains("mysql_system_schema")
        || action.contains("service_register")
}
