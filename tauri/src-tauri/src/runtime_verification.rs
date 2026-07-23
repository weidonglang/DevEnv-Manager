use crate::powershell_runner;
use serde::Serialize;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RuntimeVerificationCheck {
    pub id: String,
    pub label: String,
    pub command: String,
    pub expected: String,
    pub actual: String,
    pub status: String,
    pub error: Option<String>,
    pub elapsed_ms: u128,
    pub required: bool,
    pub suggestion: String,
}

#[derive(Debug, Clone)]
pub(crate) struct RuntimeVerificationOutcome {
    pub checks: Vec<RuntimeVerificationCheck>,
    pub fully_usable: bool,
    pub failure_stage: Option<String>,
}

pub(crate) fn verify_installed_runtime(
    kind: &str,
    root: &Path,
    executable: &Path,
    expected_version: &str,
    java_home: Option<&Path>,
) -> RuntimeVerificationOutcome {
    let mut checks = vec![
        file_check(
            "runtime-root",
            "Runtime root exists",
            root,
            true,
            "Reinstall this managed runtime if its root directory is missing.",
        ),
        file_check(
            "primary-executable",
            "Primary executable exists",
            executable,
            true,
            "Reinstall this managed runtime if its primary executable is missing.",
        ),
    ];
    let expected = expected_version
        .split('-')
        .next()
        .unwrap_or(expected_version)
        .trim();
    match kind {
        "jdk" => {
            checks.extend([
                command_check(
                    "java-version",
                    "java -version",
                    root.join("bin/java.exe"),
                    &["-version"],
                    expected,
                    true,
                    30,
                    &[],
                    "Reinstall the JDK if java cannot start or reports another major version.",
                ),
                command_check(
                    "javac-version",
                    "javac -version",
                    root.join("bin/javac.exe"),
                    &["-version"],
                    expected,
                    true,
                    30,
                    &[],
                    "Use a complete JDK rather than a JRE-only installation.",
                ),
                command_check(
                    "jar-help",
                    "jar --help",
                    root.join("bin/jar.exe"),
                    &["--help"],
                    "",
                    true,
                    30,
                    &[],
                    "Use a complete JDK that includes the jar tool.",
                ),
            ]);
        }
        "python" => {
            checks.extend([
                command_check(
                    "python-version",
                    "python --version",
                    executable.to_path_buf(),
                    &["--version"],
                    expected,
                    true,
                    30,
                    &[],
                    "Reinstall Python if the executable reports another version.",
                ),
                command_check(
                    "python-executable",
                    "sys.executable",
                    executable.to_path_buf(),
                    &["-c", "import sys; print(sys.executable)"],
                    &path_text(executable),
                    true,
                    30,
                    &[],
                    "The interpreter must report the executable inside this runtime root.",
                ),
                command_check(
                    "python-pip",
                    "python -m pip --version",
                    executable.to_path_buf(),
                    &["-m", "pip", "--version"],
                    "",
                    true,
                    60,
                    &[],
                    "Run the managed pip repair or reinstall Python.",
                ),
                command_check(
                    "python-venv",
                    "python -m venv --help",
                    executable.to_path_buf(),
                    &["-m", "venv", "--help"],
                    "",
                    true,
                    60,
                    &[],
                    "Reinstall Python with the venv component.",
                ),
                command_check(
                    "python-stdlib",
                    "ssl / sqlite3 / ctypes imports",
                    executable.to_path_buf(),
                    &[
                        "-c",
                        "import ssl, sqlite3, ctypes; print('ssl sqlite3 ctypes ok')",
                    ],
                    "ok",
                    true,
                    30,
                    &[],
                    "The managed Python standard library is incomplete; reinstall it.",
                ),
                file_check(
                    "python-pip-entry",
                    "Scripts\\pip.exe exists",
                    &root.join("Scripts/pip.exe"),
                    true,
                    "Repair pip so the Scripts command entry is recreated.",
                ),
                command_check(
                    "python-tkinter",
                    "tkinter import",
                    executable.to_path_buf(),
                    &["-c", "import tkinter; print('tkinter ok')"],
                    "ok",
                    false,
                    30,
                    &[],
                    "Install optional Tk support only if GUI Python tools need it.",
                ),
            ]);
        }
        "node" => {
            checks.extend([
                command_check(
                    "node-version",
                    "node --version",
                    root.join("node.exe"),
                    &["--version"],
                    expected,
                    true,
                    30,
                    &[],
                    "Reinstall Node.js if the executable reports another major version.",
                ),
                command_check(
                    "npm-version",
                    "npm --version",
                    root.join("npm.cmd"),
                    &["--version"],
                    "",
                    true,
                    30,
                    &[],
                    "Reinstall Node.js if npm is missing.",
                ),
                command_check(
                    "npx-version",
                    "npx --version",
                    root.join("npx.cmd"),
                    &["--version"],
                    "",
                    true,
                    30,
                    &[],
                    "Reinstall Node.js if npx is missing.",
                ),
                optional_command_check(
                    "corepack-version",
                    "corepack --version",
                    root.join("corepack.cmd"),
                    &["--version"],
                    30,
                    "Corepack is optional; enable it only when pnpm or Yarn workflows need it.",
                ),
                command_check(
                    "npm-prefix",
                    "npm config get prefix",
                    root.join("npm.cmd"),
                    &["config", "get", "prefix"],
                    "",
                    true,
                    30,
                    &[],
                    "Configure a writable npm prefix if global package commands cannot be installed.",
                ),
                command_check(
                    "npm-registry",
                    "npm config get registry",
                    root.join("npm.cmd"),
                    &["config", "get", "registry"],
                    "http",
                    true,
                    30,
                    &[],
                    "Configure a valid npm registry URL.",
                ),
            ]);
        }
        "go" => {
            let go = root.join("bin/go.exe");
            checks.extend([
                command_check(
                    "go-version",
                    "go version",
                    go.clone(),
                    &["version"],
                    expected,
                    true,
                    30,
                    &[],
                    "Reinstall Go if the executable reports another version.",
                ),
                command_check(
                    "go-goroot",
                    "go env GOROOT",
                    go.clone(),
                    &["env", "GOROOT"],
                    &path_text(root),
                    true,
                    30,
                    &[],
                    "GOROOT must point to this managed Go runtime.",
                ),
                command_check(
                    "go-gopath",
                    "go env GOPATH",
                    go.clone(),
                    &["env", "GOPATH"],
                    "",
                    true,
                    30,
                    &[],
                    "Configure a writable GOPATH for Go workspaces.",
                ),
                command_check(
                    "go-goproxy",
                    "go env GOPROXY",
                    go.clone(),
                    &["env", "GOPROXY"],
                    "",
                    true,
                    30,
                    &[],
                    "Configure GOPROXY if module downloads are unavailable.",
                ),
                command_check(
                    "go-modcache",
                    "go env GOMODCACHE",
                    go,
                    &["env", "GOMODCACHE"],
                    "",
                    true,
                    30,
                    &[],
                    "Configure a writable module cache.",
                ),
            ]);
        }
        "maven" => {
            let env = java_environment(java_home);
            checks.push(command_check(
                "maven-version",
                "mvn --version",
                root.join("bin/mvn.cmd"),
                &["--version"],
                expected,
                true,
                60,
                &env,
                "Configure a working JDK before using Maven.",
            ));
            if let Some(java_home) = java_home {
                checks.push(output_path_check(
                    "maven-java-home",
                    "Maven Java home",
                    &checks,
                    "maven-version",
                    java_home,
                    true,
                    "Maven must use the same Java home as the selected DevEnv JDK.",
                ));
            }
        }
        "gradle" => {
            let env = java_environment(java_home);
            checks.push(command_check(
                "gradle-version",
                "gradle --version",
                root.join("bin/gradle.bat"),
                &["--version"],
                expected,
                true,
                90,
                &env,
                "Configure a working JDK before using Gradle.",
            ));
            if let Some(java_home) = java_home {
                checks.push(output_path_check(
                    "gradle-java-home",
                    "Gradle JVM",
                    &checks,
                    "gradle-version",
                    java_home,
                    true,
                    "Gradle must use the same Java home as the selected DevEnv JDK.",
                ));
            }
        }
        "rust" | "rustc" => {
            checks.push(command_check(
                "rustc-version",
                "rustc --version",
                executable.to_path_buf(),
                &["--version"],
                known_expected(expected),
                true,
                30,
                &[],
                "Repair or reinstall the Rust toolchain if rustc cannot start.",
            ));
        }
        "cargo" => {
            checks.push(command_check(
                "cargo-version",
                "cargo --version",
                executable.to_path_buf(),
                &["--version"],
                known_expected(expected),
                true,
                30,
                &[],
                "Repair the Rust toolchain if Cargo cannot start.",
            ));
        }
        "rustup" => {
            checks.push(command_check(
                "rustup-version",
                "rustup --version",
                executable.to_path_buf(),
                &["--version"],
                "",
                true,
                30,
                &[],
                "Repair rustup if the toolchain manager cannot start.",
            ));
        }
        "dotnet" => {
            checks.push(command_check(
                "dotnet-info",
                "dotnet --info",
                executable.to_path_buf(),
                &["--info"],
                known_expected(expected),
                true,
                60,
                &[],
                "Repair the .NET SDK if dotnet --info fails.",
            ));
        }
        _ => {}
    }
    let fully_usable = checks
        .iter()
        .filter(|check| check.required)
        .all(|check| check.status == "passed");
    let failure_stage = checks
        .iter()
        .find(|check| check.required && check.status != "passed")
        .map(|check| check.id.clone());
    RuntimeVerificationOutcome {
        checks,
        fully_usable,
        failure_stage,
    }
}

