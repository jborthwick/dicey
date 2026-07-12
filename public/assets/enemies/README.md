# Enemy sprite assets

Drop **renamed PNG strips** here — one folder per game enemy id. The UI loads
`idle.png`, `attack.png`, `hurt.png`, and `die.png` from each folder.

Frame count is detected automatically from transparent gaps in each PNG — you
only need to tune **fps** in `src/ui/visuals/enemies.ts` if an animation feels
too fast or too slow.

## dust-mite/

**Source:** [Flying Forest Monsters (free Enemy3)](https://monopixelart.itch.io/flying-enemies)

| Save as     | Copy from pack (Enemy3)        |
|-------------|--------------------------------|
| `idle.png`  | IdleFly                        |
| `attack.png`| AttackSmashStart               |
| `hurt.png`  | Hit                            |
| `die.png`   | Die                            |

## puddle-slime/

**Source:** [Skeleton Pack (free Warrior)](https://phewcumber.itch.io/skeleton-pack)

| Save as     | Copy from pack (Warrior, sword or unarmed) |
|-------------|---------------------------------------------|
| `idle.png`  | Idle                                        |
| `attack.png`| Attack                                      |
| `hurt.png`  | Hurt (Skeleton pack exports this as `Hit.png`) |
| `die.png`   | Dead                                        |

## gust-pixie/

**Source:** [Flying Forest Monsters (premium Enemy1)](https://monopixelart.itch.io/flying-enemies)

| Save as     | Copy from pack (Enemy1) |
|-------------|-------------------------|
| `idle.png`  | IdleFly                 |
| `attack.png`| AttackV1                |
| `hurt.png`  | Hit                     |
| `die.png`   | DieV1 or DieV2          |

## poisonous-spider/

**Source:** [Flying Forest Monsters (premium Enemy2)](https://monopixelart.itch.io/flying-enemies)

| Save as     | Copy from pack (Enemy2) |
|-------------|-------------------------|
| `idle.png`  | IdleFly                 |
| `attack.png`| AttackV1                |
| `hurt.png`  | Hit                     |
| `die.png`   | Die                     |

## Credits

- MonoPixelArt — Flying Forest Monsters (credit appreciated)
- Phewcumber — Skeleton Pack (no credit required)

Do not commit paid pack files to a public repo unless your license allows it.
