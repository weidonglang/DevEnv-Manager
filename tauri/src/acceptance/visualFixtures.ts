import { dashboardInitialState, type DashboardState } from "../features/dashboard/state";
import { environmentWorkbenchInitialState, type EnvironmentWorkbenchState } from "../features/environment/state";
import { profilesInitialState, type ProfilesState } from "../features/profiles/state";
import { projectWorkbenchInitialState, type ProjectWorkbenchState } from "../features/projects/state";
import { settingsWorkbenchInitialState, type SettingsWorkbenchState } from "../features/settings/state";
import type { EnvReliabilitySnapshot } from "../types";
import { acceptanceFixtures } from "./fixtures";

const tool = (name: string, path: string) => ({ path, version: `${name} fixture`, source: "visual acceptance" });

export function dashboardVisualState(): DashboardState {
  const state = structuredClone(dashboardInitialState);
  state.snapshot = {
    defaultRoot: "C:\\DevEnvManager",
    configDir: "C:\\Users\\Acceptance\\AppData\\Roaming\\DevEnv Manager",
    os: "Windows 11 Pro",
    arch: "x86_64",
    username: "Acceptance",
  };
  state.health = [
    { name: "PATH", status: "Needs cleanup", detail: "1 duplicate entry; no missing entries." },
    { name: "JDK", status: "Available", detail: "JAVA_HOME and PATH resolve to Temurin 21." },
    { name: "Python", status: "Available", detail: "python and python -m pip resolve to the same installation." },
  ];
  state.ports = structuredClone(acceptanceFixtures.ports.records);
  state.portSnapshot = structuredClone(acceptanceFixtures.ports.snapshot);
  state.portStatus = "cached";
  state.powershell = {
    success: true,
    exitCode: 0,
    stdout: "7.5.2",
    stderr: "",
    elapsedMs: 82,
    timedOut: false,
    executable: "pwsh.exe",
    killedProcessTree: false,
  };
  state.update = {
    currentVersion: "1.9.0",
    latestVersion: "1.9.0",
    updateAvailable: false,
    date: "2026-07-22",
    notes: ["Visual acceptance fixture"],
    downloadUrl: "https://github.com/weidonglang/DevEnv-Manager/releases",
    sha256: "fixture",
    sourceName: "GitHub Release",
    sourceUrl: "https://github.com/weidonglang/DevEnv-Manager",
    failedSources: [],
    mirrors: [],
    fileName: "DevEnv.Manager_1.9.0_x64-setup.exe",
    platform: "windows-x86_64",
    size: 1,
    checkedAt: "2026-07-22T08:00:00Z",
  };
  return state;
}