pub(crate) fn condition_check(
    id: &str,
    label: &str,
    expected: impl Into<String>,
    actual: impl Into<String>,
    passed: bool,
    required: bool,
    suggestion: &str,
) -> RuntimeVerificationCheck {
    RuntimeVerificationCheck {
        id: id.to_string(),
        label: label.to_string(),
        command: "environment".to_string(),
        expected: expected.into(),
        actual: actual.into(),
        status: if passed { "passed" } else { "failed" }.to_string(),
        error: (!passed)
            .then(|| "Environment binding does not match the selected runtime.".to_string()),
        elapsed_ms: 0,
        required,
        suggestion: suggestion.to_string(),
    }
}

fn known_expected(expected: &str) -> &str {
    if expected.eq_ignore_ascii_case("unknown")
        || expected.eq_ignore_ascii_case("not available")
        || expected == "-"
    {
        ""
    } else {
        expected
    }
}

fn file_check(
    id: &str,
    label: &str,
    path: &Path,
    required: bool,
    suggestion: &str,
) -> RuntimeVerificationCheck {
    let success = path.is_file() || path.is_dir();
    RuntimeVerificationCheck {
        id: id.to_string(),
        label: label.to_string(),
        command: "filesystem".to_string(),
        expected: "exists".to_string(),
        actual: path_text(path),
        status: if success { "passed" } else { "failed" }.to_string(),
        error: (!success).then(|| "Path does not exist.".to_string()),
        elapsed_ms: 0,
        required,
        suggestion: suggestion.to_string(),
    }
}

