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
| `mushroom` | Spore Mushroom | Forest_Monsters_FREE | Free | *TODO: itch.io link* | `Mushroom-Idle/Attack/Die.png` (either VFX variant, identical bytes); `Mushroom-Hit.png` from the **with-VFX** variant specifically (the without-VFX `Hit.png` is a different file) |
| `bloom-sprite` | Bloom Sprite | FlyingForestEnemies_FREE (Enemy3) | Free — see below | [monopixelart.itch.io/flying-enemies](https://monopixelart.itch.io/flying-enemies) | `Enemy3-Idle/AttackSmashLoop/Die.png` (either Movement/No-Movement variant, identical bytes); `Enemy3-Hit.png` from the **Movement-In-Animation** variant specifically |
| `bat` | Cave Bat | DarkFantasyEnemies_FREE | Free | *TODO: itch.io link* | `Bat-IdleFly/Die.png` (either VFX variant, identical bytes); `Bat-Attack1.png` and `Bat-Hurt.png` from the **with-VFX** variant specifically (the without-VFX files differ) |
| `poisonous-spider` | Poisonous Spider | *unassigned* | — | — | No sprite committed yet (`.gitkeep` only) — currently renders the missing-sprite placeholder |

**A note on `flying-enemies`:** it's "pay what you want" — Enemy3 has a free
tier, but Enemy1 and Enemy2 on that same page are locked behind a $4 minimum
("premium"). `bloom-sprite` uses **Enemy3 only**, confirmed free. If anyone
ever wants Enemy1/Enemy2 (the ones originally — incorrectly — documented here
for `gust-pixie`/`poisonous-spider`), that requires the paid tier; don't
commit those without confirming the pack was actually purchased.

## History

- The `mushroom` / `bloom-sprite` / `bat` folders were originally named
  `dust-mite` / `puddle-slime` / `gust-pixie` from an earlier round of asset
  picks (Skeleton Pack, MonoPixelArt Enemy1) that got swapped out for the
  current free-pack sprites without this doc being updated — so it documented
  assets that were no longer actually committed. Folders, enemy ids, and
  display names were renamed to match what's actually in them; game mechanics
  (dice/cards/hp) were left unchanged.

## Credits

- Phewcumber — Skeleton Pack (no credit required) — currently unused, sitting
  in `dicey asset src/Possible/` as a candidate
- MonoPixelArt — Flying Forest Monsters (credit appreciated)
- *(credits for Forest_Monsters_FREE and DarkFantasyEnemies_FREE — TODO once
  source links are filled in above)*

Do not commit paid-tier pack files to this public repo unless the license was
actually purchased.
