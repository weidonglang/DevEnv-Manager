export type AppSnapshot = {
  defaultRoot: string;
  configDir: string;
  os: string;
  arch: string;
  username: string;
};

export type EnvSnapshot = {
  pathEntries: string[];
  javaHome?: string;
  devenvHome?: string;
  pathWarnings: string[];
};

export type ConfigView = {
  settings: {
    rootDir: string;
    autoCheckUpdate: boolean;
    autoScanPortsOnStartup: boolean;
    portScanScope: "recommended" | "full";
    downloadTimeoutSeconds: number;
    theme: string;
    updateSourceMode?: string;
    updateSources?: Array<{
      name: string;
      region: string;
      manifestUrl: string;
      priority: number;
      enabled: boolean;
    }>;
    safetyDisclaimerAccepted: boolean;
    safetyDisclaimerVersion: number;
    safetyDisclaimerAcceptedAt?: string | null;
  };
  installed: {
    jdks: ManagedRuntime[];
    pythons: ManagedRuntime[];
    nodes: ManagedRuntime[];
    mavens: ManagedRuntime[];
    gradles: ManagedRuntime[];
    gos: ManagedRuntime[];
    current: Record<string, string | null>;
  };
  paths: {
    root: string;
    downloads: string;
    config: string;
    current: string;
  };
};

export type ManagedRuntime = {
  version: string;
  path: string;
  detail?: string;
  installed_at?: string;
  installedAt?: string;
};

export type OperationResult = {
  success: boolean;
  message: string;
};

export type ToolProbe = { path?: string; version: string; source: string };
export type EnvRepairAction = {
  id: string;
  title: string;
  description: string;
  variable: string;
  oldValue?: string;
  newValue?: string;
  risk: string;
  reversible: boolean;
};
export type EnvRepairPlan = {
  planId: string;
  createdAt: string;
  target: string;
  actions: EnvRepairAction[];
  expectedAfter: { javaHome?: string; devenvHome?: string; path?: string };
  warnings: string[];
  riskLevel: string;
  requiresTerminalRestart: boolean;
  backupName: string;
  disclaimer: string;
  diff: string[];
};
export type EnvRepairResult = {
  planId: string;
  success: boolean;
  message: string;
  backupName: string;
};
export type EnvBackupRecord = {
  backupName: string;
  createdAt: string;
  reason: string;
  variables: string[];
  javaHomePreview?: string;
  devenvHomePreview?: string;
  pathEntryCount: number;
  sourcePlanId?: string;
};
export type EnvBackupDiff = {
  backupName: string;
  currentJavaHome?: string;
  backupJavaHome?: string;
  currentPathEntries: number;
  backupPathEntries: number;
  changedVariables: string[];
};
export type EnvReliabilitySnapshot = {
  generatedAt: string;
  userEnv: {
    javaHomeRaw?: string;
    javaHomeExpanded?: string;
    devenvHomeRaw?: string;
    devenvHomeExpanded?: string;
    pathRaw: string;
    pathEntries: Array<{ raw: string; expanded: string; exists: boolean; isDuplicate: boolean; isStaleDevenvEntry: boolean; containsJava: boolean; containsJavac: boolean; containsPython: boolean; containsPip: boolean; containsNode: boolean; containsNpm: boolean; risk: string }>;
  };
  processEnv: { javaHomeRaw?: string; javaHomeExpanded?: string; pathRaw: string };
  effectiveTools: { java: ToolProbe; javac: ToolProbe; python: ToolProbe; pip: ToolProbe; node: ToolProbe; npm: ToolProbe; maven: ToolProbe; gradle: ToolProbe; go: ToolProbe };
  pathAnalysis: { totalEntries: number; duplicateCount: number; missingCount: number; staleDevenvCount: number; javaEntryCount: number; pythonEntryCount: number; storeAliasDetected: boolean; pathTooLong: boolean; explanation: string[] };
  java: { javaHomeRaw?: string; javaHomeExpanded?: string; javaHomeValid: boolean; pathJava?: string; pathJavac?: string; commandJavaVersion: string; commandJavacVersion: string; consistency: string; conflicts: string[]; candidates: Array<{ path: string; version: string; source: string }> };
  python: { currentPython?: ToolProbe; currentPip?: ToolProbe; pyLauncherOutput: string; discoveredPythons: Array<{ path: string; version: string; source: string }>; discoveredPips: Array<{ path: string; version: string; source: string }>; storeAliasRisk: boolean; pipMatchesPython: boolean; userPathEffective: boolean; conflicts: string[]; suggestions: string[] };
  mavenGradle: { mavenPath?: string; mavenVersion: string; mavenJava: string; gradlePath?: string; gradleVersion: string; gradleJava: string; conflicts: string[]; suggestions: string[] };
  node: { nodePath?: string; nodeVersion: string; npmPath?: string; npmVersion: string; npmPrefix: string; npmRegistry: string; pnpmStore: string; conflicts: string[]; suggestions: string[] };
  issues: Array<{ id: string; title: string; severity: string; detail: string }>;
  suggestions: Array<{ id: string; title: string; detail: string; action?: string }>;
};

