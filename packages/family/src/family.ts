export class FamilyError extends Error {
  constructor(m: string) {
    super(m);
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type ParentAddedCallback<P, C> = (
  params: ParentAddedCallbackParams<P, C>
) => void;

export type ParentAddedCallbackParams<P, C> = {
  parent: P;
  addChild: (child: C) => void;
  removeChild: (child: C) => void;
};

export type ParentRemovedCallback<P, C> = (
  params: ParentRemovedCallbackParams<P, C>
) => void;

export type ParentRemovedCallbackParams<P, C> = {
  parent: P;
  children: IterableIterator<C>;
  removeChild: (child: C) => void;
};

export type ChildAddedCallback<P, C> = (
  params: ChildAddedCallbackParams<P, C>
) => void;

export type ChildAddedCallbackParams<P, C> = {
  parent: P;
  child: C;
};

export type ChildRemovedCallback<P, C> = (
  params: ChildRemovedCallbackParams<P, C>
) => void;

export type ChildRemovedCallbackParams<P, C> = ChildAddedCallbackParams<P, C>;

export type FamilyParams<P, C> = {
  parentAddedCallback: ParentAddedCallback<P, C>;
  parentRemovedCallback: ParentRemovedCallback<P, C>;
};

/**
 * A map from multiple parents to sets of children corresponding to each
 * parent.
 *
 * Callback functions can be added to be called upon the addition and removal
 * of parents and children.
 */
export class Family<P, C> {
  #family: Map<P, Set<C>>;
  /**
   * A flat set of all children. Used to prevent the same child from being
   * added to two parents.
   */
  #allChildren: Set<C>;

  #parentAddedCallback: ParentAddedCallback<P, C>;
  #parentRemovedCallback: ParentRemovedCallback<P, C>;
  #childAddedCallbacks: Array<ChildAddedCallback<P, C>>;
  #childRemovedCallbacks: Array<ChildAddedCallback<P, C>>;

  constructor(params: FamilyParams<P, C>) {
    this.#family = new Map();
    this.#allChildren = new Set();

    this.#parentAddedCallback = params.parentAddedCallback;
    this.#parentRemovedCallback = params.parentRemovedCallback;
    this.#childAddedCallbacks = [];
    this.#childRemovedCallbacks = [];
  }

  /**
   * Add a callback to be called whenever a child is added. It will be called
   * immediately for each existing child of each existing parent in an
   * unspecified order.
   *
   * @param callback The function to be called for each added child.
   */
  onChildAdded(callback: ChildAddedCallback<P, C>): void {
    this.#childAddedCallbacks.push(callback);

    // Call the callback for existing children.
    for (const [parent, children] of this.#family.entries()) {
      for (const child of children) {
        callback({ parent, child });
      }
    }
  }

  /**
   * Add a callback to be called whenever a child is removed.
   *
   * @param callback The function to be called for each removed child.
   */
  onChildRemoved(callback: ChildRemovedCallback<P, C>): void {
    this.#childRemovedCallbacks.push(callback);
  }

  /**
   * Get the children for a given parent. Throws an error if no such parent has
   * been added.
   *
   * @param parent The parent whose children are returned.
   */
  #getChildren(parent: P): Set<C> {
    const children = this.#family.get(parent);
    if (children == null) {
      throw new FamilyError(
        `No such parent has been added: ${JSON.stringify(parent)}`
      );
    }

    return children;
  }

  /**
   * Add a parent and call the parent-added callback.
   *
   * @param parent The parent to be added.
   */
  addParent(parent: P): void {
    if (this.#family.has(parent)) {
      throw new FamilyError(
        `Parent has already been added: ${JSON.stringify(parent)}`
      );
    }

    const children = new Set<C>();
    this.#family.set(parent, children);

    this.#parentAddedCallback({
      parent,
      addChild: (child) => this.#addChild(parent, child),
      removeChild: (child) => this.#removeChild(parent, child),
    });
  }

  /**
   * Call the parent-removed callback, remove any remaining children, and
   * remove the parent.
   *
   * @param parent The parent to be removed.
   */
  removeParent(parent: P): void {
    const children = this.#getChildren(parent);

    this.#parentRemovedCallback({
      parent,
      children: children.values(),
      removeChild: (child) => this.#removeChild(parent, child),
    });

    // Remove any children not removed by the parent-removed callback.
    for (const child of children) {
      this.#removeChild(parent, child);
    }

    this.#family.delete(parent);
  }

  /**
   * Add a child to a parent and call the child-added callbacks.
   *
   * @param parent The parent for whom
   * @param child
   */
  #addChild(parent: P, child: C): void {
    const children = this.#getChildren(parent);
    if (children.has(child)) {
      throw new FamilyError(
        `Child has already been added: ${JSON.stringify({ parent, child })}`
      );
    }
    if (this.#allChildren.has(child)) {
      throw new FamilyError(
        `Child has already been added to another parent: ${JSON.stringify(
          child
        )})}`
      );
    }

    children.add(child);
    this.#allChildren.add(child);

    for (const callback of this.#childAddedCallbacks) {
      callback({ parent, child });
    }
  }

  /**
   * Call the child-removed callbacks and remove a child from its parent.
   */
  #removeChild(parent: P, child: C): void {
    const children = this.#getChildren(parent);
    if (!children.has(child)) {
      throw new FamilyError(
        `No such child has been added: ${JSON.stringify({ parent, child })}`
      );
    }
    if (!this.#allChildren.has(child)) {
      throw new FamilyError(
        `Child is under parent but not in allChildren, should be impossible: ${JSON.stringify(
          { parent, child }
        )}`
      );
    }

    for (const callback of this.#childRemovedCallbacks) {
      callback({ parent, child });
    }

    children.delete(child);
    this.#allChildren.delete(child);
  }
}

export default Family;
