import { describe, test, expect, vi } from "vitest";
import { Family } from "./family";

test("Parent-added and parent-removed callbacks are called", () => {
  const added: Array<string> = [];
  const removed: Array<string> = [];

  const family = new Family<string, never>({
    parentAddedCallback({ parent }) {
      added.push(parent);
    },
    parentRemovedCallback({ parent, children }) {
      removed.push(parent);
      expect(Array.from(children)).toEqual([]);
    },
  });

  expect(added).toEqual([]);
  expect(removed).toEqual([]);

  family.addParent("foo");
  expect(added).toEqual(["foo"]);
  expect(removed).toEqual([]);

  family.addParent("bar");
  expect(added).toEqual(["foo", "bar"]);
  expect(removed).toEqual([]);

  family.removeParent("foo");
  expect(added).toEqual(["foo", "bar"]);
  expect(removed).toEqual(["foo"]);
});

test("The same parent can not be added twice", () => {
  const added = vi.fn();
  const removed = vi.fn();

  const family = new Family<string, never>({
    parentAddedCallback({ parent }) {
      added(parent);
    },
    parentRemovedCallback({ parent }) {
      removed(parent);
    },
  });

  family.addParent("foo");
  expect(added).toHaveBeenCalledOnce();
  expect(added).toHaveBeenCalledWith("foo");

  expect(() => {
    family.addParent("foo");
  }).toThrow();
  expect(added).toHaveBeenCalledOnce();

  expect(removed).not.toHaveBeenCalled();
});

test("A parent which has not been added can not be removed", () => {
  const added = vi.fn();
  const removed = vi.fn();

  const family = new Family<string, never>({
    parentAddedCallback({ parent }) {
      added(parent);
    },
    parentRemovedCallback({ parent }) {
      removed(parent);
    },
  });

  expect(() => {
    family.removeParent("foo");
  }).toThrow();

  expect(added).not.toHaveBeenCalled();
  expect(removed).not.toHaveBeenCalled();
});

test("A parent can not be removed twice", () => {
  const added = vi.fn();
  const removed = vi.fn();

  const family = new Family<string, never>({
    parentAddedCallback({ parent }) {
      added(parent);
    },
    parentRemovedCallback({ parent }) {
      removed(parent);
    },
  });

  family.addParent("foo");
  expect(added).toHaveBeenCalledOnce();
  expect(added).toHaveBeenCalledWith("foo");
  expect(removed).not.toHaveBeenCalled();

  family.removeParent("foo");
  expect(added).toHaveBeenCalledOnce();
  expect(added).toHaveBeenCalledWith("foo");
  expect(removed).toHaveBeenCalledOnce();
  expect(removed).toHaveBeenCalledWith("foo");

  expect(() => {
    family.removeParent("foo");
  }).toThrow();

  expect(added).toHaveBeenCalledOnce();
  expect(added).toHaveBeenCalledWith("foo");
  expect(removed).toHaveBeenCalledOnce();
  expect(removed).toHaveBeenCalledWith("foo");
});

test("The children iterator is passed to the parent-removed callback", () => {
  let called = 0;
  const family = new Family<number, string>({
    parentAddedCallback({ addChild }) {
      addChild("foo");
      addChild("bar");
    },
    parentRemovedCallback({ children }) {
      ++called;
      expect(Array.from(children)).toEqual(["foo", "bar"]);
    },
  });

  family.addParent(42);
  family.removeParent(42);

  expect(called).toEqual(1);
});

describe("The same child can not be added twice", () => {
  test("to the same parent", () => {
    let called = 0;
    const family = new Family<number, string>({
      parentAddedCallback({ addChild }) {
        ++called;

        addChild("foo");

        expect(() => {
          addChild("foo");
        }).toThrow();
      },
      parentRemovedCallback() {},
    });

    family.addParent(42);

    expect(called).toEqual(1);
  });

  test("to different parents", () => {
    let called = 0;
    const family = new Family<number, string>({
      parentAddedCallback({ addChild }) {
        ++called;

        addChild("foo");
      },
      parentRemovedCallback() {},
    });

    family.addParent(42);

    expect(() => {
      family.addParent(43);
    }).toThrow();

    expect(called).toEqual(2);
  });
});

