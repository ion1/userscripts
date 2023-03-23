// YouTube Music will pause the music and wait until it gets focused to show the
// are-you-there dialog.
export function disableVisibilityChecks(): void {
  for (const eventName of ["visibilitychange", "blur", "focus"]) {
    document.addEventListener(
      eventName,
      (ev) => {
        ev.stopImmediatePropagation();
      },
      { capture: true }
    );
  }

  document.hasFocus = () => true;

  Object.defineProperties(document, {
    visibilityState: { value: "visible" },
    hidden: { value: false },
  });
}
