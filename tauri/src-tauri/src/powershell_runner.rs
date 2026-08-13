use serde::{Deserialize, Serialize};
use std::ffi::OsStr;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::thread;
use std::thread::JoinHandle;
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
    pub allow_side_effects: bool,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeCommandResult {
    pub success: bool,
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    pub elapsed_ms: u128,
    pub timed_out: bool,
    pub executable: String,
}

const MAX_CAPTURE_BYTES: usize = 2 * 1024 * 1024;
const TRUNCATION_MARKER: &[u8] = b"\n[output truncated by DevEnv Manager]\n";

fn drain_pipe<R>(mut reader: R) -> JoinHandle<Vec<u8>>
where
    R: Read + Send + 'static,
{
    thread::spawn(move || {
        let mut captured = Vec::new();
        let mut chunk = [0_u8; 8192];
        let mut truncated = false;
        let capture_limit = MAX_CAPTURE_BYTES.saturating_sub(TRUNCATION_MARKER.len());
        while let Ok(read) = reader.read(&mut chunk) {
            if read == 0 {
                break;
            }
            let remaining = capture_limit.saturating_sub(captured.len());
            if remaining > 0 {
                captured.extend_from_slice(&chunk[..read.min(remaining)]);
            }
            truncated |= read > remaining;
        }
        if truncated {
            captured.extend_from_slice(TRUNCATION_MARKER);
        }
        captured
    })
}

fn collected_output(handle: JoinHandle<Vec<u8>>) -> Vec<u8> {
    handle.join().unwrap_or_default()
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
            allow_side_effects: false,
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

pub fn broadcast_environment_change() -> Result<PowerShellResult, String> {
    run_powershell_script(
        r#"
Add-Type -Namespace Win32 -Name Native -MemberDefinition '[DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Auto)] public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam, uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);' | Out-Null
$result = [UIntPtr]::Zero
[Win32.Native]::SendMessageTimeout([IntPtr]0xffff, 0x1a, [UIntPtr]::Zero, 'Environment', 0x2, 5000, [ref]$result) | Out-Null
"#,
        Vec::new(),
        8,
    )
}

pub fn run_powershell(request: PowerShellRequest) -> Result<PowerShellResult, String> {
    let risk = request.risk_level.trim().to_ascii_lowercase();
    if matches!(risk.as_str(), "medium" | "high" | "critical") && !request.allow_side_effects {
        return Err("PowerShell 写入类请求缺少后端副作用授权".to_string());
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
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "无法读取 PowerShell 标准输出".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "无法读取 PowerShell 错误输出".to_string())?;
    let stdout_reader = drain_pipe(stdout);
    let stderr_reader = drain_pipe(stderr);
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
    let status = child
        .wait()
        .map_err(|err| format!("等待 PowerShell 结束失败：{err}"))?;
    let stdout = collected_output(stdout_reader);
    let stderr = collected_output(stderr_reader);
    Ok(PowerShellResult {
        success: status.success() && !timed_out,
        exit_code: status.code(),
        stdout: decode_output(&stdout),
        stderr: decode_output(&stderr),
        elapsed_ms: start.elapsed().as_millis(),
        timed_out,
        executable,
        killed_process_tree,
    })
}

pub fn powershell_executable() -> String {
    // Windows management modules such as Storage and ScheduledTasks are most
    // reliable in the inbox host. Fall back to PowerShell 7 when it is absent.
    for executable in ["powershell.exe", "pwsh.exe"] {
        let probe = run_native_command_with_timeout(
            executable,
            &[
                "-NoLogo",
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "$PSVersionTable.PSVersion.ToString()",
            ],
            3,
        );
        if probe.is_ok_and(|result| result.success) {
            return executable.to_string();
        }
    }
    "powershell.exe".to_string()
}

pub fn run_native_command_with_timeout(
    executable: impl AsRef<OsStr>,
    args: &[&str],
    timeout_seconds: u64,
) -> Result<NativeCommandResult, String> {
    let executable_ref = executable.as_ref();
    let executable_label = executable_ref.to_string_lossy().to_string();
    let mut command = Command::new(executable_ref);
    command.args(args);
    run_configured_command_with_timeout(command, executable_label, timeout_seconds)
}

pub fn run_configured_command_with_timeout(
    mut command: Command,
    executable_label: String,
    timeout_seconds: u64,
) -> Result<NativeCommandResult, String> {
    let timeout_seconds = timeout_seconds.clamp(1, 300);
    hide_command_window(&mut command);
    command.stdout(Stdio::piped()).stderr(Stdio::piped());
    let start = Instant::now();
    let mut child = command
        .spawn()
        .map_err(|err| format!("Failed to start {executable_label}: {err}"))?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| format!("Failed to capture {executable_label} stdout"))?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| format!("Failed to capture {executable_label} stderr"))?;
    let stdout_reader = drain_pipe(stdout);
    let stderr_reader = drain_pipe(stderr);
    let mut timed_out = false;
    loop {
        if child
            .try_wait()
            .map_err(|err| format!("Failed to wait for {executable_label}: {err}"))?
            .is_some()
        {
            break;
        }
        if start.elapsed() >= Duration::from_secs(timeout_seconds) {
            timed_out = true;
            let _ = child.kill();
            break;
        }
        thread::sleep(Duration::from_millis(50));
    }
    let status = child
        .wait()
        .map_err(|err| format!("Failed to wait for {executable_label}: {err}"))?;
    let stdout = collected_output(stdout_reader);
    let stderr = collected_output(stderr_reader);
    Ok(NativeCommandResult {
        success: status.success() && !timed_out,
        exit_code: status.code(),
        stdout: decode_output(&stdout),
        stderr: decode_output(&stderr),
        elapsed_ms: start.elapsed().as_millis(),
        timed_out,
        executable: executable_label,
    })
}

