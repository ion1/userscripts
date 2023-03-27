import { logPrefix } from "./log";
import { optional, parse, ParserError } from "./parser";

export const playerId = "movie_player";
export const videoSelector = "#movie_player video";
export const muteButtonSelector =
  ":is(.ytp-mute-button, ytmusic-player-bar tp-yt-paper-icon-button.volume)";

export type PlayerState = {
  currentTime: number;
  duration: number;
  isLive: boolean;
};

export function getPlayerState(): PlayerState | null {
  try {
    const playerElemP = parse(document.getElementById(playerId)).object();

    const currentTime = playerElemP
      .method("getCurrentTime")
      .call()
      .number().value;
    const duration = playerElemP.method("getDuration").call().number().value;
    const isLive =
      optional(
        () =>
          playerElemP
            .method("getPlayerResponse")
            .call()
            .object()
            .property("videoDetails")
            .object()
            .property("isLive")
            .boolean().value
      ) ?? false;

    return { currentTime, duration, isLive };
  } catch (e) {
    if (!(e instanceof ParserError)) {
      throw e;
    }

    console.error(logPrefix, e.message);
    return null;
  }
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
