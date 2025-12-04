'use client';

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation";
import { useGameStore } from "@stores/game-store";
import type { DeuceRule, SetTieRule } from "@/src/types/rules";

type SetupStep = 'game-type' | 'deuce-rule' | 'sets' | 'tiebreak' | 'summary';
type GameTypeSelection = 'quick-play' | 'custom';

interface CustomConfig {
  deuceRule: DeuceRule;
  setsTarget: 1 | 3;
  setTieRule: SetTieRule;
}

const HOLD_DURATION = 1000; // 1 second

export default function SetupPage() {
  const router = useRouter();
  const reset = useGameStore((s) => s.reset);
  const setGameRules = useGameStore((s) => s.setGameRules);
  const restoreSavedGame = useGameStore((s) => s.restoreSavedGame);
  const clearSavedGame = useGameStore((s) => s.clearSavedGame);

  const [step, setStep] = useState<SetupStep>('game-type');
  const [gameType, setGameType] = useState<GameTypeSelection>('quick-play');
  const [customConfig, setCustomConfig] = useState<CustomConfig>({
    deuceRule: 'advantage',
    setsTarget: 1,
    setTieRule: 'tiebreak',
  });
  const [showResumeDialog, setShowResumeDialog] = useState(false);

  // Hold-to-select state
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const keyDownRef = useRef(false);

  // Cancel hold timer
  const cancelHold = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setIsHolding(false);
    setHoldProgress(0);
  }, []);

  // Toggle selection (Q/P keys)
  const handleToggle = useCallback(() => {
    cancelHold();
    
    if (step === 'game-type') {
      setGameType(prev => prev === 'quick-play' ? 'custom' : 'quick-play');
    } else if (step === 'deuce-rule') {
      setCustomConfig(prev => ({
        ...prev,
        deuceRule: prev.deuceRule === 'advantage' ? 'silver-point' : 
                   prev.deuceRule === 'silver-point' ? 'golden-point' : 'advantage'
      }));
    } else if (step === 'sets') {
      setCustomConfig(prev => ({ ...prev, setsTarget: prev.setsTarget === 1 ? 3 : 1 }));
    } else if (step === 'tiebreak') {
      setCustomConfig(prev => ({ ...prev, setTieRule: prev.setTieRule === 'tiebreak' ? 'play-on' : 'tiebreak' }));
    }
  }, [step, cancelHold]);

  // Confirm selection (R key hold)
  const handleConfirm = useCallback(() => {
    if (step === 'game-type') {
      if (gameType === 'quick-play') {
        // Quick Play: Use defaults and go straight to game
        setGameRules({
          deuceRule: 'advantage',
          setTieRule: 'tiebreak',
          setsTarget: 1
        });
        reset('A');
        router.push('/game');
      } else {
        // Custom: Go to deuce rule selection
        setStep('deuce-rule');
      }
    } else if (step === 'deuce-rule') {
      setStep('sets');
    } else if (step === 'sets') {
      setStep('tiebreak');
    } else if (step === 'tiebreak') {
      setStep('summary');
    } else if (step === 'summary') {
      // Apply custom config and start game
      setGameRules(customConfig);
      reset('A');
      router.push('/game');
    }
  }, [step, gameType, customConfig, setGameRules, reset, router]);

  // Complete hold action
  const completeHold = useCallback(() => {
    keyDownRef.current = false;
    cancelHold();
    handleConfirm();
  }, [cancelHold, handleConfirm]);

  // Start hold timer
  const startHold = useCallback(() => {
    if (isHolding) return;
    
    setIsHolding(true);
    setHoldProgress(0);
    
    const startTime = Date.now();

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setHoldProgress(progress);
      
      if (progress >= 100) {
        completeHold();
      }
    }, 16); // ~60fps
  }, [isHolding, completeHold]);

  // Keyboard controls (disabled when dialog is showing)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if dialog is NOT showing
      if (showResumeDialog) return;
      
      const key = e.key.toLowerCase();
      
      if (key === 'q' || key === 'p') {
        handleToggle();
      } else if (key === 'r') {
        if (!keyDownRef.current) {
          keyDownRef.current = true;
          startHold();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Only handle if dialog is NOT showing
      if (showResumeDialog) return;
      
      const key = e.key.toLowerCase();
      
      if (key === 'r') {
        keyDownRef.current = false;
        cancelHold();
      }
    };

    // ALWAYS add listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // ALWAYS cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleToggle, startHold, cancelHold, showResumeDialog]);

  // Check for saved game on mount
  useEffect(() => {
    const hasSavedGame = restoreSavedGame();
    if (hasSavedGame) {
      setShowResumeDialog(true);
    }
  }, [restoreSavedGame]);

  // Handle resume dialog response
  const handleResumeYes = useCallback(() => {
    setShowResumeDialog(false);
    router.push('/game');
  }, [router]);

  const handleResumeNo = useCallback(() => {
    setShowResumeDialog(false);
    clearSavedGame();
    // Reset to initial state
    reset('A');
  }, [clearSavedGame, reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="screen-wrapper">
      {showResumeDialog && (
        <ResumeGameDialog
          onYes={handleResumeYes}
          onNo={handleResumeNo}
        />
      )}
      {step === 'game-type' && (
        <GameTypeScreen 
          selected={gameType}
          isHolding={isHolding}
          holdProgress={holdProgress}
        />
      )}
      {step === 'deuce-rule' && (
        <DeuceRuleScreen 
          selected={customConfig.deuceRule}
          isHolding={isHolding}
          holdProgress={holdProgress}
        />
      )}
      {step === 'sets' && (
        <SetsScreen 
          selected={customConfig.setsTarget}
          isHolding={isHolding}
          holdProgress={holdProgress}
        />
      )}
      {step === 'tiebreak' && (
        <TiebreakScreen 
          selected={customConfig.setTieRule}
          isHolding={isHolding}
          holdProgress={holdProgress}
        />
      )}
      {step === 'summary' && (
        <SummaryScreen 
          config={customConfig}
          isHolding={isHolding}
          holdProgress={holdProgress}
        />
      )}
    </div>
  );
}

function ResumeGameDialog({ 
  onYes, 
  onNo 
}: { 
  onYes: () => void;
  onNo: () => void;
}) {
  const [selected, setSelected] = useState<'yes' | 'no'>('yes');
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const keyDownRef = useRef(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdCompletedRef = useRef(false);
  const isHoldingRef = useRef(false);

  // Cancel hold timer
  const cancelHold = useCallback(() => {
    console.log('[ResumeDialog] cancelHold called', {
      hasInterval: !!progressIntervalRef.current,
      keyDownRef: keyDownRef.current,
      holdCompleted: holdCompletedRef.current,
      isHoldingRef: isHoldingRef.current,
      stack: new Error().stack
    });
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    isHoldingRef.current = false;
    setIsHolding(false);
    setHoldProgress(0);
    holdCompletedRef.current = false;
  }, []);

  // Complete hold action
  const completeHold = useCallback(() => {
    console.log('[ResumeDialog] completeHold called', {
      selected,
      keyDownRef: keyDownRef.current,
      holdCompleted: holdCompletedRef.current
    });
    keyDownRef.current = false;
    cancelHold();
    if (selected === 'yes') {
      onYes();
    } else {
      onNo();
    }
  }, [selected, onYes, onNo, cancelHold]);

  // Start hold timer
  const startHold = useCallback(() => {
    console.log('[ResumeDialog] startHold called', {
      isHoldingRef: isHoldingRef.current,
      keyDownRef: keyDownRef.current,
      hasInterval: !!progressIntervalRef.current
    });
    if (isHoldingRef.current) {
      console.log('[ResumeDialog] startHold blocked - already holding');
      return;
    }
    
    isHoldingRef.current = true;
    setIsHolding(true);
    setHoldProgress(0);
    holdCompletedRef.current = false;
    
    const startTime = Date.now();
    console.log('[ResumeDialog] Starting hold timer, target duration:', HOLD_DURATION);

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setHoldProgress(progress);
      
      if (progress >= 100) {
        console.log('[ResumeDialog] Hold completed, progress:', progress);
        holdCompletedRef.current = true;
        completeHold();
      }
    }, 16); // ~60fps
  }, [completeHold]);

  // Handle keyboard input for dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      console.log('[ResumeDialog] keydown:', key, {
        repeat: e.repeat,
        keyDownRef: keyDownRef.current,
        isHoldingRef: isHoldingRef.current,
        holdCompleted: holdCompletedRef.current
      });
      
      if (key === 'q' || key === 'p') {
        // Toggle between yes and no
        console.log('[ResumeDialog] Toggling selection');
        setSelected(prev => prev === 'yes' ? 'no' : 'yes');
        cancelHold();
      } else if (key === 'r') {
        // Process first keydown (even if marked as repeat by xdotool/browser)
        // Ignore subsequent repeats only if we've already started the hold
        if (e.repeat && keyDownRef.current) {
          console.log('[ResumeDialog] R keydown ignored - keyboard repeat (already holding)');
          return;
        }
        if (!keyDownRef.current) {
          console.log('[ResumeDialog] R keydown - starting hold', {
            isRepeat: e.repeat,
            keyDownRef: keyDownRef.current
          });
          keyDownRef.current = true;
          startHold();
        } else {
          console.log('[ResumeDialog] R keydown ignored - already down');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      console.log('[ResumeDialog] keyup:', key, {
        keyDownRef: keyDownRef.current,
        isHoldingRef: isHoldingRef.current,
        holdCompleted: holdCompletedRef.current,
        hasInterval: !!progressIntervalRef.current
      });
      
      if (key === 'r') {
        keyDownRef.current = false;
        // Always cancel on keyup (matching working pattern)
        cancelHold();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelHold();
    };
  }, [startHold, cancelHold]);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div 
        style={{
          backgroundColor: 'var(--color-bg-primary, #1a1a1a)',
          padding: '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          maxWidth: '600px',
          border: '2px solid var(--color-team-1, #00ff88)',
        }}
      >
        <div 
          style={{
            fontSize: '2rem',
            marginBottom: '2rem',
            color: 'var(--color-text-primary, #ffffff)',
            fontWeight: 'bold',
          }}
        >
          Resume previous game?
        </div>
        <div 
          style={{
            display: 'flex',
            gap: '2rem',
            justifyContent: 'center',
            marginTop: '2rem',
          }}
        >
          <div style={{ position: 'relative' }}>
            <button
              onClick={onYes}
              style={{
                padding: '1rem 2rem',
                fontSize: '1.2rem',
                backgroundColor: selected === 'yes' 
                  ? 'var(--color-team-1, #00ff88)' 
                  : 'rgba(0, 255, 136, 0.3)',
                color: selected === 'yes' ? '#000' : '#888',
                border: selected === 'yes' 
                  ? '2px solid var(--color-team-1, #00ff88)' 
                  : '2px solid rgba(0, 255, 136, 0.5)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                opacity: selected === 'yes' ? 1 : 0.6,
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              YES
              {selected === 'yes' && isHolding && (
                <div 
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: '4px',
                    width: `${holdProgress}%`,
                    backgroundColor: '#000',
                    transition: 'width 0.1s',
                  }}
                />
              )}
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <button
              onClick={onNo}
              style={{
                padding: '1rem 2rem',
                fontSize: '1.2rem',
                backgroundColor: selected === 'no' 
                  ? 'var(--color-team-2, #a855f7)' 
                  : 'rgba(168, 85, 247, 0.3)',
                color: selected === 'no' ? '#fff' : '#888',
                border: selected === 'no' 
                  ? '2px solid var(--color-team-2, #a855f7)' 
                  : '2px solid rgba(168, 85, 247, 0.5)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                opacity: selected === 'no' ? 1 : 0.6,
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              NO
              {selected === 'no' && isHolding && (
                <div 
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: '4px',
                    width: `${holdProgress}%`,
                    backgroundColor: '#fff',
                    transition: 'width 0.1s',
                  }}
                />
              )}
            </button>
          </div>
        </div>
        <div 
          style={{
            marginTop: '1rem',
            fontSize: '0.9rem',
            color: 'var(--color-text-primary, #ffffff)',
            opacity: 0.7,
          }}
        >
          Q/P to toggle • Hold R to confirm
        </div>
      </div>
    </div>
  );
}

