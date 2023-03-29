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
      videoElem?.cloneNode(true)
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
        elem.cloneNode(true)
      );
      continue;
    }
    return elem;
  }
  console.error(
    logPrefix,
    "Failed to find",
    JSON.stringify(muteButtonSelector)
  );
  return null;
}
