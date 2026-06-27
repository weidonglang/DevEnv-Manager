use super::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PathRepairPolicy {
    pub preserve_user_entries: bool,
    pub remove_duplicate_entries: bool,
    pub remove_stale_devenv_entries: bool,
    pub move_managed_entries_to_front: bool,
    pub never_remove_unknown_entries: bool,
}

impl Default for PathRepairPolicy {
    fn default() -> Self {
        Self {
            preserve_user_entries: true,
            remove_duplicate_entries: true,
            remove_stale_devenv_entries: true,
            move_managed_entries_to_front: true,
            never_remove_unknown_entries: true,
        }
    }
}

pub(crate) fn is_devenv_managed_entry(raw: &str, expanded: &str, managed_root: &Path) -> bool {
    let raw_key = path_key(raw);
    MANAGED_PATHS.iter().any(|item| path_key(item) == raw_key)
        || path_key(expanded).starts_with(&path_key(&display_path(managed_root)))
}

pub(crate) fn is_stale_devenv_entry(raw: &str, expanded: &str, managed_root: &Path) -> bool {
    let raw_key = path_key(raw);
    let expanded_key = path_key(expanded);
    let current_root = path_key(&display_path(managed_root));
    (raw_key.contains("devenvmanager") || expanded_key.contains("devenvmanager"))
        && !expanded_key.starts_with(&current_root)
}

pub(crate) fn merge_path_with_policy(
    current_path: &str,
    managed_root: &Path,
    envs: &HashMap<String, String>,
    policy: &PathRepairPolicy,
) -> String {
    let mut retained = Vec::new();
    let mut seen = BTreeSet::new();
    if policy.move_managed_entries_to_front {
        for entry in MANAGED_PATHS {
            if seen.insert(path_key(entry)) {
                retained.push(entry.to_string());
            }
        }
    }
    for raw in split_path(current_path) {
        let expanded = expand_env_value(&raw, envs, managed_root);
        let key = path_key(&raw);
        if policy.remove_duplicate_entries && seen.contains(&key) {
            continue;
        }
        if policy.remove_stale_devenv_entries
            && is_stale_devenv_entry(&raw, &expanded, managed_root)
        {
            continue;
        }
        if policy.move_managed_entries_to_front
            && MANAGED_PATHS.iter().any(|item| path_key(item) == key)
        {
            continue;
        }
        seen.insert(key);
        retained.push(raw);
    }
    retained.join(";")
}

pub(crate) fn path_too_long(path: &str) -> bool {
    path.encode_utf16().count() > 30_000
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn path_merge_preserves_unknown_entries() {
        let root = PathBuf::from(r"D:\DevEnvManager");
        let envs = HashMap::from([("DEVENV_HOME".to_string(), display_path(&root))]);
        let merged = merge_path_with_policy(
            r"C:\Tools\bin;%DEVENV_HOME%\current\jdk\bin",
            &root,
            &envs,
            &PathRepairPolicy::default(),
        );
        assert!(merged.contains(r"C:\Tools\bin"));
        assert_eq!(merged.matches(r"%DEVENV_HOME%\current\jdk\bin").count(), 1);
    }

    #[test]
    fn stale_devenv_entries_are_removed() {
        let root = PathBuf::from(r"D:\DevEnvManager");
        let envs = HashMap::new();
        let merged = merge_path_with_policy(
            r"E:\Old\DevEnvManager\current\jdk\bin;C:\Tools",
            &root,
            &envs,
            &PathRepairPolicy::default(),
        );
        assert!(!merged.contains(r"E:\Old\DevEnvManager"));
        assert!(merged.contains(r"C:\Tools"));
    }
}