pub fn run_probe_command(
    executable: impl AsRef<OsStr>,
    args: &[&str],
    timeout_seconds: u64,
) -> Result<NativeCommandResult, String> {
    run_native_command_with_timeout(executable, args, timeout_seconds)
}

pub fn native_command_message(result: &NativeCommandResult) -> String {
    let first_line = result
        .stderr
        .lines()
        .chain(result.stdout.lines())
        .map(str::trim)
        .find(|line| !line.is_empty())
        .unwrap_or("");
    if result.timed_out {
        format!("timed out after {} ms", result.elapsed_ms)
    } else if !first_line.is_empty() {
        format!("exit {:?}: {first_line}", result.exit_code)
    } else {
        format!("exit {:?}", result.exit_code)
    }
}

pub fn decode_output(bytes: &[u8]) -> String {
    crate::decode_command_stream(bytes)
}

fn kill_process_tree(pid: u32) -> bool {
    let pid = pid.to_string();
    run_native_command_with_timeout("taskkill", &["/PID", &pid, "/T", "/F"], 5)
        .is_ok_and(|result| result.success)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_utf16le_output() {
        let bytes = [b'h', 0, b'i', 0, 0x0a, 0];
        assert_eq!(decode_output(&bytes), "hi\n");
    }

    #[test]
    #[cfg(windows)]
    fn decodes_windows_ansi_output() {
        let bytes = [190, 220, 190, 248, 183, 195, 206, 202];
        assert_eq!(decode_output(&bytes), "拒绝访问");
    }

    #[test]
    fn high_risk_request_requires_internal_side_effect_authorization() {
        let request = PowerShellRequest {
            script: "Write-Output ok".to_string(),
            args: Vec::new(),
            cwd: None,
            timeout_seconds: 1,
            risk_level: "high".to_string(),
            requires_admin: false,
            allow_network: false,
            allow_side_effects: false,
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

    #[test]
    #[cfg(windows)]
    fn configured_native_command_honors_timeout() {
        let mut command = Command::new("powershell.exe");
        command.args([
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "Start-Sleep -Seconds 3",
        ]);
        let result =
            run_configured_command_with_timeout(command, "powershell.exe".to_string(), 1).unwrap();
        assert!(result.timed_out);
        assert!(!result.success);
    }

    #[test]
    #[cfg(windows)]
    fn configured_native_command_drains_large_output_while_running() {
        let mut command = Command::new("powershell.exe");
        command.args([
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "$value = 'x' * 200000; [Console]::Out.Write($value)",
        ]);
        let result =
            run_configured_command_with_timeout(command, "powershell.exe".to_string(), 5).unwrap();
        assert!(result.success);
        assert!(!result.timed_out);
        assert_eq!(result.stdout.len(), 200000);
    }

    #[test]
    fn captured_output_is_bounded_and_marks_truncation() {
        let reader = std::io::Cursor::new(vec![b'x'; MAX_CAPTURE_BYTES + 4096]);
        let output = collected_output(drain_pipe(reader));
        assert!(output.len() <= MAX_CAPTURE_BYTES);
        assert!(output.ends_with(TRUNCATION_MARKER));
    }
}