export type FeatureRiskInfo = {
  featureId: string;
  title: string;
  riskLevel: string;
  whatItDoes: string[];
  whatItDoesNotDo: string[];
  possibleImpact: string[];
  reversible: boolean;
  requiresBackup: boolean;
  requiresAdmin: boolean;
  confirmationLevel: string;
  safeAlternatives: string[];
};

export type ValidationCheck = {
  id: string;
  title: string;
  success: boolean;
  required: boolean;
  detail: string;
  stage: string;
};

export type PythonIntegrityReport = {
  pythonPath: string;
  pythonHome: string;
  managed: boolean;
  fullyUsable: boolean;
  status: string;
  checks: ValidationCheck[];
  risks: string[];
  suggestions: string[];
};

export type RuntimeStrongVerificationReport = {
  generatedAt: string;
  items: Array<{
    runtimeId: string;
    kind: string;
    version: string;
    path: string;
    registered: boolean;
    current: boolean;
    environmentEffective: boolean;
    status: string;
    checks: RuntimeVerificationCheck[];
    failureStage?: string;
    report: string[];
  }>;
  summary: string[];
};

export type RuntimeVerificationCheck = {
  id: string;
  label: string;
  command: string;
  expected: string;
  actual: string;
  status: "passed" | "failed" | "skipped";
  error?: string;
  elapsedMs: number;
  required: boolean;
  suggestion: string;
};

export type RuntimeSwitchPlan = {
  planId: string;
  createdAt: string;
  kind: string;
  version: string;
  targetRoot: string;
  previousVersion?: string;
  previousRoot?: string;
  environmentChanges: string[];
  pathDiff: string[];
  backupName: string;
  warnings: string[];
  riskLevel: string;
  planFingerprint: string;
};

export type RuntimeSwitchResult = {
  success: boolean;
  message: string;
  planId: string;
  backupName: string;
  verification: RuntimeStrongVerificationReport["items"][number];
};

export type IdeaProjectReport = {
  root: string;
  detected: boolean;
  readFiles: string[];
  projectSdk: string;
  languageLevel: string;
  moduleSdks: string[];
  moduleCount: number;
  compilerTarget: string;
  mavenImporterJdk: string;
  gradleJvm: string;
  outputDir: string;
  currentJavaHome: string;
  currentJavaVersion: string;
  jdkMatch: string;
  warnings: string[];
};

export type JavaConsumerReport = {
  consumer: string;
  root: string;
  startupExists: boolean;
  javaHomeRaw?: string;
  javaHomeExpanded?: string;
  javaExists: boolean;
  javacExists: boolean;
  pathJava?: string;
  indirectJavaHomeRisk: boolean;
  processUserEnvDiffers: boolean;
  usable: boolean;
  explanation: string[];
};

export type KillResult = OperationResult & {
  needsForce: boolean;
  blocked: boolean;
};

export type RuntimeInfo = {
  id: string;
  kind: string;
  displayName: string;
  ecosystem: string;
  version: string;
  executable: string;
  runtimeRoot: string;
  source: string;
  management: "managed" | "external";
  current: boolean;
  installedAt?: string;
};

export type JavaEnvironmentReport = {
  javaHome: string;
  javaHomeExpanded: string;
  pathJava: string;
  pathJavac: string;
  javaVersion: string;
  javacVersion: string;
  mavenRuntime: string;
  gradleRuntime: string;
  effectiveSource: string;
  consistent: boolean;
  warnings: string[];
  candidates: RuntimeInfo[];
};

