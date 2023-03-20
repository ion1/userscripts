import { logPrefix } from "./log";

export const playerId = "movie_player";
export const videoSelector = "#movie_player video";
export const muteButtonSelector =
  ":is(.ytp-mute-button, ytmusic-player-bar tp-yt-paper-icon-button.volume)";

export type CurrentTimeAndDuration = {
  currentTime: number;
  duration: number;
};

export function getCurrentTimeAndDuration(): CurrentTimeAndDuration | null {
  const playerElem = document.getElementById(playerId);
  if (playerElem == null) {
    console.error(
      logPrefix,
      "Expected",
      JSON.stringify(playerId),
      "to be a player element, got:",
      playerElem
    );
    return null;
  }
  if (!("getCurrentTime" in playerElem && "getDuration" in playerElem)) {
    console.error(
      logPrefix,
      "The player element doesn't have getCurrentTime/getDuration:",
      playerElem.cloneNode(true)
    );
    return null;
  }
  if (
    typeof playerElem.getCurrentTime !== "function" ||
    typeof playerElem.getDuration !== "function"
  ) {
    console.error(
      logPrefix,
      "getCurrentTime/getDuration is not a function:",
      playerElem.getCurrentTime,
      playerElem.getDuration
    );
    return null;
  }
  const currentTime = playerElem.getCurrentTime();
  const duration = playerElem.getDuration();
  if (typeof currentTime !== "number" || typeof duration !== "number") {
    console.error(
      logPrefix,
      "Expected a number, currentTime:",
      currentTime,
      "duration:",
      duration
    );
    return null;
  }
  return { currentTime, duration };
}

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
