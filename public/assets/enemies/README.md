# Enemy sprite assets — provenance ledger

Drop **renamed PNG strips** here — one folder per game enemy id (the id is
looked up in `src/ui/visuals/enemies.ts`, which must match this table exactly).
The UI loads `idle.png`, `attack.png`, `hurt.png`, and `die.png` from each
folder. Frame count is detected automatically from transparent gaps in each
PNG — you only need to tune **fps** in `enemies.ts` if an animation feels too
fast or too slow.

## Process: this table is the source of truth

**Whenever you add or swap a committed sprite, update the matching row below
*and* the `source` string in `src/ui/visuals/enemies.ts` — same commit.** Both
drifted out of sync with reality once already (folder names didn't match the
sprites actually in them, and a "premium" label survived a later swap to a
free pack), which is exactly what this rule exists to prevent. If you can't
fill in every column, that's a signal the asset isn't ready to commit yet.

Unreleased/candidate art lives in the gitignored `dicey asset src/` folder at
the repo root (not this one) — keep exploring there under `Possible/`, and
only promote something to `Selected/` once you're actually going to use it.
Nothing under `dicey asset src/` is ever committed.

## Enemies in use

| Enemy id | Display name | Pack | License | Source | Files used |
|---|---|---|---|---|---|
| `mushroom` | Spore Mushroom | Forest Monsters 2D Pixel Art | Free tier | [monopixelart.itch.io/forest-monsters-pixel-art](https://monopixelart.itch.io/forest-monsters-pixel-art) | `Mushroom-Idle/Attack/Die.png` (either VFX variant, identical bytes); `Mushroom-Hit.png` from the **with-VFX** variant specifically (the without-VFX `Hit.png` is a different file) |
| `bloom-sprite` | Bloom Sprite | Flying Forest Monsters 2D Pixel Art (Enemy3) | Free tier — see below | [monopixelart.itch.io/flying-enemies](https://monopixelart.itch.io/flying-enemies) | `Enemy3-Idle/AttackSmashLoop/Die.png` (either Movement/No-Movement variant, identical bytes); `Enemy3-Hit.png` from the **Movement-In-Animation** variant specifically |
| `bat` | Cave Bat | Dark Fantasy Enemies 2D Pixel Art | Free tier | [monopixelart.itch.io/dark-fantasy-enemies-asset-pack](https://monopixelart.itch.io/dark-fantasy-enemies-asset-pack) | `Bat-IdleFly/Die.png` (either VFX variant, identical bytes); `Bat-Attack1.png` and `Bat-Hurt.png` from the **with-VFX** variant specifically (the without-VFX files differ) |
| `poisonous-spider` | Poisonous Spider | *unassigned* | — | — | No sprite committed yet (`.gitkeep` only) — currently renders the missing-sprite placeholder |

All three packs above are MonoPixelArt "name your own price" listings: each
has a genuinely free tier that includes exactly the one enemy we use (Mushroom,
Enemy3, Bat respectively), plus a $4-minimum premium tier that unlocks
additional enemies from the *same* pack (e.g. Slime + Bush Monster alongside
Mushroom; Enemy1 + Enemy2 alongside Enemy3; Ghost Warrior + Evil Creature
alongside Bat). **We've only ever used the free-tier enemy from each pack** —
confirmed by fetching each page directly, not by trusting a filename. If
anyone later wants one of those premium-only enemies (including Enemy1/Enemy2
from `flying-enemies`, which is what `gust-pixie`/`poisonous-spider` were
originally — incorrectly — documented as using), that requires actually
paying the $4 minimum; don't commit those files without confirming the
pack was purchased.

## History

- The `mushroom` / `bloom-sprite` / `bat` folders were originally named
  `dust-mite` / `puddle-slime` / `gust-pixie` from an earlier round of asset
  picks (Skeleton Pack, MonoPixelArt Enemy1) that got swapped out for the
  current free-pack sprites without this doc being updated — so it documented
  assets that were no longer actually committed. Folders, enemy ids, and
  display names were renamed to match what's actually in them; game mechanics
  (dice/cards/hp) were left unchanged.

## Credits

- **MonoPixelArt** ([monopixelart.itch.io](https://monopixelart.itch.io)) —
  Forest Monsters, Flying Forest Monsters, Dark Fantasy Enemies (all three
  used above; credit appreciated). Also publishes Skeletons, Golems, and an
  Animated Character pack we haven't used yet — check that profile page
  first before sourcing new enemies, since most of what we've picked so far
  has come from there.
- **Phewcumber** ([phewcumber.itch.io/skeleton-pack](https://phewcumber.itch.io/skeleton-pack))
  — Skeleton Pack (no credit required) — currently unused, sitting in
  `dicey asset src/Possible/FREE_SkeletonPack_ByPhewcumber/` as a candidate.
  **Not the same pack** as MonoPixelArt's own Skeletons Pack, which is a
  separate unused candidate in `dicey asset src/Possible/Skeletons_Free_Pack/`
  — don't conflate the two if either gets promoted to `Selected/` later.

Do not commit paid-tier pack files to this public repo unless the license was
actually purchased.
