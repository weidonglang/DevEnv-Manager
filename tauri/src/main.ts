import "./styles.css";
import "./ui/theme/tokens.css";
import "./ui/theme/light.css";
import "./ui/theme/dark.css";
import "./ui/theme/high-contrast.css";

import "./app/bootstrap";
import { registerCommandPalette } from "./app/commandPalette";
import { registerWorkbenchLifecycle } from "./app/lifecycle";
import { registerThemeSync } from "./ui/theme/controller";

registerThemeSync();
registerWorkbenchLifecycle();
registerCommandPalette();
