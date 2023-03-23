// Required with vite-plugin-monkey.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore isolatedModules

import "./main.css";

import { debugging } from "./debugging";

import { logPrefix } from "./log";
import { Watcher } from "./watcher";
import {
  Reloader,
  reloadedNotification,
  focusElementId,
  restoreFocusState,
} from "./reloader";
import { getVideoElement, getMuteButton } from "./utils";
import { disableVisibilityChecks } from "./disableVisibilityChecks";

reloadedNotification();
const reloader = new Reloader();

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
}

function adUIRemoved(_elem: Element): void {
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

function adCounterUpdated(fullText: string | null): void {
  if (debugging) {
    console.debug(logPrefix, "Ad counter:", JSON.stringify(fullText));
  }

  // In English, the format is "Ad 1 of 2 ·".
  // In Finnish, the format is "Mainos 1/2 ·".
  // Get the "1 of 2" or "1/2" part.
  const text = fullText?.match(/[0-9](?:.*[0-9])?/)?.[0] ?? null;
  if (text == null) {
    reloader.updateAdCounter(null);
    return;
  }

  // Get the individual numbers, such as [1, 2].
  const counter = (text.match(/[0-9]+/g) ?? []).map(Number);
  if (counter.length === 0) {
    reloader.updateAdCounter(null);
    return;
  }

  reloader.updateAdCounter({ text: text, parsed: counter });
}

function durationRemainingUpdated(fullText: string | null): void {
  if (debugging) {
    console.debug(logPrefix, "Duration remaining:", JSON.stringify(fullText));
  }

  // The format is "0:15".
  const match = fullText?.match(/^(?:(?:([0-9]+):)?([0-9]+):)?([0-9]+)$/);
  if (match == null) {
    reloader.updateAdDurationRemaining(null);
    return;
  }

  const text = match[0];
  const h = Number(match[1] ?? 0);
  const m = Number(match[2] ?? 0);
  const s = Number(match[3] ?? 0);

  // Add 1 since 0:00.999 is rounded down to 0:00. This is consistent with how the
  // preskip remaining time is calculated.
  const time = (h * 60 + m) * 60 + s + 1;

  reloader.updateAdDurationRemaining({ text, parsed: time });
}

function preskipUpdated(fullText: string | null): void {
  if (debugging) {
    console.debug(logPrefix, "Preskip remaining:", JSON.stringify(fullText));
  }

  const hasPreskip = fullText != null;

  // If the ad is not skippable:
  // In English, the format is one of:
  //   "Ad will end\nin 6"
  //   "Video will play\nafter ads"
  // In Finnish, the format is one of:
  //   "Mainos päättyy\n6 kuluttua"
  //   "Video alkaa\nmainosten jälkeen".

  // If the ad is skippable, the format is "6".
  const text = fullText?.match(/^[^0-9]*([0-9]+)[^0-9]*$/)?.[1];
  if (text == null) {
    reloader.updatePreskip({ hasPreskip, remaining: null });
  } else {
    reloader.updatePreskip({
      hasPreskip,
      remaining: { text, parsed: Number(text) },
    });
  }
}

function click(description: string) {
  return (elem: HTMLElement) => {
    console.info(logPrefix, "Clicking:", description);
    elem.click();
  };
}

disableVisibilityChecks();

const watcher = new Watcher("body", document.body);

if (focusElementId != null) {
  watcher.id(focusElementId).lifecycle(restoreFocusState);
}

const playerOverlay = watcher
  .klass("ytp-ad-player-overlay")
  .lifecycle(adUIAdded, adUIRemoved);

playerOverlay.klass("ytp-ad-simple-ad-badge").text(adCounterUpdated);
playerOverlay.klass("ytp-ad-duration-remaining").text(durationRemainingUpdated);
playerOverlay.klass("ytp-ad-preview-text").text(preskipUpdated);
playerOverlay.klass("ytp-ad-skip-button").visible().lifecycle(click("skip"));

watcher.klass("ytp-ad-overlay-close-button").lifecycle(click("overlay close"));

watcher.tag("ytmusic-app").lifecycle(
  () => {
    reloader.updateInYouTubeMusic(true);
  },
  () => {
    reloader.updateInYouTubeMusic(false);
  }
);

watcher
  .tag("ytmusic-you-there-renderer")
  .tag("button")
  .lifecycle(click("are-you-there"));
