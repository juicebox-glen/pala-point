"use client";

import React, { useMemo } from "react";
import { useGameStore } from "@stores/game-store";
import { formatDisplay } from "@lib/engine/engine";

export default function V3Home() {
  const state = useGameStore((s) => s.state);
  const rules = useGameStore((s) => s.rules);
  const scorePoint = useGameStore((s) => s.scorePoint);
  const undo = useGameStore((s) => s.undo);
  const reset = useGameStore((s) => s.reset);
  const setDeuceRule = useGameStore((s) => s.setDeuceRule);
  const setSetsTarget = useGameStore((s) => s.setSetsTarget);

  const view = useMemo(() => formatDisplay(state), [state]);

  const getDeuceMessage = () => {
    if (view.flags.tiebreak) return "Tiebreak";
    if (!view.flags.deuce) return "\u00A0";
    
    if (rules.deuceRule === "golden-point") {
      return "Golden Point";
    } else if (rules.deuceRule === "silver-point") {
      return state.currentGame.deuceCount >= 2 ? "Silver Point (Sudden Death)" : "Deuce";
    }
    return "Deuce";
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold tracking-wide">Padel V3 — Quick Play</h1>

        {/* Game Configuration */}
        <div className="flex flex-col gap-3 items-center">
          {/* Sets Selector */}
          <div className="inline-flex items-center gap-2 bg-zinc-900/70 rounded-xl px-3 py-2">
            <span className="text-sm opacity-80">Sets to win:</span>
            <button
              onClick={() => setSetsTarget(1)}
              className={`px-3 py-1 rounded text-sm ${
                rules.target === 1 
                  ? "bg-sky-600" 
                  : "bg-zinc-700 hover:bg-zinc-600"
              }`}
            >
              Best of 1
            </button>
            <button
              onClick={() => setSetsTarget(2)}
              className={`px-3 py-1 rounded text-sm ${
                rules.target === 2 
                  ? "bg-sky-600" 
                  : "bg-zinc-700 hover:bg-zinc-600"
              }`}
            >
              Best of 3
            </button>
          </div>

          {/* Deuce Rule Switcher */}
          <div className="inline-flex items-center gap-2 bg-zinc-900/70 rounded-xl px-3 py-2">
            <span className="text-sm opacity-80">Deuce rule:</span>
            <button
              onClick={() => setDeuceRule("advantage")}
              className={`px-3 py-1 rounded text-sm ${
                rules.deuceRule === "advantage" 
                  ? "bg-emerald-600" 
                  : "bg-zinc-700 hover:bg-zinc-600"
              }`}
            >
              Advantage
            </button>
            <button
              onClick={() => setDeuceRule("silver-point")}
              className={`px-3 py-1 rounded text-sm ${
                rules.deuceRule === "silver-point" 
                  ? "bg-emerald-600" 
                  : "bg-zinc-700 hover:bg-zinc-600"
              }`}
            >
              Silver
            </button>
            <button
              onClick={() => setDeuceRule("golden-point")}
              className={`px-3 py-1 rounded text-sm ${
                rules.deuceRule === "golden-point" 
                  ? "bg-emerald-600" 
                  : "bg-zinc-700 hover:bg-zinc-600"
              }`}
            >
              Golden
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8 items-end">
          <TeamCard
            label="Team A"
            points={view.points.A}
            games={view.games.A}
            sets={view.setsWon.A}
            serving={view.server === 'A'}
          />

          <div className="space-y-2">
            <div className="text-sm opacity-70">
              {getDeuceMessage()}
            </div>
            <div className="text-lg">{view.message ?? "\u00A0"}</div>

            <div className="flex items-center justify-center gap-3 mt-3">
              <button onClick={() => scorePoint('A')} className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500">+A</button>
              <button onClick={() => scorePoint('B')} className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500">+B</button>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button onClick={undo} className="px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600">Undo</button>
              <button onClick={() => reset('A')} className="px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600">Reset</button>
            </div>
          </div>

          <TeamCard
            label="Team B"
            points={view.points.B}
            games={view.games.B}
            sets={view.setsWon.B}
            serving={view.server === 'B'}
          />
        </div>

        <div className="text-sm opacity-70">
          Games: {view.games.A}–{view.games.B} • Sets: {view.setsWon.A}–{view.setsWon.B}
        </div>
      </div>
    </main>
  );
}

function TeamCard(props: { label: string; points: string; games: number; sets: number; serving: boolean; }) {
  const { label, points, games, sets, serving } = props;
  return (
    <div className="p-6 rounded-2xl bg-zinc-900 min-w-[220px]">
      <div className="flex items-center justify-center gap-2 mb-2">
        {serving && <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" title="Serving" />}
        <h2 className="text-xl font-semibold">{label}</h2>
      </div>
      <div className="text-7xl font-bold leading-none">{points}</div>
      <div className="mt-3 text-sm opacity-80">Games {games} • Sets {sets}</div>
    </div>
  );
}