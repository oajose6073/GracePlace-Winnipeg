import { copyFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { defineConfig, type Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";

const OUT_DIR = "dist";

/**
 * GitHub Pages serves static files only, so a direct visit to /give has no
 * file to match and falls through to 404.html. Shipping a copy of the app
 * shell there lets the router take over and render the right page.
 * `.nojekyll` stops Pages from running the output through Jekyll.
 */
function githubPagesFallback(): Plugin {
  return {
    name: "github-pages-fallback",
    apply: "build",
    closeBundle() {
      const out = resolve(process.cwd(), OUT_DIR);
      copyFileSync(resolve(out, "index.html"), resolve(out, "404.html"));
      writeFileSync(resolve(out, ".nojekyll"), "");
    },
  };
}

// The site is served from a GitHub Pages project page, so every asset URL has
// to be prefixed with the repo name. `npm run dev` stays at "/".
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/GracePlace-Winnipeg/" : "/",
  build: { outDir: OUT_DIR },
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
    githubPagesFallback(),
  ],
}));
