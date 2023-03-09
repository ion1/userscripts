// @ts-ignore isolatedModules

import "./main.css";

const logPrefix = "youtube-mute-skip-ads:";

// Reload the page if an ad with a higher count starts playing.
const adMaxCount = 1;
// Reload the page if an unskippable ad with a longer length starts playing.
const adMaxTime = 7;

const playerId = "movie_player";
const videoSelector = "#movie_player video";
const muteButtonClass = "ytp-mute-button";
const adUIClass = "ytp-ad-player-overlay-skip-or-preview";
const adBadgeClass = "ytp-ad-simple-ad-badge";
const preskipClass = "ytp-ad-preview-text";
const skipContainerClass = "ytp-ad-skip-button-slot";
const skipButtonClass = "ytp-ad-skip-button";
const overlayCloseButtonClass = "ytp-ad-overlay-close-button";

function getSelfOrChildrenByClassName(
  node: Node,
  className: string
): ArrayLike<Element> & Iterable<Element> {
  if (!(node instanceof Element)) {
    return [];
  } else if (node.classList.contains(className)) {
    return [node];
  } else {
    return node.getElementsByClassName(className);
  }
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

type YoutubePlayerElement = {
  getCurrentTime(): number;
};

function reloadPage(): void {
  const playerElem = <YoutubePlayerElement | Element | null>(
    document.getElementById(playerId)
  );
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

  const notifDiv = document.createElement("div");
  notifDiv.setAttribute("class", "youtube-mute-skip-ads-reload-notification");
  notifDiv.innerHTML = `<div aria-live="assertive" aria-atomic="true">Reloading<br/><small>(Youtube Mute and Skip Ads)</small></div>`;
  document.body.append(notifDiv);

  const currentTime = playerElem.getCurrentTime();
  if (typeof currentTime !== "number") {
    console.error(
      logPrefix,
      "Expected a number, getCurrentTime returned:",
      currentTime
    );
    return;
  }

  var searchParams = new URLSearchParams(window.location.search);
  searchParams.set("t", `${Math.floor(currentTime)}s`);
  console.info(logPrefix, "Reloading with t =", searchParams.get("t"));
  window.location.search = searchParams.toString();
}

function adBadgeAdded(elem: Element): void {
  // In English, the format is "Ad 1 of 2".
  // In Finnish, the format is "Mainos 1/2".
  const adCounter = elem.textContent?.match(
    /^[^0-9]*([0-9]+)[^0-9]+([0-9]+)[^0-9]*$/
  )?.[1];
  if (adCounter == null) {
    console.error(
      logPrefix,
      "Failed to parse the ad badge:",
      elem.cloneNode(true)
    );
    return;
  }
  console.debug(logPrefix, "Ad badge added with counter =", adCounter);

  if (Number(adCounter) > adMaxCount) {
    console.info(
      logPrefix,
      "Ad counter exceeds maximum, reloading page:",
      adCounter,
      ">",
      adMaxCount
    );
    reloadPage();
  }
}

function preskipAdded(elem: Element): void {
  const adTime = elem.textContent?.match(/^[^0-9]*([0-9]+)[^0-9]*$/)?.[1];
  console.debug(
    logPrefix,
    "Ad preskip added with countdown =",
    adTime,
    ":",
    elem.cloneNode(true)
  );

  if (adTime == null) {
    console.info(logPrefix, "No ad countdown, reloading page");
    reloadPage();
  }

  if (Number(adTime) > adMaxTime) {
    console.info(
      logPrefix,
      "Ad countdown exceeds maximum, reloading page:",
      adTime,
      ">",
      adMaxTime
    );
    reloadPage();
  }
}

function clickSkipIfVisible(button: HTMLElement): boolean {
  const isVisible = button.offsetParent !== null;
  if (isVisible) {
    console.info(logPrefix, "Skipping");
    button.click();
  }
  return isVisible;
}

function skipAdded(elem: Element): void {
  console.debug(logPrefix, "Skip added");

  const button = elem.getElementsByClassName(skipButtonClass)?.[0];
  if (!(button instanceof HTMLElement)) {
    console.error(
      logPrefix,
      "Expected",
      JSON.stringify(skipButtonClass),
      "to be an HTML element, got:",
      elem.cloneNode(true)
    );
    return;
  }

  if (!clickSkipIfVisible(button)) {
    console.info(logPrefix, "Skip button is invisible, waiting");

    const skipObserver = new MutationObserver(() => {
      clickSkipIfVisible(button);
    });
    skipObserver.observe(elem, {
      attributes: true,
      attributeFilter: ["style"],
      subtree: true,
    });
  }
}

function overlayCloseAdded(elem: Element): void {
  if (!(elem instanceof HTMLElement)) {
    console.error(
      logPrefix,
      "Expected overlay close to be an HTML element, got:",
      elem.cloneNode(true)
    );
    return;
  }
  console.info(logPrefix, "Overlay close added, clicking");
  elem.click();
}

const addedMap = [
  { className: adUIClass, func: adUIAdded },
  { className: adBadgeClass, func: adBadgeAdded },
  { className: preskipClass, func: preskipAdded },
  { className: skipContainerClass, func: skipAdded },
  { className: overlayCloseButtonClass, func: overlayCloseAdded },
];

const removedMap = [{ className: adUIClass, func: adUIRemoved }];

for (const { className, func } of addedMap) {
  for (const elem of document.getElementsByClassName(className)) {
    func(elem);
  }
}

const observer = new MutationObserver((mutations) => {
  for (const mut of mutations) {
    if (mut.type === "childList") {
      for (const parentNode of mut.addedNodes) {
        for (const { className, func } of addedMap) {
          for (const node of getSelfOrChildrenByClassName(
            parentNode,
            className
          )) {
            func(node);
          }
        }
      }

      for (const parentNode of mut.removedNodes) {
        for (const { className, func } of removedMap) {
          for (const node of getSelfOrChildrenByClassName(
            parentNode,
            className
          )) {
            func(node);
          }
        }
      }
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
