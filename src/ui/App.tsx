import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  canPlayCard,
  canReroll,
  endTurnTimeline,
  getCard,
  newRun,
  pickDraftCard,
  playCard,
  reroll,
  symbolOf,
  toggleHold,
  matchRequirement,
  SYMBOLS,
  type Actor,
  type CardDef,
  type Die,
  type GameState,
  type Passive,
  type Symbol,
  type TurnBeat,
} from "../core/index";
import { EnemySprite } from "./EnemySprite";
import { loadSavedGame, saveGame } from "./storage";
import { ELEMENT_COLOR, STATUS_UI, SYMBOL_UI } from "./symbols";

/** Cosmetic roll tuning (UI-only — never touches core RNG or state). */
const SHUFFLE_MS = 280; // how long a rolling die flickers before settling
const FLICKER_MS = 50; // interval between flicker frames
const STAGGER_MS = 45; // per-die delay so a multi-die roll cascades
const RESOLVE_DELAY = 1000; // pause between beats of the enemy's turn
const PROJECTILE_MS = 240; // flight time of a played-card projectile
const FLOATER_MS = 650; // lifetime of a floating damage number
const POP_MS = 380; // glow-pop duration when a die is spent on a card

/** Which side's HP bar a card's effect is aimed at, from the actor's frame:
 *  offensive/debuff cards fly at the opponent, self-buffs at the caster. */
function targetSideOf(card: CardDef, actorSide: "player" | "enemy"): "player" | "enemy" {
  const primary = card.effects[0]?.target ?? "enemy";
  const opponent = actorSide === "player" ? "enemy" : "player";
  return primary === "self" ? actorSide : opponent;
}

/** Coarse category, drives the projectile / impact color. */
function cardVariant(card: CardDef): "attack" | "buff" | "debuff" {
  if (card.effects.some((e) => e.kind === "damage")) return "attack";
  if (card.effects.some((e) => e.kind === "block")) return "buff";
  return "debuff";
}

function centerOf(el: Element): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

interface Projectile {
  id: number;
  label: string;
  color: string;
  variant: "attack" | "buff" | "debuff";
  side: "player" | "enemy"; // whose HP bar it hits
  amount: number; // HP lost by the target this play (0 = no damage number)
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

/** A floating "-N" that rises off a bar on impact. */
interface Floater {
  id: number;
  text: string;
  variant: "attack" | "buff" | "debuff";
  x: number;
  y: number;
}

/** Per-side impact pulse: `n` retriggers the flash, `v` colors it. */
type HitState = { player: { n: number; v: string }; enemy: { n: number; v: string } };

const REDUCED_MOTION =
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** A throwaway random face for the flicker — Math.random is fine here; this is
 *  pure cosmetics and must not perturb the seeded core RNG. */
function randomSymbol(): Symbol {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]!;
}

/**
 * The symbol-shuffle: while a die is rolling (i.e. this hook's component just
 * mounted, forced by a key change), flicker through random faces, then settle on
 * the real one — timed to land with the CSS tumble. Returns the face to display.
 * Shared by the player's dice and the spider's.
 */