function GameTypeScreen({ 
  selected, 
  isHolding, 
  holdProgress 
}: { 
  selected: GameTypeSelection;
  isHolding: boolean;
  holdProgress: number;
}) {
  return (
    <div className="screen-content layout-split-50-vertical">
      <div className={`tile ${selected === 'quick-play' ? 'selected' : ''}`}>
        {selected === 'quick-play' && isHolding && (
          <div 
            className="hold-progress-fill"
            style={{ width: `${holdProgress}%` }}
          />
        )}
        <div className="setup-title">QUICK PLAY</div>
      </div>
      <div className={`tile ${selected === 'custom' ? 'selected' : ''}`}>
        {selected === 'custom' && isHolding && (
          <div 
            className="hold-progress-fill"
            style={{ width: `${holdProgress}%` }}
          />
        )}
        <div className="setup-title">CUSTOM GAME</div>
      </div>
    </div>
  );
}

function DeuceRuleScreen({ 
  selected, 
  isHolding, 
  holdProgress 
}: { 
  selected: DeuceRule;
  isHolding: boolean;
  holdProgress: number;
}) {
  const options: { value: DeuceRule; label: string }[] = [
    { value: 'advantage', label: 'ADVANTAGE' },
    { value: 'silver-point', label: 'SILVER POINT' },
    { value: 'golden-point', label: 'GOLDEN POINT' },
  ];

  return (
    <div className="screen-content layout-split-33-vertical">
      {options.map((option) => (
        <div
          key={option.value}
          className={`tile ${selected === option.value ? 'selected' : ''}`}
        >
          {selected === option.value && isHolding && (
            <div 
              className="hold-progress-fill"
              style={{ width: `${holdProgress}%` }}
            />
          )}
          <div className="setup-title">{option.label}</div>
        </div>
      ))}
    </div>
  );
}

