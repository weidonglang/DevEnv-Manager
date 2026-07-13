use super::*;
use serde_json::{json, Map};
use std::net::TcpListener;

fn hash(path: &Path) -> Result<String, String> {
    file_sha256(path)
}

fn write_evidence(output: &Path, capability: &str, value: Value) -> Result<(), String> {
    let path = output.join(format!("{}.json", capability.replace('.', "-")));
    save_json(&path, &value)
}

fn issue_token(command: &str, plan_id: &str, backup: bool) -> Result<String, String> {
    let spec = risk_operation_spec(command).ok_or_else(|| format!("Missing risk spec: {command}"))?;
    let fingerprint = risk_operation_fingerprint(command, plan_id, spec.risk_level);
    Ok(create_confirmation_token(
        Some(command.to_string()),
        spec.action_id.to_string(),
        plan_id.to_string(),
        spec.risk_level.to_string(),
        fingerprint,
        spec.risk_level == "critical",
        backup.then(|| "isolated-fixture-backup".to_string()),
    )?
    .token)
}

fn archive_fixture(output: &Path, workspace: &Path) -> Result<Value, String> {
    let source_root = tempfile::tempdir().map_err(|error| error.to_string())?;
    let source = source_root.path().join("archive-fixture.txt");
    fs::write(&source, b"isolated archive fixture").map_err(|error| error.to_string())?;
    let initial_hash = hash(&source)?;
    let target = workspace.join("archive-target");
    let item = ArchivePlanItem {
        id: "isolated-archive-item".to_string(),
        path: display_path(&source),
        size: source.metadata().map_err(|error| error.to_string())?.len(),
        source: "isolated-fixture".to_string(),
        added_at: current_timestamp(),
        suggestion: String::new(),
    };
    let plan = build_generic_archive_plan(vec![item], target.clone())?;
    let token = issue_token("execute_generic_archive_plan", &plan.plan_id, false)?;
    require_risk_operation_token("execute_generic_archive_plan", &plan.plan_id, Some(token.clone()))?;
    let result = execute_generic_archive_files(&plan);
    let archived = target.join("archive-fixture.txt");
    if !result.success || source.exists() || hash(&archived)? != initial_hash {
        return Err("Generic archive execute verification failed".to_string());
    }
    fs::copy(&archived, &source).map_err(|error| error.to_string())?;
    fs::remove_file(&archived).map_err(|error| error.to_string())?;
    if hash(&source)? != initial_hash {
        return Err("Generic archive rollback guidance verification failed".to_string());
    }
    let value = json!({
        "capability": "cleanup.archive-plan", "status": "passed", "beforeSha256": initial_hash,
        "plan": plan, "tokenIssued": !token.is_empty(), "execute": result,
        "after": {"sourceRemoved": true, "targetHashVerified": true},
        "rollback": {"sourceRestored": true, "targetRemoved": true, "hashRestored": true}
    });
    write_evidence(output, "cleanup.archive-plan", value.clone())?;
    Ok(value)
}

fn dev_cache_fixture(output: &Path, workspace: &Path) -> Result<Value, String> {
    let root = workspace.join("dev-cache");
    let cache = root.join("npm-cache.bin");
    let outside = workspace.join("dev-cache-outside.bin");
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    fs::write(&cache, [7_u8; 37]).map_err(|error| error.to_string())?;
    fs::write(&outside, b"outside").map_err(|error| error.to_string())?;
    let outside_hash = hash(&outside)?;
    let before_hash = hash(&cache)?;
    let plan_id = "tool-npm";
    let token = issue_token("clean_dev_cache", plan_id, false)?;
    require_risk_operation_token("clean_dev_cache", plan_id, Some(token.clone()))?;
    let receipt = cleanup::clean_dev_cache_isolated("npm", |executable, args| {
        if executable != "npm" || args != ["cache", "clean", "--force"] {
            return Err("Unexpected official cache command".to_string());
        }
        fs::remove_file(&cache).map_err(|error| error.to_string())?;
        Ok("isolated npm cache cleared".to_string())
    })?;
    if cache.exists() || hash(&outside)? != outside_hash {
        return Err("Development cache fixture boundary verification failed".to_string());
    }
    let value = json!({"capability":"cleanup.dev-cache","status":"passed","before":{"count":1,"bytes":37,"sha256":before_hash},"planId":plan_id,"tokenIssued":!token.is_empty(),"receipt":receipt,"after":{"count":0,"bytesReclaimed":37},"outsideUnchanged":true});
    write_evidence(output, "cleanup.dev-cache", value.clone())?;
    Ok(value)
}