export type PortRecord = {
  groupId: string;
  groupFingerprint: string;
  protocol: string;
  localAddress: string;
  localPort: number;
  remoteAddress: string;
  state: string;
  pid: number;
  processStartTime: number;
  processName: string;
  friendlyNameZh: string;
  friendlyNameEn: string;
  processPath: string;
  productName: string;
  fileDescription: string;
  companyName: string;
  publisher: string;
  commandLine: string;
  commandLineFingerprint: string;
  parentPid: number;
  parentProcessName: string;
  serviceNames: string[];
  serviceDisplayNames: string[];
  serviceStates: string[];
  serviceStartModes: string[];
  serviceDetails: Array<{
    name: string;
    displayName: string;
    state: string;
    startMode: string;
    processId: number;
    serviceType: string;
    description: string;
    pathName: string;
    serviceHostGroup: string;
    serviceDll: string;
    coreWindowsService: boolean;
  }>;
  bindings: Array<{ localAddress: string; localEndpoint: string; remoteEndpoint: string; state: string }>;
  bindingCount: number;
  remoteConnectionCount: number;
  relatedPorts: number[];
  sourceRecordCount: number;
  hasIpv4: boolean;
  hasIpv6: boolean;
  scanSources: Array<{ source: string; scannedAt: number; recordCount: number; fallback: boolean; conflicts: string[] }>;
  commonUsage: string;
  explanation: string;
  risk: string;
  identity: string;
  identityId: string;
  identityCategory: string;
  identityEcosystem: string;
  confidence: number;
  confidenceLevel: "verified" | "high" | "medium" | "low" | "unknown" | "conflict";
  identityCatalogVersion: string;
  evidenceCount: number;
  conflictCount: number;
  riskLevel: string;
  recommendation: string;
  recommendationZh: string;
  recommendationEn: string;
  evidence: string[];
  conflictEvidence: string[];
};

export type PortScanSnapshot = {
  scanId: string;
  scope: "recommended" | "full";
  status: "idle" | "scanning" | "success" | "stale" | "failed";
  source: string;
  scannedAt: number;
  elapsedMs: number;
  rawCount: number;
  filteredCount: number;
  truncated: boolean;
  cached: boolean;
  complete: boolean;
  userMessage: string;
  debugSummary: string;
  records: PortRecord[];
};

export type PortResolutionPlan = {
  planId: string;
  groupId: string;
  groupFingerprint: string;
  scanId: string;
  pid: number;
  port: number;
  protocol: string;
  processStartTime: number;
  processName: string;
  processPath: string;
  commandLineFingerprint: string;
  parentPid?: number;
  parentProcessName?: string;
  childProcesses: Array<{ pid: number; name: string }>;
  serviceNames: string[];
  bindings: PortRecord["bindings"];
  relatedPorts: number[];
  expectedOwnerIdentity: string;
  createdAt: number;
  expiresAt: number;
  projectRoot?: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  warnings: string[];
  recommendedActions: string[];
};

export type PortResolutionResult = {
  success: boolean;
  message: string;
  targetPort: number;
  targetPid: number;
  processName: string;
  serviceOwned: boolean;
  requiresAdmin: boolean;
  failureReason: string;
  nextSteps: string[];
  pidExited: boolean;
  portReleased: boolean;
  relatedPortsReleased: boolean;
  remainingRelatedPorts: number[];
  releaseCheckedAt: string;
  remainingOwners: PortRecord[];
};

export type PortHistorySummary = {
  port: number;
  processName: string;
  observations: number;
  lastSeen: number;
};

export type PortSortKey = "localPort" | "state" | "identity" | "processName" | "pid" | "confidence" | "riskLevel";
export type SortDirection = "asc" | "desc";

export type ProjectHealth = {
  root: string;
  projectTypes: string[];
  signals: string[];
  suggestions: string[];
};

export type TaskProgress = {
  task: string;
  percent: number;
  message: string;
};

export type NetworkDiagnostics = {
  checks: Array<{
    name: string;
    url: string;
    success: boolean;
    status: string;
    elapsedMs: number;
  }>;
  proxy: Array<[string, string]>;
};

export type CacheEntry = {
  name: string;
  path: string;
  size: number;
  sha256?: string;
};

export type CommandRunResult = {
  success: boolean;
  returnCode: number;
  output: string;
  elapsedMs: number;
};

export type PowerShellResult = {
  success: boolean;
  exitCode?: number | null;
  stdout: string;
  stderr: string;
  elapsedMs: number;
  timedOut: boolean;
  executable: string;
  killedProcessTree: boolean;
};

export type CommandSafetyAssessment = {
  allowed: boolean;
  risk: string;
  reason: string;
  requiresConfirmation: boolean;
  elevated: boolean;
  executable: string;
};