function SetsScreen({ 
  selected, 
  isHolding, 
  holdProgress 
}: { 
  selected: 1 | 3;
  isHolding: boolean;
  holdProgress: number;
}) {
  return (
    <div className="screen-content layout-split-50-vertical">
      <div className={`tile ${selected === 1 ? 'selected' : ''}`}>
        {selected === 1 && isHolding && (
          <div 
            className="hold-progress-fill"
            style={{ width: `${holdProgress}%` }}
          />
        )}
        <div className="setup-number">1</div>
        <div className="setup-label">SET</div>
      </div>
      <div className={`tile ${selected === 3 ? 'selected' : ''}`}>
        {selected === 3 && isHolding && (
          <div 
            className="hold-progress-fill"
            style={{ width: `${holdProgress}%` }}
          />
        )}
        <div className="setup-number">3</div>
        <div className="setup-label">SETS</div>
      </div>
    </div>
  );
}

function TiebreakScreen({ 
  selected, 
  isHolding, 
  holdProgress 
}: { 
  selected: SetTieRule;
  isHolding: boolean;
  holdProgress: number;
}) {
  return (
    <div className="screen-content layout-split-50-vertical">
      <div className={`tile ${selected === 'tiebreak' ? 'selected' : ''}`}>
        {selected === 'tiebreak' && isHolding && (
          <div 
            className="hold-progress-fill"
            style={{ width: `${holdProgress}%` }}
          />
        )}
        <div className="setup-title">TIEBREAK</div>
      </div>
      <div className={`tile ${selected === 'play-on' ? 'selected' : ''}`}>
        {selected === 'play-on' && isHolding && (
          <div 
            className="hold-progress-fill"
            style={{ width: `${holdProgress}%` }}
          />
        )}
        <div className="setup-title">PLAY ON</div>
      </div>
    </div>
  );
}

function SummaryScreen({ 
  config,
  isHolding,
  holdProgress
}: { 
  config: CustomConfig;
  isHolding: boolean;
  holdProgress: number;
}) {
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
    <div className="screen-content">
      {isHolding && (
        <div 
          className="hold-progress-fill"
          style={{ width: `${holdProgress}%` }}
        />
      )}
      <div className="content-centered">
        <div className="setup-summary-content">
          <div className="setup-summary-line">{getDeuceLabel(config.deuceRule)}</div>
          <div className="setup-summary-line">{getSetsLabel(config.setsTarget)}</div>
          <div className="setup-summary-line">{getTiebreakLabel(config.setTieRule)}</div>
          <div className="setup-summary-action">HOLD TO START GAME</div>
        </div>
      </div>
    </div>
  );
}