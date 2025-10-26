import { error, warn } from "./log";

export const playerId = "movie_player";
export const videoSelector = "#movie_player video";
export const muteButtonSelector =
  ":is(.ytp-mute-button, ytdDesktopShortsVolumeControlsMuteIconButton, ytmusic-player-bar tp-yt-paper-icon-button.volume)";
export const shortsPlayerId = "shorts-player";
export const shortsVideoSelector = "#shorts-player video";
export const shortsDownButtonSelector = "#navigation-button-down button";

export type PlayerState = {
  currentTime: number;
  duration: number;
  isLive: boolean;
};

export function getVideoElement(): HTMLVideoElement | null {
  return getVideoElementBySelector(videoSelector);
}

export function getShortsVideoElement(): HTMLVideoElement | null {
  return getVideoElementBySelector(shortsVideoSelector);
}

export function getVideoElementBySelector(
  selector: string,
): HTMLVideoElement | null {
  const videoElem = getHTMLElementBySelector(selector);
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
  return getHTMLElementBySelector(muteButtonSelector);
}

export function getShortsDownButton(): HTMLElement | null {
  return getHTMLElementBySelector(shortsDownButtonSelector);
}

export function getHTMLElementBySelector(selector: string): HTMLElement | null {
  for (const elem of document.querySelectorAll(selector)) {
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
  error("Failed to find", JSON.stringify(selector));
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
