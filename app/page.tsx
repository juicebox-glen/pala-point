'use client';

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation";
import { useGameStore } from "@stores/game-store";
import type { DeuceRule, SetTieRule } from "@/src/types/rules";
import { writeGameState } from "@/lib/state-writer";
import Screensaver from "./components/Screensaver";

type SetupStep = 'game-type' | 'deuce-rule' | 'sets' | 'tiebreak' | 'summary';
type GameTypeSelection = 'quick-play' | 'custom';

interface CustomConfig {
  deuceRule: DeuceRule;
  setsTarget: 1 | 3;
  setTieRule: SetTieRule;
}

const HOLD_DURATION = 800; // 0.8 seconds

export default function SetupPage() {
  const router = useRouter();
  const reset = useGameStore((s) => s.reset);
  const setGameRules = useGameStore((s) => s.setGameRules);
  const setMatchStartTime = useGameStore((s) => s.setMatchStartTime);
  const setCourtId = useGameStore((s) => s.setCourtId);

  const [step, setStep] = useState<SetupStep>('game-type');
  const [gameType, setGameType] = useState<GameTypeSelection>('quick-play');
  const [customConfig, setCustomConfig] = useState<CustomConfig>({
    deuceRule: 'advantage',
    setsTarget: 1,
    setTieRule: 'tiebreak',
  });

  // Screensaver state
  const [showScreensaver, setShowScreensaver] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Hold-to-select state
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const progressIntervalRef = useRef<number | NodeJS.Timeout | null>(null);
  const keyDownRef = useRef(false);
  const isHoldingRef = useRef(false); // Track holding state with ref for immediate checks
  const holdCompletedRef = useRef(false); // Prevent multiple completions
  const holdCooldownRef = useRef(false); // Prevent key events after hold completes

  // Cancel hold timer
  const cancelHold = useCallback(() => {
    if (progressIntervalRef.current !== null) {
      // Cancel animation frame if it's a number, otherwise clear interval
      if (typeof progressIntervalRef.current === 'number') {
        cancelAnimationFrame(progressIntervalRef.current);
      } else {
        clearInterval(progressIntervalRef.current);
      }
      progressIntervalRef.current = null;
    }
    isHoldingRef.current = false;
    holdCompletedRef.current = false;
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

  // Initialize court ID from environment on mount
  useEffect(() => {
    const courtId = process.env.NEXT_PUBLIC_COURT_ID || null;
    setCourtId(courtId);
  }, [setCourtId]);

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
        reset();
        // Set match start time when game starts
        setMatchStartTime(new Date().toISOString());
        writeGameState({
          court_state: 'in_play',
          current_score: { teamA: 0, teamB: 0 },
          game_mode: 'quick-play'
        });
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
      reset();
      // Set match start time when game starts
      setMatchStartTime(new Date().toISOString());
      writeGameState({
        court_state: 'in_play',
        current_score: { teamA: 0, teamB: 0 },
        game_mode: 'custom'
      });
      router.push('/game');
    }
  }, [step, gameType, customConfig, setGameRules, reset, router, setMatchStartTime]);

  // Complete hold action
  const completeHold = useCallback(() => {
    // Prevent multiple completions
    if (holdCompletedRef.current) return;
    holdCompletedRef.current = true;
    
    // Cancel any ongoing animation first
    if (progressIntervalRef.current !== null) {
      if (typeof progressIntervalRef.current === 'number') {
        cancelAnimationFrame(progressIntervalRef.current);
      } else {
        clearInterval(progressIntervalRef.current);
      }
      progressIntervalRef.current = null;
    }
    
    // Set cooldown to prevent key release from triggering actions on next screen
    holdCooldownRef.current = true;
    
    // Reset state
    keyDownRef.current = false;
    isHoldingRef.current = false;
    setIsHolding(false);
    setHoldProgress(100);
    
    // Call confirm after a brief delay to ensure UI updates
    setTimeout(() => {
      handleConfirm();
      
      // Clear cooldown after navigation completes (300ms should be enough)
      setTimeout(() => {
        holdCooldownRef.current = false;
      }, 300);
    }, 0);
  }, [handleConfirm]);

  // Start hold timer
  const startHold = useCallback(() => {
    // Use ref for immediate check to prevent race conditions
    if (isHoldingRef.current) return;
    
    // Reset completion flag
    holdCompletedRef.current = false;
    isHoldingRef.current = true;
    setIsHolding(true);
    setHoldProgress(0);
    
    const startTime = performance.now(); // Use performance.now() for higher precision

    const updateProgress = () => {
      // Check if we should continue (might have been cancelled)
      if (!isHoldingRef.current || holdCompletedRef.current) {
        return;
      }
      
      const elapsed = performance.now() - startTime;
      const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setHoldProgress(progress);
      
      if (progress >= 100) {
        // Complete the hold
        completeHold();
      } else {
        // Schedule next frame and store the ID
        const frameId = requestAnimationFrame(updateProgress);
        progressIntervalRef.current = frameId;
      }
    };

    // Use double requestAnimationFrame to ensure we're at the start of a frame
    // This reduces visual glitches and provides smoother initial animation
    requestAnimationFrame(() => {
      const initialFrameId = requestAnimationFrame(updateProgress);
      progressIntervalRef.current = initialFrameId;
    });
  }, [completeHold]);

  // Register activity for screensaver
  const registerActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Handle screensaver dismissal - must reset activity timer
  const handleScreensaverDismiss = useCallback(() => {
    setLastActivity(Date.now()); // CRITICAL: Reset timer when exiting screensaver
    setShowScreensaver(false);
  }, []);

  // Idle detection for screensaver (30 seconds of inactivity)
  useEffect(() => {
    // Don't check idle while screensaver is showing
    if (showScreensaver) {
      return;
    }

    const checkIdle = () => {
      const idleTime = Date.now() - lastActivity;
      if (idleTime > 30000) { // 30 seconds
        setShowScreensaver(true);
      }
    };

    idleTimerRef.current = setInterval(checkIdle, 1000);

    return () => {
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
      }
    };
  }, [lastActivity, showScreensaver]);

  // Keyboard controls (disabled when dialog is showing)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore all key events during cooldown period (after hold completes)
      if (holdCooldownRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      registerActivity();
      
      
      const key = e.key.toLowerCase();
      
      if (key === 'q' || key === 'p') {
        handleToggle();
      } else if (key === 'r') {
        // Only start if key is not already down and we're not already holding
        if (!keyDownRef.current && !isHoldingRef.current) {
          keyDownRef.current = true;
          startHold();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Ignore all key events during cooldown period (after hold completes)
      if (holdCooldownRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      
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
  }, [handleToggle, startHold, cancelHold, registerActivity]);

  // Reset hold state when step changes to prevent carryover
  useEffect(() => {
    // Cancel any active hold when transitioning between steps
    cancelHold();
    keyDownRef.current = false;
    isHoldingRef.current = false;
    holdCompletedRef.current = false;
    // Note: Don't reset holdCooldownRef here - it needs to persist through step changes
  }, [step, cancelHold]);

  // Write state when on setup screen
  useEffect(() => {
    if (step === 'game-type') {
      writeGameState({
        court_state: 'mode_select',
        current_score: null,
        game_mode: null
      });
    }
  }, [step]);

  // Reset all hold state on mount (when navigating back from game)
  useEffect(() => {
    // Ensure all hold-related state is completely reset
    if (progressIntervalRef.current !== null) {
      if (typeof progressIntervalRef.current === 'number') {
        cancelAnimationFrame(progressIntervalRef.current);
      } else {
        clearInterval(progressIntervalRef.current);
      }
      progressIntervalRef.current = null;
    }
    keyDownRef.current = false;
    isHoldingRef.current = false;
    holdCompletedRef.current = false;
    holdCooldownRef.current = false;
    setHoldProgress(0);
    setIsHolding(false);
    
    // Reset step to game-type when returning to setup
    setStep('game-type');
  }, []); // Run only on mount

  // Reset hold state when page becomes visible (handles navigation back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reset all hold state when page becomes visible
        if (progressIntervalRef.current !== null) {
          if (typeof progressIntervalRef.current === 'number') {
            cancelAnimationFrame(progressIntervalRef.current);
          } else {
            clearInterval(progressIntervalRef.current);
          }
          progressIntervalRef.current = null;
        }
        keyDownRef.current = false;
        isHoldingRef.current = false;
        holdCompletedRef.current = false;
        holdCooldownRef.current = false;
        setHoldProgress(0);
        setIsHolding(false);
      }
    };

    const handleFocus = () => {
      // Also reset on window focus (catches navigation back)
      if (progressIntervalRef.current !== null) {
        if (typeof progressIntervalRef.current === 'number') {
          cancelAnimationFrame(progressIntervalRef.current);
        } else {
          clearInterval(progressIntervalRef.current);
        }
        progressIntervalRef.current = null;
      }
      keyDownRef.current = false;
      isHoldingRef.current = false;
      holdCompletedRef.current = false;
      holdCooldownRef.current = false;
      setHoldProgress(0);
      setIsHolding(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current !== null) {
        if (typeof progressIntervalRef.current === 'number') {
          cancelAnimationFrame(progressIntervalRef.current);
        } else {
          clearInterval(progressIntervalRef.current);
        }
        progressIntervalRef.current = null;
      }
      isHoldingRef.current = false;
      holdCompletedRef.current = false;
      holdCooldownRef.current = false;
      keyDownRef.current = false;
    };
  }, []);

  // Show screensaver if idle
  if (showScreensaver) {
    return <Screensaver onDismiss={handleScreensaverDismiss} />;
  }

  return (
    <div className="screen-wrapper">
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
      <div className={`tile ${selected === 'quick-play' || (selected === 'quick-play' && isHolding) ? 'selected' : ''}`}>
        {selected === 'quick-play' && isHolding && (
          <div 
            className="hold-progress-fill"
            style={{ width: `${holdProgress}%` }}
          />
        )}
        <div className="setup-title">QUICK PLAY</div>
      </div>
      <div className={`tile ${selected === 'custom' || (selected === 'custom' && isHolding) ? 'selected' : ''}`}>
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
          className={`tile ${selected === option.value || (selected === option.value && isHolding) ? 'selected' : ''}`}
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
      <div className={`tile ${selected === 1 || (selected === 1 && isHolding) ? 'selected' : ''}`}>
        {selected === 1 && isHolding && (
          <div 
            className="hold-progress-fill"
            style={{ width: `${holdProgress}%` }}
          />
        )}
        <div className="setup-title">1 SET</div>
      </div>
      <div className={`tile ${selected === 3 || (selected === 3 && isHolding) ? 'selected' : ''}`}>
        {selected === 3 && isHolding && (
          <div 
            className="hold-progress-fill"
            style={{ width: `${holdProgress}%` }}
          />
        )}
        <div className="setup-title">3 SETS</div>
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
      <div className={`tile ${selected === 'tiebreak' || (selected === 'tiebreak' && isHolding) ? 'selected' : ''}`}>
        {selected === 'tiebreak' && isHolding && (
          <div 
            className="hold-progress-fill"
            style={{ width: `${holdProgress}%` }}
          />
        )}
        <div className="setup-title">TIEBREAK</div>
      </div>
      <div className={`tile ${selected === 'play-on' || (selected === 'play-on' && isHolding) ? 'selected' : ''}`}>
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
    return sets === 1 ? '1 SET' : '3 SET';
  };

  const getTiebreakLabel = (rule: SetTieRule) => {
    return rule === 'tiebreak' ? 'TIEBREAK' : 'PLAY ON';
  };

  return (
    <div className="screen-content layout-split-33-vertical">
      {/* Combined first two sections showing selected options */}
      <div className="tile setup-summary-options">
        <div className="setup-summary-content">
          <div className="setup-summary-line">{getDeuceLabel(config.deuceRule)}</div>
          <div className="setup-summary-line">{getSetsLabel(config.setsTarget)}</div>
          <div className="setup-summary-line">{getTiebreakLabel(config.setTieRule)}</div>
        </div>
      </div>
      {/* Green bar section with hold to start */}
      <div className={`tile setup-summary-start ${isHolding ? 'selected' : ''}`}>
        {isHolding && (
          <div 
            className="hold-progress-fill"
            style={{ width: `${holdProgress}%` }}
          />
        )}
        <div className="setup-title">HOLD TO START</div>
      </div>
    </div>
  );
}