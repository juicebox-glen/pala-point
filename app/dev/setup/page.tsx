"use client";

import { useState } from "react";

type GameTypeSelection = 'quick-play' | 'custom';
type DeuceRule = 'advantage' | 'silver-point' | 'golden-point';
type SetTieRule = 'tiebreak' | 'play-on';

export default function SetupDevPage() {
  const [view, setView] = useState<'game-type' | 'deuce-rule' | 'sets' | 'tiebreak' | 'summary'>('game-type');
  const [gameType, setGameType] = useState<GameTypeSelection>('quick-play');
  const [deuceRule, setDeuceRule] = useState<DeuceRule>('advantage');
  const [sets, setSets] = useState<1 | 3>(1);
  const [tiebreak, setTiebreak] = useState<SetTieRule>('tiebreak');

  return (
    <div style={{ padding: '2rem', backgroundColor: '#000', minHeight: '100vh', color: 'white' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1>Setup Screen States</h1>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button onClick={() => setView('game-type')} style={buttonStyle}>Game Type</button>
          <button onClick={() => setView('deuce-rule')} style={buttonStyle}>Deuce Rule</button>
          <button onClick={() => setView('sets')} style={buttonStyle}>Sets</button>
          <button onClick={() => setView('tiebreak')} style={buttonStyle}>Tiebreak</button>
          <button onClick={() => setView('summary')} style={buttonStyle}>Summary</button>
        </div>
      </div>

      {view === 'game-type' && <GameTypeScreen selected={gameType} />}
      {view === 'deuce-rule' && <DeuceRuleScreen selected={deuceRule} />}
      {view === 'sets' && <SetsScreen selected={sets} />}
      {view === 'tiebreak' && <TiebreakScreen selected={tiebreak} />}
      {view === 'summary' && <SummaryScreen config={{ deuceRule, setsTarget: sets, setTieRule: tiebreak }} />}
    </div>
  );
}

function GameTypeScreen({ selected }: { selected: GameTypeSelection }) {
  return (
    <div className="screen-wrapper">
      <div className="screen-content layout-split-50-vertical">
        <div className={`tile ${selected === 'quick-play' ? 'selected' : ''}`}>
          <div className="setup-title">QUICK PLAY</div>
        </div>
        <div className={`tile ${selected === 'custom' ? 'selected' : ''}`}>
          <div className="setup-title">CUSTOM GAME</div>
        </div>
      </div>
    </div>
  );
}

function DeuceRuleScreen({ selected }: { selected: DeuceRule }) {
  const options: { value: DeuceRule; label: string }[] = [
    { value: 'advantage', label: 'ADVANTAGE' },
    { value: 'silver-point', label: 'SILVER POINT' },
    { value: 'golden-point', label: 'GOLDEN POINT' },
  ];

  return (
    <div className="screen-wrapper">
      <div className="screen-content layout-split-33-vertical">
        {options.map((option) => (
          <div
            key={option.value}
            className={`tile ${selected === option.value ? 'selected' : ''}`}
          >
            <div className="setup-title">{option.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SetsScreen({ selected }: { selected: 1 | 3 }) {
  return (
    <div className="screen-wrapper">
      <div className="screen-content layout-split-50-vertical">
        <div className={`tile ${selected === 1 ? 'selected' : ''}`}>
          <div>
            <div className="setup-number">1</div>
            <div className="setup-label">SET</div>
          </div>
        </div>
        <div className={`tile ${selected === 3 ? 'selected' : ''}`}>
          <div>
            <div className="setup-number">3</div>
            <div className="setup-label">SETS</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TiebreakScreen({ selected }: { selected: SetTieRule }) {
  return (
    <div className="screen-wrapper">
      <div className="screen-content layout-split-50-vertical">
        <div className={`tile ${selected === 'tiebreak' ? 'selected' : ''}`}>
          <div className="setup-title">TIEBREAK</div>
        </div>
        <div className={`tile ${selected === 'play-on' ? 'selected' : ''}`}>
          <div className="setup-title">PLAY ON</div>
        </div>
      </div>
    </div>
  );
}

function SummaryScreen({ config }: { config: { deuceRule: DeuceRule; setsTarget: 1 | 3; setTieRule: SetTieRule } }) {
  const getDeuceLabel = (rule: DeuceRule) => {
    if (rule === 'advantage') return 'ADVANTAGE';
    if (rule === 'silver-point') return 'SILVER POINT';
    return 'GOLDEN POINT';
  };

  const getSetsLabel = (sets: 1 | 3) => {
    return sets === 1 ? '1 SET' : '3 SETS';
  };

  const getTiebreakLabel = (rule: SetTieRule) => {
    return rule === 'tiebreak' ? 'TIEBREAK' : 'PLAY ON';
  };

  return (
    <div className="screen-wrapper">
      <div className="screen-content">
        <div className="content-centered">
          <div className="setup-summary-content">
            <div className="setup-summary-line">{getDeuceLabel(config.deuceRule)}</div>
            <div className="setup-summary-line">{getSetsLabel(config.setsTarget)}</div>
            <div className="setup-summary-line">{getTiebreakLabel(config.setTieRule)}</div>
            <div className="setup-summary-action">HOLD TO START GAME</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const buttonStyle = {
  padding: '0.5rem 1rem',
  backgroundColor: '#1E1E1E',
  color: 'white',
  border: '1px solid #333',
  borderRadius: '4px',
  cursor: 'pointer',
};