test("A child which has not been added can not be removed", () => {
  const family = new Family<number, string>({
    parentAddedCallback({ removeChild }) {
      removeChild("foo");
    },
    parentRemovedCallback() {},
  });

  expect(() => {
    family.addParent(42);
  }).toThrow();
});

test("A child can not be removed twice", () => {
  let called = 0;
  const family = new Family<number, string>({
    parentAddedCallback({ addChild, removeChild }) {
      ++called;

      addChild("foo");
      removeChild("foo");

      expect(() => {
        removeChild("foo");
      }).toThrow();
    },
    parentRemovedCallback() {},
  });

  family.addParent(42);
  expect(called).toEqual(1);
});

describe("Child-added callbacks are called", () => {
  test("when callback is registered first", () => {
    const family = new Family<number, string>({
      parentAddedCallback({ parent, addChild }) {
        addChild(`foo ${parent}`);
        addChild(`bar ${parent}`);
      },
      parentRemovedCallback() {},
    });

    const added: Array<[number, string]> = [];
    family.onChildAdded(({ parent, child }) => {
      added.push([parent, child]);
    });

    family.addParent(42);
    expect(added).toEqual([
      [42, "foo 42"],
      [42, "bar 42"],
    ]);

    family.addParent(43);
    expect(added).toEqual([
      [42, "foo 42"],
      [42, "bar 42"],
      [43, "foo 43"],
      [43, "bar 43"],
    ]);
  });

  test("when callback is registered last", () => {
    const family = new Family<number, string>({
      parentAddedCallback({ parent, addChild }) {
        addChild(`foo ${parent}`);
        addChild(`bar ${parent}`);
      },
      parentRemovedCallback() {},
    });

    family.addParent(42);
    family.addParent(43);

    const added: Array<[number, string]> = [];
    family.onChildAdded(({ parent, child }) => {
      added.push([parent, child]);
    });

    expect(added).toEqual([
      [42, "foo 42"],
      [42, "bar 42"],
      [43, "foo 43"],
      [43, "bar 43"],
    ]);
  });
});

describe("Child-removed callbacks are called when children are removed", () => {
  test("implicitly", () => {
    const family = new Family<number, string>({
      parentAddedCallback({ parent, addChild }) {
        addChild(`foo ${parent}`);
        addChild(`bar ${parent}`);
      },
      parentRemovedCallback() {},
    });

    family.addParent(42);
    family.addParent(43);

    const removed: Array<[number, string]> = [];
    family.onChildRemoved(({ parent, child }) => {
      removed.push([parent, child]);
    });

    family.removeParent(42);
    expect(removed).toEqual([
      [42, "foo 42"],
      [42, "bar 42"],
    ]);

    family.removeParent(43);
    expect(removed).toEqual([
      [42, "foo 42"],
      [42, "bar 42"],
      [43, "foo 43"],
      [43, "bar 43"],
    ]);
  });

  test("explicitly", () => {
    const family = new Family<number, string>({
      parentAddedCallback({ parent, addChild }) {
        addChild(`foo ${parent}`);
        addChild(`bar ${parent}`);
      },
      parentRemovedCallback({ parent, removeChild }) {
        removeChild(`foo ${parent}`);
        removeChild(`bar ${parent}`);
      },
    });

    family.addParent(42);
    family.addParent(43);

    const removed: Array<[number, string]> = [];
    family.onChildRemoved(({ parent, child }) => {
      removed.push([parent, child]);
    });

    family.removeParent(42);
    expect(removed).toEqual([
      [42, "foo 42"],
      [42, "bar 42"],
    ]);

    family.removeParent(43);
    expect(removed).toEqual([
      [42, "foo 42"],
      [42, "bar 42"],
      [43, "foo 43"],
      [43, "bar 43"],
    ]);
  });
});
