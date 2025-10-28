import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";
import { promises as fs } from "fs";
import path from "path";

const canonicalUrl =
  "https://ion1.github.io/userscripts/youtube-mute-skip-ads.user.js";

const metaUrlFor = (url: string) => url.replace(/\.user\.js$/, ".meta.js");

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    target: [
      "es2022",
      "chrome126",
      "edge126",
      "firefox128",
      "opera106",
      "safari17",
    ],
    outDir: "../../dist",
    cssMinify: false,
  },
  plugins: [
    monkey({
      entry: "src/main.ts",
      async generate({ userscript, mode }) {
        if (mode !== "build") {
          return userscript;
        }

        const changelog = await fs.readFile(
          path.resolve(__dirname, "CHANGELOG.md"),
        );

        const changelogComment = changelog
          .toString()
          .trim()
          .split("\n")
          .map((row) => `// ${row}`.trimEnd())
          .join("\n");

        return userscript + "\n\n" + changelogComment;
      },
      build: {
        fileName: `youtube-mute-skip-ads${mode === "development" ? ".debug" : ""}.user.js`,
        metaFileName: mode !== "development",
      },
      userscript: {
        name: "YouTube Mute and Skip Ads",
        namespace: "https://github.com/ion1/userscripts",
        match: ["*://www.youtube.com/*", "*://music.youtube.com/*"],
        icon: "https://www.google.com/s2/favicons?sz=64&domain=youtube.com",
        downloadURL: canonicalUrl,
        updateURL: metaUrlFor(canonicalUrl),
        // Display any post-reload notification ASAP.
        "run-at": "document-body",
      },
    }),
  ],
}));
