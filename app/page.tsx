"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import ConfettiExplosion from "react-confetti-explosion"

// Screensaver configuration
const SCREENSAVER_CONFIG = {
  images: ["ad1.jpg", "ad2.jpg", "ad3.jpg"],
  rotationInterval: 5000,
  idleTimeout: 30000,
} as const

type GameScore = "0" | "15" | "30" | "40" | "ADV"

interface GameState {
  // Core game state
  team1Score: GameScore | string
  team2Score: GameScore | string
  team1Games: number
  team2Games: number
  team1Sets: number
  team2Sets: number
  inTieBreak: boolean
  matchWinner: number | null
  servingTeam: number
  sidesSwapped: boolean
  gameStarted: boolean
  gameType: string
  selectedGameType: string

  // Match tracking
  matchStartTime: number
  totalPointsPlayed: number
  team1PointsWon: number
  team2PointsWon: number
  team1ServicePointsWon: number
  team2ServicePointsWon: number
  team1BreakPoints: number
  team2BreakPoints: number
  pointHistory: string[]
  longestWinningStreak: { team: number; streak: number }
  currentStreak: { team: number; streak: number }

  // Tiebreak specific
  pointsPlayedInTieBreak: number

  // Set history for final display
  setHistory: Array<{
    set: number
    team1Games: number
    team2Games: number
    team1TiebreakScore?: number
    team2TiebreakScore?: number
    winner: "team1" | "team2"
    duration: number
  }>

  // UI state
  shouldSwapSides: boolean
  swapSidesTimerActive: boolean
}

