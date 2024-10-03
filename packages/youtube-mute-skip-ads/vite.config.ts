import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

const canonicalUrl =
  "https://ion1.github.io/userscripts/youtube-mute-skip-ads.user.js";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    outDir: "../../dist",
    cssMinify: false,
  },
  plugins: [
    monkey({
      entry: "src/main.ts",
      build: {
        fileName: `youtube-mute-skip-ads${mode === "development" ? ".debug" : ""}.user.js`,
      },
      userscript: {
        name: "YouTube Mute and Skip Ads",
        namespace: "https://github.com/ion1/userscripts",
        match: ["*://www.youtube.com/*", "*://music.youtube.com/*"],
        icon: "https://www.google.com/s2/favicons?sz=64&domain=youtube.com",
        updateURL: canonicalUrl,
        downloadURL: canonicalUrl,
        // Display any post-reload notification ASAP.
        "run-at": "document-body",
      },
    }),
  ],
}));
