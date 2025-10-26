// Required with vite-plugin-monkey.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore isolatedModules

import "./main.css";

import { debug, debugging, info, warn } from "./log";
import {
  Watcher,
  type OnCreatedCallback,
  type OnRemovedCallback,
} from "./watcher";
import { getVideoElement, getMuteButton, callMoviePlayerMethod } from "./utils";
import { disableVisibilityChecks } from "./disableVisibilityChecks";

// Currently, the video element is replaced after an ad, removing the need to unmute
// it. In the case that changes, enabling this will click on the mute button twice to
// restore the mute status to the user preference.
const unmuteNeeded = false;

function adIsPlaying(_elem: Element): OnRemovedCallback | void {
  info("An ad is playing, muting and speeding up");

  const video = getVideoElement();
  if (video == null) {
    // The function logs the error.
    return;
  }

  const onRemovedCallbacks = [
    mute(video),
    speedup(video),
    cancelPlayback(video),
  ];

  return function onRemoved() {
    for (const callback of onRemovedCallbacks) {
      callback();
    }
  };
}

function mute(video: HTMLVideoElement): OnRemovedCallback {
  if (debugging) {
    debug("Muting");
  }

  // Mute the video element directly, leaving the mute state of the YouTube player
  // unchanged (whether muted or unmuted by the user).
  video.muted = true;

  return unmute;
}

function unmute(): void {
  if (!unmuteNeeded) {
    return;
  }

  info("An ad is no longer playing, unmuting");

  const elem = getMuteButton();
  if (elem == null) {
    // The function logs the error.
    return;
  }

  // Toggle the mute button twice to reset video.muted to the user preference,
  // whether muted or unmuted.
  elem.click();
  elem.click();
}

function speedup(video: HTMLVideoElement): OnRemovedCallback {
  // Speed up the video playback.
  for (let rate = 16; rate >= 2; rate /= 2) {
    if (debugging) {
      debug(`Setting playback rate:`, rate);
    }
    try {
      video.playbackRate = rate;
      break;
    } catch (e) {
      if (debugging) {
        debug(`Setting playback rate to`, rate, `failed:`, e);
      }
    }
  }

  return function onRemoved() {
    const originalRate = callMoviePlayerMethod("getPlaybackRate");
    if (
      originalRate == null ||
      typeof originalRate !== "number" ||
      isNaN(originalRate)
    ) {
      warn(
        `Restoring playback rate failed:`,
        `unable to query the current playback rate, got: ${JSON.stringify(originalRate)}.`,
        `Falling back to 1.`,
      );

      restorePlaybackRate(video, 1);

      return;
    }

    restorePlaybackRate(video, originalRate);
  };
}

function restorePlaybackRate(
  video: HTMLVideoElement,
  originalRate: number,
): void {
  if (debugging) {
    debug(`Restoring playback rate:`, originalRate);
  }
  try {
    video.playbackRate = originalRate;
  } catch (e) {
    if (debugging) {
      debug(`Restoring playback rate to`, originalRate, `failed:`, e);
    }
  }
}

/// Attempt to use the cancelPlayback method on the #movie_player element while
/// the ad is playing.
function cancelPlayback(video: HTMLVideoElement): OnRemovedCallback {
  // Sometimes the video ends up being paused after cancelPlayback. Make sure
  // it is resumed.
  let shouldResume = false;

  function doCancelPlayback() {
    info("Attempting to cancel playback");
    callMoviePlayerMethod("cancelPlayback", () => {
      shouldResume = true;
    });
  }

  // Since we resume playback after cancelling, make sure to only cancel while
  // the video is playing.
  if (video.paused) {
    if (debugging) {
      debug("Ad paused, waiting for it to play before canceling playback");
    }
    video.addEventListener("play", doCancelPlayback);
  } else {
    doCancelPlayback();
  }

  return function onRemoved(): void {
    video.removeEventListener("play", doCancelPlayback);

    if (shouldResume) {
      resumePlaybackIfNotAtEnd();
    }
  };
}

function resumePlaybackIfNotAtEnd(): void {
  const currentTime = callMoviePlayerMethod("getCurrentTime");
  const duration = callMoviePlayerMethod("getDuration");
  const isAtLiveHead = callMoviePlayerMethod("isAtLiveHead");

  if (
    currentTime == null ||
    duration == null ||
    typeof currentTime !== "number" ||
    typeof duration !== "number" ||
    isNaN(currentTime) ||
    isNaN(duration)
  ) {
    warn(
      `movie_player methods getCurrentTime/getDuration failed, got time: ${JSON.stringify(currentTime)}, duration: ${JSON.stringify(duration)}`,
    );
    return;
  }

  if (isAtLiveHead == null || typeof isAtLiveHead !== "boolean") {
    warn(
      `movie_player method isAtLiveHead failed, got: ${JSON.stringify(isAtLiveHead)}`,
    );
    return;
  }

  const atEnd = duration - currentTime < 1;

  if (atEnd && !isAtLiveHead) {
    info(
      `Video is at the end (${currentTime}/${duration}), not attempting to resume playback`,
    );
    return;
  }

  info("Attempting to resume playback");
  callMoviePlayerMethod("playVideo");
}

function click(description: string): OnCreatedCallback {
  return (elem: HTMLElement) => {
    if (elem.getAttribute("aria-hidden")) {
      info("Not clicking (aria-hidden):", description);
    } else {
      info("Clicking:", description);
      elem.click();
    }
  };
}

disableVisibilityChecks();

const watcher = new Watcher("body", document.body);

const adPlayerOverlayClasses = [
  "ytp-ad-player-overlay",
  "ytp-ad-player-overlay-layout", // Seen since 2024-04-06.
];
for (const adPlayerOverlayClass of adPlayerOverlayClasses) {
  watcher.klass(adPlayerOverlayClass).onCreated(adIsPlaying);
}

const adSkipButtonClasses = [
  "ytp-ad-skip-button",
  "ytp-ad-skip-button-modern", // Seen since 2023-11-10.
  "ytp-skip-ad-button", // Seen since 2024-04-06.
];
// For video ads, ytp-ad-skip-button is within ytp-ad-player-overlay, but for fallback
// ads when the video fails to load, it's within ytp-ad-module. All of them are within
// movie_player.
for (const adSkipButtonClass of adSkipButtonClasses) {
  watcher
    .id("movie_player")
    .klass(adSkipButtonClass)
    .visible()
    .attr("aria-hidden", (elem, value) => {
      if (value === null) {
        /// The aria-hidden attribute was removed.
        click(`skip (${adSkipButtonClass})`)(elem);
      }
    });
}

watcher
  .klass("ytp-ad-overlay-close-button")
  .visible()
  .onCreated(click("overlay close"));

watcher
  .tag("ytmusic-you-there-renderer")
  .tag("button")
  .visible()
  .onCreated(click("are-you-there"));

//Skip short ads
watcher
  .tag("ytd-reel-video-renderer")
  .klass("ad-created")
  .tag("video")
  .onCreated((elem) => {
    if (debugging) {
      debug(`Short ad detected`);
    }
    if (elem instanceof HTMLVideoElement) mute(elem);
    const button = document.querySelector("#navigation-button-down button");
    if (button instanceof HTMLElement) button.click();
  });

if (debugging) {
  debug(`Started`);
}
