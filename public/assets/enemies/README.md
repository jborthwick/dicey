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
| `poisonous-spider` | Poisonous Spider | *unassigned* | — | — | No sprite committed (`.gitkeep` only). **Not in `STARTER_ENEMY_IDS`** for this reason — ActorDef/cards/passive are left intact (dormant); add it back to the run order once it has art |
| `golem-blue` | Blue Golem | 2D Pixel Art Golems Asset Pack (Golem_1, Blue) | Free tier | [monopixelart.itch.io/golems-pack](https://monopixelart.itch.io/golems-pack) | `Golem_1_idle/die.png` (either VFX variant, identical bytes); `Golem_1_attack/hurt.png` from the **White_Swoosh_VFX** variant specifically |
| `golem-orange` | Orange Golem | 2D Pixel Art Golems Asset Pack (Golem_1, Orange) | Free tier | [monopixelart.itch.io/golems-pack](https://monopixelart.itch.io/golems-pack) | Same file mapping as `golem-blue`, Orange color variant |
| `skeleton` | Skeleton | Skeleton Pack (Phewcumber), Default/Unarmed | Free | [phewcumber.itch.io/skeleton-pack](https://phewcumber.itch.io/skeleton-pack) | `Skeleton_Default_Idle/Attack_Unarmed.png` + `Skeleton_Default_Hurt.png`, unshielded variant. **No die frame in this pack** — `die` is intentionally absent from `ENEMY_VISUALS`; `resolveEnemyClip` falls back to `idle` on defeat. The pack's `Run_Unarmed.png` exists but is unused (no "run" moment in this game) |
| `skeleton-sword` | Skeleton Warrior | Skeleton Pack (Phewcumber), Default/Sword | Free | [phewcumber.itch.io/skeleton-pack](https://phewcumber.itch.io/skeleton-pack) | Same as `skeleton`, Sword variant. Same no-die-frame / idle-fallback note applies |
| `rat-white` | White Rat | Rat Pack (Phewcumber), White | Free | [phewcumber.itch.io/rat-pack](https://phewcumber.itch.io/rat-pack) | `Rat_White_Idle/Attack/Hurt/Dead.png`. Pack also has Gray and Brown variants (unused) plus Sniff/Stand/Walk/Run (unused, no such moments in this game). This folder briefly held the **Gray** files by mistake before being corrected to White |
| `flying-demon` | Flying Demon | Flying Demon 2D Pixel Art (xzany) | Free | [xzany.itch.io/flying-demon-2d-pixel-art](https://xzany.itch.io/flying-demon-2d-pixel-art) | `IDLE/ATTACK/HURT/DEATH.png` from the **with_outline** variant. Pack also has a `FLYING.png` (unused — no separate flight-loop moment in this game, idle covers it) |
| `knight` | Knight | Knight 2D Pixel Art (xzany, free listing) | Free | [xzany.itch.io/free-knight-2d-pixel-art](https://xzany.itch.io/free-knight-2d-pixel-art) | `IDLE/DEATH/HURT.png` + **`ATTACK 3.png`** specifically (of three attack variants) from the **with_outline** variant. Pack also has DEFEND/JUMP/RUN/WALK (unused) |
| `kobold-warrior` | Kobold Warrior | Kobold Warrior 2D Pixel Art (xzany, $0-or-more bundle) | Free | [xzany.itch.io/kobold-warrior-2d-pixel-art](https://xzany.itch.io/kobold-warrior-2d-pixel-art) | `IDLE.png` + `ATTACK 1.png` from the **with_outline** variant. **This pack ships no hurt or death frame at all** (only Idle/Attack 1/Run exist) — both `hurt` and `die` are intentionally absent from `ENEMY_VISUALS`; `resolveEnemyClip` falls back to `idle` for both. `RUN.png` is unused |

All four MonoPixelArt packs above (Forest Monsters, Flying Forest Monsters,
Dark Fantasy Enemies, Golems) are "name your own price" listings: each has a
genuinely free tier that includes exactly the enemy/color we use, plus a
$4-minimum premium tier that unlocks additional enemies/colors from the
*same* pack (e.g. Slime + Bush Monster alongside Mushroom; Enemy1 + Enemy2
alongside Enemy3; Ghost Warrior + Evil Creature alongside Bat; Golem_2/
Golem_3 alongside Golem_1). **We've only ever used the free-tier enemy from
each pack** — confirmed by fetching each page directly, not by trusting a
filename. If anyone later wants one of those premium-only enemies (including
Enemy1/Enemy2 from `flying-enemies`, which is what `gust-pixie`/
`poisonous-spider` were originally — incorrectly — documented as using),
that requires actually paying the $4 minimum; don't commit those files
without confirming the pack was purchased.

xzany's three packs above are the same pattern under a different name: Knight
is a straight free listing, Flying Demon and Kobold Warrior are "name your
own price"/bundle-with-$0-allowed — all three confirmed free by fetching
xzany.itch.io directly (the profile-listing page's summary called Flying
Demon "Paid," which turned out to be an imprecise read of the listing view;
the pack's own page confirmed "Name your own price" with $0 allowed — always
verify on the specific pack page, not just the profile listing).

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
  Forest Monsters, Flying Forest Monsters, Dark Fantasy Enemies, Golems (all
  four used above; credit appreciated). Also publishes a Skeletons pack and
  an Animated Character pack we haven't used yet (**not** the same Skeletons
  pack as Phewcumber's below — don't conflate the two) — check that profile
  page first before sourcing new enemies, since most of what we've picked so
  far has come from there.
- **Phewcumber** ([phewcumber.itch.io](https://phewcumber.itch.io)) — Skeleton
  Pack (used for `skeleton`/`skeleton-sword`) and Rat Pack (used for
  `rat-white`), no credit required for either. Rat Pack also has Gray/Brown
  variants sitting unused in `dicey asset src/Possible/RatPack_v1-00/`.
- **xzany** ([xzany.itch.io](https://xzany.itch.io)) — Flying Demon, Knight,
  Kobold Warrior (all three used above; credit appreciated). Also sells
  several paid-only packs (Samurai Archer, Dragon, Wizard, Stone Golem, and
  more) — verify each specific pack page before assuming free, same as
  everything else in this file.

Do not commit paid-tier pack files to this public repo unless the license was
actually purchased.