export function environmentVisualState(): EnvironmentWorkbenchState {
  const state = structuredClone(environmentWorkbenchInitialState);
  const reliability: EnvReliabilitySnapshot = {
    generatedAt: "2026-07-22T08:00:00Z",
    userEnv: {
      javaHomeRaw: "C:\\DevEnvManager\\current\\jdk",
      javaHomeExpanded: "C:\\DevEnvManager\\runtimes\\jdk-21",
      devenvHomeRaw: "C:\\DevEnvManager",
      devenvHomeExpanded: "C:\\DevEnvManager",
      pathRaw: "C:\\DevEnvManager\\current\\jdk\\bin;C:\\Python313",
      pathEntries: [
        {
          raw: "C:\\DevEnvManager\\current\\jdk\\bin",
          expanded: "C:\\DevEnvManager\\current\\jdk\\bin",
          exists: true,
          isDuplicate: false,
          isStaleDevenvEntry: false,
          containsJava: true,
          containsJavac: true,
          containsPython: false,
          containsPip: false,
          containsNode: false,
          containsNpm: false,
          risk: "low",
        },
      ],
    },
    processEnv: {
      javaHomeRaw: "C:\\DevEnvManager\\current\\jdk",
      javaHomeExpanded: "C:\\DevEnvManager\\runtimes\\jdk-21",
      pathRaw: "C:\\DevEnvManager\\current\\jdk\\bin;C:\\Python313",
    },
    effectiveTools: {
      java: tool("Java 21", "C:\\DevEnvManager\\current\\jdk\\bin\\java.exe"),
      javac: tool("javac 21", "C:\\DevEnvManager\\current\\jdk\\bin\\javac.exe"),
      python: tool("Python 3.13", "C:\\Python313\\python.exe"),
      pip: tool("pip 25", "C:\\Python313\\Scripts\\pip.exe"),
      node: tool("Node 22", "C:\\Program Files\\nodejs\\node.exe"),
      npm: tool("npm 11", "C:\\Program Files\\nodejs\\npm.cmd"),
      maven: tool("Maven 3.9", "C:\\Tools\\maven\\bin\\mvn.cmd"),
      gradle: tool("Gradle 8", "C:\\Tools\\gradle\\bin\\gradle.bat"),
      go: tool("Go 1.24", "C:\\Go\\bin\\go.exe"),
    },
    pathAnalysis: {
      totalEntries: 9,
      duplicateCount: 1,
      missingCount: 0,
      staleDevenvCount: 0,
      javaEntryCount: 1,
      pythonEntryCount: 1,
      storeAliasDetected: false,
      pathTooLong: false,
      explanation: ["One duplicate entry can be removed through a previewed plan."],
    },
    java: {
      javaHomeRaw: "C:\\DevEnvManager\\current\\jdk",
      javaHomeExpanded: "C:\\DevEnvManager\\runtimes\\jdk-21",
      javaHomeValid: true,
      pathJava: "C:\\DevEnvManager\\current\\jdk\\bin\\java.exe",
      pathJavac: "C:\\DevEnvManager\\current\\jdk\\bin\\javac.exe",
      commandJavaVersion: "21.0.4",
      commandJavacVersion: "21.0.4",
      consistency: "verified",
      conflicts: [],
      candidates: [{ path: "C:\\DevEnvManager\\runtimes\\jdk-21", version: "21.0.4", source: "managed" }],
    },
    python: {
      currentPython: tool("Python 3.13", "C:\\Python313\\python.exe"),
      currentPip: tool("pip 25", "C:\\Python313\\Scripts\\pip.exe"),
      pyLauncherOutput: "-3.13-64",
      discoveredPythons: [{ path: "C:\\Python313\\python.exe", version: "3.13.0", source: "registry" }],
      discoveredPips: [{ path: "C:\\Python313\\Scripts\\pip.exe", version: "25.0", source: "python -m pip" }],
      storeAliasRisk: false,
      pipMatchesPython: true,
      userPathEffective: true,
      conflicts: [],
      suggestions: [],
    },
    mavenGradle: {
      mavenPath: "C:\\Tools\\maven\\bin\\mvn.cmd",
      mavenVersion: "3.9.9",
      mavenJava: "21.0.4",
      gradlePath: "C:\\Tools\\gradle\\bin\\gradle.bat",
      gradleVersion: "8.10",
      gradleJava: "21.0.4",
      conflicts: [],
      suggestions: [],
    },
    node: {
      nodePath: "C:\\Program Files\\nodejs\\node.exe",
      nodeVersion: "22.14.0",
      npmPath: "C:\\Program Files\\nodejs\\npm.cmd",
      npmVersion: "11.1.0",
      npmPrefix: "C:\\Users\\Acceptance\\AppData\\Roaming\\npm",
      npmRegistry: "https://registry.npmjs.org/",
      pnpmStore: "C:\\Users\\Acceptance\\AppData\\Local\\pnpm\\store",
      conflicts: [],
      suggestions: [],
    },
    issues: [{ id: "path-duplicate", title: "Duplicate PATH entry", severity: "warning", detail: "One identical PATH entry was detected." }],
    suggestions: [{ id: "preview", title: "Create a cleanup preview", detail: "Review the duplicate before applying.", action: "create-path-cleanup-plan" }],
  };
  state.reliability = reliability;
  state.health = [
    { name: "JAVA_HOME", status: "Available", detail: "Managed JDK 21 is active." },
    { name: "Python", status: "Available", detail: "python and pip ownership verified." },
  ];
  state.pathCleanupResult = "Read-only fixture: one duplicate entry is ready for preview.";
  state.configurationResult = "Environment configuration fixture verified.";
  return state;
}

