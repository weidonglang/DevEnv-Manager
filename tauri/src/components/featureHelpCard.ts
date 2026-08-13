export function featureHelpCard(title: string, risk: string, does: string[], notDo: string[]) {
  return `<section class="feature-help-card"><div><h3>${title}</h3><span class="risk-chip risk-${risk}">${risk}</span></div><strong>这个功能能做什么</strong><ul>${does.map((item) => `<li>${item}</li>`).join("")}</ul><strong>这个功能不会做什么</strong><ul>${notDo.map((item) => `<li>${item}</li>`).join("")}</ul></section>`;
}