export type AgentTraceReport = {
  generatedAt: string;
  items: Array<{
    source: string;
    path: string;
    evidence: string;
    confidence: string;
    recommendation: string;
  }>;
  privacyNotice: string;
  limitations: string[];
};

export type EnvHealthCheck = {
  name: string;
  status: string;
  detail: string;
};

export type ConfigProfile = {
  id: string;
  name: string;
  createdAt: string;
  current: Record<string, string | null>;
  devenvHome?: string;
  javaHome?: string;
  path: string;
};

export type ConfigProfileHistoryEntry = {
  id: string;
  createdAt: string;
  reason: string;
  profileCount: number;
  fingerprint: string;
  profiles: ConfigProfile[];
};

export type ProfileHistoryRestorePlan = {
  planId: string;
  historyId: string;
  snapshotCreatedAt: string;
  snapshotReason: string;
  profileCount: number;
  backupHistoryId: string;
  riskLevel: string;
  planFingerprint: string;
  warnings: string[];
};

export type ProfileHistoryRestoreResult = {
  success: boolean;
  message: string;
  restoredHistoryId: string;
  backupHistoryId: string;
  restoredProfileCount: number;
};

export type DoctorReport = {
  score: number;
  summary: string;
  generatedAt: string;
  checks: Array<{
    id: string;
    title: string;
    category: string;
    status: string;
    severity: string;
    detail: string;
    fixAction?: string;
  }>;
  suggestions: Array<{
    id: string;
    title: string;
    description: string;
    action?: string;
  }>;
};

export type PythonAnalysis = {
  currentPython?: PythonToolState;
  currentPip?: PythonToolState;
  launcherPath: string;
  launcherOutput: string;
  firstPythonOnPath: string;
  firstPython3OnPath: string;
  firstPipOnPath: string;
  pythonMPipAvailable: boolean;
  managedPythonAvailable: boolean;
  discoveredPythons: PythonEntry[];
  discoveredPips: PythonEntry[];
  userPathEntryCount: number;
  currentTerminalMatchesUserPath: boolean;
  storeAliasRisk: boolean;
  repairBlockers: string[];
  recoveryActions: string[];
  diagnosticReport: string;
  risks: string[];
  recommendations: string[];
  pipRepairCommand: string;
  aliasSettingsCommand: string;
};

export type PythonRepairPlan = {
  planId: string;
  createdAt: string;
  pythonPath: string;
  actions: string[];
  commands: string[];
  pathAdded: string[];
  warnings: string[];
  backupName: string;
};

export type PythonToolState = {
  path: string;
  version: string;
  status: string;
  detail: string;
};

export type PythonEntry = {
  path: string;
  source: string;
  version: string;
  current: boolean;
};

export type ProjectAnalysis = {
  root: string;
  projectTypes: string[];
  detectedFiles: string[];
  packageManager?: string;
  recommendedRuntime: Array<{
    name: string;
    requirement: string;
    status: string;
  }>;
  actions: Array<{
    id: string;
    title: string;
    command: string;
    description: string;
    safeToRun: boolean;
  }>;
  warnings: string[];
};
export type CurrentVersions = {
  jdk?: string;
  python?: string;
  node?: string;
  maven?: string;
  gradle?: string;
  go?: string;
};
export type ProjectConfigFileDraft = {
  relativePath: string;
  content: string;
  existed: boolean;
  enabled: boolean;
};
export type ProjectConfigPreview = {
  projectPath: string;
  detectedTypes: string[];
  files: ProjectConfigFileDraft[];
  current: CurrentVersions;
  warnings: string[];
};
export type ProjectPortConfig = {
  id: string;
  kind: string;
  file: string;
  currentPort: number;
  line: number;
  description: string;
  mode: "replace" | "append" | "create";
  willOverwriteExistingFile: boolean;
  backupPath?: string;
};


export type ToolState = {
  name: string;
  installed: boolean;
  version: string;
  path: string;
  detail: string;
};

export type ToolchainReport = {
  git: {
    git: ToolState;
    gitBashPath: string;
    userName: string;
    userEmail: string;
    ssh: ToolState;
    sshKeyExists: boolean;
    publicKeyPath: string;
    publicKey: string;
    githubSshStatus: string;
    githubHttpsStatus: string;
    gitLfs: ToolState;
    globalConfigPath: string;
  };
  node: {
    tools: ToolState[];
    npmPrefix: string;
    npmRegistry: string;
    pnpmStorePath: string;
    npmConfigPath: string;
  };
  python: {
    tools: ToolState[];
    pipConfig: string;
    pipIndexUrl: string;
    pipConfigPath: string;
  };
  generatedAt: string;
};