export function projectVisualState(): ProjectWorkbenchState {
  const state = structuredClone(projectWorkbenchInitialState);
  state.selectedPath = "C:\\Projects\\full-stack-sample";
  state.recentPaths = ["C:\\Projects\\full-stack-sample", "C:\\Projects\\cli-tool"];
  state.analysis = {
    root: state.selectedPath,
    projectTypes: ["Java", "Node.js", "Maven"],
    detectedFiles: ["pom.xml", "package.json", "package-lock.json", ".idea/misc.xml"],
    packageManager: "npm",
    recommendedRuntime: [
      { name: "JDK", requirement: "21", status: "matched" },
      { name: "Node.js", requirement: ">=20", status: "matched" },
    ],
    actions: [{ id: "verify-java", title: "Verify Java consumer", command: "mvn -o test", description: "Offline project consumer verification", safeToRun: true }],
    warnings: ["The project mixes Java and Node.js; verify both consumers after switching."],
  };
  state.ports = [
    {
      id: "server-port",
      kind: "Spring Boot",
      file: "src/main/resources/application.yml",
      currentPort: 8080,
      line: 7,
      description: "server.port",
      mode: "replace",
      willOverwriteExistingFile: true,
      backupPath: "application.yml.devenv.bak",
    },
  ];
  state.idea = {
    root: state.selectedPath,
    detected: true,
    projectSdk: "temurin-21",
    languageLevel: "JDK_21",
    moduleCount: 2,
    jdkMatch: "matched",
    warnings: [],
  } as unknown as NonNullable<ProjectWorkbenchState["idea"]>;
  state.javaConsumer = {
    consumer: "Maven",
    root: state.selectedPath,
    usable: true,
    javaHomeRaw: "C:\\DevEnvManager\\current\\jdk",
    javaHomeExpanded: "C:\\DevEnvManager\\runtimes\\jdk-21",
    javaExists: true,
    javacExists: true,
    pathJava: "C:\\DevEnvManager\\current\\jdk\\bin\\java.exe",
    explanation: ["Maven resolved the expected managed JDK."],
  } as NonNullable<ProjectWorkbenchState["javaConsumer"]>;
  state.applyResult = { success: true, message: "Fixture project configuration verified." };
  return state;
}

