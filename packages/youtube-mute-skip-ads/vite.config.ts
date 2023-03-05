import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: "../../dist",
  },
  plugins: [
    monkey({
      entry: "src/main.ts",
      userscript: {
        name: "YouTube Mute and Skip Ads",
        namespace: "https://github.com/ion1/userscripts",
        match: ["*://www.youtube.com/*", "*://music.youtube.com/*"],
        icon: "https://www.google.com/s2/favicons?sz=64&domain=youtube.com",
      },
    }),
  ],
});
