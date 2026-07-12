export type ToolchainActionBackend = "toolchain" | "platform";

export type ToolchainActionDefinition = {
  id: string;
  ecosystem: "Git" | "Node" | "Python" | "Go" | "Rust" | "Maven" | "Gradle";
  label: string;
  backend: ToolchainActionBackend;
  commandPreview: string;
  readOnly: boolean;
  riskLevel: "readOnly" | "high";
  timeoutSeconds: number;
  valueLabel?: string;
  secondaryLabel?: string;
  valueOptions?: Array<{ value: string; label: string }>;
};

export const toolchainActionDefinitions: ToolchainActionDefinition[] = [
  { id: "git_test_ssh", ecosystem: "Git", label: "Test GitHub SSH", backend: "toolchain", commandPreview: "ssh -T git@github.com", readOnly: true, riskLevel: "readOnly", timeoutSeconds: 15 },
  { id: "git_identity", ecosystem: "Git", label: "Set global Git identity", backend: "toolchain", commandPreview: "git config --global user.name <name> && git config --global user.email <email>", readOnly: false, riskLevel: "high", timeoutSeconds: 30, valueLabel: "User name", secondaryLabel: "Email" },
  { id: "git_generate_ssh", ecosystem: "Git", label: "Generate ED25519 SSH key", backend: "toolchain", commandPreview: "ssh-keygen -t ed25519 -C <email> -f ~/.ssh/id_ed25519 -N ''", readOnly: false, riskLevel: "high", timeoutSeconds: 60, valueLabel: "Key comment email" },
  { id: "corepack_enable", ecosystem: "Node", label: "Enable Corepack", backend: "toolchain", commandPreview: "corepack enable", readOnly: false, riskLevel: "high", timeoutSeconds: 60 },
  { id: "npm_install_pnpm", ecosystem: "Node", label: "Install pnpm globally", backend: "toolchain", commandPreview: "npm install --global pnpm", readOnly: false, riskLevel: "high", timeoutSeconds: 300 },
  { id: "npm_install_yarn", ecosystem: "Node", label: "Install Yarn globally", backend: "toolchain", commandPreview: "npm install --global yarn", readOnly: false, riskLevel: "high", timeoutSeconds: 300 },
  { id: "npm_registry", ecosystem: "Node", label: "Set npm registry", backend: "toolchain", commandPreview: "npm config set registry <allowlisted registry>", readOnly: false, riskLevel: "high", timeoutSeconds: 60, valueLabel: "Registry", valueOptions: [{ value: "official", label: "Official" }, { value: "npmmirror", label: "npmmirror" }] },
  { id: "npm_managed_prefix", ecosystem: "Node", label: "Use managed npm prefix", backend: "toolchain", commandPreview: "npm config set prefix <DevEnv managed directory>", readOnly: false, riskLevel: "high", timeoutSeconds: 60 },
  { id: "python_install_tool", ecosystem: "Python", label: "Install Python tool", backend: "toolchain", commandPreview: "python -m pip install --upgrade <allowlisted package>", readOnly: false, riskLevel: "high", timeoutSeconds: 300, valueLabel: "Package", valueOptions: [{ value: "uv", label: "uv" }, { value: "poetry", label: "Poetry" }, { value: "virtualenv", label: "virtualenv" }] },
  { id: "pip_index", ecosystem: "Python", label: "Set pip index", backend: "toolchain", commandPreview: "python -m pip config set global.index-url <allowlisted index>", readOnly: false, riskLevel: "high", timeoutSeconds: 60, valueLabel: "Index", valueOptions: [{ value: "official", label: "Official" }, { value: "tsinghua", label: "Tsinghua" }, { value: "aliyun", label: "Aliyun" }, { value: "ustc", label: "USTC" }] },
  { id: "go_proxy", ecosystem: "Go", label: "Set GOPROXY", backend: "platform", commandPreview: "Set user GOPROXY to an allowlisted value", readOnly: false, riskLevel: "high", timeoutSeconds: 30, valueLabel: "Proxy", valueOptions: [{ value: "official", label: "proxy.golang.org" }, { value: "goproxy_cn", label: "goproxy.cn" }, { value: "direct", label: "direct" }] },
  { id: "rust_default_stable", ecosystem: "Rust", label: "Set Rust stable default", backend: "platform", commandPreview: "rustup default stable", readOnly: false, riskLevel: "high", timeoutSeconds: 120 },
  { id: "rust_update", ecosystem: "Rust", label: "Update Rust toolchains", backend: "platform", commandPreview: "rustup update", readOnly: false, riskLevel: "high", timeoutSeconds: 600 },
  { id: "maven_mirror", ecosystem: "Maven", label: "Set Maven mirror", backend: "platform", commandPreview: "Write allowlisted ~/.m2/settings.xml mirror with backup", readOnly: false, riskLevel: "high", timeoutSeconds: 30, valueLabel: "Mirror", valueOptions: [{ value: "official", label: "Official" }, { value: "aliyun", label: "Aliyun" }] },
  { id: "gradle_mirror", ecosystem: "Gradle", label: "Set Gradle mirror", backend: "platform", commandPreview: "Write allowlisted ~/.gradle/init.gradle mirror with backup", readOnly: false, riskLevel: "high", timeoutSeconds: 30, valueLabel: "Mirror", valueOptions: [{ value: "official", label: "Official" }, { value: "aliyun", label: "Aliyun" }] },
  { id: "restore_maven_config", ecosystem: "Maven", label: "Restore Maven config", backend: "platform", commandPreview: "Restore latest DevEnv Manager backup of ~/.m2/settings.xml", readOnly: false, riskLevel: "high", timeoutSeconds: 30 },
  { id: "restore_gradle_config", ecosystem: "Gradle", label: "Restore Gradle config", backend: "platform", commandPreview: "Restore latest DevEnv Manager backup of ~/.gradle/init.gradle", readOnly: false, riskLevel: "high", timeoutSeconds: 30 },
];

export function selectedToolchainAction(id: string): ToolchainActionDefinition {
  return toolchainActionDefinitions.find((action) => action.id === id) ?? toolchainActionDefinitions[0];
}

export function defaultActionValue(action: ToolchainActionDefinition): string {
  return action.valueOptions?.[0]?.value ?? "";
}

export function toolchainActionPlanId(action: ToolchainActionDefinition, value: string, secondary: string): string {
  return action.backend === "toolchain"
    ? `${action.id}:${value.trim()}:${secondary.trim()}`
    : `${action.id}:${value.trim()}`;
}
