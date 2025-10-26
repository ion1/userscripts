import { abortableSetInterval, abortableSetTimeout } from "./abortable-timers";
import { debug, debugging } from "./log";

export type ObserveOnAddedParams<E extends Element> = {
  /**  The element which was added. */
  elem: E;
  /** A signal which is triggered when the element is removed. */
  signal: AbortSignal;
};

export type ObserveSelectorParams = {
  /** The element whose descendants to observe. Default: `document`. */
  root?: Document | Element | undefined;
  /**
   * The parameter to `querySelectorAll`, e.g. "div.baz". Note that
   * `querySelectorAll` may be invoked on an arbitrary descendant of the `root`
   * element. Use `matcher` to impose any hierarchical constraints.
   */
  selector: string;
  /**
   * The parameter to `elem.matches`, e.g. ".foo > .bar > div.baz". May be used
   * to filter using parent elements beyond `root`. Defaults to the value of
   * `selector`.
   */
  matcher?: string | undefined;
  /**
   * An element description for debug messages. Defaults to the element's
   * `localName`.
   */
  name?: string | undefined;
  /**
   * An `AbortSignal` which will disconnect the `MutationObserver` and send the
   * appropriate abort signals foward.
   */
  signal?: AbortSignal | undefined;
  /**
   * A function to be called when a matching element is added. The abort signal
   * is triggered when the element is removed.
   */
  onAdded: (params: ObserveOnAddedParams<Element>) => void;
};

export type ObserveIntersectingParams<E extends Element> = {
  /** The element whose intersection to observe. */
  elem: E;
  /**
   * The ancestor which is used as the viewport for checking the intersection,
   * or `null` for the browser viewport. Default: `null`.
   */
  root?: Element | null | undefined;
  /**
   * An element description for debug messages. Defaults to the element's
   * `localName`.
   */
  name?: string | undefined;
  /**
   * An `AbortSignal` which will disconnect the `IntersectionObserver` and send
   * the appropriate abort signals foward.
   */
  signal?: AbortSignal | undefined;
  /**
   * A function to be called when the element becomes intersecting. The abort
   * signal is triggered when the element is no longer intersecting.
   */
  onIntersecting: (params: ObserveOnAddedParams<E>) => void;
};

export type ObserveVisibleParams<E extends Element> = {
  /** The element whose visibility to observe. */
  elem: E;
  /**
   * An element description for debug messages. Defaults to the element's
   * `localName`.
   */
  name?: string | undefined;
  /**
   * Since external, difficult-to-track changes to stylesheets may change the
   * visibility, do an extra check periodically. Defaults to 10,000 ms.
   */
  periodicCheckInterval?: number | undefined;
  /**
   * An `AbortSignal` which will disconnect the `MutationObserver` and send
   * the appropriate abort signals foward.
   */
  signal?: AbortSignal | undefined;
  /**
   * A function to be called when the element becomes visible. The abort signal
   * is triggered when the element is no longer visible.
   */
  onVisible: (params: ObserveOnAddedParams<E>) => void;
};

export type ObserveOneCallbackParams<E extends Element> = {
  /** The element which was chosen, if any. */
  elem: E | null;
};

export type ObserveOneParams<E extends Element> = {
  /** An element description for debug messages. */
  name?: string | undefined;
  /**
   * A function to be called when the arbitrarily chosen element changes or is
   * removed.
   */
  onChanged: (params: ObserveOneCallbackParams<E>) => void;
};

export type ObserveAttrCallbackParams<E extends Element> = {
  /**
   * The element whose attribute was changed.
   */
  elem: E;
  /**
   * The name of the attribute which was changed.
   */
  attr: string;
  /**
   * The new value of the attribute. `null` if the attribute does not exist or
   * if `shouldGetAttribute` is false.
   */
  value: string | null;
};

export type ObserveAttrParams<E extends Element> = {
  /** The element whose attribute to watch for changes. */
  elem: E;
  /**
   * An element description for debug messages. Defaults to the element's
   * `localName`.
   */
  name?: string | undefined;
  /** The name of the attribute to watch for changes. */
  attr: string;
  /**
   * The new value of the attribute will be passed to `onChanged` if `true`.
   *
   * Default: `true`.
   */
  shouldGetAttr?: boolean;
  /** An `AbortSignal` which will disconnect the `MutationObserver`. */
  signal?: AbortSignal | undefined;
  /**
   * A function to be called initially and whenever the attribute changes. The
   * value will be `null` if the attribute does not exist on the element or if
   * `shouldGetAttribute` is `false`.
   */
  onChanged: (params: ObserveAttrCallbackParams<E>) => void;
};

