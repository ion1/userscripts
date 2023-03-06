// @ts-ignore isolatedModules

import "./main.css";

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
    return;
  }

  if (props.muted != null) {
    video.muted = props.muted;
  }
}

// Toggle the mute button twice to reset video.muted to the user preference,
// whether muted or unmuted.
function toggleMuteTwice(): void {
  for (const elem of document.getElementsByClassName(muteButtonClass)) {
    if (!(elem instanceof HTMLElement)) {
      continue;
    }
    elem.click();
    elem.click();
  }
}

function adUIAdded(_elem: Element): void {
  console.info("youtube-mute-skip-ads: An ad is playing, muting");
  setVideoProperties({ muted: true });
}

function adUIRemoved(_elem: Element): void {
  console.info("youtube-mute-skip-ads: An ad is no longer playing, unmuting");
  toggleMuteTwice();
}

type YoutubePlayerElement = {
  getCurrentTime(): number;
};

function reloadPage(): void {
  const playerElem = <YoutubePlayerElement | Element | null>(
    document.getElementById(playerId)
  );
  if (playerElem == null || !("getCurrentTime" in playerElem)) {
    return;
  }

  const notifDiv = document.createElement("div");
  notifDiv.setAttribute("class", "youtube-mute-skip-ads-reload-notification");
  notifDiv.innerHTML = `<div aria-live="assertive" aria-atomic="true">Reloading<br/><small>(Youtube Mute and Skip Ads)</small></div>`;
  document.body.append(notifDiv);

  const currentTime = playerElem.getCurrentTime();

  var searchParams = new URLSearchParams(window.location.search);
  searchParams.set("t", "" + Math.floor(currentTime) + "s");
  console.info(
    "youtube-mute-skip-ads: Reloading with t =",
    searchParams.get("t")
  );
  window.location.search = searchParams.toString();
}

function adBadgeAdded(elem: Element): void {
  const adCounter = elem.textContent?.match(
    /^[^0-9]*([0-9]+)\/([0-9]+)[^0-9]*$/
  )?.[1];
  console.debug(
    "youtube-mute-skip-ads: Ad badge added with counter =",
    adCounter
  );

  if (adCounter != null && Number(adCounter) > adMaxCount) {
    console.info(
      "youtube-mute-skip-ads: Ad counter exceeds maximum, reloading page:",
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
    "youtube-mute-skip-ads: Ad preskip added with countdown =",
    adTime
  );

  if (adTime == null) {
    console.info("youtube-mute-skip-ads: No ad countdown, reloading page");
    reloadPage();
  }

  if (Number(adTime) > adMaxTime) {
    console.info(
      "youtube-mute-skip-ads: Ad countdown exceeds maximum, reloading page:",
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
    console.info("youtube-mute-skip-ads: Skipping");
    button.click();
  }
  return isVisible;
}

function skipAdded(elem: Element): void {
  console.debug("youtube-mute-skip-ads: Skip added");

  const button = elem.getElementsByClassName(skipButtonClass)?.[0];
  if (!(button instanceof HTMLElement)) {
    console.error(
      "youtube-mute-skip-ads: Failed to find skip button:",
      elem.outerHTML
    );
    return;
  }

  if (!clickSkipIfVisible(button)) {
    console.info("youtube-mute-skip-ads: Skip button is invisible, waiting");

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
      "youtube-mute-skip-ads: Overlay close added, not an HTMLElement?",
      elem.outerHTML
    );
    return;
  }
  console.info("youtube-mute-skip-ads: Overlay close added, clicking");
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
