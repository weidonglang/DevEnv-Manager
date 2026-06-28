type ToastOptions = {
  sticky?: boolean;
  durationMs?: number;
  kind?: "info" | "success" | "warning" | "error";
};

let toastTimer: number | null = null;

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

export function hideToast() {
  if (toastTimer !== null) {
    window.clearTimeout(toastTimer);
    toastTimer = null;
  }
  const toast = document.querySelector<HTMLElement>("#toast");
  if (!toast) return;
  toast.hidden = true;
  toast.innerHTML = "";
}

export function showToast(message: string, isError = false, options: ToastOptions = {}) {
  const toast = document.querySelector<HTMLElement>("#toast");
  if (!toast) return;
  if (toastTimer !== null) {
    window.clearTimeout(toastTimer);
    toastTimer = null;
  }
  const kind = options.kind || (isError ? "error" : "info");
  const longError = isError && message.length > 180;
  toast.innerHTML = `
    <div class="toast-content">
      ${
        longError
          ? `<details><summary>${escapeHtml(message.slice(0, 120))}...</summary><pre>${escapeHtml(message)}</pre></details>`
          : `<span class="toast-message">${escapeHtml(message)}</span>`
      }
    </div>
    <button class="toast-close" data-action="hide-toast" aria-label="关闭通知">×</button>
  `;
  toast.hidden = false;
  toast.classList.toggle("error", isError);
  toast.classList.toggle("warning", kind === "warning");
  const duration = options.sticky ? 0 : options.durationMs ?? (isError ? 0 : kind === "warning" ? 9000 : 5000);
  if (duration > 0) {
    toastTimer = window.setTimeout(() => hideToast(), duration);
  }
}
