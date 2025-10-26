export function abortableSetTimeout(
  signal: AbortSignal | undefined,
  callback: () => void,
  timeout?: number,
): void {
  if (signal?.aborted) return;

  const timeoutId = setTimeout(() => {
    signal?.removeEventListener("abort", clearThisTimeout);
    if (signal?.aborted) return;
    callback();
  }, timeout);

  function clearThisTimeout(): void {
    clearTimeout(timeoutId);
  }

  signal?.addEventListener("abort", clearThisTimeout, { once: true });
}

export function abortableSetInterval(
  signal: AbortSignal | undefined,
  callback: () => void,
  interval?: number,
): void {
  if (signal?.aborted) return;

  const intervalId = setInterval(() => {
    if (signal?.aborted) return;
    callback();
  }, interval);

  function clearThisInterval(): void {
    clearInterval(intervalId);
  }

  signal?.addEventListener("abort", clearThisInterval, { once: true });
}

export function abortableRequestIdleCallback(
  signal: AbortSignal | undefined,
  callback: IdleRequestCallback,
  options?: IdleRequestOptions,
) {
  if (signal?.aborted) return;

  const requestId = requestIdleCallback((deadline) => {
    signal?.removeEventListener("abort", cancelThisIdleCallback);
    if (signal?.aborted) return;
    callback(deadline);
  }, options);

  function cancelThisIdleCallback(): void {
    cancelIdleCallback(requestId);
  }

  signal?.addEventListener("abort", cancelThisIdleCallback, { once: true });
}

export function abortableRequestAnimationFrame(
  signal: AbortSignal | undefined,
  callback: FrameRequestCallback,
) {
  if (signal?.aborted) return;

  const requestId = requestAnimationFrame((time) => {
    signal?.removeEventListener("abort", cancelThisAnimationFrame);
    if (signal?.aborted) return;
    callback(time);
  });

  function cancelThisAnimationFrame(): void {
    cancelAnimationFrame(requestId);
  }

  signal?.addEventListener("abort", cancelThisAnimationFrame, { once: true });
}