function useRollShuffle(realSym: Symbol, delay: number): Symbol {
  const [shown, setShown] = useState<Symbol>(() =>
    REDUCED_MOTION ? realSym : randomSymbol(),
  );
  useEffect(() => {
    if (REDUCED_MOTION) {
      setShown(realSym);
      return;
    }
    let flicker: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      flicker = setInterval(() => setShown(randomSymbol()), FLICKER_MS);
    }, delay);
    const settle = setTimeout(() => {
      if (flicker) clearInterval(flicker);
      setShown(realSym);
    }, delay + SHUFFLE_MS);
    return () => {
      clearTimeout(start);
      clearTimeout(settle);
      if (flicker) clearInterval(flicker);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return shown;
}

/**
 * Glow-pop when a die transitions to spent — i.e. it just paid for a card.
 * Doesn't fire for entangled dice (spent by a status lock, not a play) or for
 * a die that's already spent when this component mounts (e.g. the entangled
 * lock applied at roll time, before this hook's effect ever sees a change).
 * Self-contained: no App-level state, the component just watches its own prop.
 */
function useSpentPop(spent: boolean, entangled: boolean): boolean {
  const [popping, setPopping] = useState(false);
  const wasSpent = useRef(spent);
  useEffect(() => {
    if (!wasSpent.current && spent && !entangled && !REDUCED_MOTION) {
      setPopping(true);
      const t = setTimeout(() => setPopping(false), POP_MS);
      wasSpent.current = spent;
      return () => clearTimeout(t);
    }
    wasSpent.current = spent;
    return undefined;
  }, [spent, entangled]);
  return popping;
}

/**
 * The UI is a thin shell over the pure core: it holds a `GameState`, renders it,
 * and every control dispatches a core action and stores the returned state. No
 * game rules live here — if you find yourself computing damage in this file,
 * it belongs in `src/core`.
 */
export default function App() {
  // Hydrate once from localStorage (or start a default run). Cached in state so
  // StrictMode double-mount doesn't re-read / re-seed.
  const [boot] = useState(() => {
    const saved = loadSavedGame();
    if (saved) return { state: saved, seedInput: String(saved.seed) };
    return { state: newRun("dicey-1"), seedInput: "dicey-1" };
  });
  const [seedInput, setSeedInput] = useState(boot.seedInput);
  const [state, setState] = useState<GameState>(boot.state);
  const [logOpen, setLogOpen] = useState(false);

  // A per-die counter, bumped whenever that die actually rolls. It feeds the
  // die's React `key`, so a rolled die remounts and replays its CSS tumble while
  // held/spent dice keep their key and stay put. Pure UI juice — the core never
  // sees it.
  const [rollNonce, setRollNonce] = useState<number[]>(() =>
    state.player.dice.map(() => 0),
  );
  const bumpAll = () => setRollNonce((prev) => prev.map((n) => n + 1));
  const bumpSome = (indices: number[]) =>
    setRollNonce((prev) => prev.map((n, i) => (indices.includes(i) ? n + 1 : n)));

  // Same nonce trick for the spider's dice, so they tumble as it rolls/rerolls.
  const [enemyNonce, setEnemyNonce] = useState<number[]>(() =>
    state.enemy.dice.map(() => 0),
  );

  // Enemy-turn playback: endTurnTimeline gives us a list of board snapshots and
  // we reveal them one at a time so the spider's turn is watchable instead of
  // instant. `frames`/`frameIdx` drive it; `resolving` is true mid-playback.
  const [frames, setFrames] = useState<TurnBeat[]>([]);
  const [frameIdx, setFrameIdx] = useState(0);
  const resolving = frameIdx < frames.length - 1;

  // Durable save: skip mid-enemy-turn frames so a refresh never lands in a
  // stranded enemyTurn. Closing mid-resolve reloads the pre-End-Turn board;
  // same seed ⇒ End Turn again yields the same outcome.
  useEffect(() => {
    if (resolving) return;
    saveGame(state);
  }, [state, resolving]);

  // If the current beat is the spider playing a card, name it so the UI can
  // light that card up.
  const currentAction = frames[frameIdx]?.action;
  const enemyPlayingCard =
    currentAction?.kind === "play" ? currentAction.cardId : null;

  // Flying-card projectiles + per-side impact flashes. Emphasize the direction
  // of each play: the played card lunges at the HP bar it affects.
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [hit, setHit] = useState<HitState>({
    player: { n: 0, v: "attack" },
    enemy: { n: 0, v: "attack" },
  });
  const projectileId = useRef(0);
  const floaterId = useRef(0);

  const spawnProjectile = (
    card: CardDef,
    actorSide: "player" | "enemy",
    sourceEl: Element | null,
    amount: number,
  ) => {
    if (REDUCED_MOTION || !sourceEl) return;
    const side = targetSideOf(card, actorSide);
    const destEl = document.querySelector(
      side === "enemy" ? ".enemy .hpbar" : ".player .hpbar",
    );
    if (!destEl) return;
    const from = centerOf(sourceEl);
    const to = centerOf(destEl);
    const id = ++projectileId.current;
    setProjectiles((ps) => [
      ...ps,
      {
        id,
        label: card.name,
        color: ELEMENT_COLOR[card.element] ?? "#666",
        variant: cardVariant(card),
        side,
        amount,
        fromX: from.x,
        fromY: from.y,
        toX: to.x,
        toY: to.y,
      },
    ]);
  };

  // Pop a floating "-N" off a bar, with a little horizontal jitter so stacked
  // hits don't perfectly overlap. Self-removes.
  const spawnFloater = (side: "player" | "enemy", amount: number, variant: Floater["variant"]) => {
    if (REDUCED_MOTION || amount <= 0) return;
    const barEl = document.querySelector(
      side === "enemy" ? ".enemy .hpbar" : ".player .hpbar",
    );
    if (!barEl) return;
    const c = centerOf(barEl);
    const id = ++floaterId.current;
    const jitter = (Math.random() - 0.5) * 70;
    setFloaters((fs) => [...fs, { id, text: `-${amount}`, variant, x: c.x + jitter, y: c.y }]);
    setTimeout(() => setFloaters((fs) => fs.filter((f) => f.id !== id)), FLOATER_MS);
  };

  // When a projectile lands: remove it, flash the target bar, pop the number.
  const onProjectileArrive = (p: Projectile) => {
    setProjectiles((ps) => ps.filter((x) => x.id !== p.id));
    setHit((h) => ({ ...h, [p.side]: { n: h[p.side].n + 1, v: p.variant } }));
    spawnFloater(p.side, p.amount, p.variant);
  };

  // Spider plays are discovered per beat; fire a projectile from its card and
  // read the HP it cost off the beat diff.
  useEffect(() => {
    const beat = frames[frameIdx];
    if (beat?.action.kind !== "play") return;
    const card = getCard(beat.action.cardId);
    const side = targetSideOf(card, "enemy");
    const prev = frames[frameIdx - 1]?.state;
    const amount = prev ? Math.max(0, prev[side].hp - beat.state[side].hp) : 0;
    // The playing card just got its `.playing` class in this render.
    const sourceEl = document.querySelector(".enemy-card.playing");
    spawnProjectile(card, "enemy", sourceEl, amount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameIdx]);

  const playPlayerCard = (id: string, sourceEl: Element) => {
    const card = getCard(id);
    const next = playCard(state, id);
    const side = targetSideOf(card, "player");
    const amount = Math.max(0, state[side].hp - next[side].hp);
    spawnProjectile(card, "player", sourceEl, amount);
    setState(next);
  };

  // Reveal `next`, animating dice that actually changed between the two frames.
  const applyFrame = (next: GameState, prev: GameState) => {
    setState(next);
    const enemyRolled = next.enemy.dice.flatMap((d, i) =>
      prev.enemy.dice[i]?.face !== d.face ? [i] : [],
    );
    if (enemyRolled.length) {
      setEnemyNonce((n) => n.map((v, i) => (enemyRolled.includes(i) ? v + 1 : v)));
    }
    // The player's next turn re-rolls their whole pool.
    if (next.phase === "playerTurn") bumpAll();
  };

  // Advance one frame per tick while there are frames left to show.
  useEffect(() => {
    if (frameIdx >= frames.length - 1) return;
    const id = setTimeout(() => {
      applyFrame(frames[frameIdx + 1]!.state, frames[frameIdx]!.state);
      setFrameIdx((i) => i + 1);
    }, RESOLVE_DELAY);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameIdx, frames]);

  const doReroll = () => {
    // Only the dice reroll actually touches get a new nonce.
    const rolling = state.player.dice.flatMap((d, i) =>
      !d.held && !d.spent ? [i] : [],
    );
    bumpSome(rolling);
    setState(reroll(state));
  };

  const doEndTurn = () => {
    if (resolving) return;
    const timeline = endTurnTimeline(state);
    setFrames(timeline);
    setFrameIdx(0);
    applyFrame(timeline[0]!.state, state); // show the enemy's turn beginning now
  };

  // Jump straight to the end of the spider's turn.
  const skipResolve = () => {
    if (!resolving) return;
    applyFrame(frames[frames.length - 1]!.state, frames[frameIdx]!.state);
    setFrameIdx(frames.length - 1);
  };

  const restart = () => {
    setFrames([]);
    setFrameIdx(0);
    setState(newRun(seedInput || Date.now().toString()));
    bumpAll();
  };

  const pickCard = (id: string) => {
    setFrames([]);
    setFrameIdx(0);
    setState(pickDraftCard(state, id));
    bumpAll();
  };

  const drafting = state.phase === "draft";
  const over = state.phase === "won" || state.phase === "lost";
  // No "/N" denominator — runs are endless, so there's no fixed total to show.
  const fightLabel = state.run.enabled ? `Fight ${state.run.fightIndex + 1}` : null;

  const canAct = state.phase === "playerTurn";
  const canPlayAny = canAct && state.player.hand.some((id) => canPlayCard(state, id));
  const endTurnNudge = canAct && !canPlayAny && !canReroll(state) && !resolving;

  return (
    <div className="app">
      <header className="topbar">
        <h1>Dicey</h1>
        <div className="seed">
          <label>
            seed{" "}
            <input value={seedInput} onChange={(e) => setSeedInput(e.target.value)} />
          </label>
          <button onClick={restart}>New run</button>
          {fightLabel && <span className="turn">{fightLabel}</span>}
          <span className="turn">Turn {state.turn}</span>
          <button onClick={() => setLogOpen(true)}>📜 Log</button>
        </div>
      </header>

      {/* Scrollable fight chrome: hand can grow to 2+ rows without shoving the tray off-screen. */}
      <div className="fight-scroll">
        <EnemyPanel
          enemy={state.enemy}
          acting={state.phase === "enemyTurn"}
          enemyNonce={enemyNonce}
          playingCardId={enemyPlayingCard}
          hit={hit.enemy}
        />

        {over && (
          <div className={`banner ${state.phase}`}>
            {state.phase === "won" ? "Victory!" : "Defeated…"}{" "}
            <button onClick={restart}>Play again</button>
          </div>
        )}

        <div className="player-zone">
          <CardGrid state={state} onPlay={playPlayerCard} disabled={drafting || over} />
          {resolving && <div className="dim-overlay" aria-hidden="true" />}
        </div>
      </div>

      {/* Pinned dock: HP + dice/actions stay reachable on short phones. */}
      <div className="dock">
        <button
          className={`end-turn end-turn-pill${endTurnNudge ? " nudge" : ""}`}
          disabled={!canAct || resolving}
          onClick={doEndTurn}
        >
          End Turn →
        </button>
        <DiceTray
          state={state}
          rollNonce={rollNonce}
          resolving={resolving}
          onToggle={(i) => setState(toggleHold(state, i))}
          onReroll={doReroll}
          onSkip={skipResolve}
        />
        <PlayerBar player={state.player} hit={hit.player} passives={state.player.passives} />
      </div>

      {/* position:fixed overlays live outside .fight-scroll: nesting a fixed
          element inside a -webkit-overflow-scrolling: touch ancestor clips it
          to that ancestor's box on iOS/WebKit instead of the true viewport. */}
      {drafting && state.run.draftOffers && (
        <DraftOverlay
          offers={state.run.draftOffers}
          relic={state.run.pendingRelic}
          onPick={pickCard}
        />
      )}

      {logOpen && <LogOverlay lines={state.log} onClose={() => setLogOpen(false)} />}

      <Projectiles
        projectiles={projectiles}
        floaters={floaters}
        onArrive={onProjectileArrive}
      />
    </div>
  );
}

/** Fixed overlay: flying-card projectiles and the floating damage numbers. */
function Projectiles({
  projectiles,
  floaters,
  onArrive,
}: {
  projectiles: Projectile[];
  floaters: Floater[];
  onArrive: (p: Projectile) => void;
}) {
  return (
    <div className="projectiles-layer">
      {projectiles.map((p) => (
        <FlyingCard key={p.id} p={p} onArrive={onArrive} />
      ))}
      {floaters.map((f) => (
        <div
          key={f.id}
          className={`floater ${f.variant}`}
          style={{ left: f.x, top: f.y }}
        >
          {f.text}
        </div>
      ))}
    </div>
  );
}

function FlyingCard({
  p,
  onArrive,
}: {
  p: Projectile;
  onArrive: (p: Projectile) => void;
}) {
  const [moved, setMoved] = useState(false);
  useEffect(() => {
    // Two frames so the browser paints the start position before transitioning.
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setMoved(true)),
    );
    const done = setTimeout(() => onArrive(p), PROJECTILE_MS + 40);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dx = p.toX - p.fromX;
  const dy = p.toY - p.fromY;
  const style: CSSProperties = {
    left: p.fromX,
    top: p.fromY,
    background: p.color,
    transform: moved
      ? `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.55)`
      : "translate(-50%, -50%) scale(1)",
    opacity: moved ? 0.2 : 1,
    transition: `transform ${PROJECTILE_MS}ms cubic-bezier(0.5, 0, 0.7, 1), opacity ${PROJECTILE_MS}ms ease-in`,
  };
  return (
    <div className={`projectile ${p.variant}`} style={style}>
      {p.label}
    </div>
  );
}

function RelicBadge({ passive }: { passive: Passive }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div className="relic-badge-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`passive relic-badge${open ? " open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-describedby={open ? `relic-tip-${passive.id}` : undefined}
      >
        ✦ {passive.name}
      </button>
      {open && (
        <div id={`relic-tip-${passive.id}`} className="relic-tooltip" role="tooltip">
          {passive.text}
        </div>
      )}
    </div>
  );
}

function EnemyPanel({
  enemy,
  acting,
  enemyNonce,
  playingCardId,
  hit,
}: {
  enemy: Actor;
  acting: boolean;
  enemyNonce: number[];
  playingCardId: string | null;
  hit: { n: number; v: string };
}) {
  return (
    <section className={`enemy${acting ? " acting" : ""}`}>
      <div className="enemy-name">
        {enemy.name}
        {acting && <span className="acting-tag">acting…</span>}
        <StatusRow statuses={enemy.statuses} />
      </div>
      <div className="enemy-stage">
        <EnemySprite
          enemyId={enemy.id}
          hp={enemy.hp}
          hitN={hit.n}
          playingCardId={playingCardId}
        />
      </div>
      <HpBar cur={enemy.hp} max={enemy.maxHp} hit={hit} />
      {enemy.passives.map((p) => (
        <RelicBadge key={p.id} passive={p} />
      ))}
      {acting && (
        <>
          <EnemyDice enemy={enemy} enemyNonce={enemyNonce} />
          <EnemyHand enemy={enemy} playingCardId={playingCardId} />
        </>
      )}
    </section>
  );
}

/**
 * The spider's hand, shown during its turn. Cards it can currently pay for read
 * brighter; the one it's playing this beat lights up. Read-only.
 */
function EnemyHand({
  enemy,
  playingCardId,
}: {
  enemy: Actor;
  playingCardId: string | null;
}) {
  const cards = enemy.hand.map(getCard);
  return (
    <div className="enemy-hand">
      {cards.map((card) => {
        const affordable = matchRequirement(enemy.dice, card.requirement) !== null;
        const playing = card.id === playingCardId;
        const cls = [
          "enemy-card",
          affordable ? "affordable" : "",
          playing ? "playing" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <div
            key={card.id}
            className={cls}
            style={{ background: ELEMENT_COLOR[card.element] }}
            title={card.text}
          >
            <span className="ec-name">{card.name}</span>
            <span className="ec-cost">
              <CostView card={card} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Read-only display of the spider's dice during its turn. */
function EnemyDice({ enemy, enemyNonce }: { enemy: Actor; enemyNonce: number[] }) {
  let rollOrder = 0;
  return (
    <div className="dice enemy-dice">
      {enemy.dice.map((d, i) => {
        const willRoll = !d.held && !d.spent;
        const delay = willRoll ? rollOrder++ * STAGGER_MS : 0;
        return <EnemyDie key={`${i}-${enemyNonce[i] ?? 0}`} die={d} delay={delay} />;
      })}
    </div>
  );
}

function EnemyDie({ die, delay }: { die: Die; delay: number }) {
  const realSym = symbolOf(die);
  const ui = SYMBOL_UI[realSym];
  const shown = useRollShuffle(realSym, delay);
  const cls = [
    "die",
    "readonly",
    die.entangled ? "entangled" : "",
    !die.entangled && die.spent ? "spent" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      className={cls}
      style={
        {
          borderColor: die.entangled ? undefined : ui.color,
          "--roll-delay": `${delay}ms`,
        } as CSSProperties
      }
      title={die.entangled ? `${ui.label} — Entangled` : ui.label}
    >
      <span className="die-glyph">{SYMBOL_UI[shown].glyph}</span>
      {die.entangled && (
        <span className="die-web" aria-hidden>
          🕸️
        </span>
      )}
    </div>
  );
}

function DraftOverlay({
  offers,
  relic,
  onPick,
}: {
  offers: [string, string];
  relic: Passive | null;
  onPick: (id: string) => void;
}) {
  const cards = offers.map(getCard);
  const uniqueCards =
    offers[0] === offers[1] ? [cards[0]!] : [cards[0]!, cards[1]!];
  return (
    <div className="draft-overlay">
      <div className="draft-panel">
        <h2>Choose a card</h2>
        {relic && (
          <p className="draft-relic">
            Relic gained: <RelicBadge passive={relic} />
          </p>
        )}
        <div className="draft-cards">
          {uniqueCards.map((card) => (
            <button
              key={card.id}
              className="card draft-card"
              style={{ background: ELEMENT_COLOR[card.element] }}
              onClick={() => onPick(card.id)}
            >
              <div className="card-name">{card.name}</div>
              <div className="card-cost">
                <CostView card={card} />
              </div>
              <div className="card-text">{card.text}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CardGrid({
  state,
  onPlay,
  disabled,
}: {
  state: GameState;
  onPlay: (id: string, sourceEl: Element) => void;
  disabled?: boolean;
}) {
  const cards = useMemo(() => state.player.hand.map(getCard), [state.player.hand]);
  return (
    <section className="cards">
      {cards.map((card) => {
        const playable = !disabled && canPlayCard(state, card.id);
        return (
          <button
            key={card.id}
            className="card"
            style={{ background: ELEMENT_COLOR[card.element] }}
            disabled={!playable}
            onClick={(e) => onPlay(card.id, e.currentTarget)}
          >
            <div className="card-name">{card.name}</div>
            <div className="card-cost">
              <CostView card={card} />
            </div>
            <div className="card-text">{card.text}</div>
          </button>
        );
      })}
    </section>
  );
}

function CostView({ card }: { card: CardDef }) {
  const req = card.requirement;
  if (req.kind === "symbols") {
    const ui = SYMBOL_UI[req.symbol];
    return (
      <span>
        {Array.from({ length: req.count }, (_, i) => (
          <span key={i}>{ui.glyph}</span>
        ))}
      </span>
    );
  }
  return <span>{req.count === 1 ? "1 Pair" : `${req.count} Pairs`} 🎲🎲</span>;
}

function DiceTray({
  state,
  rollNonce,
  resolving,
  onToggle,
  onReroll,
  onSkip,
}: {
  state: GameState;
  rollNonce: number[];
  resolving: boolean;
  onToggle: (i: number) => void;
  onReroll: () => void;
  onSkip: () => void;
}) {
  const dice = state.player.dice;
  const canAct = state.phase === "playerTurn";
  // Stagger only the dice that can actually roll, so a partial reroll of one or
  // two dice stays snappy instead of waiting out phantom slots.
  let rollOrder = 0;
  return (
    <section className="tray">
      <div className="dice">
        {dice.map((d, i) => {
          const willRoll = !d.held && !d.spent;
          const delay = willRoll ? rollOrder++ * STAGGER_MS : 0;
          return (
            // The nonce in the key remounts the die when it rolls, replaying the
            // tumble (CSS) and the symbol shuffle (DieView's mount effect).
            <DieView
              key={`${i}-${rollNonce[i] ?? 0}`}
              die={d}
              index={i}
              delay={delay}
              canAct={canAct}
              onToggle={onToggle}
            />
          );
        })}
      </div>
      <div className="tray-actions">
        {resolving ? (
          <button className="skip" onClick={onSkip}>
            Skip ⏭
          </button>
        ) : (
          <button
            className="reroll"
            disabled={!canAct || !canReroll(state)}
            onClick={onReroll}
            title={`Reroll (${state.player.rollsRemaining} left)`}
          >
            <span className="reroll-glyph">⟳</span>
            <span className="reroll-count">{state.player.rollsRemaining}</span>
          </button>
        )}
      </div>
    </section>
  );
}

/**
 * A single die. Mounting one (which the parent forces via its `key` whenever the
 * die actually rolls) kicks off a brief symbol shuffle — the glyph flickers
 * through random faces before settling on the real one — timed to land with the
 * CSS tumble. The border keeps the die's *real* element color the whole time, so
 * only the face flickers.
 */
function DieView({
  die,
  index,
  delay,
  canAct,
  onToggle,
}: {
  die: Die;
  index: number;
  delay: number;
  canAct: boolean;
  onToggle: (i: number) => void;
}) {
  const realSym = symbolOf(die);
  const ui = SYMBOL_UI[realSym];
  const shown = useRollShuffle(realSym, delay);
  const popping = useSpentPop(die.spent, die.entangled);

  // Entangled implies held+spent, but it should read as a status, not as a die
  // you spent — so it takes its own style and suppresses the held/spent looks.
  const cls = [
    "die",
    die.entangled ? "entangled" : "",
    !die.entangled && die.held ? "held" : "",
    !die.entangled && die.spent ? "spent" : "",
    popping ? "popping" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const title = die.entangled
    ? `${ui.label} — Entangled (locked this turn)`
    : `${ui.label}${die.held ? " (held)" : ""}${die.spent ? " (spent)" : ""}`;
  return (
    <button
      className={cls}
      style={
        {
          borderColor: die.entangled ? undefined : ui.color,
          color: ui.color,
          "--roll-delay": `${delay}ms`,
        } as CSSProperties
      }
      disabled={!canAct || die.spent}
      onClick={() => onToggle(index)}
      title={title}
    >
      <span className="die-glyph">{SYMBOL_UI[shown].glyph}</span>
      {die.entangled && (
        <span className="die-web" aria-hidden>
          🕸️
        </span>
      )}
      {popping && (
        <>
          <span className="die-pop-glow" aria-hidden />
          <span className="die-pop-ring" aria-hidden />
        </>
      )}
    </button>
  );
}

function PlayerBar({
  player,
  hit,
  passives,
}: {
  player: Actor;
  hit: { n: number; v: string };
  passives: Passive[];
}) {
  return (
    <section className="player">
      <div className="player-name">
        {player.name}
        <StatusRow statuses={player.statuses} />
      </div>
      <HpBar cur={player.hp} max={player.maxHp} hit={hit} />
      {passives.length > 0 && (
        <div className="player-relics">
          {passives.map((p) => (
            <RelicBadge key={p.id} passive={p} />
          ))}
        </div>
      )}
    </section>
  );
}

function HpBar({
  cur,
  max,
  hit,
}: {
  cur: number;
  max: number;
  hit?: { n: number; v: string };
}) {
  const pct = Math.max(0, Math.min(100, (cur / max) * 100));
  const n = hit?.n ?? 0;
  return (
    // Keyed by the hit nonce: a landing projectile remounts the bar, replaying
    // both the shake and the flash. HP-only changes (poison, etc.) don't bump
    // the nonce, so the fill still transitions smoothly.
    <div key={n} className={`hpbar${n > 0 ? " bumped" : ""}`}>
      <div className="hpbar-fill" style={{ width: `${pct}%` }} />
      <span className="hpbar-text">
        {cur} / {max}
      </span>
      {n > 0 && <span className={`hpbar-hit ${hit!.v}`} />}
    </div>
  );
}

function StatusRow({ statuses }: { statuses: Actor["statuses"] }) {
  const entries = Object.entries(statuses).filter(([, v]) => (v ?? 0) > 0);
  if (entries.length === 0) return null;
  return (
    <span className="statuses">
      {entries.map(([k, v]) => {
        const ui = STATUS_UI[k];
        return (
          <span key={k} className="status" title={ui?.label ?? k}>
            {ui?.glyph ?? "?"}
            {v}
          </span>
        );
      })}
    </span>
  );
}

function LogOverlay({ lines, onClose }: { lines: string[]; onClose: () => void }) {
  const recent = lines.slice(-30);
  return (
    <div className="log-overlay" onClick={onClose}>
      <div className="draft-panel log-panel" onClick={(e) => e.stopPropagation()}>
        <h2>
          Log
          <button className="log-close" onClick={onClose} aria-label="Close log">
            ✕
          </button>
        </h2>
        <section className="log">
          {recent.map((l, i) => (
            <div key={lines.length - recent.length + i} className="log-line">
              {l}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