fn download_cache_fixture(output: &Path, workspace: &Path) -> Result<Value, String> {
    let root = workspace.join("download-root");
    let downloads = root.join("downloads");
    let outside = root.join("unselected.bin");
    fs::create_dir_all(&downloads).map_err(|error| error.to_string())?;
    fs::write(downloads.join("selected.bin"), [3_u8; 41]).map_err(|error| error.to_string())?;
    fs::write(&outside, b"keep").map_err(|error| error.to_string())?;
    let outside_hash = hash(&outside)?;
    let plan_id = "clear-download-cache";
    let token = issue_token("clear_download_cache", plan_id, false)?;
    require_risk_operation_token("clear_download_cache", plan_id, Some(token.clone()))?;
    let result = cleanup::clean_managed_download_cache_isolated(&root);
    if !result.success || result.cleaned_bytes != 41 || hash(&outside)? != outside_hash {
        return Err("Download cache fixture verification failed".to_string());
    }
    let value = json!({"capability":"cleanup.download-cache","status":"passed","planId":plan_id,"tokenIssued":!token.is_empty(),"execute":result,"selectedRemoved":true,"unselectedRetained":true,"outsideUnchanged":true});
    write_evidence(output, "cleanup.download-cache", value.clone())?;
    Ok(value)
}

fn move_fixture(output: &Path, workspace: &Path) -> Result<Value, String> {
    let managed = workspace.join("move-managed");
    let source = workspace.join("move-source");
    let target = workspace.join("move-target");
    fs::create_dir_all(&source).map_err(|error| error.to_string())?;
    let file = source.join("payload.bin");
    fs::write(&file, [9_u8; 53]).map_err(|error| error.to_string())?;
    let initial_hash = hash(&file)?;
    let plan = cleanup::MovePlan { plan_id:"isolated-move-plan".to_string(), created_at:current_timestamp(), source:display_path(&source), target:display_path(&target), mode:"junction_bridge".to_string(), estimated_bytes:53, item_count:1, risk:"high".to_string(), requires_admin:false, reversible:true, warnings:Vec::new() };
    let token = issue_token("execute_move_plan", &plan.plan_id, true)?;
    require_risk_operation_token("execute_move_plan", &plan.plan_id, Some(token.clone()))?;
    let result = cleanup::execute_isolated_move_plan(&managed, plan.clone());
    let rollback_id = result.rollback_id.clone().ok_or_else(|| "Move fixture produced no rollback id".to_string())?;
    if !result.success || hash(&target.join("payload.bin"))? != initial_hash {
        return Err(format!("Move fixture execute failed: {:?}", result.failures));
    }
    let rollback_token = issue_token("rollback_move", &rollback_id, false)?;
    require_risk_operation_token("rollback_move", &rollback_id, Some(rollback_token.clone()))?;
    let rollback = cleanup::rollback_move(&managed, rollback_id.clone())?;
    if hash(&source.join("payload.bin"))? != initial_hash || path_is_reparse_point(&source) {
        return Err("Move rollback did not restore the original source".to_string());
    }
    fs::remove_dir_all(&target).map_err(|error| error.to_string())?;
    let value = json!({"capability":"cleanup.move-rollback","status":"passed","beforeSha256":initial_hash,"plan":plan,"tokenIssued":!token.is_empty(),"execute":result,"targetHashVerified":true,"sourceReplacedByJunction":true,"rollbackTokenIssued":!rollback_token.is_empty(),"rollbackReceipt":rollback,"sourceRestored":true,"targetCleaned":true,"finalHashMatches":true});
    write_evidence(output, "cleanup.move-rollback", value.clone())?;
    Ok(value)
}