export function profilesVisualState(): ProfilesState {
  const state = structuredClone(profilesInitialState);
  state.profiles = [
    {
      id: "profile-java-node",
      name: "Java 21 + Node 22",
      createdAt: "2026-07-22T08:00:00Z",
      current: { jdk: "21.0.4", node: "22.14.0", python: null },
      devenvHome: "C:\\DevEnvManager",
      javaHome: "C:\\DevEnvManager\\current\\jdk",
      path: "C:\\Users\\Acceptance\\AppData\\Roaming\\DevEnv Manager\\profiles\\java-node.json",
    },
    {
      id: "profile-python",
      name: "Python Data Tools",
      createdAt: "2026-07-21T08:00:00Z",
      current: { jdk: null, node: null, python: "3.13.0" },
      devenvHome: "C:\\DevEnvManager",
      path: "C:\\Users\\Acceptance\\AppData\\Roaming\\DevEnv Manager\\profiles\\python.json",
    },
  ];
  state.selectedProfileId = "profile-java-node";
  state.plan = {
    planId: "profile-apply-fixture",
    profileId: "profile-java-node",
    profileName: "Java 21 + Node 22",
    missingRequirements: [],
    runtimeSwitches: ["JDK -> 21.0.4", "Node.js -> 22.14.0"],
    willInstall: false,
    willWriteEnvironment: true,
    backupName: "environment-before-profile-fixture.json",
    warnings: ["Open terminals and IDEs must be restarted after the switch."],
  };
  state.operationResult = "Profile preview is ready; no changes were applied by this fixture.";
  state.history = [{
    id: "profile-history-fixture",
    createdAt: "2026-07-22T07:30:00Z",
    reason: "Before saving profile: Java 21 + Node 22",
    profileCount: 1,
    fingerprint: "profile-history-fingerprint",
    profiles: [state.profiles[0]],
  }];
  state.selectedHistoryId = "profile-history-fixture";
  state.historyPlan = {
    planId: "profile-history-restore-fixture",
    historyId: "profile-history-fixture",
    snapshotCreatedAt: "2026-07-22T07:30:00Z",
    snapshotReason: "Before saving profile: Java 21 + Node 22",
    profileCount: 1,
    backupHistoryId: "profile-history-backup-fixture",
    riskLevel: "medium",
    planFingerprint: "profile-history-plan-fingerprint",
    warnings: ["The plan is single-use and keeps the current profile collection as a backup."],
  };
  state.historyResult = {
    success: true,
    message: "Restored 1 profiles from history snapshot profile-history-fixture",
    restoredHistoryId: "profile-history-fixture",
    backupHistoryId: "profile-history-backup-fixture",
    restoredProfileCount: 1,
  };
  return state;
}

export function settingsVisualState(theme: SettingsWorkbenchState["theme"]): SettingsWorkbenchState {
  const state = structuredClone(settingsWorkbenchInitialState);
  state.theme = theme;
  state.config = {
    settings: {
      rootDir: "C:\\DevEnvManager",
      autoCheckUpdate: true,
      autoScanPortsOnStartup: true,
      portScanScope: "recommended",
      downloadTimeoutSeconds: 30,
      theme,
      updateSourceMode: "auto",
      updateSources: [
        { name: "GitHub", region: "global", manifestUrl: "https://github.com/weidonglang/DevEnv-Manager/releases/latest", priority: 1, enabled: true },
        { name: "Gitee", region: "CN", manifestUrl: "https://gitee.com/weidonglang/DevEnv-Manager/releases", priority: 2, enabled: true },
      ],
      safetyDisclaimerAccepted: true,
      safetyDisclaimerVersion: 1,
      safetyDisclaimerAcceptedAt: "2026-07-22T08:00:00Z",
    },
    installed: { jdks: [], pythons: [], nodes: [], mavens: [], gradles: [], gos: [], current: { jdk: "21.0.4" } },
    paths: {
      root: "C:\\DevEnvManager",
      downloads: "C:\\DevEnvManager\\downloads",
      config: "C:\\Users\\Acceptance\\AppData\\Roaming\\DevEnv Manager",
      current: "C:\\DevEnvManager\\current",
    },
  };
  state.powershell = {
    success: true,
    exitCode: 0,
    stdout: "7.5.2",
    stderr: "",
    elapsedMs: 82,
    timedOut: false,
    executable: "pwsh.exe",
    killedProcessTree: false,
  };
  state.update = {
    currentVersion: "1.9.0",
    latestVersion: "1.9.0",
    updateAvailable: false,
    date: "2026-07-22",
    notes: ["Visual acceptance fixture"],
    downloadUrl: "https://github.com/weidonglang/DevEnv-Manager/releases",
    sha256: "fixture-sha256",
    sourceName: "GitHub Release",
    sourceUrl: "https://github.com/weidonglang/DevEnv-Manager",
    failedSources: [],
    mirrors: [{ name: "Gitee", region: "CN", url: "https://gitee.com/weidonglang/DevEnv-Manager/releases" }],
    fileName: "DevEnv.Manager_1.9.0_x64-setup.exe",
    platform: "windows-x86_64",
    size: 2675263,
    checkedAt: "2026-07-22T08:00:00Z",
  };
  state.operationResult = "Settings fixture loaded without modifying the host.";
  return state;
}