#[allow(clippy::too_many_arguments)]
fn command_check(
    id: &str,
    label: &str,
    executable: PathBuf,
    args: &[&str],
    expected: &str,
    required: bool,
    timeout_seconds: u64,
    environment: &[(&str, &str)],
    suggestion: &str,
) -> RuntimeVerificationCheck {
    let command = format!("{} {}", path_text(&executable), args.join(" "))
        .trim()
        .to_string();
    let result = if environment.is_empty() {
        powershell_runner::run_probe_command(&executable, args, timeout_seconds)
    } else {
        powershell_runner::run_probe_command_with_env(
            &executable,
            args,
            timeout_seconds,
            environment,
        )
    };
    match result {
        Ok(output) => {
            let actual = joined_output(&output.stdout, &output.stderr);
            let expected_matches = expected.is_empty() || contains_normalized(&actual, expected);
            let passed = output.success && expected_matches;
            let error = if output.timed_out {
                Some(format!("Timed out after {} ms.", output.elapsed_ms))
            } else if !output.success {
                Some(powershell_runner::native_command_message(&output))
            } else if !expected_matches {
                Some(format!("Expected output to contain {expected}."))
            } else {
                None
            };
            RuntimeVerificationCheck {
                id: id.to_string(),
                label: label.to_string(),
                command,
                expected: expected.to_string(),
                actual,
                status: if passed { "passed" } else { "failed" }.to_string(),
                error,
                elapsed_ms: output.elapsed_ms,
                required,
                suggestion: suggestion.to_string(),
            }
        }
        Err(error) => RuntimeVerificationCheck {
            id: id.to_string(),
            label: label.to_string(),
            command,
            expected: expected.to_string(),
            actual: String::new(),
            status: "failed".to_string(),
            error: Some(error),
            elapsed_ms: 0,
            required,
            suggestion: suggestion.to_string(),
        },
    }
}