export type PlatformReport = {
  go: {
    go: ToolState;
    goroot: string;
    gopath: string;
    goproxy: string;
    gomodcache: string;
  };
  rust: {
    tools: ToolState[];
    defaultToolchain: string;
    installedToolchains: string[];
    msvcBuildTools: string;
    cargoConfigPath: string;
  };
  dotnet: {
    dotnet: ToolState;
    sdks: string[];
    runtimes: string[];
    nugetConfigPath: string;
  };
  mirrors: {
    npmRegistry: string;
    pipIndexUrl: string;
    goProxy: string;
    mavenSettingsPath: string;
    mavenSettingsExists: boolean;
    gradleInitPath: string;
    gradleInitExists: boolean;
    cargoConfigPath: string;
    cargoConfigExists: boolean;
  };
  chsrc: ToolState;
  chsrcRecovery: {
    missing: boolean;
    explanation: string[];
    scoopCommand: string;
    wingetCommand: string;
    officialUrl: string;
    fallbackFeatures: string[];
  };
  generatedAt: string;
};

export type SystemPlatformReport = {
  docker: ToolState;
  dockerInfo: string;
  dockerDesktopPath: string;
  wsl: ToolState;
  wslStatus: string;
  wslDistributions: string[];
  wslItems: Array<{
    name: string;
    state: string;
    version: string;
    isDefault: boolean;
  }>;
};

export type LocalServiceStatus = {
  id: string;
  name: string;
  port: number;
  occupied: boolean;
  pid: number;
  processName: string;
  processPath: string;
  serviceNames: string[];
  safeToStop: boolean;
  connectionCommand: string;
  installed: boolean;
  serviceName: string;
  serviceState: string;
  binaryPath: string;
  executablePath: string;
  installDirectory: string;
  pathStatus: string;
  logPath: string;
  logPathReason: string;
};

export type MySqlCandidate = {
  id: string;
  status: string;
  versionHint: string;
  serviceName: string;
  serviceState: string;
  mysqldPath: string;
  myIniPath: string;
  basedir: string;
  datadir: string;
  port: number;
  portOccupied: boolean;
  portProcess: string;
  dataHealth: string;
  confidence: string;
  conclusionLevel: string;
  staticFileCheck: string;
  connectionCheck: string;
  systemSchemaCheck: string;
  reasoning: string[];
  backupManifest?: MySqlBackupManifestStatus | null;
  evidence: string[];
  nextSteps: string[];
  systemSchemaMissing: boolean;
  businessDatabases: string[];
  lastError: string;
  suggestions: string[];
  registrationCommand: string;
  consoleCommand: string;
};

export type MySqlBackupManifestStatus = {
  valid: boolean;
  reason: string;
  createdAt: number;
  expiresAt: number;
  destination: string;
  files: number;
  bytes: number;
  ibdata: boolean;
  frm: boolean;
  businessSchema: boolean;
  systemSchema: boolean;
  manifestPath: string;
};

export type MySqlRepairReport = {
  generatedAt: string;
  candidates: MySqlCandidate[];
  warnings: string[];
  privacyNotice: string;
};

export type MySqlRepairPlan = {
  planId: string;
  createdAt: string;
  candidateId: string;
  action: string;
  title: string;
  steps: string[];
  commands: string[];
  warnings: string[];
  requiresAdmin: boolean;
  requiresBackup: boolean;
  riskLevel: string;
  planFingerprint: string;
};

export type ConfirmationTokenView = {
  token: string;
  command: string;
  actionId: string;
  planId: string;
  riskLevel: string;
  expiresAt: number;
};

export type MySqlExecutionGuard = {
  actionId: string;
  planId: string;
  riskLevel: string;
  planFingerprint: string;
  backupRequired: boolean;
  backupReceipt?: string;
};

export type JdkDistribution = {
  id: string;
  name: string;
  recommended: boolean;
  supportsInstall: boolean;
  description: string;
};

export type UpdateCheckResult = {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  date: string;
  notes: string[];
  downloadUrl: string;
  sha256: string;
  sourceName: string;
  sourceUrl: string;
  failedSources: string[];
  mirrors: Array<{
    name: string;
    region: string;
    url: string;
  }>;
  fileName: string;
  platform: string;
  size: number;
  checkedAt: string;
};

export type UpdateDownloadResult = {
  success: boolean;
  version: string;
  platform: string;
  fileName: string;
  filePath: string;
  size: number;
  sha256: string;
  sourceName: string;
  sourceUrl: string;
  verified: boolean;
  message: string;
};

