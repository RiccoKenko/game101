# Hero sprite bake

Bakes the rigged 2D cut-out hero from the old Three.js project (branch `sky-pirates-td`) into
`public/art/hero/hero.png` (8-column grid of 256x256 frames), `hero.json` (frame size, feet point, animations)
and `hero_menu.png` (idle pose, ~520 px tall, trimmed with 12 px padding).

These files are not part of this game's build. They run inside a checkout of `sky-pirates-td`:

- `dev/bake.html` + `src/dev/bake.ts`: a page that renders only the hero puppet on a transparent WebGL canvas
  (orthographic camera with its origin at the feet, facing right, fixed 1/240 s substeps, no random blinks) and
  hands back raw premultiplied pixels.
- `scripts/bake-hero.mjs`: starts Vite, drives the page in headless Chromium, renders at 4x and averages down in
  premultiplied space (so edges have no dark or white fringe), checks that nothing touches the frame edge and
  that the loops close, and writes the PNGs and the JSON.

## Re-run

```sh
git -C /home/user/game101 fetch origin sky-pirates-td
git -C /home/user/game101 worktree add --detach /tmp/sp origin/sky-pirates-td   # any path
cd /tmp/sp && npm ci                      # Playwright's Chromium is preinstalled at /opt/pw-browsers/chromium
cp -r /home/user/game101/scripts/art/hero-bake/{dev,src,scripts} /tmp/sp/
node scripts/bake-hero.mjs /tmp/hero-out --contact /tmp/hero-check
cp /tmp/hero-out/hero.png /tmp/hero-out/hero.json /tmp/hero-out/hero_menu.png /home/user/game101/public/art/hero/
```

Look at `/tmp/hero-check/contact.png` (every frame on mid grey, with the frame border, the baseline and the feet
point) and `menu_on_grey.png` before copying. The log lists each animation's extents and lowest row per frame,
any frame touching the edge (`PROBLEM ...`), and for loops the difference between "one more step" and the first
frame (0.000 = seamless).

Options: `PROBE=1` renders everything plus alternatives (calm idle, original `shoot`, ...) on 512 px frames to
measure true extents; `MENU_CLIP=idle` renders the menu still from the calm idle (bow held low) instead.

## What is baked

| animation | frames | fps | loop | from (hero.ts clips) |
| --- | --- | --- | --- | --- |
| idle | 0-15 | 12 | yes | `rapid` held at full draw (arrow nocked), plus hero.ts's breathing re-timed to one breath per 1.33 s |
| run | 16-23 | 16 | yes | `run`, one full 0.5 s cycle, body raised 21 rig px so the planted foot meets the standing soles |
| shoot | 24-31 | 16 | no | `shoot`'s release (string snaps, hand flies back), then `rapid`'s re-draw; ends on idle frame 0 |
| hurt | 32-37 | 12 | no | `hit` |
| ko | 38-47 | 12 | no | `ko`, last frame lying down |
| cheer | 48-59 | 12 | no | `cheer` up to its arms-up hold, jump height cut to 40% so the raised bow stays in frame |

Tuning lives at the top of `scripts/bake-hero.mjs`: `K` (frame px per rig px, 0.14 gives a ~204 px standing
hero), `FEET` ([128, 236], the rig's ground point), `STRING_PX` (bowstring thickness), and the `ANIMS` list
(which clip and which clip times each frame samples).