export type ObserveHasAttrCallbackParams<E extends Element> = {
  /** The element to which the attribute was added. */
  elem: E;
  /** The name of the attribute which was added. */
  attr: string;
  /** A signal which is triggered when the attribute is removed. */
  signal: AbortSignal;
};

export type ObserveHasAttrParams<E extends Element> = {
  /** The element whose attribute to watch for changes in existence. */
  elem: E;
  /**
   * An element description for debug messages. Defaults to the element's
   * `localName`.
   */
  name?: string | undefined;
  /** The name of the attribute to watch for changes in existence. */
  attr: string;
  /**
   * An `AbortSignal` which will disconnect the `MutationObserver` and send the
   * appropriate abort signals foward.
   */
  signal?: AbortSignal | undefined;
  /**
   * A function to be called initially if the attribute exists and whenever the
   * attribute is added. The abort signal is triggered when the attribute is
   * removed.
   */
  onAdded: (params: ObserveHasAttrCallbackParams<E>) => void;
};

export type ObserveHasClassCallbackParams<E extends Element> = {
  /** The element to which the class was added. */
  elem: E;
  /** The class which was added. */
  className: string;
  /** A signal which is triggered when the class is removed. */
  signal: AbortSignal;
};

export type ObserveHasClassParams<E extends Element> = {
  /** The element whose class to watch for changes in existence. */
  elem: E;
  /**
   * An element description for debug messages. Defaults to the element's
   * `localName`.
   */
  name?: string | undefined;
  /** The name of the class to watch for changes in existence. */
  className: string;
  /**
   * An `AbortSignal` which will disconnect the `MutationObserver` and send the
   * appropriate abort signals foward.
   */
  signal?: AbortSignal | undefined;
  /**
   * A function to be called initially if the element has the class exists and
   * whenever the class is added. The abort signal is triggered when the class
   * is removed.
   */
  onAdded: (params: ObserveHasClassCallbackParams<E>) => void;
};

/**
 * Observe mutations to the descendants of the element, calling `onAdded`
 * callbacks when matching descendants are added, and triggering the appropriate
 * AbortSignals when they are removed.
 */
export function observeSelector({
  selector,
  matcher,
  root,
  name,
  signal,
  onAdded,
}: ObserveSelectorParams): void {
  root ??= document;
  matcher ??= selector;

  if (signal?.aborted) return;

  const abortControllerMap = new Map<Element, AbortController>();

  function added(elem: Element): void {
    if (debugging) debug(name ?? elem.localName, "element added");
    const abortController = new AbortController();
    abortControllerMap.set(elem, abortController);
    try {
      onAdded({ elem, signal: abortController.signal });
    } catch (err) {
      reportError(err);
    }
  }

  function removed(elem: Element): void {
    const abortController = abortControllerMap.get(elem);
    if (abortController) {
      if (debugging) debug(name ?? elem.localName, "element removed");
      abortControllerMap.delete(elem);
      abortController.abort();
    }
  }

  for (const elem of root.querySelectorAll(selector)) {
    if (elem.matches(matcher)) {
      added(elem);
    }
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const addedNode of mutation.addedNodes) {
        for (const elem of matchingElementsInTree({
          root: addedNode,
          selector,
          matcher,
        })) {
          added(elem);
        }
      }

      for (const removedNode of mutation.removedNodes) {
        for (const elem of matchingElementsInTree({
          root: removedNode,
          selector,
          matcher,
        })) {
          removed(elem);
        }
      }
    }
  });

  observer.observe(root, { childList: true, subtree: true });

  signal?.addEventListener(
    "abort",
    () => {
      observer.disconnect();

      while (abortControllerMap.size > 0) {
        const elem = abortControllerMap.keys().next().value!;
        removed(elem);
      }
    },
    { once: true },
  );
}

/**
 * Yield the root element if it matches `matcher`, or all descendants matched by
 * `selector` as long as they match `matcher` as well.
 */
function* matchingElementsInTree({
  root,
  selector,
  matcher,
}: {
  root: Node;
  selector: string;
  matcher: string;
}): Generator<Element> {
  if (!(root instanceof Element)) return;

  if (root.matches(matcher)) {
    yield root;
    return;
  }

  for (const descendant of root.querySelectorAll(selector)) {
    if (descendant.matches(matcher)) {
      yield descendant;
    }
  }
}

