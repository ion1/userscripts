import { debugging } from "./debugging";
import { logPrefix } from "./log";
import { showNotification } from "./notification";
import { getPlayerState, getVideoElement } from "./utils";

// Reload the page if an unskippable ad with a longer length starts playing.
const adMaxTime = 7;
// Reload the page if the ad counter exceeds 1. YouTube started behaving in a more
// annoying way on 2023-03-28 and repeatedly showing long ads after the reload; default
// to false for now.
const adCounterReload = false;

const notificationKey = "youtube-mute-skip-ads-notification";
const restoreFocusKey = "youtube-mute-skip-ads-restore-focus";

function reloadNotification(description: string): void {
  showNotification({ heading: "⟳ Reloading", description });
  sessionStorage.setItem(notificationKey, description);
}

function reloadCanceledNotification(): void {
  showNotification({ heading: "✗ Reload canceled", fadeOut: true });
  sessionStorage.removeItem(notificationKey);
}

// Call this on page load.
export function reloadedNotification(): void {
  const description = sessionStorage.getItem(notificationKey);
  sessionStorage.removeItem(notificationKey);

  if (description != null) {
    showNotification({ heading: "✓ Reloaded", description, fadeOut: true });
  }
}

function storeFocusState(): void {
  const id = document.activeElement?.id;
  if (id != null && id !== "") {
    sessionStorage.setItem(restoreFocusKey, id);
  }
}

function removeFocusState(): void {
  sessionStorage.removeItem(restoreFocusKey);
}

export let focusElementId = sessionStorage.getItem(restoreFocusKey);
removeFocusState();

export function restoreFocusState(elem: HTMLElement): void {
  if (focusElementId == null) {
    // Only restore once.
    return;
  }

  console.info(logPrefix, "Restoring focus to", JSON.stringify(elem.id));
  elem.focus();
  focusElementId = null;
}

/**
 * ┌───────────────────────────────500 ms delay, see enterReloadCanceled───┐
 * │                                                                       │
 * │   ┌───────────┐   ┌─────────┐   ┌───────────┐   ┌─────────────────┐   │
 * └──►│   idle    ├──►│ pausing ├──►│ reloading ├──►│ reload-canceled ├───┘
 *     └─────────┬─┘   └─────────┘   └───────────┘   └─────────────────┘
 *       ▲   ▲   │                     ▲
 *       │   │   └────already paused───┘
 *       │   ▼
 *       │ ┌───────────────┐
 *       │ │ youtube-music │
 *       │ └───────────────┘
 *       ▼
 *     ┌─────────────────┐
 *     │ end-of-video-ad │
 *     └─────────────────┘
 */

type State =
  | { id: "idle" }
  | { id: "pausing"; description: string; currentTime: number }
  | { id: "reloading" }
  | { id: "reload-canceled" }
  | { id: "youtube-music" }
  | { id: "end-of-video-ad" };

export type ParsedText<T> = {
  text: string;
  parsed: T;
};

export class Reloader {
  state: State;

  adCounter: ParsedText<number[]> | null;
  // In the bottom left of the video.
  adDurationRemaining: ParsedText<number> | null;
  // The preskip might exist but not have a countdown.
  hasPreskip: boolean;
  // In the preskip box preceding the skip button.
  preskipRemaining: ParsedText<number> | null;

  inYouTubeMusic: boolean;

  constructor() {
    this.state = { id: "idle" };

    this.adCounter = null;
    this.adDurationRemaining = null;
    this.hasPreskip = false;
    this.preskipRemaining = null;

    this.inYouTubeMusic = false;
  }

  updateAdCounter(value: ParsedText<number[]> | null): void {
    this.adCounter = value;
    this.dispatch();
  }

  updateAdDurationRemaining(value: ParsedText<number> | null): void {
    this.adDurationRemaining = value;
    this.dispatch();
  }

  updatePreskip(info: {
    hasPreskip: boolean;
    remaining: ParsedText<number> | null;
  }): void {
    this.hasPreskip = info.hasPreskip;
    this.preskipRemaining = info.remaining;
    this.dispatch();
  }

  updateInYouTubeMusic(inYouTubeMusic: boolean): void {
    this.inYouTubeMusic = inYouTubeMusic;
    this.dispatch();
  }

  setState(state: State): void {
    if (debugging) {
      console.debug(logPrefix, "Watcher state:", JSON.stringify(state));
    }
    this.state = state;
  }

  dispatch(): void {
    switch (this.state.id) {
      case "idle":
        return this.dispatchWhileIdle();
      case "pausing":
        return this.dispatchWhilePausing();
      case "reloading":
        return this.dispatchWhileReloading();
      case "reload-canceled":
        return this.dispatchWhileReloadCanceled();
      case "youtube-music":
        return this.dispatchWhileYouTubeMusic();
      case "end-of-video-ad":
        return this.dispatchWhileEndOfVideoAd();
      default: {
        const impossible: never = this.state;
        throw new Error(`Impossible state: ${JSON.stringify(impossible)}`);
      }
    }
  }

  enterIdle(): void {
    this.setState({ id: "idle" });
  }