export type FileAssociationSource = "userChoice" | "hkcu" | "hklm" | "unknown";
export type FileAssociationRisk = "normal" | "missingApp" | "protected" | "highRisk" | "unknown";
export type FileAssociationApplyMode = "userLevelRegistry" | "openSystemSettings" | "blocked";

export type FileAssociationRecord = {
  extension: string;
  category: string;
  description: string;
  currentProgId?: string | null;
  currentAppName?: string | null;
  currentCommand?: string | null;
  executablePath?: string | null;
  executableExists: boolean;
  source: FileAssociationSource;
  risk: FileAssociationRisk;
  canInspect: boolean;
  canSuggestChange: boolean;
  canApplyAutomatically: boolean;
  requiresSystemSettings: boolean;
  notes: string[];
};

export type FileAssociationReport = {
  scannedAt: string;
  currentUser: string;
  windowsVersion: string;
  totalExtensions: number;
  manageableExtensions: number;
  requiresSystemSettings: number;
  abnormalCount: number;
  missingAppCount: number;
  highRiskCount: number;
  records: FileAssociationRecord[];
};

export type FileAssociationPlanRequest = {
  targetAppName: string;
  targetExecutable: string;
  extensions: string[];
  advancedHighRisk: boolean;
};

export type FileAssociationAppCandidate = {
  appId: string;
  displayName: string;
  executablePath: string;
  source:
    | "knownLocation"
    | "appPaths"
    | "registry"
    | "path"
    | "scoop"
    | "chocolatey"
    | "winget"
    | "jetbrainsToolbox"
    | "manualCache";
  confidence: number;
  exists: boolean;
  recommendedCommandTemplate: string;
  notes: string[];
};

export type FileAssociationAppSearchResult = {
  query: string;
  normalizedQuery: string;
  matchedAppId?: string | null;
  matchedDisplayName?: string | null;
  autoSelected?: FileAssociationAppCandidate | null;
  candidates: FileAssociationAppCandidate[];
  manualSelectionRequired: boolean;
  message: string;
};

export type FileAssociationTarget = {
  progId: string;
  appName: string;
  executable: string;
  command: string;
};

export type FileAssociationChange = {
  extension: string;
  before: FileAssociationRecord;
  after: FileAssociationTarget;
  applyMode: FileAssociationApplyMode;
  risk: FileAssociationRisk;
  warnings: string[];
};

export type FileAssociationPlan = {
  planId: string;
  createdAt: string;
  targetAppName: string;
  targetExecutable: string;
  changes: FileAssociationChange[];
  backupPath: string;
  warnings: string[];
  riskLevel: "high";
  requiresConfirmationToken: boolean;
  planFingerprint: string;
};

export type FileAssociationApplyResult = {
  success: boolean;
  message: string;
  backupId?: string | null;
  backupPath?: string | null;
  items: Array<{
    extension: string;
    success: boolean;
    message: string;
    requiresSystemSettings: boolean;
  }>;
};

export type FileAssociationBackupSummary = {
  backupId: string;
  createdAt: string;
  changeCount: number;
  extensions: string[];
  targetAppName: string;
  backupPath: string;
  rollbackAvailable: boolean;
};

export type CleanupArchitecture = {
  schemaVersion: number;
  status: string;
  categories: Array<{
    id: string;
    name: string;
    risk: string;
    scanOnly: boolean;
    cleanupEnabled: boolean;
    protectedPatterns: string[];
  }>;
  safetyRules: string[];
};

export type DoctorRepairResult = {
  beforeScore: number;
  afterScore: number;
  applied: string[];
  remaining: string[];
  report: DoctorReport;
};

export type DoctorRepairPlan = {
  planId: string;
  beforeScore: number;
  actions: string[];
  actionDetails: Array<{
    actionId: string;
    title: string;
    reason: string;
    evidence: string[];
    riskLevel: string;
    requiresBackup: boolean;
    requiresToken: boolean;
    nextStep: string;
  }>;
  willCleanupPath: boolean;
  willConfigureEnvironment: boolean;
  backupName: string;
  warnings: string[];
};

export type ConfigProfileImportPreview = {
  source: string;
  exportedAt: string;
  profiles: Array<{
    name: string;
    current: Record<string, string | null>;
    missing: string[];
    willReplace: boolean;
  }>;
};

export type ProfileRequirement = {
  kind: string;
  version: string;
  installed: boolean;
  autoInstallSupported: boolean;
};

