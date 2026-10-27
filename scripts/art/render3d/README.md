# 3D models rendered to sprites (Ricco Rush)

The heroes (and monsters) are free CC0 3D models photographed into 2D sprites, like the pre-rendered sprites of
2000s games: an orthographic camera a little above the field, the model turned to face right (the game mirrors
it), rendered twice as big, shrunk for smooth edges and given a thin dark outline.

- `page.html`: the studio page (three.js) that loads a model and photographs it in any animation pose.
- `studio.mjs`: opens the page in headless Chromium (software WebGL) and post-processes renders (`spritify`).
- `heroes.mjs`: `node scripts/art/render3d/heroes.mjs [hero ...] [--preview out.png]` writes
  `public/art/hero/<id>.webp` + `.json` (frames, feet, body height, animations) and `<id>_menu.webp`.

Models live in `art/models/` with their licences:
- `kaykit/`: KayKit Adventurers 1.0 by Kay Lousberg (CC0): Knight = Swordman, Rogue = Archer, Mage = Mage.
  Each model holds 76 animations and its props as separate meshes; `show` picks the meshes to keep.
