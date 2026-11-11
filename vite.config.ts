// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";
import path from "node:path";

// Load server-only env vars (e.g. LOVABLE_API_KEY) into process.env for the
// email server routes. Client code still only receives VITE_* vars.
Object.assign(process.env, loadEnv(process.env["NODE_ENV"] ?? "development", process.cwd(), ""));

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      // Exact-match only: React Email needs entities v4.5.0 for these paths, while
      // htmlparser2 v10 imports "entities/decode" from its own nested v7 copy.
      alias: [
        { find: /^entities\/lib\/decode\.js$/, replacement: path.resolve(process.cwd(), "node_modules/entities/lib/decode.js") },
        { find: /^entities\/lib\/encode\.js$/, replacement: path.resolve(process.cwd(), "node_modules/entities/lib/encode.js") },
        { find: /^entities$/, replacement: path.resolve(process.cwd(), "node_modules/entities") },
      ],
    },
  },
});
