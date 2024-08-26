import { logPrefix } from "./log";

export const playerId = "movie_player";
export const videoSelector = "#movie_player video";
export const muteButtonSelector =
  ":is(.ytp-mute-button, ytmusic-player-bar tp-yt-paper-icon-button.volume)";

export type PlayerState = {
  currentTime: number;
  duration: number;
  isLive: boolean;
};

export function getVideoElement(): HTMLVideoElement | null {
  const videoElem = document.querySelector(videoSelector);
  if (!(videoElem instanceof HTMLVideoElement)) {
    console.error(
      logPrefix,
      "Expected",
      JSON.stringify(videoSelector),
      "to be a video element, got:",
      videoElem?.cloneNode(true),
    );
    return null;
  }
  return videoElem;
}

export function getMuteButton(): HTMLElement | null {
  for (const elem of document.querySelectorAll(muteButtonSelector)) {
    if (!(elem instanceof HTMLElement)) {
      console.error(
        logPrefix,
        "Expected",
        JSON.stringify(muteButtonSelector),
        "to be an HTML element, got:",
        elem.cloneNode(true),
      );
      continue;
    }
    return elem;
  }
  console.error(
    logPrefix,
    "Failed to find",
    JSON.stringify(muteButtonSelector),
  );
  return null;
}

export function callMoviePlayerMethod(
  name: string,
  onSuccess?: () => void,
  args?: unknown[],
): void {
  try {
    const movieElem = document.getElementById("movie_player");

    if (movieElem == null) {
      console.warn(logPrefix, "movie_player element not found");
      return;
    }

    const method: unknown = Object.getOwnPropertyDescriptor(
      movieElem,
      name,
    )?.value;
    if (method == null) {
      console.warn(
        logPrefix,
        `movie_player element has no ${JSON.stringify(name)} property`,
      );
      return;
    }

    if (!(typeof method === "function")) {
      console.warn(
        logPrefix,
        `movie_player element property ${JSON.stringify(name)} is not a function`,
      );
      return;
    }

    method.apply(movieElem, args);

    if (onSuccess != null) {
      onSuccess();
    }
  } catch (e) {
    console.warn(
      logPrefix,
      `movie_player method ${JSON.stringify(name)} failed:`,
      e,
    );
  }
}
