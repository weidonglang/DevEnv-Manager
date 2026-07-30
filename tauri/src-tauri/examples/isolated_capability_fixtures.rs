use std::path::PathBuf;

fn main() {
    let mut args = std::env::args_os().skip(1);
    let first = args.next().unwrap_or_else(|| {
        eprintln!("usage: isolated-capability-fixtures <evidence-directory>");
        std::process::exit(2);
    });
    if first == "--version" {
        println!("v22.0.0");
        return;
    }
    if first == "-p" {
        match args
            .next()
            .and_then(|value| value.into_string().ok())
            .as_deref()
        {
            Some("process.execPath") => {
                println!(
                    "{}",
                    std::env::current_exe()
                        .map(|path| path.display().to_string())
                        .unwrap_or_default()
                );
                return;
            }
            Some("process.version") => {
                println!("v22.0.0");
                return;
            }
            _ => {
                eprintln!("unsupported fixture expression");
                std::process::exit(2);
            }
        }
    }
    let output = PathBuf::from(first);
    if !output.is_absolute() {
        eprintln!("evidence directory must be absolute");
        std::process::exit(2);
    }
    match dailytools_tauri_lib::run_isolated_capability_fixtures(&output) {
        Ok(summary) => println!("{summary}"),
        Err(error) => {
            eprintln!("isolated capability fixtures failed: {error}");
            std::process::exit(1);
        }
    }
}
