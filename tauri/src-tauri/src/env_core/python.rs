use super::resolver::classify_source;
use super::snapshot::{PythonEnvReliability, RuntimeCandidate, ToolProbe};
use super::*;

pub fn inspect_python_reliability(
    managed_root: &Path,
    user: &HashMap<String, String>,
    process: &HashMap<String, String>,
) -> PythonEnvReliability {
    let user_path = user
        .get("Path")
        .or_else(|| user.get("PATH"))
        .cloned()
        .unwrap_or_default();
    let process_path = process
        .get("Path")
        .or_else(|| process.get("PATH"))
        .cloned()
        .unwrap_or_default();
    let python_path = find_in_path("python", &user_path, user, managed_root);
    let pip_path = find_in_path("pip", &user_path, user, managed_root);
    let current_python = python_path.as_deref().map(|path| ToolProbe {
        path: Some(display_path(path)),
        version: run_command(path, &["--version"]),
        source: classify_source(path, managed_root),
    });
    let current_pip = pip_path.as_deref().map(|path| ToolProbe {
        path: Some(display_path(path)),
        version: run_command(path, &["--version"]),
        source: classify_source(path, managed_root),
    });
    let python_m_pip = python_path
        .as_deref()
        .map(|path| run_command(path, &["-m", "pip", "--version"]))
        .unwrap_or_default();
    let pip_version = pip_path
        .as_deref()
        .map(|path| run_command(path, &["--version"]))
        .unwrap_or_default();
    let pip_matches_python = !python_m_pip.is_empty()
        && !pip_version.is_empty()
        && same_pip_owner(&python_m_pip, &pip_version);
    let py_launcher_output = hidden_command("py")
        .arg("-0p")
        .output()
        .ok()
        .map(|output| command_text(&output.stdout, &output.stderr))
        .unwrap_or_default();
    let discovered_pythons = all_in_path("python", &user_path, user, managed_root)
        .into_iter()
        .map(|path| RuntimeCandidate {
            version: run_command(&path, &["--version"]),
            source: classify_source(&path, managed_root),
            path: display_path(path),
        })
        .collect::<Vec<_>>();
    let discovered_pips = all_in_path("pip", &user_path, user, managed_root)
        .into_iter()
        .map(|path| RuntimeCandidate {
            version: run_command(&path, &["--version"]),
            source: classify_source(&path, managed_root),
            path: display_path(path),
        })
        .collect::<Vec<_>>();
    let store_alias_risk = discovered_pythons
        .iter()
        .any(|item| item.path.to_ascii_lowercase().contains("\\windowsapps"))
        || process_path.to_ascii_lowercase().contains("\\windowsapps");
    let user_path_effective = path_key(&user_path) == path_key(&process_path);
    let mut conflicts = Vec::new();
    if discovered_pythons.len() > 1 {
        conflicts.push(format!(
            "发现 {} 个 Python，命令命中取决于 PATH 顺序。",
            discovered_pythons.len()
        ));
    }
    if discovered_pips.len() > 1 {
        conflicts.push(format!(
            "发现 {} 个 pip，pip.exe 可能不属于当前 python.exe。",
            discovered_pips.len()
        ));
    }
    if !pip_matches_python {
        conflicts.push(
            "pip 与当前 python -m pip 不一致，或当前 Python 缺少 pip。建议使用 python -m pip。"
                .to_string(),
        );
    }
    if store_alias_risk {
        conflicts.push("Microsoft Store Python Alias 可能抢占 python 命令。".to_string());
    }
    if !user_path_effective {
        conflicts.push(
            "当前 DevEnv Manager 进程 PATH 与用户 PATH 不一致；请重启终端或 IDE 后验证。"
                .to_string(),
        );
    }
    let suggestions = vec![
        "优先使用 python -m pip，避免 pip.exe 与 Python 版本不一致。".to_string(),
        "本程序不会自动关闭 Microsoft Store Alias，只会提示你打开系统设置手动处理。".to_string(),
    ];
    PythonEnvReliability {
        current_python,
        current_pip,
        py_launcher_output,
        discovered_pythons,
        discovered_pips,
        store_alias_risk,
        pip_matches_python,
        user_path_effective,
        conflicts,
        suggestions,
    }
}

fn same_pip_owner(python_m_pip: &str, pip_version: &str) -> bool {
    fn owner(text: &str) -> String {
        text.replace('/', "\\")
            .split_whitespace()
            .find(|part| part.to_ascii_lowercase().contains("site-packages"))
            .unwrap_or("")
            .to_ascii_lowercase()
    }
    let a = owner(python_m_pip);
    let b = owner(pip_version);
    !a.is_empty() && a == b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_pip_owner_mismatch() {
        assert!(same_pip_owner(
            r"pip 24 from C:\Py311\Lib\site-packages\pip",
            r"pip 24 from C:\Py311\Lib\site-packages\pip"
        ));
        assert!(!same_pip_owner(
            r"pip 24 from C:\Py311\Lib\site-packages\pip",
            r"pip 24 from C:\Py312\Lib\site-packages\pip"
        ));
    }
}