fn optional_command_check(
    id: &str,
    label: &str,
    executable: PathBuf,
    args: &[&str],
    timeout_seconds: u64,
    suggestion: &str,
) -> RuntimeVerificationCheck {
    if !executable.is_file() {
        return RuntimeVerificationCheck {
            id: id.to_string(),
            label: label.to_string(),
            command: format!("{} {}", path_text(&executable), args.join(" ")),
            expected: "optional".to_string(),
            actual: "not installed".to_string(),
            status: "skipped".to_string(),
            error: None,
            elapsed_ms: 0,
            required: false,
            suggestion: suggestion.to_string(),
        };
    }
    command_check(
        id,
        label,
        executable,
        args,
        "",
        false,
        timeout_seconds,
        &[],
        suggestion,
    )
}

fn output_path_check(
    id: &str,
    label: &str,
    checks: &[RuntimeVerificationCheck],
    source_id: &str,
    expected_path: &Path,
    required: bool,
    suggestion: &str,
) -> RuntimeVerificationCheck {
    let source = checks.iter().find(|check| check.id == source_id);
    let actual = source.map(|check| check.actual.clone()).unwrap_or_default();
    let success = source.is_some_and(|check| {
        check.status == "passed" && contains_normalized(&check.actual, &path_text(expected_path))
    });
    RuntimeVerificationCheck {
        id: id.to_string(),
        label: label.to_string(),
        command: format!("inspect {source_id} output"),
        expected: path_text(expected_path),
        actual,
        status: if success { "passed" } else { "failed" }.to_string(),
        error: (!success)
            .then(|| "The reported JVM does not match the selected Java home.".to_string()),
        elapsed_ms: 0,
        required,
        suggestion: suggestion.to_string(),
    }
}

fn java_environment(java_home: Option<&Path>) -> Vec<(&str, &str)> {
    java_home
        .and_then(Path::to_str)
        .map(|path| vec![("JAVA_HOME", path)])
        .unwrap_or_default()
}

fn contains_normalized(actual: &str, expected: &str) -> bool {
    let normalize = |value: &str| {
        value
            .replace('/', "\\")
            .replace("\\\\", "\\")
            .trim()
            .to_ascii_lowercase()
    };
    normalize(actual).contains(&normalize(expected))
}

fn joined_output(stdout: &str, stderr: &str) -> String {
    let value = format!("{}\n{}", stdout.trim(), stderr.trim());
    let trimmed = value.trim();
    if trimmed.chars().count() > 4_000 {
        format!("{}...", trimmed.chars().take(4_000).collect::<String>())
    } else {
        trimmed.to_string()
    }
}

fn path_text(path: &Path) -> String {
    path.to_string_lossy().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalized_output_matches_windows_paths_case_insensitively() {
        assert!(contains_normalized(
            r#"Java home: C:/DevEnv/current/jdk"#,
            r#"c:\devenv\current\jdk"#
        ));
    }

    #[test]
    fn missing_optional_command_is_skipped() {
        let check = optional_command_check(
            "optional",
            "optional",
            PathBuf::from("Z:/missing/runtime-tool.exe"),
            &["--version"],
            1,
            "none",
        );
        assert_eq!(check.status, "skipped");
        assert!(!check.required);
    }
}
