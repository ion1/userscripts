import { debugging } from "./debugging";
import { logPrefix } from "./log";
import { showNotification } from "./notification";
import { getCurrentTimeAndDuration, getVideoElement } from "./utils";

// Reload the page if an unskippable ad with a longer length starts playing.
const adMaxTime = 7;

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

type State =
  | { id: "not-reloading" }
  | { id: "pausing"; description: string; currentTime: number }
  | { id: "reloading" }
  | { id: "reload-canceled" }
  | { id: "disabled" };

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
    this.state = { id: "not-reloading" };

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
      case "not-reloading":
        return this.dispatchWhileNotReloading();
      case "pausing":
        return this.dispatchWhilePausing();
      case "reloading":
        return this.dispatchWhileReloading();
      case "reload-canceled":
        return this.dispatchWhileReloadCanceled();
      case "disabled":
        return this.dispatchWhileDisabled();
      default:
        const impossible: never = this.state;
        throw new Error(`Impossible state: ${JSON.stringify(impossible)}`);
    }
  }

  enterNotReloading(): void {
    this.setState({ id: "not-reloading" });
  }

  dispatchWhileNotReloading(): void {
    if (this.inYouTubeMusic) {
      return this.enterDisabled(
        "Not reloading on YouTube Music; it messes up random playlists"
      );
    }

    if (this.adCounter != null && !this.adCounter.parsed.includes(1)) {
      console.info(logPrefix, "Ad counter exceeds 1, reloading page");
      return this.maybeReload(`Reason: ad counter: ${this.adCounter.text}`);
    }

    if (this.adDurationRemaining != null && this.hasPreskip) {
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
        return this.maybeReload(`Reason: ad duration: ${time}\u00A0s`);
      }
    }
  }

  maybeReload(description: string): void {
    const currentTimeAndDuration = getCurrentTimeAndDuration();
    if (currentTimeAndDuration == null) {
      // The function logs the error.
      return;
    }
    const { currentTime, duration } = currentTimeAndDuration;

    if (debugging) {
      console.debug(
        logPrefix,
        "currentTime:",
        currentTime,
        "duration:",
        duration
      );
    }

    if (Math.floor(currentTime) === Math.floor(duration)) {
      // Do not reload if we are at the very end of the video. Trying to seek to the last
      // second seems to jump back to the beginning.
      if (debugging) {
        console.debug(logPrefix, "Not reloading; at the end of the video");
      }
      return;
    }

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

    var searchParams = new URLSearchParams(window.location.search);
    searchParams.set("t", `${Math.floor(currentTime)}s`);
    console.info(logPrefix, "Reloading with t =", searchParams.get("t"));
    window.location.search = searchParams.toString();

    this.setState({ id: "reloading" });
  }

  dispatchWhileReloading(): void {
    // Nothing to do in general, except if the reload was prevented somehow. In that
    // case, just go back to not-reloading if the ad is gone.
    if (this.adDurationRemaining == null && !this.hasPreskip) {
      if (debugging) {
        console.debug(
          logPrefix,
          "Watcher:",
          JSON.stringify({
            adDurationRemaining: this.adDurationRemaining,
            hasPreskip: this.hasPreskip,
          })
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

      this.enterNotReloading();
    }, 100);
  }

  dispatchWhileReloadCanceled(): void {
    // Nothing to do until the timer is done.
    return;
  }

  enterDisabled(reason: string): void {
    console.info(logPrefix, reason);
    this.setState({ id: "disabled" });
  }

  dispatchWhileDisabled(): void {
    if (!this.inYouTubeMusic) {
      return this.enterNotReloading();
    }
  }
}
