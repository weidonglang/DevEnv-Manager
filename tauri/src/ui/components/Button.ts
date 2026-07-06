export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export function button(label: string, options: { id?: string; variant?: ButtonVariant; icon?: string } = {}): string {
  const variant = options.variant ?? "secondary";
  const icon = options.icon ? `<span class="button__icon">${options.icon}</span>` : "";
  const id = options.id ? ` id="${options.id}"` : "";
  return `<button${id} class="button button--${variant}">${icon}<span>${label}</span></button>`;
}