/**
 * Observe the intersecting status of the element within the viewport specified
 * by the root element, calling the `onIntersecting` callback when it becomes
 * intersecting, and triggering the appropriate AbortSignal when it is no longer
 * intersecting.
 */
export function observeIntersecting<E extends Element>({
  elem,
  root,
  name,
  signal,
  onIntersecting,
}: ObserveIntersectingParams<E>): void {
  root ??= null;

  if (signal?.aborted) return;

  // Only defined if the element is intersecting.
  let abortController: AbortController | null = null;

  const observer = new IntersectionObserver(
    (entries) => {
      let intersecting = false;

      // MDN tells to sort the array.
      for (const entry of entries.slice().sort((a, b) => a.time - b.time)) {
        intersecting = entry.isIntersecting;
      }

      if (abortController === null && intersecting) {
        if (debugging) debug(`${name ?? elem.localName}: element intersecting`);

        abortController = new AbortController();

        try {
          onIntersecting({ elem, signal: abortController.signal });
        } catch (err) {
          reportError(err);
        }
      } else if (abortController !== null && !intersecting) {
        if (debugging)
          debug(`${name ?? elem.localName}: element not intersecting`);

        abortController.abort();
        abortController = null;
      }
    },
    {
      root: root,
    },
  );

  observer.observe(elem);

  signal?.addEventListener(
    "abort",
    () => {
      observer.disconnect();

      abortController?.abort();
      abortController = null;
    },
    { once: true },
  );
}

/**
 * Observe the visibility status of the element, calling the `onVisible`
 * callback when it becomes visible, and triggering the appropriate AbortSignal
 * when it is no longer visible.
 */
export function observeVisible<E extends Element>({
  elem,
  name,
  periodicCheckInterval,
  signal,
  onVisible,
}: ObserveVisibleParams<E>): void {
  if (signal?.aborted) return;

  periodicCheckInterval ??= 10000;

  // Only defined if the element is visible.
  let abortController: AbortController | null = null;

  let checkVisiblePending = false;

  function checkVisible(): void {
    if (checkVisiblePending) return;

    checkVisiblePending = true;

    abortableSetTimeout(signal, () => {
      checkVisiblePending = false;
      checkVisibleImmediately();
    });
  }

  function checkVisibleImmediately(): void {
    const visible = isElementVisible(elem);

    if (visible && abortController === null) {
      if (debugging) debug(`${name ?? elem.localName}: element visible`);

      abortController = new AbortController();

      try {
        onVisible({ elem, signal: abortController.signal });
      } catch (err) {
        reportError(err);
      }
    } else if (!visible && abortController !== null) {
      if (debugging) debug(`${name ?? elem.localName}: element not visible`);

      abortController!.abort();
      abortController = null;
    }
  }

  checkVisibleImmediately();

  const observer = new MutationObserver(checkVisible);

  // Observe all the ancestors, as any of them may affect the visibility.
  for (
    let ancestor: Element | null = elem;
    ancestor !== null;
    ancestor = ancestor.parentElement
  ) {
    observer.observe(ancestor, {
      attributes: true,
      attributeFilter: ["style", "class"],
      subtree: false,
    });
  }

  // Also check periodically just in case changes to stylesheets cause a change
  // in the visibility. Is there really no way to do this reliably without
  // polling?
  abortableSetInterval(signal, checkVisible, periodicCheckInterval);

  signal?.addEventListener(
    "abort",
    () => {
      observer.disconnect();

      abortController?.abort();
      abortController = null;
    },
    { once: true },
  );
}

function isElementVisible(elem: Element): boolean {
  for (
    let ancestor: Element | null = elem;
    ancestor !== null;
    ancestor = ancestor.parentElement
  ) {
    const style = getComputedStyle(ancestor);

    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse" ||
      style.opacity === "0"
    )
      return false;
  }

  return true;
}

/**
 * Given multiple matching elements, pick an arbitrary one and notify whenever
 * it changes or gets removed without replacement.
 */
