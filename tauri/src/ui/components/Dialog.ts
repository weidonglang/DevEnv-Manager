export function dialog(id: string, title: string, body: string): string {
  return `<dialog id="${id}" class="dialog"><form method="dialog"><h2>${title}</h2>${body}</form></dialog>`;
}
