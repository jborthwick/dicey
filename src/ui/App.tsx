import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  canPlayCard,
  endTurn,
  getCard,
  newGame,
  playCard,
  reroll,
  symbolOf,
  toggleHold,
  SYMBOLS,
  type Actor,
  type CardDef,
  type Die,
  type GameState,
  type Symbol,
} from "../core/index";
import { ELEMENT_COLOR, STATUS_UI, SYMBOL_UI } from "./symbols";

/** Cosmetic roll tuning (UI-only — never touches core RNG or state). */
const SHUFFLE_MS = 280; // how long a rolling die flickers before settling
const FLICKER_MS = 50; // interval between flicker frames
const STAGGER_MS = 45; // per-die delay so a multi-die roll cascades

const REDUCED_MOTION =
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** A throwaway random face for the flicker — Math.random is fine here; this is
 *  pure cosmetics and must not perturb the seeded core RNG. */
function randomSymbol(): Symbol {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]!;
}

/**
 * The UI is a thin shell over the pure core: it holds a `GameState`, renders it,
 * and every control dispatches a core action and stores the returned state. No
 * game rules live here — if you find yourself computing damage in this file,
 * it belongs in `src/core`.
 */
export default function App() {
  const [seedInput, setSeedInput] = useState("dicey-1");
  const [state, setState] = useState<GameState>(() => newGame("dicey-1"));

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

  const doReroll = () => {
    // Only the dice reroll actually touches get a new nonce.
    const rolling = state.player.dice.flatMap((d, i) =>
      !d.held && !d.spent ? [i] : [],
    );
    bumpSome(rolling);
    setState(reroll(state));
  };

  const doEndTurn = () => {
    const next = endTurn(state);
    setState(next);
    // Turn start re-rolls every player die (unless the game just ended).
    if (next.phase === "playerTurn") bumpAll();
  };

  const restart = () => {
    setState(newGame(seedInput || Date.now().toString()));
    bumpAll();
  };

  const over = state.phase === "won" || state.phase === "lost";

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
          <span className="turn">Turn {state.turn}</span>
        </div>
      </header>

      <EnemyPanel enemy={state.enemy} />

      {over && (
        <div className={`banner ${state.phase}`}>
          {state.phase === "won" ? "Victory!" : "Defeated…"}{" "}
          <button onClick={restart}>Play again</button>
        </div>
      )}

      <CardGrid state={state} onPlay={(id) => setState(playCard(state, id))} />

      <DiceTray
        state={state}
        rollNonce={rollNonce}
        onToggle={(i) => setState(toggleHold(state, i))}
        onReroll={doReroll}
        onEndTurn={doEndTurn}
      />

      <PlayerBar player={state.player} />

      <Log lines={state.log} />
    </div>
  );
}

function EnemyPanel({ enemy }: { enemy: Actor }) {
  return (
    <section className="enemy">
      <div className="enemy-name">
        {enemy.name}
        <StatusRow statuses={enemy.statuses} />
      </div>
      <HpBar cur={enemy.hp} max={enemy.maxHp} />
      {enemy.passives.map((p) => (
        <div key={p.id} className="passive" title={p.name}>
          ✦ {p.name}
        </div>
      ))}
    </section>
  );
}

function CardGrid({
  state,
  onPlay,
}: {
  state: GameState;
  onPlay: (id: string) => void;
}) {
  const cards = useMemo(() => state.player.hand.map(getCard), [state.player.hand]);
  return (
    <section className="cards">
      {cards.map((card) => {
        const playable = canPlayCard(state, card.id);
        return (
          <button
            key={card.id}
            className="card"
            style={{ background: ELEMENT_COLOR[card.element] }}
            disabled={!playable}
            onClick={() => onPlay(card.id)}
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
  onToggle,
  onReroll,
  onEndTurn,
}: {
  state: GameState;
  rollNonce: number[];
  onToggle: (i: number) => void;
  onReroll: () => void;
  onEndTurn: () => void;
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
        <button
          disabled={!canAct || state.player.rollsRemaining <= 0}
          onClick={onReroll}
        >
          Reroll ({state.player.rollsRemaining})
        </button>
        <button className="end-turn" disabled={!canAct} onClick={onEndTurn}>
          End Turn →
        </button>
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
  const [shown, setShown] = useState<Symbol>(() =>
    REDUCED_MOTION ? realSym : randomSymbol(),
  );

  // Mount-only: the die is remounted (fresh key) every time it rolls.
  useEffect(() => {
    if (REDUCED_MOTION) {
      setShown(realSym);
      return;
    }
    let flicker: ReturnType<typeof setInterval> | undefined;
    // Begin flickering as the die drops in (after its stagger delay)…
    const start = setTimeout(() => {
      flicker = setInterval(() => setShown(randomSymbol()), FLICKER_MS);
    }, delay);
    // …then settle on the true face before the tumble finishes.
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

  // Entangled implies held+spent, but it should read as a status, not as a die
  // you spent — so it takes its own style and suppresses the held/spent looks.
  const cls = [
    "die",
    die.entangled ? "entangled" : "",
    !die.entangled && die.held ? "held" : "",
    !die.entangled && die.spent ? "spent" : "",
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
    </button>
  );
}

function PlayerBar({ player }: { player: Actor }) {
  return (
    <section className="player">
      <div className="player-name">
        {player.name}
        <StatusRow statuses={player.statuses} />
      </div>
      <HpBar cur={player.hp} max={player.maxHp} />
    </section>
  );
}

function HpBar({ cur, max }: { cur: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (cur / max) * 100));
  return (
    <div className="hpbar">
      <div className="hpbar-fill" style={{ width: `${pct}%` }} />
      <span className="hpbar-text">
        {cur} / {max}
      </span>
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

function Log({ lines }: { lines: string[] }) {
  const recent = lines.slice(-8);
  return (
    <section className="log">
      {recent.map((l, i) => (
        <div key={lines.length - recent.length + i} className="log-line">
          {l}
        </div>
      ))}
    </section>
  );
}
