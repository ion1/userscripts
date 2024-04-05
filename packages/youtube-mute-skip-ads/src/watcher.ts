import { debugging } from "./debugging";
import { logPrefix } from "./log";

export type SelectorType = "id" | "class" | "tag";

export class Watcher {
  name: string;

  element: HTMLElement | null;

  onCreated: ((elem: HTMLElement) => void)[];
  onRemoved: ((elem: HTMLElement) => void)[];

  nodeObserver: MutationObserver | null;
  nodeWatchers: { selector: SelectorType; name: string; watcher: Watcher }[];

  textObserver: MutationObserver | null;
  onTextChanged: ((text: string | null) => void)[];

  onAttrChanged: {
    name: string;
    callback: (text: string | null) => void;
    observer: MutationObserver | null;
  }[];

  visibilityAncestor: HTMLElement | null;
  visibilityObserver: IntersectionObserver | null;
  isVisible: boolean | null;
  visibilityWatchers: Watcher[];

  constructor(name: string, elem?: HTMLElement) {
    this.name = name;

    this.element = null;

    this.onCreated = [];
    this.onRemoved = [];

    this.nodeObserver = null;
    this.nodeWatchers = [];

    this.textObserver = null;
    this.onTextChanged = [];

    this.onAttrChanged = [];

    this.visibilityAncestor = null;
    this.visibilityObserver = null;
    this.isVisible = null;
    this.visibilityWatchers = [];

    if (elem != null) {
      this.connect(elem);
    }
  }

  assertElement(): HTMLElement {
    if (this.element == null) {
      throw new Error(`Watcher not connected to an element`);
    }
    return this.element;
  }

  assertVisibilityAncestor(): HTMLElement {
    if (this.visibilityAncestor == null) {
      throw new Error(`Watcher is missing a visibilityAncestor`);
    }
    return this.visibilityAncestor;
  }

  isConnected(): boolean {
    return this.element != null;
  }

  connect(element: HTMLElement, visibilityAncestor?: HTMLElement): void {
    // Currently assuming that no selector matches more than one element.
    if (this.element != null) {
      // Watcher already connected.
      if (this.element !== element) {
        // Watcher already connected to a different element.
        console.error(
          logPrefix,
          `Watcher already connected to`,
          this.element,
          `while trying to connect to`,
          element,
        );
      }
      return;
    }

    this.element = element;
    this.visibilityAncestor = visibilityAncestor ?? null;

    if (debugging) {
      console.debug(
        logPrefix,
        `${this.name}: Connect:`,
        this.element.cloneNode(true),
      );
    }

    for (const callback of this.onCreated) {
      callback(this.element);
    }

    for (const { selector, name, watcher } of this.nodeWatchers) {
      for (const descElem of getDescendantsBy(this.element, selector, name)) {
        watcher.connect(descElem, this.element);
      }
    }

    for (const callback of this.onTextChanged) {
      callback(this.element.textContent);
    }

    for (const { name, callback } of this.onAttrChanged) {
      callback(this.element.getAttribute(name));
    }

    // The visibilityObserver will trigger automatically if the element is visible
    // already. No need to handle visibilityWatchers here.

    this.registerNodeObserver();
    this.registerTextObserver();
    this.registerAttrObservers();
    this.registerVisibilityObserver();
  }

  disconnect(): void {
    if (this.element == null) {
      // Watcher already disconnected
      return;
    }

    if (debugging) {
      console.debug(
        logPrefix,
        `${this.name}: Disconnect:`,
        this.element.cloneNode(true),
      );
    }

    for (const child of this.nodeWatchers) {
      child.watcher.disconnect();
    }

    for (const callback of this.onTextChanged) {
      callback(null);
    }

    for (const { callback } of this.onAttrChanged) {
      callback(null);
    }

    for (const child of this.visibilityWatchers) {
      child.disconnect();
    }

    this.deregisterNodeObserver();
    this.deregisterTextObserver();
    this.deregisterAttrObservers();
    this.deregisterVisibilityObserver();

    for (const callback of this.onRemoved) {
      callback(this.element);
    }

    this.element = null;
  }

  registerNodeObserver(): void {
    if (this.nodeObserver != null) {
      // Already registered.
      return;
    }

    if (this.nodeWatchers.length === 0) {
      // No watchers, no need for an observer.
      return;
    }

    const elem = this.assertElement();

    this.nodeObserver = new MutationObserver((mutations) => {
      for (const mut of mutations) {
        for (const node of mut.addedNodes) {
          for (const { selector, name, watcher } of this.nodeWatchers) {
            for (const descElem of getSelfOrDescendantsBy(
              node,
              selector,
              name,
            )) {
              watcher.connect(descElem, elem);
            }
          }
        }

        for (const node of mut.removedNodes) {
          for (const { selector, name, watcher } of this.nodeWatchers) {
            for (const _descElem of getSelfOrDescendantsBy(
              node,
              selector,
              name,
            )) {
              watcher.disconnect();
            }
          }
        }
      }
    });

    this.nodeObserver.observe(elem, {
      subtree: true,
      childList: true,
    });
  }

  registerTextObserver(): void {
    if (this.textObserver != null) {
      // Already registered.
      return;
    }

    if (this.onTextChanged.length === 0) {
      // No callbacks, no need for an observer.
      return;
    }

    const elem = this.assertElement();

    this.textObserver = new MutationObserver((_mutations) => {
      for (const callback of this.onTextChanged) {
        callback(elem.textContent);
      }
    });

    this.textObserver.observe(elem, {
      subtree: true,
      // This is needed when elements are replaced to update their text.
      childList: true,
      characterData: true,
    });
  }