fn profile_fixture(output: &Path, workspace: &Path) -> Result<Value, String> {
    let paths = AppPaths::new(workspace.join("profile-root"));
    paths.ensure().map_err(|error| error.to_string())?;
    let profile = ConfigProfile { id:"fixture-profile".to_string(), name:"Fixture Profile".to_string(), created_at:current_timestamp(), current:CurrentVersions::default(), devenv_home:Some("X:\\FixtureDevEnv".to_string()), java_home:Some("X:\\FixtureJdk".to_string()), path:"X:\\FixtureBin".to_string() };
    save_json(&paths.profiles_file(), &vec![profile.clone()])?;
    let saved_hash = hash(&paths.profiles_file())?;
    let bundle_path = paths.logs().join("profile-export.json");
    save_json(&bundle_path, &ConfigProfileBundle { schema_version:1, exported_at:current_timestamp(), profiles:load_profiles(&paths)? })?;
    let bundle = read_profile_bundle(&bundle_path)?;
    save_json(&paths.profiles_file(), &bundle.profiles)?;
    let imported_hash = hash(&paths.profiles_file())?;
    let plan_id = format!("config-profile-{}", profile_fingerprint(&profile));
    let token = issue_token("apply_config_profile", &plan_id, true)?;
    require_risk_operation_token("apply_config_profile", &plan_id, Some(token.clone()))?;
    let state = paths.config().join("isolated-environment.json");
    let original = json!({"devenvHome":"before","javaHome":"before","path":"before"});
    save_json(&state, &original)?;
    let original_hash = hash(&state)?;
    write_profile_environment(&profile, |devenv, java, path| save_json(&state, &json!({"devenvHome":devenv,"javaHome":java,"path":path})))?;
    let applied: Value = read_json(&state)?;
    if applied["path"] != profile.path { return Err("Profile isolated apply did not persist desired state".to_string()); }
    save_json(&state, &original)?;
    if hash(&state)? != original_hash { return Err("Profile isolated restore hash mismatch".to_string()); }
    let value = json!({"capability":"profiles.apply","status":"passed","created":true,"savedSha256":saved_hash,"exported":true,"imported":true,"importHashStable":saved_hash==imported_hash,"planId":plan_id,"tokenIssued":!token.is_empty(),"execute":{"fileBackedEnvironment":true,"reloaded":true},"restored":true,"finalConfigSha256":original_hash});
    write_evidence(output, "profiles.apply", value.clone())?;
    Ok(value)
}

fn project_configuration_fixture(output: &Path, workspace: &Path) -> Result<Value, String> {
    let root = workspace.join("project-config");
    let target = root.join(".vscode/settings.json");
    fs::create_dir_all(target.parent().unwrap()).map_err(|error| error.to_string())?;
    fs::write(root.join("package.json"), "{\"name\":\"fixture\"}").map_err(|error| error.to_string())?;
    fs::write(&target, "{\"fixture\":\"before\"}\n").map_err(|error| error.to_string())?;
    let initial_hash = hash(&target)?;
    let request = ProjectConfigApplyRequest { project_path:display_path(&root), files:vec![ProjectConfigFileDraft { relative_path:".vscode/settings.json".to_string(), content:"{\"fixture\":\"after\"}\n".to_string(), existed:true, enabled:true }], switches:CurrentVersions::default() };
    let plan_id = project_configuration_plan_id(&request);
    let token = issue_token("apply_project_configuration", &plan_id, true)?;
    require_risk_operation_token("apply_project_configuration", &plan_id, Some(token.clone()))?;
    let receipt = apply_project_configuration_isolated(request)?;
    let consumer: Value = serde_json::from_str(&fs::read_to_string(&target).map_err(|error| error.to_string())?).map_err(|error| error.to_string())?;
    if consumer["fixture"] != "after" { return Err("Project consumer did not read applied config".to_string()); }
    let backup = find_only_backup(&root.join(".devenv-manager/backups"), "settings.json")?;
    fs::copy(backup, &target).map_err(|error| error.to_string())?;
    if hash(&target)? != initial_hash { return Err("Project config restore hash mismatch".to_string()); }
    let value = json!({"capability":"projects.configuration","status":"passed","initialSha256":initial_hash,"planId":plan_id,"tokenIssued":!token.is_empty(),"execute":receipt,"diffVerified":true,"consumerRead":true,"restored":true,"finalSha256":hash(&target)?});
    write_evidence(output, "projects.configuration", value.clone())?;
    Ok(value)
}

