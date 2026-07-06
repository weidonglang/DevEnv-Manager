export function progress(value: number, max = 100): string {
  return `<progress class="progress" value="${value}" max="${max}"></progress>`;
}
