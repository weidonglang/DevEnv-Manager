import assert from "node:assert/strict";
import fs from "node:fs";

const read = (relativePath) => fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");
const backend = read("../src-tauri/src/lib.rs");
const bootstrap = read("../src/app/bootstrap.ts");
const component = read("../src/components/onboardingGuide.ts");
const settingsRender = read("../src/features/settings/render.ts");
const settingsEvents = read("../src/features/settings/events.ts");
const types = read("../src/types/index.ts");
const styles = read("../src/styles.css");
const english = read("../src/core/locales/en-US.ts");
const chinese = read("../src/core/locales/zh-CN.ts");

assert.match(backend, /#\[serde\(default\)\]\s+onboarding_completed: bool/);
assert.match(backend, /fn complete_onboarding\(\)/);
assert.match(backend, /settings\.onboarding_completed = true/);
assert.match(backend, /accept_safety_disclaimer,\s+complete_onboarding,/);
assert.match(types, /onboardingCompleted: boolean/);
assert.match(bootstrap, /if \(config\.settings\.onboardingCompleted \|\| onboardingSessionShown\) return/);
assert.match(bootstrap, /onboardingSessionShown = true/);
assert.match(bootstrap, /invoke<OperationResult>\("complete_onboarding"\)/);
assert.doesNotMatch(bootstrap, /localStorage[^\n]*onboarding/i);

for (const selector of ["onboarding-dialog", "onboarding-skip", "onboarding-back", "onboarding-next"]) {
  assert.ok(component.includes(selector), `missing onboarding selector ${selector}`);
}
for (const selector of ["onboarding-step-1", "onboarding-step-2", "onboarding-step-3", "onboarding-step-4"]) {
  assert.ok(component.includes(selector), `missing onboarding step selector ${selector}`);
}
for (const key of ["onboarding.welcome.title", "onboarding.navigate.title", "onboarding.workflow.title", "onboarding.start.title", "onboarding.finish"]) {
  assert.ok(english.includes(`\"${key}\"`), `missing English onboarding key ${key}`);
  assert.ok(chinese.includes(`\"${key}\"`), `missing Chinese onboarding key ${key}`);
}
assert.match(component, /event\.key === "Escape"/);
assert.match(component, /await options\.onDismiss\?\.\(\)/);
assert.match(settingsRender, /show-onboarding-guide/);
assert.match(settingsEvents, /showOnboardingGuide\(\)/);
assert.match(styles, /\.onboarding-overlay\s*\{/);
assert.match(styles, /\.onboarding-dialog\s*\{[^}]*max-height:/s);
assert.match(styles, /background: var\(--color-surface/);

console.log("Onboarding acceptance passed (first-run persistence, bilingual steps, manual reopen, and theme-safe layout).");
