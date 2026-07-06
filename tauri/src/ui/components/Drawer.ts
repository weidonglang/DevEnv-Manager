export function drawer(id: string, title: string, body: string): string {
  return `<aside id="${id}" class="drawer" aria-label="${title}"><header>${title}</header>${body}</aside>`;
}
