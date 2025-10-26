import { error, warn } from "./log";

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
    error(
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
      error(
        "Expected",
        JSON.stringify(muteButtonSelector),
        "to be an HTML element, got:",
        elem.cloneNode(true),
      );
      continue;
    }
    return elem;
  }
  error("Failed to find", JSON.stringify(muteButtonSelector));
  return null;
}

export function callMoviePlayerMethod(
  name: string,
  onSuccess?: (result: unknown) => void,
  args?: unknown[],
): unknown | void {
  try {
    const movieElem = document.getElementById("movie_player");

    if (movieElem == null) {
      warn("movie_player element not found");
      return;
    }

    const method: unknown = Object.getOwnPropertyDescriptor(
      movieElem,
      name,
    )?.value;
    if (method == null) {
      warn(`movie_player element has no ${JSON.stringify(name)} property`);
      return;
    }

    if (!(typeof method === "function")) {
      warn(
        `movie_player element property ${JSON.stringify(name)} is not a function`,
      );
      return;
    }

    const result = method.apply(movieElem, args);

    if (onSuccess != null) {
      onSuccess(result);
    }

    return result;
  } catch (e) {
    warn(`movie_player method ${JSON.stringify(name)} failed:`, e);
    return;
  }
}
