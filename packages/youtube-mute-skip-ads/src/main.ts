// Required with vite-plugin-monkey.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore isolatedModules

import "./main.css";

import { debugging } from "./debugging";

import { logPrefix } from "./log";
import { Watcher } from "./watcher";
import { getVideoElement, getMuteButton } from "./utils";
import { disableVisibilityChecks } from "./disableVisibilityChecks";

// Currently, the video element is replaced after an ad, removing the need to unmute
// it. In the case that changes, enabling this will click on the mute button twice to
// restore the mute status to the user preference.
const unmuteNeeded = false;

function adUIAdded(_elem: Element): void {
  console.info(logPrefix, "An ad is playing, muting");

  const video = getVideoElement();
  if (video == null) {
    // The function logs the error.
    return;
  }

  // Mute the video element directly, leaving the mute state of the YouTube player
  // unchanged (whether muted or unmuted by the user).
  video.muted = true;

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

function adUIRemoved(_elem: Element): void {
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

function click(description: string) {
  return (elem: HTMLElement) => {
    console.info(logPrefix, "Clicking:", description);
    elem.click();
  };
}

disableVisibilityChecks();

const watcher = new Watcher("body", document.body);

watcher.klass("ytp-ad-player-overlay").lifecycle(adUIAdded, adUIRemoved);

// For video ads, ytp-ad-skip-button is within ytp-ad-player-overlay, but for fallback
// ads when the video fails to load, it's within ytp-ad-module. All of them are within
// movie_player.
watcher
  .id("movie_player")
  .klass("ytp-ad-skip-button")
  .visible()
  .lifecycle(click("skip"));

watcher
  .id("movie_player")
  .klass("ytp-ad-skip-button-modern")
  .visible()
  .lifecycle(click("skip (new)"));

watcher.klass("ytp-ad-overlay-close-button").lifecycle(click("overlay close"));

watcher
  .klass("ytp-featured-product")
  .klass("ytp-suggested-action-badge-dismiss-button-icon")
  .visible()
  .lifecycle(click("suggested action close"));

watcher
  .tag("ytmusic-you-there-renderer")
  .tag("button")
  .lifecycle(click("are-you-there"));
