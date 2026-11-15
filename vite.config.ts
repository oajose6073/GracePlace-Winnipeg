import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// Served from the root of graceplacewpg.ca on Netlify. Client-side routes such
// as /give are rewritten to index.html by the redirect rule in netlify.toml.
// https://vite.dev/config/
export default defineConfig({
  base: "/",
  build: { outDir: "dist" },
  plugins: [react(), tailwindcss(), babel({ presets: [reactCompilerPreset()] })],
});
