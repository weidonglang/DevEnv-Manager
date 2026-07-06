export type TabItem = {
  id: string;
  label: string;
  active?: boolean;
};

export function tablist(items: TabItem[], name: string): string {
  return `<div class="tablist" role="tablist" aria-label="${name}">${items
    .map((item) => `<button role="tab" aria-selected="${item.active ? "true" : "false"}" data-tab="${item.id}">${item.label}</button>`)
    .join("")}</div>`;
}
