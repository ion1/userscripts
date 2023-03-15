// @ts-ignore isolatedModules

import "./main.css";

import { debugging } from "./debugging";

import { Watcher } from "./watcher";
import { showNotification } from "./notification";

const logPrefix = "youtube-mute-skip-ads:";

// Reload the page if an unskippable ad with a longer length starts playing.
const adMaxTime = 7;

const notificationKey = "youtube-mute-skip-ads-notification";
const restoreFocusKey = "youtube-mute-skip-ads-restore-focus";

const playerId = "movie_player";
const videoSelector = "#movie_player video";
const muteButtonClass = "ytp-mute-button";

type ParsedText<T> = { text: string; parsed: T };

type AdState = {
  reloading: boolean;
  adCounter: ParsedText<number[]> | null;
  // In the bottom left of the video.
  adDurationRemaining: ParsedText<number> | null;
  // The preskip might exist but not have a countdown.
  hasPreskip: boolean;
  // In the preskip box preceding the skip button.
  preskipRemaining: ParsedText<number> | null;
};

const adState: AdState = {
  reloading: false,
  adCounter: null,
  adDurationRemaining: null,
  hasPreskip: false,
  preskipRemaining: null,
};

function reloadNotification(description: string): void {
  showNotification({ heading: "⟳ Reloading", description });
  sessionStorage.setItem(notificationKey, description);
}

function reloadedNotification(): void {
  const description = sessionStorage.getItem(notificationKey);
  sessionStorage.removeItem(notificationKey);

  if (description != null) {
    showNotification({ heading: "✓ Reloaded", description, fadeOut: true });
  }
}
reloadedNotification();

function storeFocusState(): void {
  const id = document.activeElement?.id;
  if (id != null && id !== "") {
    sessionStorage.setItem(restoreFocusKey, id);
  }
}

let focusElementId = sessionStorage.getItem(restoreFocusKey);
sessionStorage.removeItem(restoreFocusKey);

function restoreFocusState(elem: HTMLElement): void {
  if (focusElementId == null) {
    // Only restore once.
    return;
  }

  console.info(logPrefix, "Restoring focus to", JSON.stringify(elem.id));
  elem.focus();
  focusElementId = null;
}

type VideoProperties = {
  muted: boolean;
};

function setVideoProperties(props: VideoProperties): void {
  const video = document.querySelector(videoSelector);
  if (!(video instanceof HTMLVideoElement)) {
    console.error(
      logPrefix,
      "Expected",
      JSON.stringify(videoSelector),
      "to be a video element, got:",
      video?.cloneNode(true)
    );
    return;
  }

  // Mute the video element directly, leaving the mute state of the YouTube player
  // unchanged (whether muted or unmuted by the user).
  if (props.muted != null) {
    video.muted = props.muted;
  }
}

// Toggle the mute button twice to reset video.muted to the user preference,
// whether muted or unmuted.
function toggleMuteTwice(): void {
  for (const elem of document.getElementsByClassName(muteButtonClass)) {
    if (!(elem instanceof HTMLElement)) {
      console.error(
        logPrefix,
        "Expected",
        JSON.stringify(muteButtonClass),
        "to be an HTML element, got:",
        elem.cloneNode(true)
      );
      continue;
    }
    elem.click();
    elem.click();
    return;
  }
  console.error(logPrefix, "Failed to find", JSON.stringify(muteButtonClass));
}

function adUIAdded(_elem: Element): void {
  console.info(logPrefix, "An ad is playing, muting");
  setVideoProperties({ muted: true });
}

function adUIRemoved(_elem: Element): void {
  console.info(logPrefix, "An ad is no longer playing, unmuting");
  toggleMuteTwice();
}

