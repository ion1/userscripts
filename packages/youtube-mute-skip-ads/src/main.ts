// Required with vite-plugin-monkey.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore isolatedModules

import "./main.css";

import { debugging } from "./debugging";

import { logPrefix } from "./log";
import {
  Watcher,
  type OnCreatedCallback,
  type OnRemovedCallback,
} from "./watcher";
import { getVideoElement, getMuteButton } from "./utils";
import { disableVisibilityChecks } from "./disableVisibilityChecks";

// Currently, the video element is replaced after an ad, removing the need to unmute
// it. In the case that changes, enabling this will click on the mute button twice to
// restore the mute status to the user preference.
const unmuteNeeded = false;

function adIsPlaying(_elem: Element): OnRemovedCallback | void {
  console.info(logPrefix, "An ad is playing, muting and speeding up");

  const video = getVideoElement();
  if (video == null) {
    // The function logs the error.
    return;
  }

  const muteRemovedCallback: OnRemovedCallback = mute(video);

  speedup(video);

  return function onRemoved() {
    muteRemovedCallback();
  };
}

function mute(video: HTMLVideoElement): OnRemovedCallback {
  console.debug(logPrefix, "Muting");

  // Mute the video element directly, leaving the mute state of the YouTube player
  // unchanged (whether muted or unmuted by the user).
  video.muted = true;

  return unmute;
}

function unmute(): void {
  if (!unmuteNeeded) {
    return;
  }

  console.info(logPrefix, "An ad is no longer playing, unmuting");

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

function speedup(video: HTMLVideoElement): void {
  // Speed up the video playback.
  for (let rate = 16; rate >= 2; rate /= 2) {
    if (debugging) {
      console.debug(logPrefix, `Setting playback rate:`, rate);
    }
    try {
      video.playbackRate = rate;
      break;
    } catch (e) {
      console.debug(logPrefix, `Setting playback rate to`, rate, `failed:`, e);
    }
  }
}

function click(description: string): OnCreatedCallback {
  return (elem: HTMLElement) => {
    if (elem.getAttribute("aria-hidden")) {
      console.info(logPrefix, "Not clicking (aria-hidden):", description);
    } else {
      console.info(logPrefix, "Clicking:", description);
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
  .klass("ytp-featured-product")
  .klass("ytp-suggested-action-badge-dismiss-button-icon")
  .visible()
  .onCreated(click("suggested action close"));

watcher
  .tag("ytmusic-you-there-renderer")
  .tag("button")
  .visible()
  .onCreated(click("are-you-there"));

if (debugging) {
  console.debug(logPrefix, `Started`);
}