export function observeOne<E extends Element>({
  name,
  onChanged,
}: ObserveOneParams<E>): (params: ObserveOnAddedParams<E>) => void {
  const elems = new Set<E>();
  let currentElem: E | null = null;

  function change(elem: E | null): void {
    if (debugging) {
      debug(
        name !== null ? `${name} element` : "Element",
        "changed:",
        currentElem?.localName ?? "null",
        "->",
        elem?.localName ?? "null",
      );
    }

    currentElem = elem;

    onChanged({ elem: currentElem });
  }

  function onRemoved(elem: E): void {
    elems.delete(elem);

    if (currentElem === elem) {
      // Pick another one that still exists, if any.
      change(elems.values().next().value ?? null);
    }
  }

  return function onAdded({ elem, signal }: ObserveOnAddedParams<E>): void {
    signal.addEventListener(
      "abort",
      () => {
        onRemoved(elem);
      },
      { once: true },
    );

    elems.add(elem);

    // Refrain from notifying about a change if the previous element still
    // exists.
    if (currentElem === null) {
      change(elem);
    }
  };
}

/**
 * Observe mutations to the given attribute on the element, calling the
 * `onChanged` callback initially and whenever the attribute changes.
 */
export function observeAttr<E extends Element>({
  elem,
  name,
  attr,
  shouldGetAttr,
  signal,
  onChanged,
}: ObserveAttrParams<E>): void {
  shouldGetAttr ??= true;

  if (signal?.aborted) return;

  const observer = new MutationObserver((_mutations) => {
    if (debugging) {
      debug(
        `${name ?? elem.localName}: attribute ${attr} changed to`,
        JSON.stringify(elem.getAttribute(attr)),
      );
    }
    onChanged({
      elem,
      attr,
      value: shouldGetAttr ? elem.getAttribute(attr) : null,
    });
  });

  observer.observe(elem, {
    attributeFilter: [attr],
    attributes: true,
  });

  signal?.addEventListener(
    "abort",
    () => {
      observer.disconnect();
    },
    { once: true },
  );
}

/**
 * Observe changes to the existence of the given attribute on the element,
 * calling the `onAdded` callback initially if it exists already and whenever
 * the attribute is added.
 */
export function observeHasAttr<E extends Element>({
  elem,
  name,
  attr,
  signal,
  onAdded,
}: ObserveHasAttrParams<E>): void {
  if (signal?.aborted) return;

  // Only defined if the attribute exists.
  let abortController: AbortController | null = null;

  function onChanged(): void {
    const elemHasAttr = elem.hasAttribute(attr);

    if (abortController === null && elemHasAttr) {
      if (debugging) {
        debug(`${name ?? elem.localName}: attribute ${attr} added`);
      }

      abortController = new AbortController();

      try {
        onAdded({ elem, attr, signal: abortController.signal });
      } catch (err) {
        reportError(err);
      }
    } else if (abortController !== null && !elemHasAttr) {
      if (debugging) {
        debug(`${name ?? elem.localName}: attribute ${attr} removed`);
      }

      abortController.abort();
      abortController = null;
    }
  }

  observeAttr({
    elem,
    name,
    attr,
    shouldGetAttr: false,
    signal,
    onChanged,
  });

  signal?.addEventListener(
    "abort",
    () => {
      abortController?.abort();
      abortController = null;
    },
    { once: true },
  );
}

/**
 * Observe changes to the existence of the given class on the element, calling
 * the `onAdded` callback initially if the element already has the class and
 * whenever the class is added.
 */
export function observeHasClass<E extends Element>({
  elem,
  name,
  className,
  signal,
  onAdded,
}: ObserveHasClassParams<E>): void {
  if (signal?.aborted) return;

  // Only defined if the element has the class.
  let abortController: AbortController | null = null;

  function change(): void {
    const elemHasClass = elem.classList.contains(className);

    if (abortController === null && elemHasClass) {
      if (debugging) {
        debug(`${name ?? elem.localName}: class ${className} added`);
      }

      abortController = new AbortController();

      try {
        onAdded({ elem, className, signal: abortController.signal });
      } catch (err) {
        reportError(err);
      }
    } else if (abortController !== null && !elemHasClass) {
      if (debugging) {
        debug(`${name ?? elem.localName}: class ${className} removed`);
      }

      abortController.abort();
      abortController = null;
    }
  }

  observeAttr({
    elem,
    name,
    attr: "class",
    shouldGetAttr: false,
    signal,
    onChanged: change,
  });

  signal?.addEventListener(
    "abort",
    () => {
      abortController?.abort();
      abortController = null;
    },
    { once: true },
  );
}
