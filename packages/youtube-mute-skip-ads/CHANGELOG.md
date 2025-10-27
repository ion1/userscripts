# YouTube Mute and Skip Ads: Change Log

## next

- Include the change log in the script.

## 0.0.30 2025-10-26

- Skip shorts ads backwards if the user was moving backwards in the feed.

## 0.0.29 2025-10-26

- Handle shorts ads ([PR #3](https://github.com/ion1/userscripts/pull/3), thanks [@sim6](https://github.com/sim6)!)
- Replace Watcher with code thatsupports observing multiple matching elements.

  Watcher only supported singular elements matching the selectors. However, sometimes there are more than one of them. Implement the observer code in a much simpler way at the expense of a more verbose API. It might be improved later.

## 0.0.28 2024-10-03

- Add a missing `if (debugging)` around a `console.debug` call.
  - TODO: Add logging functions which handle the prefix and the debug mode.
- Add a build with debug logging.
- Target modern browser versions when building, reducing polyfills in the output.
- Use the `getPlaybackRate` method on the `#movie_player` element.

  `video.playbackRate` may return 1 if an ad is played before the main video is loaded ([issue #2](https://github.com/ion1/userscripts/issues/2)).

## 0.0.27 2024-09-25

- `.ytp-suggested-action-badge` popups are showing up on top of the video with a hidden dismiss button. Hide them using CSS rather than just blurring and trying to click on the button.

## 0.0.26 2024-09-02

- Restore playback rate after ads.

## 0.0.25 2024-08-29

- Resume playback at end of live video.

## 0.0.24 2024-08-27

- Refrain from resuming playback if at the end.

## 0.0.23 2024-08-27

- Watcher: Make onAdded callbacks return a possible onRemoved callback.
- Watcher: In text/attr callbacks, distinguish empty value from disconnecting watcher.
- Watcher: Also pass element to text/attr callbacks.
- Wait for aria-hidden being removed from skip button.
- CSS: Add `.ytp-ad-action-interstitial-slot`, `.ytp-ad-action-interstitial-background-container` (an image ad in place of the video).
- Put all clicks behind a visibility check.
- Add a popover on unclickable skip buttons.
- Split `adUIAdded` into mute and speedup.
- Use the `cancelPlayback` method on `#movie_player`.

## 0.0.22 2024-04-07

- CSS: Hide `.ytp-suggested-action-badge`, `.ytp-visit-advertiser-link`.

## 0.0.21 2024-04-06

- Fix CSS minification happening again.
- Add new ad class: `.ytp-ad-player-overlay-layout__player-card-container`.
- Add new ad player overlay class: `.ytp-ad-player-overlay-layout`.
- Add new skip button class: `.ytp-skip-ad-button`.

## 0.0.20 2023-11-10

- Handle new skip button class: `.ytp-ad-skip-button-modern`.

## 0.0.19 2023-11-07

- Simplify the PostCSS output by using `:is(:hover, :focus-within)`.
- CSS: Remove unnecessary prefers-reduced-motion handling.
  Fading [shouldn't be a problem](https://www.smashingmagazine.com/2020/09/design-reduced-motion-sensitivities/#identifying-potentially-triggering-motion) with prefers-reduced-motion.
- Close featured product overlay.
- CSS: Hide `yts-merch-shelf-renderer`.

## 0.0.18 2023-04-08

- New ad panel element: `ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]`.

## 0.0.17 2023-03-29

- Detect skip button on non-video ads.
- Disable ad counter-based reloading for now.

  YouTube started behaving in a more annoying way on 2023-03-28 and repeatedly showing long ads after the reload.

- Rather than reloading, speed up ad playback.
- No need to unmute; the video element is replaced.

## 0.0.16 2023-03-27

- Parser: Typo fix.

## 0.0.15 2023-03-27

- Add a nicer object property parser.
- Avoid end-of-video detection while live.

## 0.0.14 2023-03-24

- Disable visibility checks.

  YouTube Music will pause the music and wait until it gets focused to show the are-you-there dialog.

## 0.0.13 2023-03-22

- Include `duration >= 1` in end-of-video check.

## 0.0.12 2023-03-20

- `getMuteButton`: Also work on YouTube Music.

## 0.0.11 2023-03-20

- Increase reload-canceled notification delay.
- Reloader: Show a notification during end-of-video ads.
- Adjust a log message and formatting.

## 0.0.10 2023-03-19

- Do not reload if at the end of the video.
- Watcher: Add attribute watchers.
- Blur ad title and subtitle in YT Music.
- Reloader: pause before reloading; handle canceled reloads.
- Avoid reloading on YouTube Music; it messes up random playlists.

## 0.0.9 2023-03-16

- Upload reload reason descriptions.
- Blur `ytd-player-legacy-desktop-watch-ads-renderer`.
- Replace ad-hoc observers with a Watcher class.
  - Now uses IntersectionObserver to determine when the skip button becomes visible.
  - Now takes both the remaining time indicator and the preskip countdown into account.

## 0.0.8 2023-03-11

- Update the description.

## 0.0.7 2023-03-11

- Prevent CSS minification.

## 0.0.6 2023-03-11

- More robust ad badge parsing.
- Display a post-reload notification as well.
- Restore focused element (by ID, if any) after reloading.

## 0.0.5 2023-03-09

- Overhaul logging.
- Click "yes" on "are you there?" on YouTube Music.

## 0.0.4 2023-03-07

- Parse ad badges in more languages.

## 0.0.3 2023-03-07

- Update the description.

## 0.0.2 2023-03-06

- Add a notification for when the video page is reloaded.

## 0.0.1 2023-03-05

- Initial release.