function reloadPage(description: string): void {
  const playerElem = document.getElementById(playerId);
  if (playerElem == null) {
    console.error(
      logPrefix,
      "Expected",
      JSON.stringify(playerId),
      "to be a player element, got:",
      playerElem
    );
    return;
  }
  if (!("getCurrentTime" in playerElem)) {
    console.error(
      logPrefix,
      "The player element doesn't have getCurrentTime:",
      playerElem.cloneNode(true)
    );
    return;
  }
  if (typeof playerElem.getCurrentTime !== "function") {
    console.error(
      logPrefix,
      "getCurrentTime is not a function:",
      playerElem.getCurrentTime
    );
    return;
  }
  const currentTime = playerElem.getCurrentTime();
  if (typeof currentTime !== "number") {
    console.error(
      logPrefix,
      "Expected a number, getCurrentTime returned:",
      currentTime
    );
    return;
  }

  reloadNotification(description);

  storeFocusState();

  adState.reloading = true;

  var searchParams = new URLSearchParams(window.location.search);
  searchParams.set("t", `${Math.floor(currentTime)}s`);
  console.info(logPrefix, "Reloading with t =", searchParams.get("t"));
  window.location.search = searchParams.toString();
}

function maybeReloadPage(): void {
  if (adState.reloading) {
    // Already reloading.
    return;
  }

  // If any numbers are parsed and none of them are 1, reload the page.
  if (!!adState.adCounter && !adState.adCounter.parsed.includes(1)) {
    console.info(logPrefix, "Ad counter exceeds 1, reloading page");
    reloadPage(`Reason: ad counter: ${adState.adCounter.text}`);
    return;
  }

  if (!!adState.adDurationRemaining && adState.hasPreskip) {
    let time = adState.adDurationRemaining.parsed;
    if (!!adState.preskipRemaining) {
      // Preskip might not have a number, but if it does, take it into account.
      time = Math.min(time, adState.preskipRemaining.parsed);
    }

    if (time > adMaxTime) {
      console.info(
        logPrefix,
        "Ad duration remaining exceeds maximum, reloading page:",
        time,
        ">",
        adMaxTime
      );
      reloadPage(`Reason: ad duration: ${time}\u00A0s`);
      return;
    }
  }
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
    adState.adCounter = null;
    return;
  }

  // Get the individual numbers, such as [1, 2].
  const counter = (text.match(/[0-9]+/g) ?? []).map(Number);
  if (counter.length === 0) {
    adState.adCounter = null;
    return;
  }

  adState.adCounter = { text: text, parsed: counter };

  maybeReloadPage();
}

function durationRemainingUpdated(fullText: string | null): void {
  if (debugging) {
    console.debug(logPrefix, "Duration remaining:", JSON.stringify(fullText));
  }

  // The format is "0:15".
  const match = fullText?.match(/^(?:(?:([0-9]+):)?([0-9]+):)?([0-9]+)$/);
  if (match == null) {
    adState.adDurationRemaining = null;
    return;
  }

  const text = match[0];
  const h = Number(match[1] ?? 0);
  const m = Number(match[2] ?? 0);
  const s = Number(match[3] ?? 0);

  // Add 1 since 0:00.999 is rounded down to 0:00. This is consistent with how the
  // preskip remaining time is calculated.
  const time = (h * 60 + m) * 60 + s + 1;

  adState.adDurationRemaining = { text, parsed: time };

  maybeReloadPage();
}

function preskipUpdated(fullText: string | null): void {
  if (debugging) {
    console.debug(logPrefix, "Preskip remaining:", JSON.stringify(fullText));
  }

  adState.hasPreskip = fullText != null;

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
    adState.preskipRemaining = null;
  } else {
    adState.preskipRemaining = { text, parsed: Number(text) };
  }

  maybeReloadPage();
}

function click(description: string) {
  return (elem: HTMLElement) => {
    console.info(logPrefix, "Clicking:", description);
    elem.click();
  };
}

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

watcher
  .tag("ytmusic-you-there-renderer")
  .tag("button")
  .lifecycle(click("are-you-there"));
