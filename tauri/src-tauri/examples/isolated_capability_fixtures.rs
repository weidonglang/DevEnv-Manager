use std::path::PathBuf;

fn main() {
    let mut args = std::env::args_os().skip(1);
    let output = args.next().map(PathBuf::from).unwrap_or_else(|| {
        eprintln!("usage: isolated-capability-fixtures <evidence-directory>");
        std::process::exit(2);
    });
    match dailytools_tauri_lib::run_isolated_capability_fixtures(&output) {
        Ok(summary) => println!("{summary}"),
        Err(error) => {
            eprintln!("isolated capability fixtures failed: {error}");
            std::process::exit(1);
        }
    }
}
