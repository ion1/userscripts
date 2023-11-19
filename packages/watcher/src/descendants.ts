export type SelectorType = "id" | "class" | "tag";

/**
 * Return the root node or the descendants matching the given selector. If a
 * node is returned, none of its descendants will.
 *
 * Only call this with a selector which is expected to match a small number of
 * nodes, otherwise the descendant filter may be slow.
 *
 * @param node The root node for the search.
 * @param selector "id", "class" or "tag".
 * @param name The id, class or tag name to search for.
 * @returns The matching elements, if any.
 */
export function getElementsBy(
  node: Node,
  selector: SelectorType,
  name: string
): Array<HTMLElement> {
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

/**
 * Return the decendants matching the given selector. If a node is returned,
 * none of its descendants will.
 *
 * Only call this with a selector which is expected to match a small number of
 * nodes, otherwise the descendant filter may be slow.
 *
 * @param node The root node for the search.
 * @param selector "id", "class" or "tag".
 * @param name The id, class or tag name to search for.
 * @returns The matching elements, if any.
 */
export function getDescendantsBy(
  node: Node,
  selector: SelectorType,
  name: string
): Array<HTMLElement> {
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

  const result: Array<HTMLElement> = [];
  // O(n^2) but n is expected to be small.
  for (const descendant of node.querySelectorAll(cssSelector)) {
    if (!(descendant instanceof HTMLElement)) {
      continue;
    }

    if (result.some((ancestor) => ancestor.contains(descendant))) {
      continue;
    }

    result.push(descendant);
  }

  return result;
}
