# Dev tools (not part of the game)

Helpers used while bringing art into the game and tuning balance. They are run by hand; nothing imports them.

| Tool | What it does |
|---|---|
| `grid.mjs <img> <out.png> [step] [x,y,w,h,zoom]` | Draws a labelled pixel grid over a picture (or a zoomed crop), to read off joint and wrist points. |
| `fit.py`, `compose.py` | Auto-fit a sliced part onto the rig pose by colour (Python + numpy + Pillow), and draw the fitted parts beside the rig pose to check them. |
| `<id>_rig.py` + `<id>_fit.json` | How each `art/rigs/<id>.json` was generated from the fits and hand-measured points (deckhand, ironclad, powder_monkey, parrot_raider, first_mate, talon, mochi). Rerun one to rebuild its rig. |
| `parrot_raider_fit.py`, `talon_fit.py`, `parrot_raider_compose.py` | `fit.py` / `compose.py` variants for pictures with a real transparent background (they use the alpha channel instead of the magenta). |
| `rigshot.mjs <out.png> "<query>" [w h]` | Screenshots `dev/rig.html` (e.g. `"c=deckhand&frames=walk@0.2,cheer@0.4"`). |
| `playshot.mjs <prefix> "<query>" "<js>" <ms,ms>` | Opens `play.html`, runs some JS once it is ready (e.g. `__play.battle.callWave()`), then screenshots after each delay. |
| `map_overlay.mts <map> <out.png>` | Draws the level's road, tower spots, dock, vault and island over a painted map. |
| `map_measure.mts <raw rgb>` | Measures how far the painted road and stone spots sit from the level data. |
| `balance_bot.mts [level\|all] [easy\|normal\|hard\|all] [towers]` | Plays the hero/lazy/mixed/archers/cannons/storms plans on a level and difficulty over six seeds and prints the crystals left (`BRANCH=1` buys level 4, `PICK=n` picks that order card, `PLANS=a,b` runs only those plans). |
| `check-artifact.mjs <page.html> <out.png>` | Loads a single-file build offline the way an artifact wraps it, and reports errors. |
| `gen_prompts.py` | Builds the all-in-one Codex prompts of section 10 in `docs/art/CHARACTER_BRIEF.md`. |

Run the `.mts` ones with `npx tsx`, the `.mjs` ones with `node` from the repository root.
