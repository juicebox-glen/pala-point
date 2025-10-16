"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@stores/game-store";
import type { DeuceRule, SetTieRule } from "@types/rules";

type SetupStep = 'game-type' | 'deuce-rule' | 'sets' | 'tiebreak' | 'summary';
type GameTypeSelection = 'quick-play' | 'custom';

interface CustomConfig {
  deuceRule: DeuceRule;
  setsTarget: 1 | 3;
  setTieRule: SetTieRule;
}

interface SetupState {
  step: SetupStep;
  gameType: GameTypeSelection;
  customConfig: CustomConfig;
  holdTimer: NodeJS.Timeout | null;
  holdStartTime: number;
  isHolding: boolean;
}

const HOLD_DURATION = 2000; // 2 seconds

export default function SetupPage() {
  const router = useRouter();
  const reset = useGameStore((s) => s.reset);

  const [state, setState] = useState<SetupState>({
    step: 'game-type',
    gameType: 'quick-play',
    customConfig: {
      deuceRule: 'advantage',
      setsTarget: 1,
      setTieRule: 'tiebreak',
    },
    holdTimer: null,
    holdStartTime: 0,
    isHolding: false,
  });

  // Navigation: determine next step
  const getNextStep = useCallback((currentStep: SetupStep, gameType: GameTypeSelection): SetupStep | 'game' => {
    if (currentStep === 'game-type') {
      if (gameType === 'quick-play') return 'game';
      if (gameType === 'custom') return 'deuce-rule';
    }
    if (currentStep === 'deuce-rule') return 'sets';
    if (currentStep === 'sets') return 'tiebreak';
    if (currentStep === 'tiebreak') return 'summary';
    if (currentStep === 'summary') return 'game';
    return currentStep;
  }, []);

  // Toggle selection (Q/P keys)
  const handleToggle = useCallback(() => {
    setState((prev) => {
      const { step, gameType, customConfig } = prev;

      if (step === 'game-type') {
        return { ...prev, gameType: gameType === 'quick-play' ? 'custom' : 'quick-play' };
      }

      if (step === 'deuce-rule') {
        const options: DeuceRule[] = ['advantage', 'silver-point', 'golden-point'];
        const currentIndex = options.indexOf(customConfig.deuceRule);
        const nextIndex = (currentIndex + 1) % options.length;
        return {
          ...prev,
          customConfig: { ...customConfig, deuceRule: options[nextIndex] },
        };
      }

      if (step === 'sets') {
        return {
          ...prev,
          customConfig: { ...customConfig, setsTarget: customConfig.setsTarget === 1 ? 3 : 1 },
        };
      }

      if (step === 'tiebreak') {
        return {
          ...prev,
          customConfig: {
            ...customConfig,
            setTieRule: customConfig.setTieRule === 'tiebreak' ? 'play-on' : 'tiebreak',
          },
        };
      }

      return prev;
    });
  }, []);

  // Start the game (apply rules and navigate)
  const startGame = useCallback(() => {
    try {
      const { gameType, customConfig } = state;

      if (gameType === 'custom') {
        const store = useGameStore.getState();
        store.setGameRules({
          deuceRule: customConfig.deuceRule,
          setsTarget: customConfig.setsTarget === 3 ? 2 : 1,
          setTieRule: customConfig.setTieRule,
        });
      }

      // Random server selection
      const randomServer = Math.random() < 0.5 ? 'A' : 'B';
      reset(randomServer);
      
      // Navigate to game
      router.push('/game');
    } catch (error) {
      console.error('Error starting game:', error);
    }
  }, [state, reset, router]);

  // Confirm and move to next step
  const handleConfirm = useCallback(() => {
    const nextStep = getNextStep(state.step, state.gameType);

    if (nextStep === 'game') {
      startGame();
      return;
    }

    setState((prev) => ({ ...prev, step: nextStep as SetupStep }));
  }, [state.step, state.gameType, getNextStep, startGame]);

  // Start hold timer (R key down)
  const startHold = useCallback(() => {
    const startTime = Date.now();
    setState((prev) => ({ ...prev, isHolding: true, holdStartTime: startTime }));

    const timer = setTimeout(() => {
      handleConfirm();
      setState((prev) => ({ ...prev, isHolding: false, holdTimer: null }));
    }, HOLD_DURATION);

    setState((prev) => ({ ...prev, holdTimer: timer }));
  }, [handleConfirm]);

  // Cancel hold timer (R key up)
  const cancelHold = useCallback(() => {
    setState((prev) => {
      if (prev.holdTimer) {
        clearTimeout(prev.holdTimer);
      }
      return { ...prev, isHolding: false, holdTimer: null, holdStartTime: 0 };
    });
  }, []);

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (e.repeat) return;

      if (key === 'q' || key === 'p') {
        handleToggle();
      } else if (key === 'r') {
        startHold();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'r') {
        cancelHold();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleToggle, startHold, cancelHold]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (state.holdTimer) {
        clearTimeout(state.holdTimer);
      }
    };
  }, [state.holdTimer]);

  // Calculate hold progress (0-1)
  const [holdProgress, setHoldProgress] = useState(0);

  useEffect(() => {
    if (!state.isHolding) {
      setHoldProgress(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - state.holdStartTime;
      const progress = Math.min(elapsed / HOLD_DURATION, 1);
      setHoldProgress(progress);
    }, 50);

    return () => clearInterval(interval);
  }, [state.isHolding, state.holdStartTime]);

  // Render appropriate screen based on current step
  const renderScreen = () => {
    switch (state.step) {
      case 'game-type':
        return <GameTypeScreen selected={state.gameType} />;
      
      case 'deuce-rule':
        return <DeuceRuleScreen selected={state.customConfig.deuceRule} />;
      
      case 'sets':
        return <SetsScreen selected={state.customConfig.setsTarget} />;
      
      case 'tiebreak':
        return <TiebreakScreen selected={state.customConfig.setTieRule} />;
      
      case 'summary':
        return <SummaryScreen config={state.customConfig} />;
      
      default:
        return null;
    }
  };

  return (
    <>
      {renderScreen()}

      {state.isHolding && (
        <div className="setup-hold-progress">
          <div 
            className="setup-hold-progress-bar"
            style={{ width: `${holdProgress * 100}%` }}
          />
        </div>
      )}
    </>
  );
}

// ===================================================================
// SCREEN COMPONENTS
// ===================================================================

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

function SummaryScreen({ config }: { config: CustomConfig }) {
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