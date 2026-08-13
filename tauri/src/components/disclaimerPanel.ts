export function disclaimerPanel(text: string) {
  return `<section class="disclaimer-panel"><h2>使用前请阅读</h2><p>${text}</p><button id="accept-safety-disclaimer">我已了解，只使用我确认过的操作</button></section>`;
}