export default function PadelScoringSystem() {
  const [gameState, setGameState] = useState<GameState>({
    team1Score: "0",
    team2Score: "0",
    team1Games: 0,
    team2Games: 0,
    team1Sets: 0,
    team2Sets: 0,
    inTieBreak: false,
    matchWinner: null,
    servingTeam: 1,
    sidesSwapped: false,
    gameStarted: false,
    gameType: "standard",
    selectedGameType: "standard",
    matchStartTime: 0,
    totalPointsPlayed: 0,
    team1PointsWon: 0,
    team2PointsWon: 0,
    team1ServicePointsWon: 0,
    team2ServicePointsWon: 0,
    team1BreakPoints: 0,
    team2BreakPoints: 0,
    pointHistory: [],
    longestWinningStreak: { team: 0, streak: 0 },
    currentStreak: { team: 0, streak: 0 },
    pointsPlayedInTieBreak: 0,
    setHistory: [],
    shouldSwapSides: false,
    swapSidesTimerActive: false,
  })

  // Game state history for undo
  const [gameStateHistory, setGameStateHistory] = useState<GameState[]>([])
  const [showSwapMessage, setShowSwapMessage] = useState(false)
  const [undoNotification, setUndoNotification] = useState("")

  // Server selection states
  const [showCoinToss, setShowCoinToss] = useState(false)
  const [coinTossResult, setCoinTossResult] = useState<number | null>(null)
  const [serverSelectionPhase, setServerSelectionPhase] = useState<1 | 2>(1)

  // Set win states
  const [showSetWin, setShowSetWin] = useState(false)
  const [setWinData, setSetWinData] = useState<{ team: number; setNumber: number; gamesScore: string } | null>(null)

  // Stats slideshow states
  const [showStatsSlideshow, setShowStatsSlideshow] = useState(false)
  const [currentStatsSlide, setCurrentStatsSlide] = useState(0)
  const [manualNavigation, setManualNavigation] = useState(false)

  // Animation states
  const [leftScoreAnimating, setLeftScoreAnimating] = useState(false)
  const [rightScoreAnimating, setRightScoreAnimating] = useState(false)
  const [swapAnimationActive, setSwapAnimationActive] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  // Screensaver states
  const [showScreensaver, setShowScreensaver] = useState(false)
  const [currentAdIndex, setCurrentAdIndex] = useState(0)
  const [lastActivity, setLastActivity] = useState(Date.now())

  // Refs for timers to avoid state dependencies
  const swapSidesTimerRef = useRef<NodeJS.Timeout | null>(null)
  const autoSlideTimerRef = useRef<NodeJS.Timeout | null>(null)
  const screensaverTimerRef = useRef<NodeJS.Timeout | null>(null)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const ballAnimationRef = useRef<number | null>(null)

  const MAX_HISTORY_SIZE = 50

  // Memoized calculations to prevent unnecessary re-renders
  const teamPositions = useMemo(
    () => ({
      leftTeam: gameState.sidesSwapped ? "team2" : "team1",
      rightTeam: gameState.sidesSwapped ? "team1" : "team2",
      leftScore: gameState.sidesSwapped ? gameState.team2Score : gameState.team1Score,
      rightScore: gameState.sidesSwapped ? gameState.team1Score : gameState.team2Score,
      leftGames: gameState.sidesSwapped ? gameState.team2Games : gameState.team1Games,
      rightGames: gameState.sidesSwapped ? gameState.team1Games : gameState.team2Games,
      leftSets: gameState.sidesSwapped ? gameState.team2Sets : gameState.team1Sets,
      rightSets: gameState.sidesSwapped ? gameState.team1Sets : gameState.team2Sets,
    }),
    [
      gameState.sidesSwapped,
      gameState.team1Score,
      gameState.team2Score,
      gameState.team1Games,
      gameState.team2Games,
      gameState.team1Sets,
      gameState.team2Sets,
    ],
  )

  // Activity registration with throttling
  const registerActivity = useCallback(() => {
    const now = Date.now()
    if (now - lastActivity > 1000) {
      // Throttle to once per second
      setLastActivity(now)
      if (showScreensaver) {
        setShowScreensaver(false)
      }
    }
  }, [lastActivity, showScreensaver])

  // State management
  const saveStateToHistory = useCallback(() => {
    setGameStateHistory((prev) => {
      const newHistory = [...prev, { ...gameState }]
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift()
      }
      return newHistory
    })
  }, [gameState])

  const restoreFromHistory = useCallback(() => {
    if (gameStateHistory.length === 0) {
      setUndoNotification("NO ACTION TO UNDO")
      setTimeout(() => setUndoNotification(""), 2000)
      return false
    }

    const newHistory = [...gameStateHistory]
    const previousState = newHistory.pop()!

    setGameStateHistory(newHistory)
    setGameState(previousState)

    // Clean up any active swap timer
    if (swapSidesTimerRef.current) {
      clearTimeout(swapSidesTimerRef.current)
      swapSidesTimerRef.current = null
    }
    setShowSwapMessage(false)
    setSwapAnimationActive(false)

    setUndoNotification("UNDOING LAST ACTION")
    setTimeout(() => setUndoNotification(""), 2000)
    return true
  }, [gameStateHistory])

  // Game logic helpers
  const getDisplayScore = useCallback((score: number): string => {
    switch (score) {
      case 0:
        return "0"
      case 1:
        return "15"
      case 2:
        return "30"
      case 3:
        return "40"
      case 4:
        return "ADV"
      default:
        return score.toString()
    }
  }, [])

  const checkSideSwap = useCallback((state: GameState): boolean => {
    if (state.gameType === "casual") {
      const totalGames = state.team1Games + state.team2Games
      if (totalGames > 0 && totalGames % 4 === 0) return true
      if (state.inTieBreak && state.pointsPlayedInTieBreak > 0 && state.pointsPlayedInTieBreak % 6 === 0) return true
      return false
    }

    const totalGames = state.team1Games + state.team2Games
    if (totalGames > 0 && totalGames % 2 === 1) return true
    if (state.inTieBreak && state.pointsPlayedInTieBreak > 0 && state.pointsPlayedInTieBreak % 6 === 0) return true
    return false
  }, [])

  const getPointSituation = useCallback(
    (state: GameState): { type: "set" | "match" | "tiebreak" | null; team: number | null } => {
      if (!state.gameStarted || state.matchWinner) return { type: null, team: null }

      if (state.inTieBreak) {
        const score1 = Number.parseInt(state.team1Score as string)
        const score2 = Number.parseInt(state.team2Score as string)

        let setPointTeam = null
        if (score1 >= 6 && score1 - score2 >= 1) setPointTeam = 1
        else if (score2 >= 6 && score2 - score1 >= 1) setPointTeam = 2

        if (setPointTeam) {
          if (state.gameType === "casual") return { type: "match", team: setPointTeam }
          if ((setPointTeam === 1 && state.team1Sets >= 1) || (setPointTeam === 2 && state.team2Sets >= 1)) {
            return { type: "match", team: setPointTeam }
          }
          return { type: "set", team: setPointTeam }
        }

        // If no set/match point, show tie-break
        return { type: "tiebreak", team: null }
      } else {
        const team1NumScore =
          state.team1Score === "ADV"
            ? 4
            : state.team1Score === "40"
              ? 3
              : state.team1Score === "30"
                ? 2
                : state.team1Score === "15"
                  ? 1
                  : 0
        const team2NumScore =
          state.team2Score === "ADV"
            ? 4
            : state.team2Score === "40"
              ? 3
              : state.team2Score === "30"
                ? 2
                : state.team2Score === "15"
                  ? 1
                  : 0

        let setPointTeam = null

        if (state.gameType === "golden-point") {
          if (team1NumScore >= 3 && team2NumScore >= 3) {
            if (team1NumScore > team2NumScore) setPointTeam = 1
            else if (team2NumScore > team1NumScore) setPointTeam = 2
          } else if (team1NumScore >= 3 && state.team1Games >= 5 && state.team1Games - state.team2Games >= 1) {
            setPointTeam = 1
          } else if (team2NumScore >= 3 && state.team2Games >= 5 && state.team2Games - state.team1Games >= 1) {
            setPointTeam = 2
          }
        } else {
          if (
            team1NumScore >= 3 &&
            team1NumScore > team2NumScore &&
            ((state.team1Games === 5 && state.team2Games <= 4) || (state.team1Games === 6 && state.team2Games === 5))
          ) {
            setPointTeam = 1
          } else if (
            team2NumScore >= 3 &&
            team2NumScore > team1NumScore &&
            ((state.team2Games === 5 && state.team1Games <= 4) || (state.team2Games === 6 && state.team1Games === 5))
          ) {
            setPointTeam = 2
          }
        }

        if (setPointTeam) {
          if (state.gameType === "casual") return { type: "match", team: setPointTeam }
          if ((setPointTeam === 1 && state.team1Sets >= 1) || (setPointTeam === 2 && state.team2Sets >= 1)) {
            return { type: "match", team: setPointTeam }
          }
          return { type: "set", team: setPointTeam }
        }
      }

      return { type: null, team: null }
    },
    [],
  )

  const pointSituation = useMemo(() => getPointSituation(gameState), [gameState, getPointSituation])

  // Main scoring function
  const scorePointForSide = useCallback(
    (side: "left" | "right") => {
      if (gameState.matchWinner || !gameState.gameStarted || gameState.swapSidesTimerActive) return

      registerActivity()
      saveStateToHistory()

      setGameState((prev) => {
        // Trigger score animation
        if (side === "left") {
          setLeftScoreAnimating(true)
          setTimeout(() => setLeftScoreAnimating(false), 600)
        } else {
          setRightScoreAnimating(true)
          setTimeout(() => setRightScoreAnimating(false), 600)
        }

        const newState = { ...prev }
        const team = side === "left" ? (prev.sidesSwapped ? "team2" : "team1") : prev.sidesSwapped ? "team1" : "team2"
        const scoringTeam = side === "left" ? (prev.sidesSwapped ? 2 : 1) : prev.sidesSwapped ? 1 : 2

        // Update stats
        newState.totalPointsPlayed++
        newState.pointHistory.push(scoringTeam === 1 ? "team-1" : "team-2")

        if (scoringTeam === 1) {
          newState.team1PointsWon++
        } else {
          newState.team2PointsWon++
        }

        // Update service stats
        if (newState.servingTeam === scoringTeam) {
          if (scoringTeam === 1) {
            newState.team1ServicePointsWon++
          } else {
            newState.team2ServicePointsWon++
          }
        }

        // Update winning streak
        if (newState.currentStreak.team === scoringTeam) {
          newState.currentStreak.streak++
        } else {
          newState.currentStreak = { team: scoringTeam, streak: 1 }
        }

        if (newState.currentStreak.streak > newState.longestWinningStreak.streak) {
          newState.longestWinningStreak = { ...newState.currentStreak }
        }

        if (prev.inTieBreak) {
          // Tiebreak scoring
          const tieBreakScore1 = Number.parseInt(prev.team1Score as string) + (team === "team1" ? 1 : 0)
          const tieBreakScore2 = Number.parseInt(prev.team2Score as string) + (team === "team2" ? 1 : 0)

          newState.team1Score = tieBreakScore1.toString()
          newState.team2Score = tieBreakScore2.toString()
          newState.pointsPlayedInTieBreak++

          // Check for tiebreak winner
          if ((tieBreakScore1 >= 7 || tieBreakScore2 >= 7) && Math.abs(tieBreakScore1 - tieBreakScore2) >= 2) {
            const winningTeam = tieBreakScore1 > tieBreakScore2 ? 1 : 2

            if (tieBreakScore1 > tieBreakScore2) {
              newState.team1Sets++
            } else {
              newState.team2Sets++
            }

            const currentSetNumber = newState.team1Sets + newState.team2Sets

            newState.setHistory.push({
              set: currentSetNumber,
              team1Games: tieBreakScore1 > tieBreakScore2 ? 7 : 6,
              team2Games: tieBreakScore1 > tieBreakScore2 ? 6 : 7,
              team1TiebreakScore: tieBreakScore1,
              team2TiebreakScore: tieBreakScore2,
              winner: winningTeam === 1 ? "team1" : "team2",
              duration: Math.floor((Date.now() - newState.matchStartTime) / 1000),
            })

            // Reset for next set
            newState.team1Games = 0
            newState.team2Games = 0
            newState.team1Score = "0"
            newState.team2Score = "0"
            newState.inTieBreak = false
            newState.pointsPlayedInTieBreak = 0
            newState.servingTeam = newState.servingTeam === 1 ? 2 : 1

            // Check for match winner
            const setsNeededToWin = newState.gameType === "casual" ? 1 : 2
            if (newState.team1Sets >= setsNeededToWin) {
              newState.matchWinner = 1
              console.log("Match won by team 1") // Debug log
              setShowStatsSlideshow(true)
            } else if (newState.team2Sets >= setsNeededToWin) {
              newState.matchWinner = 2
              console.log("Match won by team 2") // Debug log
              setShowStatsSlideshow(true)
            }

            if (!newState.matchWinner) {
              const tieBreakScore = `${tieBreakScore1 > tieBreakScore2 ? "7-6" : "6-7"} (${tieBreakScore1}-${tieBreakScore2})`
              console.log('Complete tiebreak score string:', tieBreakScore);

              setSetWinData({
                team: winningTeam,
                setNumber: currentSetNumber,
                gamesScore: tieBreakScore,
              })
              setShowSetWin(true)
            }

            return newState
          }
        } else {
          // Regular game scoring
          let team1NumScore =
            prev.team1Score === "ADV"
              ? 4
              : prev.team1Score === "40"
                ? 3
                : prev.team1Score === "30"
                  ? 2
                  : prev.team1Score === "15"
                    ? 1
                    : 0
          let team2NumScore =
            prev.team2Score === "ADV"
              ? 4
              : prev.team2Score === "40"
                ? 3
                : prev.team2Score === "30"
                  ? 2
                  : prev.team2Score === "15"
                    ? 1
                    : 0

          if (team === "team1") {
            team1NumScore++
          } else {
            team2NumScore++
          }

          let gameWon = false
          if (prev.gameType === "golden-point") {
            if (team1NumScore >= 4 && team2NumScore >= 4) {
              gameWon = true
            } else if ((team1NumScore >= 4 || team2NumScore >= 4) && Math.abs(team1NumScore - team2NumScore) >= 1) {
              gameWon = true
            }
          } else {
            // Standard scoring with advantage
            if (team1NumScore >= 4 && team2NumScore >= 4) {
              if (Math.abs(team1NumScore - team2NumScore) >= 2) {
                gameWon = true
              } else {
                // Handle advantage/deuce logic
                if (team1NumScore > team2NumScore) {
                  team1NumScore = 4 // ADV
                  team2NumScore = 3 // 40
                } else if (team2NumScore > team1NumScore) {
                  team2NumScore = 4 // ADV
                  team1NumScore = 3 // 40
                } else {
                  // Back to deuce
                  team1NumScore = 3 // 40
                  team2NumScore = 3 // 40
                }
              }
            } else if ((team1NumScore >= 4 || team2NumScore >= 4) && Math.abs(team1NumScore - team2NumScore) >= 2) {
              gameWon = true
            }
          }

          if (gameWon) {
            const gameWinningTeam = team1NumScore > team2NumScore ? 1 : 2

            // Check for break of serve
            if (newState.servingTeam !== gameWinningTeam) {
              if (gameWinningTeam === 1) {
                newState.team1BreakPoints++
              } else {
                newState.team2BreakPoints++
              }
            }

            // Award the game
            if (team1NumScore > team2NumScore) {
              newState.team1Games++
            } else {
              newState.team2Games++
            }

            // Reset points and change server
            newState.team1Score = "0"
            newState.team2Score = "0"
            newState.servingTeam = newState.servingTeam === 1 ? 2 : 1

            // Check for set winner or tiebreak
            let setWon = false
            let winningTeam = 0
            let gamesScore = ""

            if (newState.gameType === "casual") {
              if (
                (newState.team1Games >= 6 && newState.team1Games - newState.team2Games >= 2) ||
                (newState.team1Games === 7 && newState.team2Games === 6)
              ) {
                winningTeam = 1
                gamesScore = `${newState.team1Games}-${newState.team2Games}`
                newState.team1Sets++
                setWon = true
              } else if (
                (newState.team2Games >= 6 && newState.team2Games - newState.team1Games >= 2) ||
                (newState.team2Games === 7 && newState.team1Games === 6)
              ) {
                winningTeam = 2
                gamesScore = `${newState.team1Games}-${newState.team2Games}`
                newState.team2Sets++
                setWon = true
              }
            } else {
              if (newState.team1Games >= 6 && newState.team1Games - newState.team2Games >= 2) {
                winningTeam = 1
                gamesScore = `${newState.team1Games}-${newState.team2Games}`
                newState.team1Sets++
                setWon = true
              } else if (newState.team2Games >= 6 && newState.team2Games - newState.team1Games >= 2) {
                winningTeam = 2
                gamesScore = `${newState.team1Games}-${newState.team2Games}`
                newState.team2Sets++
                setWon = true
              } else if (newState.team1Games === 6 && newState.team2Games === 6) {
                newState.inTieBreak = true
                newState.team1Score = "0"
                newState.team2Score = "0"
                newState.pointsPlayedInTieBreak = 0
              }
            }

            if (setWon && winningTeam > 0) {
              const currentSetNumber = newState.team1Sets + newState.team2Sets

              newState.setHistory.push({
                set: currentSetNumber,
                team1Games: newState.team1Games,
                team2Games: newState.team2Games,
                winner: winningTeam === 1 ? "team1" : "team2",
                duration: Math.floor((Date.now() - newState.matchStartTime) / 1000),
              })

              newState.team1Games = 0
              newState.team2Games = 0

              const setsNeededToWin = newState.gameType === "casual" ? 1 : 2
              if (newState.team1Sets >= setsNeededToWin) {
                newState.matchWinner = 1
                console.log("Match won by team 1") // Debug log
                setShowStatsSlideshow(true)
              } else if (newState.team2Sets >= setsNeededToWin) {
                newState.matchWinner = 2
                console.log("Match won by team 2") // Debug log
                setShowStatsSlideshow(true)
              }

              if (!newState.matchWinner) {
                setSetWinData({
                  team: winningTeam,
                  setNumber: currentSetNumber,
                  gamesScore: gamesScore,
                })
                setShowSetWin(true)
              }
            }

            // Check for side swap
            if (!newState.matchWinner && checkSideSwap(newState)) {
              newState.shouldSwapSides = true
              newState.swapSidesTimerActive = true

              setShowSwapMessage(true)
              setSwapAnimationActive(true)

              // Use a more resilient timer approach
              const timerId = setTimeout(() => {
                setGameState((current) => {
                  // Only swap if we're still in the swap state
                  if (current.swapSidesTimerActive && current.shouldSwapSides) {
                    return {
                      ...current,
                      sidesSwapped: !current.sidesSwapped,
                      shouldSwapSides: false,
                      swapSidesTimerActive: false,
                    }
                  }
                  return current
                })
                setShowSwapMessage(false)
                setSwapAnimationActive(false)
                swapSidesTimerRef.current = null
              }, 500)

              swapSidesTimerRef.current = timerId
            }
          } else {
            newState.team1Score = getDisplayScore(team1NumScore)
            newState.team2Score = getDisplayScore(team2NumScore)
          }
        }

        return newState
      })
    },
    [gameState, saveStateToHistory, registerActivity, getDisplayScore, checkSideSwap],
  )

  // Undo function
  const undoPointForSide = useCallback(
    (side: "left" | "right") => {
      if (!gameState.gameStarted) return

      registerActivity()

      if (showSetWin) {
        setShowSetWin(false)
        setSetWinData(null)
      }

      if (showStatsSlideshow) {
        setShowStatsSlideshow(false)
        setCurrentStatsSlide(0)
        setManualNavigation(false)
        if (autoSlideTimerRef.current) {
          clearTimeout(autoSlideTimerRef.current)
          autoSlideTimerRef.current = null
        }
      }

      if (restoreFromHistory()) {
        setUndoNotification("POINT UNDONE")
        setTimeout(() => setUndoNotification(""), 2000)
      }
    },
    [gameState, restoreFromHistory, showSetWin, showStatsSlideshow, registerActivity],
  )

  // Game control functions
  const switchGameType = useCallback(() => {
    if (gameState.gameStarted) return
    registerActivity()
    setGameState((prev) => ({
      ...prev,
      selectedGameType:
        prev.selectedGameType === "standard"
          ? "golden-point"
          : prev.selectedGameType === "golden-point"
            ? "casual"
            : "standard",
    }))
  }, [gameState.gameStarted, registerActivity])

  const startGame = useCallback(() => {
    if (gameState.gameStarted) return

    registerActivity()
    setShowCoinToss(true)
    setServerSelectionPhase(1)

    const servingTeam = Math.random() < 0.5 ? 1 : 2
    setCoinTossResult(servingTeam)

    setTimeout(() => {
      setServerSelectionPhase(2)
    }, 3000)
  }, [gameState.gameStarted, registerActivity])

  const resetGame = useCallback(() => {
    registerActivity()

    // Clear all timers
    if (swapSidesTimerRef.current) {
      clearTimeout(swapSidesTimerRef.current)
      swapSidesTimerRef.current = null
    }
    if (autoSlideTimerRef.current) {
      clearTimeout(autoSlideTimerRef.current)
      autoSlideTimerRef.current = null
    }

    setSwapAnimationActive(false)
    setShowConfetti(false)

    setGameState({
      team1Score: "0",
      team2Score: "0",
      team1Games: 0,
      team2Games: 0,
      team1Sets: 0,
      team2Sets: 0,
      inTieBreak: false,
      matchWinner: null,
      servingTeam: 1,
      sidesSwapped: false,
      gameStarted: false,
      gameType: "standard",
      selectedGameType: "standard",
      matchStartTime: 0,
      totalPointsPlayed: 0,
      team1PointsWon: 0,
      team2PointsWon: 0,
      team1ServicePointsWon: 0,
      team2ServicePointsWon: 0,
      team1BreakPoints: 0,
      team2BreakPoints: 0,
      pointHistory: [],
      longestWinningStreak: { team: 0, streak: 0 },
      currentStreak: { team: 0, streak: 0 },
      pointsPlayedInTieBreak: 0,
      setHistory: [],
      shouldSwapSides: false,
      swapSidesTimerActive: false,
    })
    setGameStateHistory([])
    setShowSwapMessage(false)
    setShowCoinToss(false)
    setCoinTossResult(null)
    setServerSelectionPhase(1)
    setShowSetWin(false)
    setSetWinData(null)
    setShowStatsSlideshow(false)
    setCurrentStatsSlide(0)
    setManualNavigation(false)
  }, [registerActivity])

  const navigateSlide = useCallback(
    (direction: "next" | "prev") => {
      registerActivity()
      setManualNavigation(true)

      if (direction === "next") {
        setCurrentStatsSlide((prev) => (prev >= 3 ? 0 : prev + 1))
      } else {
        setCurrentStatsSlide((prev) => (prev <= 0 ? 3 : prev - 1))
      }
    },
    [registerActivity],
  )

  // Effects for auto-cycling slides
  useEffect(() => {
    if (!showStatsSlideshow || manualNavigation) {
      if (autoSlideTimerRef.current) {
        clearTimeout(autoSlideTimerRef.current)
        autoSlideTimerRef.current = null
      }
      return
    }

    const timer = setTimeout(() => {
      setCurrentStatsSlide((prev) => (prev >= 3 ? 0 : prev + 1))
    }, 10000)

    autoSlideTimerRef.current = timer

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [showStatsSlideshow, currentStatsSlide, manualNavigation])

  useEffect(() => {
    if (manualNavigation) {
      const resetTimer = setTimeout(() => {
        setManualNavigation(false)
      }, 5000)
      return () => clearTimeout(resetTimer)
    }
  }, [manualNavigation])

  // Screensaver effects
  useEffect(() => {
    if (!showScreensaver) {
      if (screensaverTimerRef.current) {
        clearTimeout(screensaverTimerRef.current)
        screensaverTimerRef.current = null
      }
      return
    }

    const timer = setTimeout(() => {
      setCurrentAdIndex((prev) => (prev + 1) % SCREENSAVER_CONFIG.images.length)
    }, SCREENSAVER_CONFIG.rotationInterval)

    screensaverTimerRef.current = timer

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [showScreensaver, currentAdIndex])

  useEffect(() => {
    const shouldShowScreensaver =
      (!gameState.gameStarted && !showCoinToss) || (gameState.matchWinner !== null && !showStatsSlideshow)

    if (shouldShowScreensaver) {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }

      const timer = setTimeout(() => {
        setShowScreensaver(true)
        setCurrentAdIndex(0)
      }, SCREENSAVER_CONFIG.idleTimeout)

      idleTimerRef.current = timer

      return () => {
        if (timer) {
          clearTimeout(timer)
        }
      }
    } else {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
        idleTimerRef.current = null
      }
      setShowScreensaver(false)
    }
  }, [gameState.gameStarted, gameState.matchWinner, showCoinToss, showStatsSlideshow, lastActivity])

  // Ball animation effect
  useEffect(() => {
    const shouldAnimate = showSetWin || (showCoinToss && serverSelectionPhase === 1)

    if (!shouldAnimate) {
      if (ballAnimationRef.current) {
        cancelAnimationFrame(ballAnimationRef.current)
        ballAnimationRef.current = null
      }
      return
    }

    let currentX = 50
    let currentY = 50
    let dx = 0.3
    let dy = 0.2

    if (Math.random() < 0.5) dx = -dx
    if (Math.random() < 0.5) dy = -dy

    const animate = () => {
      const ballElement = document.querySelector(".bouncing-ball") as HTMLElement
      if (!ballElement) return

      currentX += dx
      currentY += dy

      if (currentX <= 2 || currentX >= 96) {
        dx = -dx
        currentX = currentX <= 2 ? 2 : 96
      }

      if (currentY <= 2 || currentY >= 94) {
        dy = -dy
        currentY = currentY <= 2 ? 2 : 94
      }

      ballElement.style.left = `${currentX}%`
      ballElement.style.top = `${currentY}%`

      const animId = requestAnimationFrame(animate)
      ballAnimationRef.current = animId
    }

    const startAnimation = () => {
      const ballElement = document.querySelector(".bouncing-ball") as HTMLElement
      if (ballElement) {
        const initialAnimId = requestAnimationFrame(animate)
        ballAnimationRef.current = initialAnimId
      } else {
        setTimeout(startAnimation, 50)
      }
    }

    startAnimation()

    return () => {
      if (ballAnimationRef.current) {
        cancelAnimationFrame(ballAnimationRef.current)
      }
    }
  }, [showSetWin, showCoinToss, serverSelectionPhase])

  // Keyboard event handler
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      registerActivity()

      if (["q", "p", "a", "l", " ", "Enter", "h", "r", "k"].includes(e.key.toLowerCase()) || e.key === " ") {
        e.preventDefault()
      }

      if (!gameState.gameStarted && !showCoinToss) {
        if (e.key.toLowerCase() === "q" || e.key.toLowerCase() === "p") {
          switchGameType()
        } else if (e.key.toLowerCase() === "h") {
          startGame()
        }
      } else if (showCoinToss && serverSelectionPhase === 2) {
        setGameState((prev) => ({
          ...prev,
          gameStarted: true,
          gameType: prev.selectedGameType,
          team1Score: "0",
          team2Score: "0",
          team1Games: 0,
          team2Games: 0,
          team1Sets: 0,
          team2Sets: 0,
          inTieBreak: false,
          matchWinner: null,
          servingTeam: coinTossResult || 1,
          sidesSwapped: false,
          shouldSwapSides: false,
          swapSidesTimerActive: false,
          pointsPlayedInTieBreak: 0,
          matchStartTime: Date.now(),
        }))
        setGameStateHistory([])
        setShowCoinToss(false)
        setCoinTossResult(null)
        setServerSelectionPhase(1)
      } else {
        if (showSetWin) {
          setShowSetWin(false)
          setSetWinData(null)
        } else if (e.key.toLowerCase() === "q") {
          scorePointForSide("left")
        } else if (e.key.toLowerCase() === "p") {
          scorePointForSide("right")
        } else if (e.key.toLowerCase() === "a") {
          undoPointForSide("left")
        } else if (e.key.toLowerCase() === "l") {
          undoPointForSide("right")
        } else if (e.key.toLowerCase() === "r") {
          resetGame()
        } else if (showStatsSlideshow) {
          if (e.key.toLowerCase() === "q" || e.key.toLowerCase() === "p") {
            navigateSlide("next")
          } else if (e.key.toLowerCase() === "a" || e.key.toLowerCase() === "l") {
            navigateSlide("prev")
          }
        } else if (e.key.toLowerCase() === "q") {
          scorePointForSide("left")
        } else if (e.key.toLowerCase() === "p") {
          scorePointForSide("right")
        } else if (e.key.toLowerCase() === "a") {
          undoPointForSide("left")
        } else if (e.key.toLowerCase() === "l") {
          undoPointForSide("right")
        } else if (e.key.toLowerCase() === "h" && gameState.gameStarted) {
          resetGame()
        }
      }

      if (e.key.toLowerCase() === "r" && !gameState.gameStarted && !showCoinToss) {
        resetGame()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [
    gameState,
    scorePointForSide,
    undoPointForSide,
    switchGameType,
    startGame,
    resetGame,
    showStatsSlideshow,
    navigateSlide,
    registerActivity,
    showSetWin,
    serverSelectionPhase,
    coinTossResult,
    showCoinToss,
  ])

  // Activity detection with throttling
  useEffect(() => {
    let throttleTimeout: NodeJS.Timeout | null = null

    const handleActivity = () => {
      if (!throttleTimeout) {
        registerActivity()
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null
        }, 1000) // Throttle to once per second
      }
    }

    window.addEventListener("mousemove", handleActivity, { passive: true })
    window.addEventListener("mousedown", handleActivity, { passive: true })
    window.addEventListener("touchstart", handleActivity, { passive: true })
    window.addEventListener("touchmove", handleActivity, { passive: true })

    return () => {
      window.removeEventListener("mousemove", handleActivity)
      window.removeEventListener("mousedown", handleActivity)
      window.removeEventListener("touchstart", handleActivity)
      window.removeEventListener("touchmove", handleActivity)
      if (throttleTimeout) clearTimeout(throttleTimeout)
    }
  }, [registerActivity])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (swapSidesTimerRef.current) clearTimeout(swapSidesTimerRef.current)
      if (autoSlideTimerRef.current) clearTimeout(autoSlideTimerRef.current)
      if (screensaverTimerRef.current) clearTimeout(screensaverTimerRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      if (ballAnimationRef.current) cancelAnimationFrame(ballAnimationRef.current)
    }
  }, [])

  // Enhanced cleanup effect for swap timer
  useEffect(() => {
    // If we're not in a swap state, make sure UI is clean
    if (!gameState.swapSidesTimerActive && !gameState.shouldSwapSides) {
      if (showSwapMessage) {
        setShowSwapMessage(false)
      }
      if (swapAnimationActive) {
        setSwapAnimationActive(false)
      }
      if (swapSidesTimerRef.current) {
        clearTimeout(swapSidesTimerRef.current)
        swapSidesTimerRef.current = null
      }
    }
  }, [gameState.swapSidesTimerActive, gameState.shouldSwapSides, showSwapMessage, swapAnimationActive])

  // Auto-hide confetti after 4 seconds
  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => {
        setShowConfetti(false)
      }, 4000)

      return () => clearTimeout(timer)
    }
  }, [showConfetti])

  // Trigger confetti when match results slide is visible
  useEffect(() => {
    if (showStatsSlideshow && currentStatsSlide === 0 && gameState.matchWinner && !showConfetti) {
      setShowConfetti(true)
    }
  }, [showStatsSlideshow, currentStatsSlide, gameState.matchWinner, showConfetti])

  // Hide confetti when leaving slide 0
  useEffect(() => {
    if (showConfetti && showStatsSlideshow && currentStatsSlide !== 0) {
      setShowConfetti(false)
    }
  }, [showConfetti, showStatsSlideshow, currentStatsSlide])

  // Render screens based on current state
  return (
    <>
      {/* Confetti at the top level */}
      {showConfetti && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          <ConfettiExplosion
            force={0.8}
            duration={3000}
            particleCount={150}
            width={1600}
            colors={["#04CA95", "#BB86FC", "#D0FF14"]}
          />
          <ConfettiExplosion
            force={0.6}
            duration={2500}
            particleCount={100}
            width={1200}
            colors={["#04CA95", "#BB86FC", "#D0FF14"]}
          />
        </div>
      )}

      {/* Screen rendering */}
      {showScreensaver ? (
        <div className="screen-wrapper">
          <div className="screensaver">
            <div className="screensaver-image-container">
              <img
                src={`/images/ads/${SCREENSAVER_CONFIG.images[currentAdIndex]}`}
                alt={`Padel Advertisement ${currentAdIndex + 1}`}
                className="screensaver-image"
              />
            </div>
            <div className="screensaver-indicator">
              <div className="screensaver-dots">
                {SCREENSAVER_CONFIG.images.map((_, index) => (
                  <div key={index} className={`screensaver-dot ${currentAdIndex === index ? "active" : ""}`} />
                ))}
              </div>
              <div className="screensaver-text">Press any key to continue</div>
            </div>
          </div>
          <style jsx>{`
            body {
              background-color: #121212;
              margin: 0;
              padding: 0;
            }

            .screen-wrapper {
              position: absolute;
              inset: 0;
              padding: 0.5vw;
              box-sizing: border-box;
              background-color: #121212;
            }

            .screensaver {
              position: relative;
              width: 100%;
              height: 100%;
              background-color: #121212;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              z-index: 200;
              overflow: hidden;
            }

            .screensaver-image-container {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
            }

            .screensaver-image {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
              animation: fadeIn 1s ease-in-out;
            }

            .screensaver-indicator {
              position: absolute;
              bottom: 4vw;
              left: 50%;
              transform: translateX(-50%);
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 2vw;
            }

            .screensaver-dots {
              display: flex;
              gap: 1vw;
              justify-content: center;
            }

            .screensaver-dot {
              width: 1vw;
              height: 1vw;
              border-radius: 50%;
              background-color: rgba(255, 255, 255, 0.3);
              transition: background-color 0.3s ease;
            }

            .screensaver-dot.active {
              background-color: rgba(255, 255, 255, 0.8);
            }

            .screensaver-text {
              color: rgba(255, 255, 255, 0.7);
              font-size: 1.5vw;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
              text-align: center;
              animation: pulse 2s infinite;
            }

            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }

            @keyframes pulse {
              0%, 100% { opacity: 0.7; }
              50% { opacity: 1; }
            }
          `}</style>
        </div>
      ) : !gameState.gameStarted && !showCoinToss ? (
        <div className="screen-wrapper">
          <div className="game-type-selection">
            <div className="selection-title">SELECT GAME TYPE</div>

            <div className="game-type-options">
              <div className={`game-type-option ${gameState.selectedGameType === "standard" ? "selected" : ""}`}>
                <div className={`game-type-icon-wrapper ${gameState.selectedGameType === "standard" ? "active" : ""}`}>
                  <img
                    src={
                      gameState.selectedGameType === "standard"
                        ? "/images/tennis-ball.svg"
                        : "/images/tennis-ball-inactive.svg"
                    }
                    alt="Standard Mode Icon"
                    className="game-type-icon-svg"
                  />
                </div>
                <div className="game-type-name">STANDARD</div>
                <div className="game-type-description">Traditional scoring with advantage</div>
              </div>

              <div className={`game-type-option ${gameState.selectedGameType === "golden-point" ? "selected" : ""}`}>
                <div
                  className={`game-type-icon-wrapper ${gameState.selectedGameType === "golden-point" ? "active" : ""}`}
                >
                  <img
                    src={
                      gameState.selectedGameType === "golden-point"
                        ? "/images/tennis-ball.svg"
                        : "/images/tennis-ball-inactive.svg"
                    }
                    alt="Golden Mode Icon"
                    className="game-type-icon-svg"
                  />
                </div>
                <div className="game-type-name">GOLDEN</div>
                <div className="game-type-description">One deciding point at deuce</div>
              </div>

              <div className={`game-type-option ${gameState.selectedGameType === "casual" ? "selected" : ""}`}>
                <div className={`game-type-icon-wrapper ${gameState.selectedGameType === "casual" ? "active" : ""}`}>
                  <img
                    src={
                      gameState.selectedGameType === "casual"
                        ? "/images/tennis-ball.svg"
                        : "/images/tennis-ball-inactive.svg"
                    }
                    alt="Casual Mode Icon"
                    className="game-type-icon-svg"
                  />
                </div>
                <div className="game-type-name">CASUAL</div>
                <div className="game-type-description">Single set, swap every 4 games</div>
              </div>
            </div>

            <div className="selection-instructions">PRESS TO SWITCH, HOLD TO SELECT</div>
          </div>
          <style jsx>{`
            body {
              background-color: #121212;
              margin: 0;
              padding: 0;
            }

            .screen-wrapper {
              position: absolute;
              inset: 0;
              padding: 0.5vw;
              box-sizing: border-box;
              background-color: #121212;
            }

            .game-type-selection {
              position: relative;
              width: 100%;
              height: 100%;
              background-color: #121212;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              z-index: 100;
              color: white;
              padding: 2vw;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
            }

            .selection-title {
              z-index: 100;
              color: white;
              padding: 2vw;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
              font-size: 3.5vw;
              font-weight: 600;
              margin-bottom: 8vw;
              text-align: center;
              letter-spacing: 0.1em;
            }

            .game-type-options {
              display: flex;
              gap: 2vw;
              margin-bottom: 4vw;
              flex-wrap: wrap;
              justify-content: center;
            }

            .game-type-option {
              position: relative;
              background-color: #1E1E1E;
              border-radius: 0.8vw;
              padding: 8vw 5vw 6vw;
              text-align: center;
              cursor: pointer;
              min-width: 18vw;
              min-height: 30vh;
              max-width: 25vw;
            }

            .game-type-option.selected {
              background-color: #2A2A2A;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
              transform: scale(1.05);
            }

            .game-type-icon-wrapper {
              position: absolute;
              top: -4.5vw;
              left: 50%;
              transform: translateX(-50%);
              width: 8.8vw;
              height: 8.8vw;
              z-index: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              background-color: transparent;
              pointer-events: none;
            }

            .game-type-icon-wrapper::before {
              content: '';
              position: absolute;
              width: 100%;
              height: 100%;
              background-color: #121212;
              border-radius: 50%;
              z-index: -1;
              box-shadow: 0 0 0 1.1vw #121212;
            }

            .game-type-icon-svg {
              width: 100%;
              height: 100%;
              object-fit: contain;
              transition: all 0.3s ease;
            }

            .game-type-icon-wrapper.active .game-type-icon-svg {
              opacity: 1;
              filter: drop-shadow(0 0 1.5vw rgba(205, 255, 64, 0.2));
            }

            .game-type-name {
              font-size: 2.3vw;
              font-weight: 500;
              margin-bottom: 1vw;
              letter-spacing: 0.1em;
            }

            .game-type-description {
              font-size: 1.6vw;
              color: #B3B3B3;
            }

            .selection-instructions {
              font-size: 2.5vw;
              color: #B3B3B3;
              margin-top: 2.5vw;
              text-align: center;
              letter-spacing: 0.05em;
              font-weight: 500;
            }
          `}</style>
        </div>
      ) : showCoinToss ? (
        <div className="screen-wrapper">
          <div className="server-selection-screen">
            {serverSelectionPhase === 1 && (
              <>
                <div className="text-overlay-block-single">
                  <div className="screen-title">SELECTING SERVER</div>
                </div>
                <div
                  className="bouncing-ball server-ball"
                  style={{
                    left: "50%",
                    top: "50%",
                  }}
                ></div>
              </>
            )}

            {serverSelectionPhase === 2 && (
              <>
                <div className="server-selection-border-container">
                  <div
                    className={`server-selection-border ${
                      coinTossResult === 1 ? "server-selection-border-left" : "server-selection-border-right"
                    }`}
                    style={{
                      borderColor: coinTossResult === 1 ? "var(--team1-color)" : "var(--team2-color)",
                    }}
                  ></div>
                </div>

                <div className={`player-positions ${coinTossResult === 1 ? "team1-serving" : "team2-serving"}`}>
                  <div className="player-circle team1-player team1-top"></div>
                  <div className="player-circle team1-player team1-bottom"></div>
                  <div className="player-circle team2-player team2-top"></div>
                  <div className="player-circle team2-player team2-bottom"></div>
                  <div
                    className={`tennis-ball ${coinTossResult === 1 ? "team1-serving-ball" : "team2-serving-ball"}`}
                  ></div>
                </div>

                <div className="text-overlay-block">
                  <div className="screen-title">TEAM {coinTossResult} TO SERVE</div>
                  <div className="game-on-instruction">Game on. Press button to begin</div>
                </div>
              </>
            )}
          </div>
          <style jsx>{`
            body {
              background-color: #121212;
              margin: 0;
              padding: 0;
            }

            :root {
              --team1-color: #04CA95;
              --team2-color: #BB86FC;
            }

            .screen-wrapper {
              position: absolute;
              inset: 0;
              padding: 0.5vw;
              box-sizing: border-box;
              background-color: #121212;
            }

            .server-selection-screen {
              position: relative;
              width: 100%;
              height: 100%;
              background-color: #121212;
              background-image: url('/images/court.png');
              background-size: cover;
              background-position: center;
              background-repeat: no-repeat;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              z-index: 100;
              color: white;
              padding: 2vw;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
            }

            .text-overlay-block-single {
              background-color: #121212;
              padding: 1vw 2vw;
              text-align: center;
              display: inline-block;
              z-index: 10;
            }

            .text-overlay-block {
              background-color: #121212;
              padding: 1.5vw 3vw;
              text-align: center;
              display: inline-block;
              margin-top: 3vw;
              z-index: 10;
            }

            .screen-title {
              font-size: 3.5vw;
              font-weight: 600;
              text-align: center;
              color: #ffffff;
              animation: fadeIn 0.5s ease-in;
              z-index: 10;
              letter-spacing: 0.1em;
            }

            .game-on-instruction {
              font-size: 2vw;
              text-align: center;
              color: #9ca3af;
              animation: fadeIn 0.7s ease-in;
              z-index: 10;
            }

            .server-selection-border-container {
              position: absolute;
              inset: 0;
              pointer-events: none;
              z-index: 5;
            }

            .server-selection-border {
              position: absolute;
              top: 0;
              bottom: 0;
              width: 50%;
              border: 0.8vw solid;
              animation: fadeIn 0.5s ease-in;
            }

            .server-selection-border-left {
              left: 0;
              border-right: none;
            }

            .server-selection-border-right {
              top: 0;
              right: 0;
              bottom: 0;
              width: 50%;
              border-top: 0.8vw solid;
              border-right: 0.8vw solid;
              border-bottom: 0.8vw solid;
              border-left: none;
            }

            .player-positions {
              position: absolute;
              inset: 0;
              z-index: 10;
            }

            .player-circle {
              position: absolute;
              width: 6.8vw;
              height: 6.8vw;
              border-radius: 50%;
              animation: fadeIn 0.7s ease-in;
            }

            .team1-player {
              background-color: var(--team1-color);
            }

            .team2-player {
              background-color: var(--team2-color);
            }

            .team1-top {
              left: 30%;
              top: 18%;
            }

            .team1-bottom {
              left: 19%;
              top: 71%;
            }

            .team2-top {
              right: 19%;
              bottom: 71%;
            }

            .team2-bottom {
              right: 30%;
              bottom: 18%;
            }

            .team1-serving .team2-player {
              display: none;
            }

            .team2-serving .team1-player {
              display: none;
            }

            .bouncing-ball.server-ball {
              position: absolute;
              width: 3vw;
              height: 3vw;
              background-color: #D0FF14;
              border-radius: 50%;
              border: 2px solid #B8E000;
              pointer-events: none;
              z-index: 10;
              transition: none;
              user-select: none;
              box-shadow: 0 0 1vw rgba(208, 255, 20, 0.6);
            }

            .tennis-ball {
              position: absolute;
              width: 2.5vw;
              height: 2.5vw;
              background-color: #D0FF14;
              border-radius: 50%;
              animation: fadeIn 0.9s ease-in;
            }

            .team1-serving-ball {
              left: calc(20% + 6vw);
              top: calc(65% + 3vw);
            }

            .team2-serving-ball {
              right: calc(20% + 6vw);
              bottom: calc(65% + 3vw);
            }

            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(2vw); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      ) : showSetWin && setWinData ? (
        <div className="screen-wrapper">
          <div className={`set-win-screen ${setWinData.team === 1 ? "team1-border" : "team2-border"}`}>
            <div className="text-overlay-block">
              <div className="screen-title">
                TEAM {setWinData.team} WINS SET {setWinData.setNumber}
              </div>
              <div className="set-win-score">
              {(() => {
  const winningTeam = setWinData.team;
  
  // Handle tiebreak scores specially
  if (setWinData.gamesScore.includes('(')) {
    const [mainScore, tiebreakScore] = setWinData.gamesScore.split(' (');
    const [team1Games, team2Games] = mainScore.split('-').map(s => s.trim());
    const cleanTiebreak = tiebreakScore.replace(')', '');
    
    return (
      <>
        <span className={`score-number ${winningTeam === 1 ? 'winning-score' : 'losing-score'}`}>
          {team1Games}
        </span>
        <span className="score-separator">-</span>
        <span className={`score-number ${winningTeam === 2 ? 'winning-score' : 'losing-score'}`}>
          {team2Games}
        </span>
        <span className="tiebreak-display"> ({cleanTiebreak})</span>
      </>
    );
  } else {
    // Regular set score without tiebreak
    const [team1Games, team2Games] = setWinData.gamesScore.split('-').map(s => s.trim());
    return (
      <>
        <span className={`score-number ${winningTeam === 1 ? 'winning-score' : 'losing-score'}`}>
          {team1Games}
        </span>
        <span className="score-separator">-</span>
        <span className={`score-number ${winningTeam === 2 ? 'winning-score' : 'losing-score'}`}>
          {team2Games}
        </span>
      </>
    );
  }
})()}
              </div>
              <div className="continue-instruction">Press button to begin next set</div>
            </div>
            <div
              className="bouncing-ball"
              style={{
                left: "50%",
                top: "50%",
              }}
            ></div>
          </div>
          <style jsx>{`
            :root {
              --team1-color: #04CA95;
              --team2-color: #BB86FC;
            }

            .screen-wrapper {
              position: absolute;
              inset: 0;
              padding: 0.5vw;
              box-sizing: border-box;
              background-color: #121212;
            }

            .set-win-screen {
              position: relative;
              width: 100%;
              height: 100%;
              background-image: url('/images/court.png');
              background-size: cover;
              background-position: center;
              background-repeat: no-repeat;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              z-index: 100;
              color: white;
              padding: 2vw;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
            }

            .set-win-screen::after {
              content: '';
              position: absolute;
              inset: 0;
              border: 0.8vw solid;
              border-color: inherit;
              pointer-events: none;
              z-index: -1;
            }

            .set-win-screen.team1-border::after {
              border-color: var(--team1-color);
            }

            .set-win-screen.team2-border::after {
              border-color: var(--team2-color);
            }

            .screen-title {
              font-size: 3.5vw;
              font-weight: 600;
              color: white;
              letter-spacing: 0.1em;
              text-align: center;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
              margin: 0;
            }

            .text-overlay-block {
              background-color: #121212;
              padding: 1.5vw 3vw;
              text-align: center;
              display: inline-block;
              margin-top: 3vw;
              z-index: 10;
            }

            .set-win-score {
              font-size: 6vw;
              font-weight: 600;
              text-align: center;
              color: white;
              margin-bottom: 1vw;
              animation: fadeIn 0.7s ease-in;
            }

            .score-number {
  font-size: 7vw;
  font-weight: 600;
  transition: opacity 0.3s ease;
}

.winning-score {
  opacity: 1;
  color: white;
}

.losing-score {
  opacity: 0.5;
  color: rgba(255, 255, 255, 0.5);
}

.score-separator {
  font-size: 6vw;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.5);
  opacity: 0.5;
  margin: 0 1vw;
  transform: translateY(-0.8vw); /* Move up */
  display: inline-block; /* Required for transform */
}

            .continue-instruction {
              font-size: 2.5vw;
              text-align: center;
              color: white;
              margin-bottom: 2vw;
              animation: fadeIn 1.1s ease-in;
            }

            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(2vw); }
              to { opacity: 1; transform: translateY(0); }
            }

            .bouncing-ball {
              position: absolute;
              width: 3vw;
              height: 3vw;
              background-color: #D0FF14;
              border-radius: 50%;
              border: 2px solid #B8E000;
              pointer-events: none;
              z-index: 10;
              transition: none;
              user-select: none;
              box-shadow: 0 0 1vw rgba(208, 255, 20, 0.6);
            }
          `}</style>
        </div>
      ) : showStatsSlideshow ? (
        <div className="screen-wrapper">
          <div className={`stats-background ${gameState.matchWinner === 1 ? "team1-border" : "team2-border"}`}></div>

          <div className="stats-foreground">
          <div className={`stats-slideshow ${currentStatsSlide !== 0 ? 'grid-layout' : ''}`}>
              {currentStatsSlide === 0 && (
                <div className="stats-slide results-slide">
                  <div className="stats-content">
                    <div className="match-winner-display">
                      <div className="screen-title">TEAM {gameState.matchWinner} WINS!</div>
                      <div className="set-scores-display">
                      {gameState.setHistory
  .filter((set, index, array) => {
    // Remove duplicates by keeping only the first occurrence of each set number
    return array.findIndex(s => s.set === set.set) === index;
  })
  .filter((set, index) => {
    // For casual mode, only show the first set
    if (gameState.gameType === "casual") {
      return index === 0
    }
    // For standard/golden-point, show up to 3 sets (best of 3)
    return index < 3
  })
  .map((set) => {
    const team1Won = set.winner === "team1"
    const team2Won = set.winner === "team2"
    const key = `${set.set}-${set.team1Games}-${set.team2Games}-${set.team1TiebreakScore ?? 0}-${set.team2TiebreakScore ?? 0}-${set.winner}`
  
    return (
      <div key={key} className="set-score-container">
        {/* Main set score on first line */}
        <div className="set-score-main">
          <span className="set-score-number" style={{
            color: team1Won && set.team1Games > set.team2Games ? "var(--team1-color)" : "white",
          }}>
            {set.team1Games}
          </span>
          <span className="set-score-separator">-</span>
          <span className="set-score-number" style={{
            color: team2Won && set.team2Games > set.team1Games ? "var(--team2-color)" : "white",
          }}>
            {set.team2Games}
          </span>
        </div>
        
        {/* Tiebreak score on second line below */}
        {set.team1TiebreakScore !== undefined && set.team2TiebreakScore !== undefined && (
          <div className="tiebreak-score">
            (
            <span style={{
              color: team1Won && set.team1TiebreakScore > set.team2TiebreakScore ? "var(--team1-color)" : "white",
            }}>
              {set.team1TiebreakScore}
            </span>
            -
            <span style={{
              color: team2Won && set.team2TiebreakScore > set.team1TiebreakScore ? "var(--team2-color)" : "white",
            }}>
              {set.team2TiebreakScore}
            </span>
            )
          </div>
        )}
      </div>
    )
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

{currentStatsSlide === 1 && (
  <div className="stats-slide-layout">
    <div className="layout-grid-3">
      <div className="layout-section coral">
        <div className="section-title">GAME LENGTH</div>
        <div className="section-content">
          <div className="large-value">
            {Math.floor((Date.now() - gameState.matchStartTime) / 60000)}m
          </div>
        </div>
      </div>
      <div className="layout-section green">
        <div className="section-title">TOTAL POINTS</div>
        <div className="section-content">
          <div className="large-value">{gameState.totalPointsPlayed}</div>
        </div>
      </div>
      <div className="layout-section blue full-width">
        <div className="section-title">POINTS WON</div>
        <div className="section-content">
          <div className="points-bars-layout">
            {(() => {
              const team1Points = gameState.team1PointsWon
              const team2Points = gameState.team2PointsWon
              const maxPoints = Math.max(team1Points, team2Points, 1)

              return (
                <>
                  <div className="points-bar-layout">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${maxPoints > 0 ? (team2Points / maxPoints) * 85 : 0}%`,
                        backgroundColor: "var(--team2-color)",
                      }}
                    ></div>
                    <div className="bar-value">{team2Points}</div>
                  </div>
                  <div className="points-bar-layout">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${maxPoints > 0 ? (team1Points / maxPoints) * 85 : 0}%`,
                        backgroundColor: "var(--team1-color)",
                      }}
                    ></div>
                    <div className="bar-value">{team1Points}</div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  </div>
)}

              {currentStatsSlide === 2 && (
                <div className="stats-slide">
                  <div className="stats-title">MATCH MOMENTUM</div>
                  <div className="stats-content">
                    <div className="momentum-chart-container">
                      {(() => {
                        const totalDots = 98 // 14 columns x 7 rows for better aspect ratio
                        const pointHistory = gameState.pointHistory || []
                        const totalPoints = pointHistory.length

                        const bins = []
                        if (totalPoints === 0) {
                          for (let i = 0; i < totalDots; i++) {
                            bins.push("neutral")
                          }
                        } else {
                          const pointsPerBin = Math.max(1, Math.ceil(totalPoints / totalDots))

                          for (let i = 0; i < totalDots; i++) {
                            const startIdx = i * pointsPerBin
                            const endIdx = Math.min(startIdx + pointsPerBin, totalPoints)

                            if (startIdx >= totalPoints) {
                              bins.push("neutral")
                              continue
                            }

                            let team1Count = 0
                            let team2Count = 0

                            for (let j = startIdx; j < endIdx; j++) {
                              if (pointHistory[j] === "team-1") team1Count++
                              else if (pointHistory[j] === "team-2") team2Count++
                            }

                            if (team1Count > team2Count) {
                              bins.push("team-1")
                            } else if (team2Count > team1Count) {
                              bins.push("team-2")
                            } else {
                              if (endIdx > startIdx) {
                                bins.push(pointHistory[endIdx - 1])
                              } else {
                                bins.push("neutral")
                              }
                            }
                          }
                        }

                        return (
                          <div className="momentum-grid">
                            {bins.map((team, index) => (
                              <div
                                key={index}
                                className={`momentum-dot ${
                                  team === "team-1"
                                    ? "momentum-dot-team1"
                                    : team === "team-2"
                                      ? "momentum-dot-team2"
                                      : "momentum-dot-neutral"
                                }`}
                              />
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )}

{currentStatsSlide === 3 && (
  <div className="stats-slide-layout">
   <div className="layout-grid-3-flipped">
      <div className="layout-section blue full-width">
        <div className="section-title">SERVICE POINTS WON</div>
        <div className="section-content">
          <div className="points-bars-layout">
            {(() => {
              const team1ServicePoints = gameState.team1ServicePointsWon
              const team2ServicePoints = gameState.team2ServicePointsWon
              const maxServicePoints = Math.max(team1ServicePoints, team2ServicePoints, 1)

              return (
                <>
                  <div className="points-bar-layout">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${maxServicePoints > 0 ? (team2ServicePoints / maxServicePoints) * 85 : 0}%`,
                        backgroundColor: "var(--team2-color)",
                      }}
                    ></div>
                    <div className="bar-value">{team2ServicePoints}</div>
                  </div>
                  <div className="points-bar-layout">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${maxServicePoints > 0 ? (team1ServicePoints / maxServicePoints) * 85 : 0}%`,
                        backgroundColor: "var(--team1-color)",
                      }}
                    ></div>
                    <div className="bar-value">{team1ServicePoints}</div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      </div>
      <div className="layout-section coral">
        <div className="section-title">BREAKS</div>
        <div className="section-content">
          <div className="breaks-display-layout">
            <span className="break-number" style={{ color: "var(--team2-color)" }}>
              {gameState.team2BreakPoints || 0}
            </span>
            <span className="break-separator">-</span>
            <span className="break-number" style={{ color: "var(--team1-color)" }}>
              {gameState.team1BreakPoints || 0}
            </span>
          </div>
        </div>
      </div>
      <div className="layout-section green">
        <div className="section-title">BEST STREAK</div>
        <div className="section-content">
          <div className="streak-display-layout">
            <span
              className="streak-number"
              style={{
                color:
                  gameState.longestWinningStreak.team === 1 ? "var(--team1-color)" : "var(--team2-color)",
              }}
            >
              {gameState.longestWinningStreak.streak}
            </span>
            <span className="streak-label">PTS</span>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
              <div className="stats-navigation">
                <div className="stats-dots">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={index} className={`stats-dot ${currentStatsSlide === index ? "active" : ""}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <style jsx>{`
            body {
              background-color: #121212;
              margin: 0;
              padding: 0;
            }

            :root {
              --team1-color: #04CA95;
              --team2-color: #BB86FC;
            }

            .screen-wrapper {
              position: absolute;
              inset: 0;
              padding: 0.5vw;
              box-sizing: border-box;
              background-color: #121212;
            }

         .stats-background {
  position: absolute;
  inset: 0;
  
  background-image: url('/images/court.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 40; /* Lower than confetti */
}

            .stats-background::after {
              content: '';
              position: absolute;
              inset: 0;
              border: 0.8vw solid;
              border-color: inherit;
              pointer-events: none;
              z-index: -1;
            }

            .stats-background.team1-border::after {
              border-color: var(--team1-color);
            }

            .stats-background.team2-border::after {
              border-color: var(--team2-color);
            }

           .stats-foreground {
  position: absolute;
  inset: 0;
  z-index: 50; /* Higher than background, lower than confetti */
  pointer-events: auto;
  
}

            .stats-slideshow {
              position: relative;
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              color: white;
              padding: 2vw;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
            }

            .stats-slideshow.grid-layout {
  justify-content: flex-start;
  padding-top: 4vw;
}

           .stats-slide {
  text-align: center;
  max-width: 80vw;
  animation: slideIn 0.5s ease-in;
   background-color: #121212;
  border-radius: 2vw;
  padding: 2vw;
  
}

.stats-slide.results-slide {
  margin-top: -6.5vw; 
}

/* New Layout Grid Styles */
.stats-slide-layout {
  width: 78vw;
  height: 91.3vh;
  animation: slideIn 0.5s ease-in;
}

.layout-grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 0;
  width: 100%;
  height: 100%;
}

.layout-grid-3-flipped {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 0;
  width: 100%;
  height: 100%;
}

.layout-grid-3-flipped .layout-section.full-width {
  grid-column: 1 / -1;
  grid-row: 1;
  padding-top: 4vw;
  margin-bottom: 2vw;
  margin-top: -3.2vw; /* Pull up to cover court line */
}

.layout-grid-3-flipped .layout-section:not(.full-width) {
  grid-row: 2;
  padding-top: 2vw; /* Push down to cover court line */
  margin-top: 1vw;
}

.layout-grid-3-flipped .layout-section:not(.full-width):first-of-type {
  grid-column: 1;
}

.layout-grid-3-flipped .layout-section:not(.full-width):last-of-type {
  grid-column: 2;
}

.layout-section {
  position: relative;
  padding: 3vw;
  display: flex;
  flex-direction: column;
}

.layout-section.full-width {
  grid-column: 1 / -1;
}

.layout-section.blue {
  background-color: #121212;
}

.breaks-display-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2.5vw;
}


.section-title {
  font-size: 2.5vw;
  font-weight: bold;
  color: #fff;
  margin-bottom: 2vw;
  letter-spacing: 0.1em;
}

.section-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.large-value {
  font-size: 8vw;
  font-weight: bold;
  color: #fff;
  font-family: 'Inter', system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
}

.points-bars-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 66vw;
}

.points-bar-layout {
  display: flex;
  align-items: center;
  gap: 2vw;
  width: 100%;
}

.bar-fill {
  height: 3vw;
  border-radius: 0.3vw;
  transition: width 1s ease-in-out;
  min-width: 2vw;
}

.bar-value {
  font-size: 6vw;
  font-weight: bold;
  color: #fff;
  font-family: 'Inter', system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  min-width: 8vw;
  text-align: left;
}



  .screen-title {
              font-size: 3.5vw;
              font-weight: 600;
              color: white;
              letter-spacing: 0.1em;
              text-align: center;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
              margin: 0;
            }

            .stats-title {
              font-size: 3vw;
              font-weight: 600;
              margin-bottom: 3vw;
              color: #ffffff;
              text-shadow: 0 0 1vw rgba(250, 204, 21, 0.5);
            }

            .stats-content {
              display: flex;
              flex-direction: column;
              gap: 2vw;
            }

            .match-winner-display {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 0.8vw;
            }

            .winner-text {
              font-size: 5vw;
              font-weight: 600;
              color: #facc15;
              text-align: center;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
              text-shadow: 0 0 1vw rgba(250, 204, 21, 0.5);
            }

           .set-scores-display {
  display: flex;
  gap: 3vw;
  justify-content: center;
  align-items: flex-start; /* Change from center to flex-start */
  flex-wrap: wrap;
}

          .set-score-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1vw;
}

.set-score-main {
  display: flex;
  align-items: center;
  gap: 0.5vw;
}

            .set-score-number {
              font-size: 7vw;
              font-weight: 600;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
              text-shadow: 0 0 0.5vw rgba(255, 255, 255, 0.3);
              transition: all 0.3s ease;
            }

            .set-score-separator {
              font-size: 4vw;
              font-weight: bold;
              color: white;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
            }

           .stats-navigation {
  position: absolute;
  left: 3.5vw;
  top: 51.5%;
  transform: translateY(-50%);
  text-align: center;
  padding: 2vw;
}

         .stats-dots {
  display: flex;
  flex-direction: column;
  gap: 1vw;
  justify-content: center;
  align-items: center;
  margin-bottom: 2vw;
}

            .stats-dot {
              width: 1vw;
              height: 1vw;
              border-radius: 50%;
              background-color: rgba(255, 255, 255, 0.3);
              transition: background-color 0.3s ease;
            }

            .stats-dot.active {
              background-color:rgb(255, 255, 255);
              box-shadow: 0 0 0.5vw rgba(250, 204, 21, 0.5);
            }

            @keyframes slideIn {
              from {
                opacity: 0;
                transform: translateY(2vw);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            .stats-content-grid {
              display: flex;
              flex-direction: column;
              gap: 4vw;
              width: 100%;
              max-width: 80vw;
            }

            .stats-top-row {
              display: flex;
              justify-content: space-between;
              gap: 4vw;
            }

            .stat-block {
              flex: 1;
              text-align: center;
            }

            .stat-block-label {
              font-size: 2.5vw;
              font-weight: 600;
              color: #e5e7eb;
              margin-bottom: 1vw;
              letter-spacing: 0.1em;
            }

            .stat-block-value {
              font-size: 8vw;
              font-weight: bold;
              color: white;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
              text-shadow: 0 0 0.5vw rgba(255, 255, 255, 0.3);
            }

            .points-won-section {
              display: flex;
              flex-direction: column;
              gap: 2vw;
            }

            .points-won-label {
              font-size: 2.5vw;
              font-weight: 600;
              color: #e5e7eb;
              text-align: center;
              letter-spacing: 0.1em;
            }

            .points-won-chart {
              display: flex;
              flex-direction: column;
              gap: 1.5vw;
            }

            .points-bar-container {
              display: flex;
              align-items: center;
              gap: 2vw;
            }

            .points-bar {
              height: 3vw;
              border-radius: 0.5vw;
              transition: width 1s ease-in-out;
              min-width: 2vw;
            }

            .points-value {
              font-size: 4vw;
              font-weight: bold;
              color: white;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
              min-width: 8vw;
              text-align: left;
              text-shadow: 0 0 0.3vw rgba(255, 255, 255, 0.3);
            }

            .stats-content-service {
              display: flex;
              flex-direction: column;
              gap: 4vw;
              width: 100%;
              max-width: 80vw;
            }

            .service-points-section {
              display: flex;
              flex-direction: column;
              gap: 3vw;
            }

            .service-points-title {
              font-size: 3vw;
              font-weight: 600;
              color: #e5e7eb;
              text-align: center;
              letter-spacing: 0.2em;
            }

            .service-bars-container {
              display: flex;
              flex-direction: column;
              gap: 2vw;
            }

            .service-bar-row {
              display: flex;
              align-items: center;
              gap: 2vw;
              min-height: 4vw;
            }

            .service-bar {
              height: 4vw;
              border-radius: 0.5vw;
              transition: width 1s ease-in-out;
              min-width: 2vw;
            }

            .service-value {
              font-size: 6vw;
              font-weight: bold;
              color: white;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
              min-width: 12vw;
              text-align: left;
              text-shadow: 0 0 0.5vw rgba(255, 255, 255, 0.3);
            }

            .bottom-stats-section {
              display: flex;
              justify-content: space-between;
              gap: 8vw;
              margin-top: 2vw;
            }

            .breaks-section, .streak-section {
              flex: 1;
              text-align: center;
            }

            .breaks-title, .streak-title {
              font-size: 2.5vw;
              font-weight: 600;
              color: #e5e7eb;
              margin-bottom: 2vw;
              letter-spacing: 0.1em;
            }

            .breaks-display {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 1.5vw;
            }

            .break-number {
              font-size: 8vw;
              font-weight: bold;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
              text-shadow: 0 0 0.5vw rgba(255, 255, 255, 0.2);
            }

            .break-separator {
              font-size: 6vw;
              font-weight: bold;
              color: #666;
              font-family: 'Inter', system-ui, sans-serif;
            }

            .streak-display {
              display: flex;
              align-items: baseline;
              justify-content: center;
              gap: 1vw;
            }

            .streak-number {
              font-size: 10vw;
              font-weight: bold;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
              text-shadow: 0 0 0.5vw rgba(255, 255, 255, 0.2);
            }

            .streak-label {
              font-size: 3vw;
              font-weight: 600;
              color: white;
              font-family: 'Inter', system-ui, sans-serif;
              margin-bottom: 1vw;
            }

            .momentum-chart-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 3vw;
              width: 100%;
            }

            .momentum-grid {
              display: grid;
              grid-template-columns: repeat(14, 1fr);
              grid-template-rows: repeat(7, 1fr);
              gap: 0.8vw;
              width: 70vw;
              height: 35vw;
              padding: 1vw;
              background-color: rgba(18, 18, 18, 0.8);
              border-radius: 2vw;
              backdrop-filter: blur(10px);
              justify-items: center;
              align-items: center;
            }

            .momentum-dot {
              width: 2.5vw;
              height: 2.5vw;
              border-radius: 50%;
              transition: all 0.3s ease;
              aspect-ratio: 1;
            }

            .momentum-dot-team1 {
              background-color: var(--team1-color);
              box-shadow: 0 0 0.5vw rgba(4, 202, 149, 0.3);
            }

            .momentum-dot-team2 {
              background-color: var(--team2-color);
              box-shadow: 0 0 0.5vw rgba(187, 134, 252, 0.3);
            }

            .momentum-dot-neutral {
              background-color: rgba(255, 255, 255, 0.15);
              border: 2px solid rgba(255, 255, 255, 0.2);
            }

            .momentum-legend {
              display: flex;
              gap: 4vw;
              align-items: center;
              justify-content: center;
            }

            .momentum-legend-item {
              display: flex;
              align-items: center;
              gap: 1vw;
              font-size: 2vw;
              color: #e5e7eb;
            }

            .tiebreak-score {
              font-size: 3vw;
              font-weight: bold;
              color: white;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
            }
          `}</style>
        </div>
      ) : (
        // Main scoreboard
        <div className="screen-wrapper">
          <div className="scoreboard">
            <div className="background">
              <div className="background-left"></div>
              <div className="background-right"></div>
            </div>

            <div className="serving-border-container">
              <div
                className={`serving-border serving-border-left ${
                  gameState.servingTeam === (gameState.sidesSwapped ? 2 : 1) ? "active" : ""
                }`}
                style={{
                  borderColor: gameState.sidesSwapped ? "var(--team2-color)" : "var(--team1-color)",
                }}
              ></div>
              <div
                className={`serving-border serving-border-right ${
                  gameState.servingTeam === (gameState.sidesSwapped ? 1 : 2) ? "active" : ""
                }`}
                style={{
                  borderColor: gameState.sidesSwapped ? "var(--team1-color)" : "var(--team2-color)",
                }}
              ></div>
            </div>

            {pointSituation.type && (
              <div className="point-situation-indicator">
                <div className="point-situation-text">
                  {pointSituation.type === "tiebreak" ? (
                    <>
                      TIE
                      <br />
                      BREAK
                    </>
                  ) : (
                    <>
                      {pointSituation.type.toUpperCase()}
                      <br />
                      POINT
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="main-layout">
              <div className="team-column">
                <div className="team-name">{teamPositions.leftTeam === "team1" ? "TEAM 1" : "TEAM 2"}</div>
                <div className="score-display">
                  <div
                    className={`${teamPositions.leftScore === "ADV" ? "score-text-adv" : "score-text"} ${leftScoreAnimating ? "score-animate" : ""}`}
                  >
                    {teamPositions.leftScore}
                  </div>
                </div>
                <div className="set-indicators set-indicators-left">
                  <div
                    className={`set-indicator ${teamPositions.leftSets >= 1 ? (gameState.sidesSwapped ? "set-indicator-won-team2" : "set-indicator-won-team1") : "set-indicator-not-won"}`}
                  ></div>
                  {gameState.gameType !== "casual" && (
                    <div
                      className={`set-indicator ${teamPositions.leftSets >= 2 ? (gameState.sidesSwapped ? "set-indicator-won-team2" : "set-indicator-won-team1") : "set-indicator-not-won"}`}
                    ></div>
                  )}
                </div>
              </div>

              <div className="team-column">
                <div className="team-name">{teamPositions.rightTeam === "team1" ? "TEAM 1" : "TEAM 2"}</div>
                <div className="score-display">
                  <div
                    className={`${teamPositions.rightScore === "ADV" ? "score-text-adv" : "score-text"} ${rightScoreAnimating ? "score-animate" : ""}`}
                  >
                    {teamPositions.rightScore}
                  </div>
                </div>
                <div className="set-indicators set-indicators-right">
                  <div
                    className={`set-indicator ${teamPositions.rightSets >= 1 ? (gameState.sidesSwapped ? "set-indicator-won-team1" : "set-indicator-won-team2") : "set-indicator-not-won"}`}
                  ></div>
                  {gameState.gameType !== "casual" && (
                    <div
                      className={`set-indicator ${teamPositions.rightSets >= 2 ? (gameState.sidesSwapped ? "set-indicator-won-team1" : "set-indicator-won-team2") : "set-indicator-not-won"}`}
                    ></div>
                  )}
                </div>
              </div>
            </div>

            <div className="game-score">
              <div>
                {teamPositions.leftGames} - {teamPositions.rightGames}
              </div>
            </div>

            <div className={`change-ends-message ${showSwapMessage ? "active" : ""}`}>
              <div className="change-ends-icon-bg" />
              <div className="text-overlay-block-single">
                <div className="screen-title">SWAP SIDES</div>
              </div>
              <div
                className={`swap-player-circle left-player-circle ${swapAnimationActive ? "swapped" : ""}`}
                style={{
                  backgroundColor: gameState.sidesSwapped ? "var(--team2-color)" : "var(--team1-color)",
                  opacity: showSwapMessage ? 1 : 0, // Hide circles when message starts to fade
                }}
              ></div>
              <div
                className={`swap-player-circle right-player-circle ${swapAnimationActive ? "swapped" : ""}`}
                style={{
                  backgroundColor: gameState.sidesSwapped ? "var(--team1-color)" : "var(--team2-color)",
                  opacity: showSwapMessage ? 1 : 0, // Hide circles when message starts to fade
                }}
              ></div>
            </div>
          </div>

          <div className={`undo-notification ${undoNotification ? "visible" : ""}`}>{undoNotification}</div>

          <style jsx>{`
            body {
              background-color: #121212;
              margin: 0;
              padding: 0;
            }

            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            :root {
              --team1-color: #04CA95;
              --team2-color: #BB86FC;
              --base-unit: 1vw;
              --score-font-size: 26vw;
              --adv-font-size: 18vw;
              --team-name-font-size: 3.5vw;
              --game-score-font-size: 7.4vw;
              --set-indicator-size: 3vw;
              --set-indicator-gap: 1.5vw;
              --team-name-margin-top: 8vw;
              --score-display-margin-top: 1vw;
              --set-indicators-bottom: 8.5vw;
              --game-score-bottom: 6.5vw;
              --serving-indicator-height: 1.5vw;
            }

            .score-animate {
              animation: scoreFlash 0.6s ease-out;
            }

            @keyframes scoreFlash {
              0% { transform: scale(1); }
              50% { transform: scale(1.05); }
              100% { transform: scale(1); }
            }

            .screen-title {
              font-size: 3.5vw;
              font-weight: 600;
              color: white;
              letter-spacing: 0.1em;
              text-align: center;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
              margin: 0;
            }

            .text-overlay-block-single {
              background-color: #121212;
              padding: 1vw 2vw;
              text-align: center;
              display: inline-block;
              z-index: 10;
            }

            .screen-wrapper {
              position: absolute;
              inset: 0;
              padding: 0.5vw;
              box-sizing: border-box;
            }

            .scoreboard {
              position: relative;
              width: 100%;
              height: 100%;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
              overflow: hidden;
              background-color: #121212;
              display: flex;
              flex-direction: column;
              color: white;
            }

            .background {
              position: absolute;
              inset: 0;
              display: flex;
              background-image: url('https://cdn.prod.website-files.com/68820f3eb20497c5cbd8ddb9/6887cc8cc89e4f43cb5be859_scoreboard.png');
              background-size: cover;
              background-position: center;
              background-repeat: no-repeat;
            }

            .background-left {
              width: 50%;
              height: 100%;
              background-color: #121212;
            }

            .background-right {
              width: 50%;
              height: 100%;
              background-color: #1E1E1F;
            }

            .serving-border-container {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              pointer-events: none;
              z-index: 5;
            }

            .serving-border {
              position: absolute;
              opacity: 0;
              transition: opacity 0.3s ease;
              pointer-events: none;
            }

            .serving-border.active {
              opacity: 1;
            }

            .serving-border-left {
              top: 0;
              left: 0;
              bottom: 0;
              width: 50%;
              border-top: 0.8vw solid;
              border-left: 0.8vw solid;
              border-bottom: 0.8vw solid;
              border-right: none;
            }

            .serving-border-right {
              top: 0;
              right: 0;
              bottom: 0;
              width: 50%;
              border-top: 0.8vw solid;
              border-right: 0.8vw solid;
              border-bottom: 0.8vw solid;
              border-left: none;
            }

            .main-layout {
              display: flex;
              height: 100%;
              width: 100%;
              position: relative;
              z-index: 1;
            }

            .team-column {
              width: 50%;
              display: flex;
              flex-direction: column;
              align-items: center;
            }

            .team-name {
              font-size: var(--team-name-font-size);
              text-transform: uppercase;
              letter-spacing: 6px;
              opacity: 70%;
              margin-top: var(--team-name-margin-top);
              margin-bottom: 1.5vw;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
            }

            .score-display {
              width: 100%;
              height: 40%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-top: var(--score-display-margin-top);
            }

            .score-text {
              font-size: var(--score-font-size);
              font-weight: normal;
              line-height: 1;
              text-align: center;
              width: 100%;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
            }

            .score-text-adv {
              font-size: var(--adv-font-size);
              font-weight: normal;
              line-height: 1;
              text-align: center;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
            }

            .set-indicators {
              display: flex;
              gap: var(--set-indicator-gap);
              align-items: center;
              position: absolute;
              bottom: var(--set-indicators-bottom);
              margin-top: auto;
            }

            .set-indicators-left {
              left: 25%;
              transform: translateX(-50%);
            }

            .set-indicators-right {
              right: 25%;
              transform: translateX(50%);
            }

            .set-indicator {
              width: var(--set-indicator-size);
              height: var(--set-indicator-size);
              border-radius: 50%;
              transition: all 0.3s ease;
            }

            .set-indicator-won-team1 {
              background-color: var(--team1-color);
            }

            .set-indicator-won-team2 {
              background-color: var(--team2-color);
            }

            .set-indicator-not-won {
              border: 4px solid white;
              opacity: 70%;
            }

            .game-score {
              position: absolute;
              bottom: var(--game-score-bottom);
              left: 0;
              right: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              z-index: 20;
              pointer-events: none;
              font-size: var(--game-score-font-size);
              font-weight: normal;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
            }

            .game-score > div {
              display: flex;
              align-items: center;
              line-height: 1;
            }

            .change-ends-message {
              position: absolute;
              inset: 0;
              background-color: #121212;
              background-image: url('/images/court.png');
              background-size: cover;
              background-position: center;
              background-repeat: no-repeat;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              z-index: 35;
              opacity: 0;
              pointer-events: none;
              transition: opacity 0.5s ease;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
            }

            .change-ends-message.active {
              opacity: 1;
              pointer-events: auto;
            }

            .change-ends-icon-bg {
              position: absolute;
              top: 50%;
              left: 50%;
              width: 50vw;
              height: 50vw;
              transform: translate(-50%, -50%);
              background-image: url('/images/swap.svg');
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              z-index: 1;
              animation: rotate 3s linear infinite;
            }

            @keyframes rotate {
              from {
                transform: translate(-50%, -50%) rotate(0deg);
              }
              to {
                transform: translate(-50%, -50%) rotate(360deg);
              }
            }

            .swap-player-circle {
              position: absolute;
              width: 8vw;
              height: 8vw;
              border-radius: 50%;
              z-index: 2;
              transition: transform 2s ease-in-out, background-color 0.3s ease;
            }

            .left-player-circle {
              top: 25%;
              left: 20%;
            }

            .left-player-circle.swapped {
              transform: translateX(60vw);
            }

            .right-player-circle {
              bottom: 25%;
              right: 20%;
            }

            .right-player-circle.swapped {
              transform: translateX(-60vw);
            }

            .point-situation-indicator {
              position: absolute;
              top: 46%;
              left: 50%;
              transform: translate(-50%, -50%);
              z-index: 25;
              pointer-events: none;
              text-align: center;
            }

            .point-situation-text {
              font-size: 2.2vw;
              font-weight: 500;
              color: #BDF33F;
              font-family: 'Inter', system-ui, sans-serif;
              font-variant-numeric: tabular-nums;
              letter-spacing: 0.1em;
              text-shadow: 0 0 1vw rgba(205, 255, 64, 0.3);
            }

            .undo-notification {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background-color: rgba(0, 0, 0, 0.8);
              color: white;
              padding: 1vw 2vw;
              border-radius: 0.5vw;
              font-size: 2vw;
              font-weight: bold;
              z-index: 100;
              opacity: 0;
              transition: opacity 0.3s ease;
              pointer-events: none;
            }

            .undo-notification.visible {
              opacity: 1;
            }
          `}</style>
        </div>
      )}
    </>
  )
}
