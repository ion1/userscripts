// @ts-ignore isolatedModules

import "./main.css";

const logPrefix = "youtube-mute-skip-ads:";

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
const areYouThereTag = "ytmusic-you-there-renderer";

type Selector = "class" | "tag";

function getSelfOrChildrenBy(
  node: Node,
  selector: Selector,
  name: string
): ArrayLike<Element> & Iterable<Element> {
  if (!(node instanceof Element)) {
    return [];
  }

  if (selector === "class") {
    if (node.classList.contains(name)) {
      return [node];
    } else {
      return node.getElementsByClassName(name);
    }
  } else if (selector === "tag") {
    if (node.tagName.toLowerCase() === name.toLowerCase()) {
      return [node];
    } else {
      return node.getElementsByTagName(name);
    }
  } else {
    const impossible: never = selector;
    throw new Error(`Impossible selector: ${JSON.stringify(impossible)}`);
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
  // If any numbers are parsed and none of them are 1, reload the page.
  const numbers = (elem.textContent?.match(/[0-9]+/g) ?? []).map(Number);
  console.debug(
    logPrefix,
    "Ad badge added with text =",
    JSON.stringify(elem.textContent),
    "numbers =",
    JSON.stringify(numbers)
  );

  if (numbers.length > 0 && !numbers.includes(1)) {
    console.info(logPrefix, "Ad counter exceeds 1, reloading page");
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

function areYouThereAdded(elem: Element): void {
  for (const button of elem.getElementsByTagName("button")) {
    console.info(logPrefix, "Are-you-there added, clicking button");
    button.click();
    return;
  }

  console.info(
    logPrefix,
    "Are-you-there added but doesn't have a button yet, waiting"
  );

  const buttonObserver = new MutationObserver((mutations) => {
    for (const mut of mutations) {
      if (mut.type === "childList") {
        for (const parentNode of mut.addedNodes) {
          for (const button of getSelfOrChildrenBy(
            parentNode,
            "tag",
            "button"
          )) {
            if (!(button instanceof HTMLElement)) {
              console.error(
                logPrefix,
                "Are-you-there button: expected an HTML element, got:",
                button.cloneNode(true)
              );
              continue;
            }

            console.info(logPrefix, "Are-you-there button added, clicking");
            button.click();
            buttonObserver.disconnect();
            return;
          }
        }
      }
    }
  });

  buttonObserver.observe(elem, {
    childList: true,
    subtree: true,
  });
}

type CallbackMap = {
  selector: Selector;
  name: string;
  func: (elem: Element) => void;
}[];

const addedMap: CallbackMap = [
  { selector: "class", name: adUIClass, func: adUIAdded },
  { selector: "class", name: adBadgeClass, func: adBadgeAdded },
  { selector: "class", name: preskipClass, func: preskipAdded },
  { selector: "class", name: skipContainerClass, func: skipAdded },
  { selector: "class", name: overlayCloseButtonClass, func: overlayCloseAdded },
  { selector: "tag", name: areYouThereTag, func: areYouThereAdded },
];

const removedMap: CallbackMap = [
  { selector: "class", name: adUIClass, func: adUIRemoved },
];

for (const { selector, name, func } of addedMap) {
  for (const elem of getSelfOrChildrenBy(document.body, selector, name)) {
    func(elem);
  }
}

const observer = new MutationObserver((mutations) => {
  for (const mut of mutations) {
    if (mut.type === "childList") {
      for (const parentNode of mut.addedNodes) {
        for (const { selector, name, func } of addedMap) {
          for (const node of getSelfOrChildrenBy(parentNode, selector, name)) {
            func(node);
          }
        }
      }

      for (const parentNode of mut.removedNodes) {
        for (const { selector, name, func } of removedMap) {
          for (const node of getSelfOrChildrenBy(parentNode, selector, name)) {
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
