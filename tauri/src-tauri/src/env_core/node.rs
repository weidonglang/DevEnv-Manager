use super::snapshot::NodeEnvReliability;
use super::*;

pub fn inspect_node_reliability(
    managed_root: &Path,
    user: &HashMap<String, String>,
) -> NodeEnvReliability {
    let path_value = user
        .get("Path")
        .or_else(|| user.get("PATH"))
        .cloned()
        .unwrap_or_default();
    let node = find_in_path("node", &path_value, user, managed_root);
    let npm = find_in_path("npm", &path_value, user, managed_root);
    let npx = find_in_path("npx", &path_value, user, managed_root);
    let corepack = find_in_path("corepack", &path_value, user, managed_root);
    let pnpm = find_in_path("pnpm", &path_value, user, managed_root);
    let mut suggestions = Vec::new();
    if node.is_none() {
        suggestions
            .push("未发现 node；如使用受管 Node，请先配置用户 PATH 并重新打开终端。".to_string());
    }
    NodeEnvReliability {
        node_path: node.as_deref().map(display_path),
        node_version: node
            .as_deref()
            .map(|path| run_command(path, &["-v"]))
            .unwrap_or_default(),
        npm_path: npm.as_deref().map(display_path),
        npm_version: npm
            .as_deref()
            .map(|path| run_command(path, &["-v"]))
            .unwrap_or_default(),
        npx_path: npx.as_deref().map(display_path),
        corepack_status: corepack
            .as_deref()
            .map(|path| run_command(path, &["--version"]))
            .unwrap_or_default(),
        npm_prefix: npm
            .as_deref()
            .map(|path| run_command(path, &["config", "get", "prefix"]))
            .unwrap_or_default(),
        npm_registry: npm
            .as_deref()
            .map(|path| run_command(path, &["config", "get", "registry"]))
            .unwrap_or_default(),
        pnpm_store: pnpm
            .as_deref()
            .map(|path| run_command(path, &["store", "path"]))
            .unwrap_or_default(),
        conflicts: Vec::new(),
        suggestions,
    }
}
