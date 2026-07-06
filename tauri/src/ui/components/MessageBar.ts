export type MessageTone = "info" | "success" | "warning" | "danger";

export function messageBar(message: string, tone: MessageTone = "info"): string {
  return `<div class="message-bar message-bar--${tone}" role="status">${message}</div>`;
}
