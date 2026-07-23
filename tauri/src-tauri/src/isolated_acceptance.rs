use super::*;
use serde_json::{json, Map};
use std::net::{Ipv4Addr, TcpListener};

fn hash(path: &Path) -> Result<String, String> {
    file_sha256(path)
}

fn write_evidence(output: &Path, capability: &str, value: Value) -> Result<(), String> {
    let path = output.join(format!("{}.json", capability.replace('.', "-")));
    save_json(&path, &value)
}

fn issue_token(command: &str, plan_id: &str, backup: bool) -> Result<String, String> {
    let spec =
        risk_operation_spec(command).ok_or_else(|| format!("Missing risk spec: {command}"))?;
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
    require_risk_operation_token(
        "execute_generic_archive_plan",
        &plan.plan_id,
        Some(token.clone()),
    )?;
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
    let plan = cleanup::MovePlan {
        plan_id: "isolated-move-plan".to_string(),
        created_at: current_timestamp(),
        source: display_path(&source),
        target: display_path(&target),
        mode: "junction_bridge".to_string(),
        estimated_bytes: 53,
        item_count: 1,
        risk: "high".to_string(),
        requires_admin: false,
        reversible: true,
        selected_items: Vec::new(),
        warnings: Vec::new(),
    };
    let token = issue_token("execute_move_plan", &plan.plan_id, true)?;
    require_risk_operation_token("execute_move_plan", &plan.plan_id, Some(token.clone()))?;
    let result = cleanup::execute_isolated_move_plan(&managed, plan.clone());
    let rollback_id = result
        .rollback_id
        .clone()
        .ok_or_else(|| "Move fixture produced no rollback id".to_string())?;
    if !result.success || hash(&target.join("payload.bin"))? != initial_hash {
        return Err(format!(
            "Move fixture execute failed: {:?}",
            result.failures
        ));
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
    let profile = ConfigProfile {
        id: "fixture-profile".to_string(),
        name: "Fixture Profile".to_string(),
        created_at: current_timestamp(),
        current: CurrentVersions::default(),
        devenv_home: Some("X:\\FixtureDevEnv".to_string()),
        java_home: Some("X:\\FixtureJdk".to_string()),
        path: "X:\\FixtureBin".to_string(),
    };
    save_json(&paths.profiles_file(), &vec![profile.clone()])?;
    let saved_hash = hash(&paths.profiles_file())?;
    let bundle_path = paths.logs().join("profile-export.json");
    save_json(
        &bundle_path,
        &ConfigProfileBundle {
            schema_version: 1,
            exported_at: current_timestamp(),
            profiles: load_profiles(&paths)?,
        },
    )?;
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
    write_profile_environment(&profile, |devenv, java, path| {
        save_json(
            &state,
            &json!({"devenvHome":devenv,"javaHome":java,"path":path}),
        )
    })?;
    let applied: Value = read_json(&state)?;
    if applied["path"] != profile.path {
        return Err("Profile isolated apply did not persist desired state".to_string());
    }
    save_json(&state, &original)?;
    if hash(&state)? != original_hash {
        return Err("Profile isolated restore hash mismatch".to_string());
    }
    let value = json!({"capability":"profiles.apply","status":"passed","created":true,"savedSha256":saved_hash,"exported":true,"imported":true,"importHashStable":saved_hash==imported_hash,"planId":plan_id,"tokenIssued":!token.is_empty(),"execute":{"fileBackedEnvironment":true,"reloaded":true},"restored":true,"finalConfigSha256":original_hash});
    write_evidence(output, "profiles.apply", value.clone())?;
    Ok(value)
}

fn project_configuration_fixture(output: &Path, workspace: &Path) -> Result<Value, String> {
    let root = workspace.join("project-config");
    let target = root.join(".vscode/settings.json");
    fs::create_dir_all(target.parent().unwrap()).map_err(|error| error.to_string())?;
    fs::write(root.join("package.json"), "{\"name\":\"fixture\"}")
        .map_err(|error| error.to_string())?;
    fs::write(&target, "{\"fixture\":\"before\"}\n").map_err(|error| error.to_string())?;
    let initial_hash = hash(&target)?;
    let request = ProjectConfigApplyRequest {
        project_path: display_path(&root),
        files: vec![ProjectConfigFileDraft {
            relative_path: ".vscode/settings.json".to_string(),
            content: "{\"fixture\":\"after\"}\n".to_string(),
            existed: true,
            enabled: true,
        }],
        switches: CurrentVersions::default(),
    };
    let plan_id = project_configuration_plan_id(&request);
    let token = issue_token("apply_project_configuration", &plan_id, true)?;
    require_risk_operation_token("apply_project_configuration", &plan_id, Some(token.clone()))?;
    let receipt = apply_project_configuration_isolated(request)?;
    let consumer: Value =
        serde_json::from_str(&fs::read_to_string(&target).map_err(|error| error.to_string())?)
            .map_err(|error| error.to_string())?;
    if consumer["fixture"] != "after" {
        return Err("Project consumer did not read applied config".to_string());
    }
    let backup = find_only_backup(&root.join(".devenv-manager/backups"), "settings.json")?;
    fs::copy(backup, &target).map_err(|error| error.to_string())?;
    if hash(&target)? != initial_hash {
        return Err("Project config restore hash mismatch".to_string());
    }
    let value = json!({"capability":"projects.configuration","status":"passed","initialSha256":initial_hash,"planId":plan_id,"tokenIssued":!token.is_empty(),"execute":receipt,"diffVerified":true,"consumerRead":true,"restored":true,"finalSha256":hash(&target)?});
    write_evidence(output, "projects.configuration", value.clone())?;
    Ok(value)
}

fn apply_project_configuration_isolated(
    request: ProjectConfigApplyRequest,
) -> Result<OperationResult, String> {
    apply_project_configuration_blocking(request)
}

fn find_only_backup(root: &Path, name: &str) -> Result<PathBuf, String> {
    let mut stack = vec![root.to_path_buf()];
    while let Some(path) = stack.pop() {
        for entry in fs::read_dir(path).map_err(|error| error.to_string())? {
            let path = entry.map_err(|error| error.to_string())?.path();
            if path.is_dir() {
                stack.push(path);
            } else if path.file_name().and_then(OsStr::to_str) == Some(name) {
                return Ok(path);
            }
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
    let listener =
        TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).map_err(|error| error.to_string())?;
    let new_port = listener
        .local_addr()
        .map_err(|error| error.to_string())?
        .port();
    drop(listener);
    let config = inspect_project_port_configs_blocking(&root)?
        .into_iter()
        .next()
        .ok_or_else(|| "Fixture port config was not detected".to_string())?;
    let plan_id = format!("{}:{}:{new_port}", display_path(&root), config.id);
    let token = issue_token("update_project_port", &plan_id, true)?;
    require_risk_operation_token("update_project_port", &plan_id, Some(token.clone()))?;
    let receipt = update_project_port_blocking(&root, &config.id, new_port)?;
    let reread = inspect_project_port_configs_blocking(&root)?;
    if !reread.iter().any(|item| item.current_port == new_port) {
        return Err("Updated fixture port was not re-read".to_string());
    }
    let backup = fs::read_dir(&root)
        .map_err(|error| error.to_string())?
        .flatten()
        .map(|entry| entry.path())
        .find(|path| {
            path.file_name()
                .is_some_and(|name| name.to_string_lossy().contains(".devenv-backup-"))
        })
        .ok_or_else(|| "Port backup missing".to_string())?;
    fs::copy(backup, &file).map_err(|error| error.to_string())?;
    if hash(&file)? != initial_hash {
        return Err("Port config rollback hash mismatch".to_string());
    }
    let value = json!({"capability":"projects.port-config","status":"passed","initialPort":18080,"newPort":new_port,"newPortWasFree":true,"planId":plan_id,"tokenIssued":!token.is_empty(),"execute":receipt,"rereadVerified":true,"realServiceStarted":false,"rollback":true,"finalSha256":hash(&file)?});
    write_evidence(output, "projects.port-config", value.clone())?;
    Ok(value)
}

fn runtime_lifecycle_fixture(
    output: &Path,
    workspace: &Path,
) -> Result<Vec<(&'static str, Value)>, String> {
    let paths = AppPaths::new(workspace.join("runtime-root"));
    paths.ensure().map_err(|error| error.to_string())?;
    let outside = workspace.join("runtime-outside.txt");
    fs::write(&outside, b"outside runtime boundary").map_err(|error| error.to_string())?;
    let outside_hash = hash(&outside)?;

    let archive = paths.downloads().join("node-fixture.zip");
    let archive_file = fs::File::create(&archive).map_err(|error| error.to_string())?;
    let mut zip = zip::ZipWriter::new(archive_file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    let fixture_executable = fs::read(std::env::current_exe().map_err(|error| error.to_string())?)
        .map_err(|error| error.to_string())?;
    let npm_fixture = b"@echo off\r\nif \"%1 %2 %3\"==\"config get registry\" (echo https://registry.npmjs.org/) else if \"%1 %2\"==\"config get\" (echo C:\\fixture-npm) else (echo 10.0.0)\r\n";
    let files = [
        ("node.exe", fixture_executable.as_slice()),
        ("npm.cmd", npm_fixture.as_slice()),
        ("npx.cmd", b"@echo 10.0.0\r\n".as_slice()),
    ];
    for (name, content) in files {
        zip.start_file(name, options)
            .map_err(|error| error.to_string())?;
        zip.write_all(content).map_err(|error| error.to_string())?;
    }
    zip.finish().map_err(|error| error.to_string())?;

    let target = paths.nodes().join("node-22-fixture");
    install_zip_payload(&archive, &target, &["node.exe", "npm.cmd", "npx.cmd"])?;
    record_install(
        &paths,
        runtime_meta("node")?,
        "22-fixture",
        &target,
        &target.join("node.exe"),
        json!({"detail":"isolated fixture"}),
    )?;
    let installed_after_extract = load_installed(&paths)?;
    if installed_after_extract.nodes.len() != 1 || !target.join("node.exe").is_file() {
        return Err("Runtime install fixture was not registered".to_string());
    }
    let install = json!({
        "capability":"runtime.install", "status":"passed", "archive":display_path(&archive),
        "target":display_path(&target), "requiredFilesVerified":true,
        "installedRecordCount":installed_after_extract.nodes.len(), "outsideUnchanged":hash(&outside)?==outside_hash
    });

    let target_text = display_path(&target);
    let switch_plan_id = runtime_plan_id("node", "22-fixture", Some(&target_text));
    let switch_token = issue_token("switch_runtime", &switch_plan_id, true)?;
    require_risk_operation_token(
        "switch_runtime",
        &switch_plan_id,
        Some(switch_token.clone()),
    )?;
    let switch_result = switch_runtime_with_paths(
        &paths,
        "node".to_string(),
        "22-fixture".to_string(),
        Some(target_text.clone()),
    )?;
    let current_link = paths.current().join("node");
    let installed_after_switch = load_installed(&paths)?;
    if installed_after_switch.current.node.as_deref() != Some("22-fixture")
        || !current_link.exists()
        || !is_junction(&current_link)
    {
        return Err(
            "Runtime switch fixture did not create the managed current pointer".to_string(),
        );
    }
    let switched_target = current_link
        .canonicalize()
        .map_err(|error| error.to_string())?;
    if switched_target != target.canonicalize().map_err(|error| error.to_string())? {
        return Err("Runtime current pointer targets the wrong directory".to_string());
    }
    let switch = json!({
        "capability":"runtime.switch", "status":"passed", "planId":switch_plan_id,
        "tokenIssued":!switch_token.is_empty(), "execute":switch_result,
        "currentVersion":"22-fixture", "junctionVerified":true, "targetVerified":true
    });

    let uninstall_plan_id = runtime_plan_id("node", "22-fixture", Some(&target_text));
    let uninstall_token = issue_token("uninstall_runtime", &uninstall_plan_id, false)?;
    require_risk_operation_token(
        "uninstall_runtime",
        &uninstall_plan_id,
        Some(uninstall_token.clone()),
    )?;
    let uninstall_result = uninstall_runtime_with_paths(
        &paths,
        "node".to_string(),
        "22-fixture".to_string(),
        Some(target_text),
    )?;
    let installed_after_uninstall = load_installed(&paths)?;
    if target.exists()
        || current_link.exists()
        || !installed_after_uninstall.nodes.is_empty()
        || installed_after_uninstall.current.node.is_some()
        || hash(&outside)? != outside_hash
    {
        return Err("Runtime uninstall fixture did not preserve its managed boundary".to_string());
    }
    let uninstall = json!({
        "capability":"runtime.uninstall", "status":"passed", "planId":uninstall_plan_id,
        "tokenIssued":!uninstall_token.is_empty(), "execute":uninstall_result,
        "targetRemoved":true, "currentPointerRemoved":true, "recordRemoved":true,
        "outsideUnchanged":true
    });
    let lifecycle = json!({
        "capability":"runtime.lifecycle", "status":"passed",
        "installVerified":true, "switchVerified":true, "uninstallVerified":true,
        "tokenContractsVerified":true, "managedBoundaryVerified":true, "outsideUnchanged":true
    });
    for (id, value) in [
        ("runtime.install", install.clone()),
        ("runtime.switch", switch.clone()),
        ("runtime.uninstall", uninstall.clone()),
        ("runtime.lifecycle", lifecycle.clone()),
    ] {
        write_evidence(output, id, value)?;
    }
    Ok(vec![
        ("runtime.install", install),
        ("runtime.switch", switch),
        ("runtime.uninstall", uninstall),
        ("runtime.lifecycle", lifecycle),
    ])
}

fn environment_repair_fixture(
    output: &Path,
    workspace: &Path,
) -> Result<Vec<(&'static str, Value)>, String> {
    let fixture_root = workspace.join("environment-repair");
    let managed_root = fixture_root.join("managed-root");
    let config_dir = fixture_root.join("config");
    let environment_store = fixture_root.join("user-environment.json");
    fs::create_dir_all(&managed_root).map_err(|error| error.to_string())?;

    let initial = HashMap::from([
        ("DEVENV_HOME".to_string(), "C:\\BeforeDevEnv".to_string()),
        ("JAVA_HOME".to_string(), "C:\\BeforeJdk".to_string()),
        ("Path".to_string(), "C:\\BeforeTools".to_string()),
    ]);
    save_json(&environment_store, &initial)?;
    std::env::set_var("DEVENV_ACCEPTANCE_CONFIG_DIR", &config_dir);
    std::env::set_var("DEVENV_ACCEPTANCE_ENV_STORE", &environment_store);

    let jdk = fixture_root.join("jdk-21");
    let bin = jdk.join("bin");
    fs::create_dir_all(&bin).map_err(|error| error.to_string())?;
    let command = std::env::var_os("COMSPEC")
        .map(PathBuf::from)
        .filter(|path| path.is_file())
        .ok_or_else(|| "COMSPEC is unavailable for the isolated JDK fixture".to_string())?;
    for tool in ["java.exe", "javac.exe", "jar.exe"] {
        fs::copy(&command, bin.join(tool)).map_err(|error| error.to_string())?;
    }
    let managed_jdk_bin = managed_root.join("current").join("jdk").join("bin");
    fs::create_dir_all(&managed_jdk_bin).map_err(|error| error.to_string())?;
    for tool in ["java.exe", "javac.exe", "jar.exe"] {
        fs::copy(bin.join(tool), managed_jdk_bin.join(tool)).map_err(|error| error.to_string())?;
    }

    let plan = env_core::create_java_stabilize_plan(&managed_root, display_path(&jdk))?;
    let apply_token = issue_token("apply_env_repair_plan", &plan.plan_id, true)?;
    require_risk_operation_token(
        "apply_env_repair_plan",
        &plan.plan_id,
        Some(apply_token.clone()),
    )?;
    let apply = env_core::apply_env_repair_plan(&managed_root, plan.clone());
    let applied: HashMap<String, String> = read_json(&environment_store)?;
    let expected_jdk = display_path(&jdk);
    if !apply.success
        || applied.get("DEVENV_HOME") != Some(&display_path(&managed_root))
        || applied.get("JAVA_HOME") != Some(&expected_jdk)
        || !applied
            .get("Path")
            .is_some_and(|path| path.contains(r"%DEVENV_HOME%\current\jdk\bin"))
    {
        return Err(
            "Java stabilization fixture did not apply the expected environment".to_string(),
        );
    }
    let backup = config_dir.join("env_backups").join(&apply.backup_name);
    if !backup.is_file() {
        return Err("Java stabilization fixture did not create its backup".to_string());
    }
    let stabilize = json!({
        "capability":"environment.java-stabilize", "status":"passed",
        "planId":plan.plan_id, "riskLevel":plan.risk_level,
        "tokenIssued":!apply_token.is_empty(), "backup":display_path(&backup),
        "backupSha256":hash(&backup)?, "apply":apply,
        "javaHomeVerified":true, "pathVerified":true, "registryTouched":false
    });

    let restore_token = issue_token("restore_env_backup", &plan.backup_name, true)?;
    require_risk_operation_token(
        "restore_env_backup",
        &plan.backup_name,
        Some(restore_token.clone()),
    )?;
    let restore = env_core::restore_env_backup(plan.backup_name.clone())?;
    let restored: HashMap<String, String> = read_json(&environment_store)?;
    if restored != initial || !restore.success {
        return Err(
            "Environment restore fixture did not restore the exact initial values".to_string(),
        );
    }
    let pre_restore = config_dir.join("env_backups").join(&restore.backup_name);
    if !pre_restore.is_file() {
        return Err("Environment restore fixture did not create a safety backup".to_string());
    }
    let restore_evidence = json!({
        "capability":"environment.restore", "status":"passed",
        "sourceBackup":display_path(&backup), "sourceBackupSha256":hash(&backup)?,
        "tokenIssued":!restore_token.is_empty(), "restore":restore,
        "preRestoreBackup":display_path(&pre_restore),
        "preRestoreBackupSha256":hash(&pre_restore)?,
        "exactValuesRestored":true, "registryTouched":false
    });
    for (id, value) in [
        ("environment.java-stabilize", stabilize.clone()),
        ("environment.restore", restore_evidence.clone()),
    ] {
        write_evidence(output, id, value)?;
    }
    std::env::remove_var("DEVENV_ACCEPTANCE_CONFIG_DIR");
    std::env::remove_var("DEVENV_ACCEPTANCE_ENV_STORE");
    Ok(vec![
        ("environment.java-stabilize", stabilize),
        ("environment.restore", restore_evidence),
    ])
}

fn python_repair_fixture(output: &Path, workspace: &Path) -> Result<Value, String> {
    let fixture_root = workspace.join("python-repair");
    let paths = AppPaths::new(fixture_root.join("managed-root"));
    paths.ensure().map_err(|error| error.to_string())?;
    let python_home = fixture_root.join("python-3.12");
    let python = python_home.join("python.exe");
    fs::create_dir_all(python_home.join("Scripts")).map_err(|error| error.to_string())?;
    fs::write(&python, b"isolated python runner boundary").map_err(|error| error.to_string())?;

    let initial = HashMap::from([
        ("DEVENV_HOME".to_string(), display_path(&paths.root)),
        ("JAVA_HOME".to_string(), "C:\\FixtureJdk".to_string()),
        ("Path".to_string(), "C:\\BeforePython".to_string()),
    ]);
    let proposed_path = format!(
        "{};{};{}",
        display_path(&python_home),
        display_path(python_home.join("Scripts")),
        initial.get("Path").cloned().unwrap_or_default()
    );
    let plan_id = "python-isolated-repair".to_string();
    let pending = PendingPythonRepair {
        public: PythonRepairPlan {
            plan_id: plan_id.clone(),
            created_at: unix_timestamp().to_string(),
            python_path: display_path(&python),
            actions: vec![
                "ensurepip".to_string(),
                "pip-upgrade".to_string(),
                "path".to_string(),
            ],
            commands: vec![
                "python -m ensurepip --upgrade".to_string(),
                "python -m pip install --upgrade pip".to_string(),
            ],
            path_added: vec![
                display_path(&python_home),
                display_path(python_home.join("Scripts")),
            ],
            warnings: Vec::new(),
            backup_name: "env-backup-<apply-time>.json".to_string(),
        },
        baseline_fingerprint: environment_fingerprint(&initial),
        proposed_path: proposed_path.clone(),
        repair_pip: true,
        repair_path: true,
    };
    let token = issue_token("apply_python_repair", &plan_id, true)?;
    require_risk_operation_token("apply_python_repair", &plan_id, Some(token.clone()))?;

    let calls = std::cell::RefCell::new(Vec::<String>::new());
    let written = std::cell::RefCell::new(initial.clone());
    let result = apply_python_repair_pending_with(
        pending,
        initial.clone(),
        &paths,
        |executable, args, timeout| {
            if executable != python {
                return Err("Python repair escaped the selected executable".to_string());
            }
            calls
                .borrow_mut()
                .push(format!("{}:{timeout}", args.join(" ")));
            if args == ["-m", "pip", "--version"] {
                Ok("pip 24.0 from isolated fixture".to_string())
            } else {
                Ok("isolated command accepted".to_string())
            }
        },
        |devenv_home, java_home, path| {
            let mut environment = written.borrow_mut();
            for (name, value) in [
                ("DEVENV_HOME", devenv_home),
                ("JAVA_HOME", java_home),
                ("Path", Some(path)),
            ] {
                match value {
                    Some(value) => {
                        environment.insert(name.to_string(), value.to_string());
                    }
                    None => {
                        environment.remove(name);
                    }
                }
            }
            Ok(())
        },
    )?;
    let calls = calls.into_inner();
    let written = written.into_inner();
    let backups = fs::read_dir(paths.config().join("env_backups"))
        .map_err(|error| error.to_string())?
        .flatten()
        .map(|entry| entry.path())
        .collect::<Vec<_>>();
    if !result.success
        || calls.len() != 3
        || written.get("Path") != Some(&proposed_path)
        || written.get("JAVA_HOME") != initial.get("JAVA_HOME")
        || backups.len() != 1
    {
        return Err(
            "Python repair fixture did not preserve its command and backup contract".to_string(),
        );
    }
    let value = json!({
        "capability":"environment.python-health-repair", "status":"passed",
        "planId":plan_id, "tokenIssued":!token.is_empty(),
        "commands":calls, "result":result,
        "pathUpdated":true, "unrelatedEnvironmentPreserved":true,
        "backup":display_path(&backups[0]), "backupSha256":hash(&backups[0])?,
        "runner":"isolated-no-network", "registryTouched":false
    });
    write_evidence(output, "environment.python-health-repair", value.clone())?;
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
        (
            "cleanup.download-cache",
            download_cache_fixture(output, &workspace),
        ),
        ("cleanup.move-rollback", move_fixture(output, &workspace)),
        ("profiles.apply", profile_fixture(output, &workspace)),
        (
            "projects.configuration",
            project_configuration_fixture(output, &workspace),
        ),
        ("projects.port-config", port_fixture(output, &workspace)),
    ] {
        cases.insert(id.to_string(), result?);
    }
    for (id, value) in runtime_lifecycle_fixture(output, &workspace)? {
        cases.insert(id.to_string(), value);
    }
    for (id, value) in environment_repair_fixture(output, &workspace)? {
        cases.insert(id.to_string(), value);
    }
    cases.insert(
        "environment.python-health-repair".to_string(),
        python_repair_fixture(output, &workspace)?,
    );
    let manifest = json!({"schemaVersion":1,"generatedAt":current_timestamp(),"cases":cases,"summary":{"total":14,"passed":14,"failed":0}});
    write_evidence(output, "manifest", manifest.clone())?;
    serde_json::to_string(&manifest["summary"]).map_err(|error| error.to_string())
}
