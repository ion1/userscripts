// Required with vite-plugin-monkey.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore isolatedModules

import "./main.css";

import { debug, debugging, info, warn } from "./log";
import {
  observeAttr,
  observeHasClass,
  observeSelector,
  observeVisible,
} from "./observe";
import {
  getVideoElement,
  callMoviePlayerMethod,
  getShortsVideoElement,
  getShortsDownButton,
} from "./utils";
import { disableVisibilityChecks } from "./disableVisibilityChecks";

function main(): void {
  disableVisibilityChecks();

  const adPlayerOverlaySelectors = [
    ".ytp-ad-player-overlay",
    ".ytp-ad-player-overlay-layout", // Seen since 2024-04-06.
  ];
  for (const adPlayerOverlaySelector of adPlayerOverlaySelectors) {
    observeSelector({
      selector: adPlayerOverlaySelector,
      name: adPlayerOverlaySelector,
      onAdded: adIsPlaying,
    });
  }

  observeSelector({
    selector: "#shorts-player",
    name: "#shorts-player",
    onAdded({ elem: shortsRenderer, signal }) {
      observeHasClass({
        elem: shortsRenderer,
        name: "#shorts-player",
        className: "ad-created",
        signal,
        onAdded: shortsAdIsPlaying,
      });
    },
  });

  observeSelector({
    selector: "#movie_player",
    name: "#movie_player",
    onAdded({ elem: moviePlayer, signal }) {
      const adSkipButtonSelectors = [
        ".ytp-ad-skip-button",
        ".ytp-ad-skip-button-modern", // Seen since 2023-11-10.
        ".ytp-skip-ad-button", // Seen since 2024-04-06.
      ];
      // For video ads, .ytp-ad-skip-button is within .ytp-ad-player-overlay,
      // but for fallback ads when the video fails to load, it's within
      // ytp-ad-module. All of them are within #movie_player.

      for (const adSkipButtonSelector of adSkipButtonSelectors) {
        const name = `#movie_player ${adSkipButtonSelector}`;

        observeSelector({
          root: moviePlayer,
          selector: adSkipButtonSelector,
          name,
          signal,
          onAdded({ elem: button, signal }) {
            observeVisible({
              elem: button,
              name,
              signal,
              onVisible({ signal }) {
                observeAttr({
                  elem: button,
                  name,
                  attr: "aria-hidden",
                  signal,
                  onChanged(ariaHidden) {
                    if (ariaHidden === null) {
                      /// The aria-hidden attribute was removed.
                      click(button, `skip (${adSkipButtonSelector})`);
                    }
                  },
                });
              },
            });
          },
        });
      }
    },
  });

  observeSelector({
    selector: ".ytp-ad-overlay-close-button",
    name: ".ytp-ad-overlay-close-button",
    onAdded({ elem: button, signal }) {
      observeVisible({
        elem: button,
        name: ".ytp-ad-overlay-close-button",
        signal,
        onVisible() {
          click(button, ".ytp-ad-overlay-close-button");
        },
      });
    },
  });

  observeSelector({
    selector: "ytmusic-you-there-renderer button",
    name: "are-you-there",
    onAdded({ elem: button, signal }) {
      observeVisible({
        elem: button,
        name: "are-you-there",
        signal,
        onVisible() {
          click(button, "are-you-there");
        },
      });
    },
  });

  if (debugging) {
    debug(`Started`);
  }
}
function adIsPlaying({ signal }: { signal: AbortSignal }): void {
  info("An ad is playing, muting and speeding up");

  const video = getVideoElement();
  if (video == null) {
    // The function logs the error.
    return;
  }

  mute(video);
  speedup(video, signal);
  cancelPlayback(video, signal);
}

export function shortsAdIsPlaying({ signal }: { signal: AbortSignal }): void {
  info("A shorts ad is playing, muting and skipping");

  const video = getShortsVideoElement();
  if (video == null) return;

  mute(video);

  oncePlaying({
    elem: video,
    signal,
    onWaiting() {
      if (debugging) {
        debug(
          "Waiting for shorts ad to start playback before clicking down button",
        );
      }
    },
    onPlaying() {
      const downButton = getShortsDownButton();
      if (downButton != null) {
        click(downButton, "down button");
      }
    },
  });
}

function mute(video: HTMLVideoElement): void {
  if (debugging) {
    debug("Muting");
  }

  // Mute the video element directly, leaving the mute state of the YouTube player
  // unchanged (whether muted or unmuted by the user).
  video.muted = true;
}

function speedup(video: HTMLVideoElement, signal: AbortSignal): void {
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

  function onRemoved() {
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
  }

  signal?.addEventListener("abort", onRemoved, { once: true });
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
function cancelPlayback(video: HTMLVideoElement, signal: AbortSignal): void {
  function doCancelPlayback() {
    info("Attempting to cancel playback");
    callMoviePlayerMethod("cancelPlayback", () => {
      // Sometimes the video ends up being paused after cancelPlayback. Make sure
      // it is resumed.
      signal.addEventListener(
        "abort",
        () => {
          resumePlaybackIfNotAtEnd();
        },
        { once: true },
      );
    });
  }

  // Since we resume playback after canceling, make sure to only cancel while
  // the video is playing.
  oncePlaying({
    elem: video,
    signal,
    onWaiting() {
      if (debugging) {
        debug("Ad paused, waiting for it to play before canceling playback");
      }
    },
    onPlaying: doCancelPlayback,
  });
}

function oncePlaying({
  elem,
  signal,
  onWaiting,
  onPlaying,
}: {
  elem: HTMLMediaElement;
  signal: AbortSignal;
  onWaiting?: () => void | undefined;
  onPlaying: () => void;
}): void {
  if (elem.paused || elem.readyState < 3) {
    onWaiting?.();
    elem.addEventListener(
      "playing",
      () => {
        onPlaying();
      },
      { signal, once: true },
    );
  } else {
    onPlaying();
  }
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

function click(elem: Element, description: string): void {
  if (!(elem instanceof HTMLElement)) return;

  if (elem.getAttribute("aria-hidden")) {
    info("Not clicking (aria-hidden):", description);
  } else {
    info("Clicking:", description);
    elem.click();
  }
}

main();
