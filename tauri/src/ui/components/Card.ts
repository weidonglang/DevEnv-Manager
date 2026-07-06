export function card(title: string, body: string, className = ""): string {
  return `<section class="card ${className}"><h2>${title}</h2>${body}</section>`;
}