export type ProfileApplyPlan = {
  planId: string;
  profileId: string;
  profileName: string;
  missingRequirements: ProfileRequirement[];
  runtimeSwitches: string[];
  willInstall: boolean;
  willWriteEnvironment: boolean;
  backupName: string;
  warnings: string[];
};

export type CleanupCandidate = {
  id: string;
  path: string;
  size: number;
  modifiedAt?: string;
  source: string;
  reason: string;
  risk: string;
  cleanable: boolean;
  selectedByDefault: boolean;
  skippedReason?: string;
};

export type CleanupCategoryScan = {
  id: string;
  name: string;
  description: string;
  risk: string;
  scanOnly: boolean;
  cleanable: boolean;
  enabledByDefault: boolean;
  totalBytes: number;
  itemCount: number;
  items: CleanupCandidate[];
};

export type CleanupScanReport = {
  generatedAt: string;
  totalBytes: number;
  totalItems: number;
  categories: CleanupCategoryScan[];
  warnings: string[];
};

export type CleanupPlan = {
  planId: string;
  createdAt: string;
  selectedItems: Array<{
    itemId: string;
    path: string;
    size: number;
    categoryId: string;
    risk: string;
    action: string;
    reversible: boolean;
  }>;
  estimatedBytes: number;
  riskSummary: string[];
  requiresAdmin: boolean;
  warnings: string[];
};

export type CleanupResult = {
  planId: string;
  startedAt: string;
  finishedAt: string;
  success: boolean;
  cleanedBytes: number;
  cleanedItems: number;
  skippedItems: number;
  failedItems: number;
  failures: Array<{ path: string; reason: string }>;
  reportMarkdown: string;
};

export type MovePlan = {
  planId: string;
  createdAt: string;
  source: string;
  target: string;
  mode: string;
  estimatedBytes: number;
  itemCount: number;
  risk: string;
  requiresAdmin: boolean;
  reversible: boolean;
  selectedItems: MovePlanItem[];
  warnings: string[];
};

export type MovePlanItem = {
  source: string;
  target: string;
  size: number;
  sha256: string;
};

export type MoveReceipt = {
  source: string;
  target: string;
  size: number;
  sourceSha256: string;
  targetSha256: string;
};

export type MoveResult = {
  planId: string;
  success: boolean;
  movedBytes: number;
  movedItems: number;
  sourceBackup?: string;
  targetPath: string;
  junctionCreated: boolean;
  failures: string[];
  rollbackId?: string;
  receipts: MoveReceipt[];
  reportMarkdown: string;
};

export type RollbackRecord = {
  rollbackId: string;
  createdAt: string;
  operationType: string;
  source: string;
  target: string;
  backupPath?: string;
  junctionPath?: string;
  reversible: boolean;
  movedFiles: MoveReceipt[];
  notes: string[];
};

export type PartitionInfo = {
  diskIndex: string;
  partitionIndex: string;
  driveLetter?: string;
  size: number;
  fileSystem?: string;
  partitionType: string;
  isBoot: boolean;
  isSystem: boolean;
  isRecovery: boolean;
  isEmpty: boolean;
};

export type PartitionLayoutReport = {
  systemDisk: string;
  cPartition: PartitionInfo;
  adjacentRight?: PartitionInfo;
  unallocatedAfterC?: number;
  recoveryPartitionBlocks: boolean;
  dPartitionSameDisk: boolean;
  bitlockerSuspected: boolean;
  canExtendSafely: boolean;
  canDeleteEmptyAdjacentPartition: boolean;
  resultLevel: string;
  explanation: string;
  suggestedActions: string[];
};

export type ExpansionPlan = {
  planId: string;
  mode: string;
  canExecute: boolean;
  requiresAdmin: boolean;
  estimatedAddedBytes: number;
  commandsPreview: string[];
  risks: string[];
  backupRequired: boolean;
  explanation: string;
};

export type ExpansionResult = {
  planId: string;
  success: boolean;
  beforeFree: number;
  afterFree: number;
  beforeTotal: number;
  afterTotal: number;
  output: string;
  reportMarkdown: string;
};

export type DiskVolumeInfo = {
  drive: string;
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usedPercent: number;
  fileSystem?: string;
  diskKind: string;
  removable: boolean;
  readOnly: boolean;
  systemVolume: boolean;
  archiveTargetEligible: boolean;
  archiveTargetReason: string;
  risk: string;
};

