export const debugging = import.meta.env.MODE === "development";

const logPrefix = "[youtube-mute-skip-ads]";

/** Log an error with the app prefix. */
export function error(...args: unknown[]): void {
  console.error(logPrefix, ...args);
}

/** Log a warning with the app prefix. */
export function warn(...args: unknown[]): void {
  console.warn(logPrefix, ...args);
}

/** Log an info message with the app prefix. */
export function info(...args: unknown[]): void {
  console.info(logPrefix, ...args);
}

/** Log a debug message with the app prefix. */
export function debug(...args: unknown[]): void {
  console.debug(logPrefix, ...args);
}
