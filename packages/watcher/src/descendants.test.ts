import { describe, test, expect, vi } from "vitest";
import { getElementsBy, getDescendantsBy } from "./descendants";

const rootNode = document.createElement("main");
rootNode.setAttribute("id", "main-id");
rootNode.setAttribute("class", "main-class");
rootNode.innerHTML = `
  <div id="parent">
    <div id="foo">
      <div id="foo">foo</div>
    </div>

    <div class="foo">
      <div class="foo">foo</div>
    </div>

    <span>
      <span>foo</span>
    </span>

    <div id="child">
      <div id="foo">
        <div id="foo">foo</div>
      </div>

      <div class="foo">
        <div class="foo">foo</div>
      </div>

      <span>
        <span>foo</span>
      </span>
    </div>
  </div>
`;

describe("getDescendantsBy", () => {
  describe("finds descendants by", () => {
    test.each([
      ["id" as const, "foo", ":is(#parent, #child) > #foo"],
      ["class" as const, "foo", ":is(#parent, #child) > .foo"],
      ["tag" as const, "span", ":is(#parent, #child) > span"],
    ])("%s", (selector, name, expectedSel) => {
      const nodes = getDescendantsBy(rootNode, selector, name);
      const expected = Array.from(rootNode.querySelectorAll(expectedSel));
      expect(nodes).toEqual(expected);
    });
  });

  describe("does not find the root element by", () => {
    test.each([
      ["id" as const, "main-id"],
      ["class" as const, "main-class"],
      ["tag" as const, "main"],
    ])("%s", (selector, name) => {
      const nodes = getDescendantsBy(rootNode, selector, name);
      expect(nodes).toEqual([]);
    });
  });
});

describe("getElementsBy", () => {
  describe("finds elements by", () => {
    test.each([
      ["id" as const, "foo", ":is(#parent, #child) > #foo"],
      ["class" as const, "foo", ":is(#parent, #child) > .foo"],
      ["tag" as const, "span", ":is(#parent, #child) > span"],
    ])("%s", (selector, name, expectedSel) => {
      const nodes = getElementsBy(rootNode, selector, name);
      const expected = Array.from(rootNode.querySelectorAll(expectedSel));
      expect(nodes).toEqual(expected);
    });
  });

  describe("finds the root element by", () => {
    test.each([
      ["id" as const, "main-id"],
      ["class" as const, "main-class"],
      ["tag" as const, "main"],
    ])("%s", (selector, name) => {
      const nodes = getElementsBy(rootNode, selector, name);
      expect(nodes).toEqual([rootNode]);
    });
  });
});