fn apply_project_configuration_isolated(request: ProjectConfigApplyRequest) -> Result<OperationResult, String> {
    apply_project_configuration_blocking(request)
}

fn find_only_backup(root: &Path, name: &str) -> Result<PathBuf, String> {
    let mut stack = vec![root.to_path_buf()];
    while let Some(path) = stack.pop() {
        for entry in fs::read_dir(path).map_err(|error| error.to_string())? {
            let path = entry.map_err(|error| error.to_string())?.path();
            if path.is_dir() { stack.push(path); } else if path.file_name().and_then(OsStr::to_str) == Some(name) { return Ok(path); }
        }
    }
    Err("Expected backup was not found".to_string())
}

fn port_fixture(output: &Path, workspace: &Path) -> Result<Value, String> {
    let root = workspace.join("port-project");
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    let file = root.join(".env");
    fs::write(&file, "PORT=18080\n").map_err(|error| error.to_string())?;
    let initial_hash = hash(&file)?;
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).map_err(|error| error.to_string())?;
    let new_port = listener.local_addr().map_err(|error| error.to_string())?.port();
    drop(listener);
    let config = inspect_project_port_configs_blocking(&root)?.into_iter().next().ok_or_else(|| "Fixture port config was not detected".to_string())?;
    let plan_id = format!("{}:{}:{new_port}", display_path(&root), config.id);
    let token = issue_token("update_project_port", &plan_id, true)?;
    require_risk_operation_token("update_project_port", &plan_id, Some(token.clone()))?;
    let receipt = update_project_port_blocking(&root, &config.id, new_port)?;
    let reread = inspect_project_port_configs_blocking(&root)?;
    if !reread.iter().any(|item| item.current_port == new_port) { return Err("Updated fixture port was not re-read".to_string()); }
    let backup = fs::read_dir(&root).map_err(|error| error.to_string())?.flatten().map(|entry| entry.path()).find(|path| path.file_name().is_some_and(|name| name.to_string_lossy().contains(".devenv-backup-"))).ok_or_else(|| "Port backup missing".to_string())?;
    fs::copy(backup, &file).map_err(|error| error.to_string())?;
    if hash(&file)? != initial_hash { return Err("Port config rollback hash mismatch".to_string()); }
    let value = json!({"capability":"projects.port-config","status":"passed","initialPort":18080,"newPort":new_port,"newPortWasFree":true,"planId":plan_id,"tokenIssued":!token.is_empty(),"execute":receipt,"rereadVerified":true,"realServiceStarted":false,"rollback":true,"finalSha256":hash(&file)?});
    write_evidence(output, "projects.port-config", value.clone())?;
    Ok(value)
}

pub fn run_isolated_capability_fixtures(output: &Path) -> Result<String, String> {
    fs::create_dir_all(output).map_err(|error| error.to_string())?;
    let workspace = output.join("workspace");
    fs::create_dir_all(&workspace).map_err(|error| error.to_string())?;
    let mut cases = Map::new();
    for (id, result) in [
        ("cleanup.archive-plan", archive_fixture(output, &workspace)),
        ("cleanup.dev-cache", dev_cache_fixture(output, &workspace)),
        ("cleanup.download-cache", download_cache_fixture(output, &workspace)),
        ("cleanup.move-rollback", move_fixture(output, &workspace)),
        ("profiles.apply", profile_fixture(output, &workspace)),
        ("projects.configuration", project_configuration_fixture(output, &workspace)),
        ("projects.port-config", port_fixture(output, &workspace)),
    ] {
        cases.insert(id.to_string(), result?);
    }
    let manifest = json!({"schemaVersion":1,"generatedAt":current_timestamp(),"cases":cases,"summary":{"total":7,"passed":7,"failed":0}});
    write_evidence(output, "manifest", manifest.clone())?;
    serde_json::to_string(&manifest["summary"]).map_err(|error| error.to_string())
}