  dispatchWhileIdle(): void {
    if (this.inYouTubeMusic) {
      return this.enterYouTubeMusic();
    }

    if (!(this.adDurationRemaining != null && this.hasPreskip)) {
      // An ad is not playing.
      return;
    }

    const playerState = getPlayerState();
    if (playerState == null) {
      // The function logs the error.
      return;
    }
    const { currentTime, duration, isLive } = playerState;

    if (debugging) {
      console.debug(
        logPrefix,
        "currentTime:",
        currentTime,
        "duration:",
        duration
      );
    }

    const endOfVideo =
      duration >= 1 && Math.floor(currentTime) === Math.floor(duration);
    if (endOfVideo && !isLive) {
      // Do not reload if we are at the very end of the video. Trying to seek to the last
      // second seems to jump back to the beginning.
      return this.enterEndOfVideoAd();
    }

    if (
      adCounterReload &&
      this.adCounter != null &&
      !this.adCounter.parsed.includes(1)
    ) {
      console.info(logPrefix, "Ad counter exceeds 1, reloading page");
      return this.doReload({
        description: `Reason: ad counter: ${this.adCounter.text}`,
        currentTime,
      });
    }

    let time = this.adDurationRemaining.parsed;
    if (this.preskipRemaining != null) {
      // Preskip might not have a number, but if it does, take it into account.
      time = Math.min(time, this.preskipRemaining.parsed);
    }

    if (time > adMaxTime) {
      console.info(
        logPrefix,
        "Ad duration remaining exceeds maximum, reloading page:",
        time,
        ">",
        adMaxTime
      );
      return this.doReload({
        description: `Reason: ad duration: ${time}\u00A0s`,
        currentTime,
      });
    }
  }

  doReload(info: { description: string; currentTime: number }): void {
    const { description, currentTime } = info;

    const videoElem = getVideoElement();
    if (videoElem == null) {
      // The function logs the error.
      return;
    }

    if (videoElem.paused) {
      return this.enterReloading({ description, currentTime });
    } else {
      videoElem.addEventListener(
        "pause",
        () => {
          this.paused();
        },
        { once: true }
      );
      videoElem.pause();
      return this.enterPausing({ description, currentTime });
    }
  }

  enterPausing(info: { description: string; currentTime: number }): void {
    this.setState({ id: "pausing", ...info });
  }

  dispatchWhilePausing(): void {
    // Nothing to do until paused.
    return;
  }

  paused(): void {
    if (this.state.id !== "pausing") {
      if (debugging) {
        console.debug(
          logPrefix,
          "Reloader: paused called while state =",
          JSON.stringify(this.state)
        );
      }
      return;
    }

    const { description, currentTime } = this.state;

    // Delay to make sure the YouTube app detects the pausing first.
    setTimeout(() => {
      this.enterReloading({ description, currentTime });
    });
  }

  enterReloading(info: { description: string; currentTime: number }): void {
    const { description, currentTime } = info;

    reloadNotification(description);

    storeFocusState();

    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("t", `${Math.floor(currentTime)}s`);
    console.info(logPrefix, "Reloading with t =", searchParams.get("t"));
    window.location.search = searchParams.toString();

    this.setState({ id: "reloading" });
  }

  dispatchWhileReloading(): void {
    // Nothing to do in general, except if the reload was prevented somehow. In that
    // case, just go back to idle if the ad is gone.

    if (this.adDurationRemaining == null && !this.hasPreskip) {
      // Ad stopped.

      if (debugging) {
        console.debug(
          logPrefix,
          "Ad stopped while a reload was being attempted"
        );
      }

      return this.enterReloadCanceled();
    }
  }

  enterReloadCanceled() {
    removeFocusState();

    this.setState({ id: "reload-canceled" });

    // Show the notification with a small delay to prevent it flashing just before the
    // page reloads due to the YouTube app removing the ad.
    setTimeout(() => {
      reloadCanceledNotification();

      this.enterIdle();
    }, 500);
  }

  dispatchWhileReloadCanceled(): void {
    // Nothing to do until the timer is done.
    return;
  }

  enterYouTubeMusic(): void {
    console.info(
      logPrefix,
      "Not reloading on YouTube Music; it messes up random playlists"
    );
    this.setState({ id: "youtube-music" });
  }

  dispatchWhileYouTubeMusic(): void {
    if (!this.inYouTubeMusic) {
      return this.enterIdle();
    }
  }

  enterEndOfVideoAd(): void {
    if (debugging) {
      console.debug(logPrefix, "End-of-video started; will not reload");
    }

    // Show a notification since it's not visually clear whether an ad is an
    // end-of-video one or not.
    showNotification({ heading: "End of video", fadeOut: true });

    this.setState({ id: "end-of-video-ad" });
  }

  dispatchWhileEndOfVideoAd(): void {
    if (this.adDurationRemaining == null && !this.hasPreskip) {
      // Ad stopped.

      if (debugging) {
        console.debug(logPrefix, "End-of-video ad stopped");
      }

      this.enterIdle();
    }
  }
}
