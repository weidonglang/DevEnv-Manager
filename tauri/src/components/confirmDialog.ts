type ConfirmOptions = {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  details?: string[];
  requiredText?: string;
};

function ensureConfirmHost() {
  let host = document.querySelector<HTMLElement>("#confirm-host");
  if (host) return host;
  host = document.createElement("div");
  host.id = "confirm-host";
  document.body.appendChild(host);
  return host;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char] || char;
  });
}

export function askForConfirmation(message: string, options: ConfirmOptions = {}) {
  const host = ensureConfirmHost();
  return new Promise<boolean>((resolve) => {
    const required = options.requiredText?.trim();
    host.innerHTML = `
      <div class="confirm-backdrop" role="presentation">
        <section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
          <div>
            <h2 id="confirm-dialog-title">${escapeHtml(options.title || (options.danger ? "确认高风险操作" : "确认操作"))}</h2>
            <p>${escapeHtml(message)}</p>
          </div>
          ${options.details?.length ? `<ul>${options.details.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
          ${required ? `<label class="confirm-required"><span>请输入确认文本</span><input id="confirm-required-input" autocomplete="off" /></label><small>确认文本：${escapeHtml(required)}</small>` : ""}
          <div class="confirm-actions">
            <button id="confirm-cancel">${escapeHtml(options.cancelText || "取消")}</button>
            <button id="confirm-ok" class="${options.danger ? "danger-button" : "primary"}">${escapeHtml(options.confirmText || "确认")}</button>
          </div>
        </section>
      </div>
    `;
    const cleanup = (answer: boolean) => {
      host.innerHTML = "";
      resolve(answer);
    };
    host.querySelector("#confirm-cancel")?.addEventListener("click", () => cleanup(false), { once: true });
    host.querySelector("#confirm-ok")?.addEventListener("click", () => {
      const input = host.querySelector<HTMLInputElement>("#confirm-required-input");
      if (required && input?.value.trim() !== required) {
        input?.classList.add("invalid");
        input?.focus();
        return;
      }
      cleanup(true);
    });
    host.querySelector<HTMLElement>(".confirm-backdrop")?.addEventListener("click", (event) => {
      if (event.target === event.currentTarget) cleanup(false);
    });
    window.setTimeout(() => host.querySelector<HTMLInputElement>("#confirm-required-input")?.focus(), 0);
  });
}

export async function confirmRisk(message: string, risk: string) {
  if (risk === "critical") {
    return askForConfirmation(message, {
      title: "确认极高风险操作",
      confirmText: "确认执行",
      danger: true,
      requiredText: "我已理解风险并确认执行",
      details: [
        "该操作可能修改环境、进程、服务、文件或数据库状态。",
        "请确认已经备份重要数据，并理解失败后的恢复方式。",
        "前端确认只是交互提示，后端仍必须校验一次性 confirmation token。",
      ],
    });
  }
  if (risk === "high" || risk === "medium") {
    return askForConfirmation(message, {
      title: "确认受保护操作",
      confirmText: "我已阅读风险说明",
      danger: risk === "high",
      details: ["请先核对计划预览、备份信息和影响范围。"],
    });
  }
  return true;
}
