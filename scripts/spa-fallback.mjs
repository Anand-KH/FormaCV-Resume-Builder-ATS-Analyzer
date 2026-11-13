// Surge serves 200.html for any path it doesn't have. Copying index.html
// there lets deep links and refreshes (/dashboard, /resume/:id, /ats) load
// the app, which then shows the right page via client-side routing.
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const index = join(dist, "index.html");
if (!existsSync(index)) throw new Error("dist/index.html not found. Run the build first.");
copyFileSync(index, join(dist, "200.html"));
console.log("SPA fallback ready: dist/200.html");