export type RecycleBinItem = {
  id: string;
  name: string;
  originalPath: string;
  recyclePath: string;
  sourceDrive: string;
  size: number;
  deletedAt: string;
  recoverable: boolean;
};

export type RecycleBinVolumeSummary = {
  drive: string;
  itemCount: number;
  totalBytes: number;
  recoverableCount: number;
};

export type RecycleBinReport = {
  generatedAt: string;
  itemCount: number;
  totalBytes: number;
  recoverableCount: number;
  items: RecycleBinItem[];
  volumes: RecycleBinVolumeSummary[];
  warnings: string[];
};

export type RecycleBinCleanupPlan = {
  planId: string;
  createdAt: string;
  selectedDrives: string[];
  itemIds: string[];
  itemCount: number;
  estimatedBytes: number;
  snapshotFingerprint: string;
  riskLevel: "critical";
  warnings: string[];
};

export type RecycleBinCleanupResult = {
  planId: string;
  success: boolean;
  beforeItemCount: number;
  beforeBytes: number;
  afterItemCount: number;
  afterBytes: number;
  cleanedItems: number;
  cleanedBytes: number;
  selectedDrives: string[];
  failures: string[];
  message: string;
};

export type MaintenanceOverview = {
  cDrive: DiskVolumeInfo;
  volumes: DiskVolumeInfo[];
  safeCleanEstimate: number;
  moveEstimate: number;
  devCacheEstimate: number;
  largeFileCount: number;
  startupCount: number;
  memorySummary?: {
    totalBytes: number;
    usedBytes: number;
    availableBytes: number;
    usedPercent: number;
  };
  riskLevel: string;
  summary: string;
  suggestions: string[];
};


export type LargeFileItem = {
  fileName: string;
  path: string;
  directory: string;
  extension: string;
  size: number;
  modifiedAt?: string;
  fileType: string;
  sourceCategory: string;
  exists: boolean;
  canOpen: boolean;
  canLocate: boolean;
  openStatus: string;
  suggestion: string;
  risk: string;
  actionable: boolean;
  blockedReason?: string | null;
};

export type ArchivePlanItem = {
  id: string;
  path: string;
  size: number;
  source: string;
  addedAt: string;
  suggestion: string;
};

export type GenericArchivePlan = {
  planId: string;
  createdAt: string;
  targetRoot: string;
  estimatedBytes: number;
  riskLevel: string;
  entries: Array<{
    id: string;
    source: string;
    target: string;
    size: number;
    sha256: string;
    conflict: boolean;
    conflictReason: string;
  }>;
  warnings: string[];
};

export type GenericArchiveResult = {
  planId: string;
  success: boolean;
  movedItems: number;
  movedBytes: number;
  skippedItems: number;
  failures: string[];
  verifiedTargets: string[];
  rollbackGuidance: string[];
  receiptPath: string;
};

export type DuplicateGroup = {
  size: number;
  hash: string;
  files: Array<{ path: string; modifiedAt?: string; keepSuggestion: string }>;
  reclaimableEstimate: number;
};

export type FolderUsageReport = {
  name: string;
  path: string;
  totalBytes: number;
  fileCount: number;
  folderCount: number;
  protectedCount: number;
  categories: Array<{
    name: string;
    path: string;
    size: number;
    category: string;
    suggestion: string;
    details: LargeFileItem[];
  }>;
  topFiles: LargeFileItem[];
  suggestions: string[];
  warnings: string[];
};

export type InstalledSoftwareUsage = {
  name: string;
  publisher: string;
  installLocation: string;
  estimatedSize: number;
  uninstallCommandExists: boolean;
  suggestion: string;
};

export type AppUsageItem = {
  name: string;
  detected: boolean;
  path: string;
  size: number;
  categories: FolderUsageReport["categories"];
  safeActions: string[];
  warnings: string[];
};

export type AppUsageReport = {
  wechat?: AppUsageItem;
  qq?: AppUsageItem;
  browsers: AppUsageItem[];
  netDisks: AppUsageItem[];
  videoEditors: AppUsageItem[];
  gamePlatforms: AppUsageItem[];
  installedSoftware: InstalledSoftwareUsage[];
};

export type EnvironmentConfigPreview = {
  previewId: string;
  createdAt: string;
  changes: Array<{ name: string; current: string; proposed: string; impact: string }>;
  pathAdded: string[];
  pathRemoved: string[];
  warnings: string[];
  backupName: string;
};

export type EnvironmentBackupInfo = {
  fileName: string;
  createdAt: string;
  devenvHome: string;
  javaHome: string;
  pathEntries: number;
};

