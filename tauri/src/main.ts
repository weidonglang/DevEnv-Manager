import "./ui/theme/tokens.css";
import "./ui/theme/light.css";
import "./ui/theme/dark.css";
import "./ui/theme/high-contrast.css";
import "./styles.css";

import "./app/bootstrap";
import { registerCommandPalette } from "./app/commandPalette";
import { registerWorkbenchLifecycle } from "./app/lifecycle";

registerWorkbenchLifecycle();
registerCommandPalette();