  registerAttrObservers(): void {
    const elem = this.assertElement();

    for (const handler of this.onAttrChanged) {
      if (handler.observer != null) {
        // Already registered.
        continue;
      }

      const { name, callback } = handler;

      handler.observer = new MutationObserver((_mutations) => {
        callback(elem.getAttribute(name));
      });

      handler.observer.observe(elem, {
        attributes: true,
        attributeFilter: [name],
      });
    }
  }

  registerVisibilityObserver(): void {
    if (this.visibilityObserver != null) {
      // Already registered.
      return;
    }

    if (this.visibilityWatchers.length === 0) {
      // No watchers, no need for an observer.
      return;
    }

    this.isVisible = false;

    const elem = this.assertElement();
    const visibilityAncestor = this.assertVisibilityAncestor();

    this.visibilityObserver = new IntersectionObserver(
      (entries) => {
        const oldVisible = this.isVisible;

        for (const entry of entries) {
          this.isVisible = entry.isIntersecting;
        }

        if (this.isVisible !== oldVisible) {
          if (this.isVisible) {
            for (const watcher of this.visibilityWatchers) {
              watcher.connect(elem, visibilityAncestor);
            }
          } else {
            for (const watcher of this.visibilityWatchers) {
              watcher.disconnect();
            }
          }
        }
      },
      {
        root: visibilityAncestor,
      },
    );

    this.visibilityObserver.observe(elem);
  }

  deregisterNodeObserver(): void {
    if (this.nodeObserver == null) {
      // Already unregistered.
      return;
    }

    // Throwing away any pending events.
    this.nodeObserver.disconnect();
    this.nodeObserver = null;
  }

  deregisterTextObserver(): void {
    if (this.textObserver == null) {
      // Already unregistered.
      return;
    }

    // Throwing away any pending events.
    this.textObserver.disconnect();
    this.textObserver = null;
  }

  deregisterAttrObservers(): void {
    for (const handler of this.onAttrChanged) {
      if (handler.observer == null) {
        // Already unregistered.
        continue;
      }

      // Throwing away any pending events.
      handler.observer.disconnect();
      handler.observer = null;
    }
  }

  deregisterVisibilityObserver(): void {
    if (this.visibilityObserver == null) {
      // Already unregistered.
      return;
    }

    // Throwing away any pending events.
    this.visibilityObserver.disconnect();
    this.visibilityObserver = null;

    this.isVisible = null;
  }

  lifecycle(
    onCreated: (elem: HTMLElement) => void,
    onRemoved?: (elem: HTMLElement) => void,
  ): Watcher {
    this.onCreated.push(onCreated);
    if (onRemoved != null) {
      this.onRemoved.push(onRemoved);
    }

    if (this.element != null) {
      onCreated(this.element);
    }

    return this;
  }

  descendant(selector: SelectorType, name: string): Watcher {
    const watcher = new Watcher(`${this.name} → ${name}`);

    this.nodeWatchers.push({ selector, name, watcher });

    if (this.element != null) {
      for (const descElem of getDescendantsBy(this.element, selector, name)) {
        watcher.connect(descElem, this.element);
      }

      this.registerNodeObserver();
    }

    return watcher;
  }

  id(idName: string): Watcher {
    return this.descendant("id", idName);
  }

  klass(className: string): Watcher {
    return this.descendant("class", className);
  }

  tag(tagName: string): Watcher {
    return this.descendant("tag", tagName);
  }

  visible(): Watcher {
    const watcher = new Watcher(`${this.name} (visible)`);

    this.visibilityWatchers.push(watcher);

    if (this.element != null) {
      const visibilityAncestor = this.assertVisibilityAncestor();

      if (this.isVisible) {
        // The observer is already registered, connect manually as it wouldn't
        // trigger otherwise.
        watcher.connect(this.element, visibilityAncestor);
      }

      this.registerVisibilityObserver();
    }

    return watcher;
  }

  text(callback: (text: string | null) => void): Watcher {
    this.onTextChanged.push(callback);
    if (this.element != null) {
      callback(this.element.textContent);

      this.registerTextObserver();
    }

    return this;
  }

  attr(name: string, callback: (text: string | null) => void): Watcher {
    this.onAttrChanged.push({ name, callback, observer: null });

    if (this.element != null) {
      callback(this.element.getAttribute(name));

      this.registerAttrObservers();
    }

    return this;
  }
}

function getSelfOrDescendantsBy(
  node: Node,
  selector: SelectorType,
  name: string,
): HTMLElement[] {
  if (!(node instanceof HTMLElement)) {
    return [];
  }

  if (selector === "id" || selector === "class" || selector === "tag") {
    if (
      (selector === "id" && node.id === name) ||
      (selector === "class" && node.classList.contains(name)) ||
      (selector === "tag" && node.tagName.toLowerCase() === name.toLowerCase())
    ) {
      return [node];
    } else {
      return getDescendantsBy(node, selector, name);
    }
  } else {
    const impossible: never = selector;
    throw new Error(`Impossible selector type: ${JSON.stringify(impossible)}`);
  }
}

function getDescendantsBy(
  node: Node,
  selector: SelectorType,
  name: string,
): HTMLElement[] {
  if (!(node instanceof HTMLElement)) {
    return [];
  }

  let cssSelector = "";

  if (selector === "id") {
    cssSelector += "#";
  } else if (selector === "class") {
    cssSelector += ".";
  } else if (selector === "tag") {
    // No CSS prefix.
  } else {
    const impossible: never = selector;
    throw new Error(`Impossible selector type: ${JSON.stringify(impossible)}`);
  }

  cssSelector += CSS.escape(name);

  return Array.from(node.querySelectorAll(cssSelector));
}
