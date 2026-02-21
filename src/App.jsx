import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw, Play, Settings, Trophy, X, Clock } from 'lucide-react';

/**
 * UTILITIES & CONSTANTS
 */
const SUITS = ['spades', 'hearts', 'clubs', 'diamonds'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const SUIT_ICONS = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦',
};

const SUIT_COLORS = {
  spades: 'text-slate-900',
  hearts: 'text-red-600',
  clubs: 'text-slate-900',
  diamonds: 'text-red-600',
};

const SUIT_FILL_COLORS = {
  spades: 'text-slate-800/20',
  hearts: 'text-red-500/20',
  clubs: 'text-slate-800/20',
  diamonds: 'text-red-500/20',
};

const isAlternateColor = (card1, card2) => {
  const isRed1 = card1.suit === 'hearts' || card1.suit === 'diamonds';
  const isRed2 = card2.suit === 'hearts' || card2.suit === 'diamonds';
  return isRed1 !== isRed2;
};

const getRankValue = (rank) => RANKS.indexOf(rank) + 1;

const getTwinId = (card) => {
    const twins = {
        'spades': 'clubs',
        'clubs': 'spades',
        'hearts': 'diamonds',
        'diamonds': 'hearts'
    };
    return `${card.rank}-${twins[card.suit]}`;
};

const createDeck = () => {
  const deck = [];
  SUITS.forEach((suit) => {
    RANKS.forEach((rank) => {
      deck.push({
        id: `${rank}-${suit}`,
        rank,
        suit,
        value: getRankValue(rank),
        isRed: suit === 'hearts' || suit === 'diamonds'
      });
    });
  });
  return deck;
};

const shuffleDeck = (deck) => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

const dealGame = () => {
  const deck = shuffleDeck(createDeck());
  const columns = Array(8).fill().map(() => []);
  const freecells = Array(4).fill(null);
  const foundations = { spades: [], hearts: [], clubs: [], diamonds: [] };

  deck.forEach((card, index) => {
    columns[index % 8].push(card);
  });

  return { columns, freecells, foundations, moves: 0 };
};

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
};

/**
 * MAIN COMPONENT
 */

const getCardOffset = (windowWidth, windowHeight, colLength) => {
  // Base offset values (rem)
  let baseOffset = 4.5;
  if (windowWidth < 640) baseOffset = 1.8;
  else if (windowWidth < 1024) baseOffset = 3.5;
  else if (windowWidth < 1440) baseOffset = 4.5;
  else baseOffset = 5.5;

  // Header height (rem): h-20 (5), sm:h-24 (6), xl:h-32 (8)
  const headerHeight = windowWidth < 640 ? 5 : (windowWidth < 1280 ? 6 : 8);

  // Padding Y (rem)
  let paddingY = 12;
  if (windowWidth < 640) paddingY = 5;
  else if (windowWidth < 1024) paddingY = 6;
  else if (windowWidth < 1280) paddingY = 8;

  // Padding X (rem)
  let mainPaddingX = 12;
  if (windowWidth < 640) mainPaddingX = 2;
  else if (windowWidth < 1024) mainPaddingX = 6;
  else if (windowWidth < 1280) mainPaddingX = 8;
  else if (windowWidth > 2000) mainPaddingX = 16;

  // Side panels (rem)
  const sidePanelsWidth = windowWidth > 2000 ? 56 : 0;

  // Gap (rem)
  let gapRem = 6;
  if (windowWidth < 640) gapRem = 0.75;
  else if (windowWidth < 768) gapRem = 1.5;
  else if (windowWidth < 1024) gapRem = 2;
  else if (windowWidth < 1280) gapRem = 3;

  const totalBoardWidthRem = (windowWidth / 16) - sidePanelsWidth - mainPaddingX;
  const colWidthRem = (totalBoardWidthRem - (7 * gapRem)) / 8;
  const cardHeightRem = colWidthRem * (3.6 / 2.5);

  const slotRowMarginBottomRem = windowWidth < 640 ? 1 : 2;
  const slotRowHeightRem = cardHeightRem + slotRowMarginBottomRem;

  const availableHeightRem = (windowHeight / 16) - headerHeight - paddingY - slotRowHeightRem - 2;

  if (colLength <= 1) return baseOffset;

  const maxTotalOffset = availableHeightRem - cardHeightRem;
  const requiredOffset = maxTotalOffset / (colLength - 1);

  return Math.min(baseOffset, Math.max(requiredOffset, 1.2));
};

export default function App() {
  const { width, height } = useWindowSize();
  const [gameState, setGameState] = useState(dealGame());
  const [history, setHistory] = useState([]);
  const [win, setWin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [dragInfo, setDragInfo] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [time, setTime] = useState(0);
  const [focusedCard, setFocusedCard] = useState(null);
  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem('freecell-stats');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { wins: 0, games: 0, bestTime: null, leastMoves: null, streak: 0, history: [] };
      }
    }
    return { wins: 0, games: 0, bestTime: null, leastMoves: null, streak: 0, history: [] };
  });

  useEffect(() => {
    localStorage.setItem('freecell-stats', JSON.stringify(stats));
  }, [stats]);

  const updateStats = useCallback((win, finalTime, finalMoves) => {
    setStats(prev => {
      const newGames = prev.games + 1;
      const newWins = win ? prev.wins + 1 : prev.wins;
      const newStreak = win ? prev.streak + 1 : 0;
      let newBestTime = prev.bestTime;
      if (win && (prev.bestTime === null || finalTime < prev.bestTime)) {
        newBestTime = finalTime;
      }
      let newLeastMoves = prev.leastMoves;
      if (win && (prev.leastMoves === null || finalMoves < prev.leastMoves)) {
        newLeastMoves = finalMoves;
      }
      const newHistory = [{ win, time: finalTime, moves: finalMoves, date: new Date().toISOString() }, ...prev.history].slice(0, 50);
      return {
        wins: newWins,
        games: newGames,
        bestTime: newBestTime,
        leastMoves: newLeastMoves,
        streak: newStreak,
        history: newHistory
      };
    });
  }, []);

  const dragStartPos = useRef(null);
  const logoClickTimer = useRef(null);
  const logoClicks = useRef(0);

  const saveState = useCallback(() => {
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(gameState))]);
  }, [gameState]);

  const checkWin = useCallback((state) => {
    const totalFoundation = Object.values(state.foundations).reduce((acc, pile) => acc + pile.length, 0);
    if (totalFoundation === 52) { setWin(true); updateStats(true, time, gameState.moves); }
  }, [gameState.moves, time, updateStats]);

  const attemptMove = useCallback((from, to) => {
    const newColumns = gameState.columns.map(c => [...c]);
    const newFreecells = [...gameState.freecells];
    const newFoundations = { ...gameState.foundations };

    let cardsToMove = [];
    if (from.type === 'freecell') {
      cardsToMove = [newFreecells[from.index]];
    } else {
      cardsToMove = newColumns[from.index].slice(from.cardIndex);
    }

    if (!cardsToMove.length || !cardsToMove[0]) return;
    const primaryCard = cardsToMove[0];
    let valid = false;

    const getMaxMoveSize = (targetColumnIsEmpty) => {
        const emptyFreecells = newFreecells.filter(c => c === null).length;
        const emptyColumns = newColumns.filter(c => c.length === 0).length;
        const effectiveEmptyCols = targetColumnIsEmpty ? emptyColumns - 1 : emptyColumns;
        return (emptyFreecells + 1) * Math.pow(2, Math.max(0, effectiveEmptyCols));
    };

    if (to.type === 'freecell') {
      if (cardsToMove.length === 1 && newFreecells[to.index] === null) {
        valid = true;
        newFreecells[to.index] = primaryCard;
        if (from.type === 'freecell') newFreecells[from.index] = null;
        else newColumns[from.index].splice(from.cardIndex);
      }
    }
    else if (to.type === 'column') {
      const targetCol = newColumns[to.index];
      const canMoveToColumn = (card, columnPile) => {
        if (!card) return false;
        if (columnPile.length === 0) return true;
        const topCard = columnPile[columnPile.length - 1];
        return isAlternateColor(card, topCard) && topCard.value === card.value + 1;
      };
      if (canMoveToColumn(primaryCard, targetCol)) {
        if (cardsToMove.length <= getMaxMoveSize(targetCol.length === 0)) {
          valid = true;
          targetCol.push(...cardsToMove);
          if (from.type === 'freecell') newFreecells[from.index] = null;
          else newColumns[from.index].splice(from.cardIndex, cardsToMove.length);
        }
      }
    } else if (to.type === 'foundation' && cardsToMove.length === 1) {
        const suit = SUITS[to.index];
        const canMoveToFoundation = (card, foundationPile) => {
            if (!card) return false;
            if (foundationPile.length === 0) return card.rank === 'A';
            const topCard = foundationPile[foundationPile.length - 1];
            return card.suit === topCard.suit && card.value === topCard.value + 1;
        };
        if (primaryCard.suit === suit && canMoveToFoundation(primaryCard, newFoundations[suit])) {
            valid = true;
            newFoundations[suit].push(primaryCard);
            if (from.type === 'freecell') newFreecells[from.index] = null;
            else newColumns[from.index].pop();
        }
    }

    if (valid) {
      setHistory(prev => [...prev, JSON.parse(JSON.stringify(gameState))]);
      setGameState({ columns: newColumns, freecells: newFreecells, foundations: newFoundations, moves: gameState.moves + 1 });
      checkWin({ foundations: newFoundations });
      setHasStarted(true);
    }
  }, [gameState, checkWin]);

  const onMouseMove = useCallback((e) => { if (e.type === "touchmove" && e.cancelable) e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (dragStartPos.current && !dragStartPos.current.isDragging) {
      const dx = Math.abs(clientX - dragStartPos.current.x);
      const dy = Math.abs(clientY - dragStartPos.current.y);

      if (dx > 5 || dy > 5) {
        const { sourceType, sourceIndex, cardIndex } = dragStartPos.current;
        let cards = [];

        if (sourceType === 'freecell') {
          const card = gameState.freecells[sourceIndex];
          if (!card) return;
          cards = [card];
        } else if (sourceType === 'column') {
          const col = gameState.columns[sourceIndex];
          const clickedCard = col[cardIndex];
          if (!clickedCard) return;

          let isValidStack = true;
          for (let i = cardIndex; i < col.length - 1; i++) {
            if (!isAlternateColor(col[i], col[i+1]) || col[i].value !== col[i+1].value + 1) {
              isValidStack = false;
              break;
            }
          }
          if (!isValidStack) return;
          cards = col.slice(cardIndex);
        }

        dragStartPos.current.isDragging = true;
        setHasStarted(true);
        setDragInfo({
          source: { type: sourceType, index: sourceIndex, cardIndex },
          cards,
          x: clientX,
          y: clientY
        });
      }
    } else if (dragInfo) {
      setDragInfo(prev => prev ? { ...prev, x: clientX, y: clientY } : null);
    }
  }, [dragInfo, gameState]);

  const onMouseUp = useCallback((e) => {
    if (e.button === 2) {
        setFocusedCard(null);
    }

    if (dragInfo) {
      const elements = document.elementsFromPoint(dragInfo.x, dragInfo.y);
      const dropTarget = elements.find(el => el.dataset.dropType);

      if (dropTarget) {
        const type = dropTarget.dataset.dropType;
        const index = parseInt(dropTarget.dataset.dropIndex);
        attemptMove(dragInfo.source, { type, index });
      }
      setDragInfo(null);
    }
    dragStartPos.current = null;
  }, [dragInfo, attemptMove]);

  // External API
  useEffect(() => {
    window.loadGame = (state) => {
        if (state && state.columns && state.freecells && state.foundations) {
            setGameState(state);
            setHasStarted(true);
            setWin(false);
            setHistory([]);
            setFocusedCard(null);
            console.log("Game state successfully restored.");
        } else {
            console.error("Invalid game state provided.");
        }
    };
  }, []);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setGameState(previousState);
    setHistory(prev => prev.slice(0, -1));
    setWin(false);
    setFocusedCard(null);
  }, [history]);

  const startNewGame = useCallback(() => {
    setHistory([]);
    setGameState(dealGame());
    setWin(false);
    setMenuOpen(false);
    setHasStarted(false);
    setGameState(prev => ({ ...prev, moves: 0 }));
    setTime(0);
    setFocusedCard(null);
  }, []);

  // Timer logic
  useEffect(() => {
    let interval;
    if (hasStarted && !win) {
        interval = setInterval(() => {
            setTime(t => t + 1);
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [hasStarted, win]);

  const handleLogoClick = async () => {
    logoClicks.current += 1;
    clearTimeout(logoClickTimer.current);

    if (logoClicks.current === 3) {
        logoClicks.current = 0;
        const stateStr = JSON.stringify(gameState);
        try {
            await navigator.clipboard.writeText(stateStr);
            const clipboardText = await navigator.clipboard.readText();
            if (clipboardText && clipboardText !== stateStr) {
                const potentialState = JSON.parse(clipboardText);
                if (potentialState.columns) window.loadGame(potentialState);
            }
        } catch {
            console.log("State:", stateStr);
        }
        return;
    }
    logoClickTimer.current = setTimeout(() => { logoClicks.current = 0; }, 400);
  };

  const onMouseDown = (e, sourceType, sourceIndex, cardIndex = -1) => {
    if (e.button !== 0 && e.type !== 'touchstart') return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    dragStartPos.current = {
      x: clientX,
      y: clientY,
      sourceType,
      sourceIndex,
      cardIndex,
      isDragging: false
    };
  };

  const onContextMenu = (e, card) => {
    e.preventDefault();
    if (!card) return;
    setFocusedCard({
        id: card.id,
        twinId: getTwinId(card)
    });
  };

  useEffect(() => {
    const handleGlobalClick = (e) => {
        if (focusedCard && e.button !== 2) setFocusedCard(null);
    };

    window.addEventListener('mousedown', handleGlobalClick);

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if (e.key === 'n' || e.key === 'N') {
        if (!win) startNewGame();
      }
      if (e.key === 'u' || e.key === 'U') {
        undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);


    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('touchmove', onMouseMove, { passive: false });
    window.addEventListener('touchend', onMouseUp);
    return () => {
      window.removeEventListener('mousedown', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [onMouseMove, onMouseUp, focusedCard, undo, startNewGame, win]);

  const handleDoubleClick = (card, sourceType, sourceIndex) => {
    setHasStarted(true);
    if (sourceType === 'column') {
      const col = gameState.columns[sourceIndex];
      if (col[col.length - 1].id !== card.id) return;
    }
    const newFoundations = { ...gameState.foundations };
    const newFreecells = [...gameState.freecells];
    const newColumns = gameState.columns.map(c => [...c]);
    const canMoveToFoundation = (card, foundationPile) => {
        if (!card) return false;
        if (foundationPile.length === 0) return card.rank === 'A';
        const topCard = foundationPile[foundationPile.length - 1];
        return card.suit === topCard.suit && card.value === topCard.value + 1;
    };
    if (canMoveToFoundation(card, newFoundations[card.suit])) {
      saveState();
      newFoundations[card.suit] = [...newFoundations[card.suit], card];
      if (sourceType === 'freecell') newFreecells[sourceIndex] = null;
      else newColumns[sourceIndex].pop();
      setGameState({ columns: newColumns, freecells: newFreecells, foundations: newFoundations, moves: gameState.moves + 1 });
      checkWin({ foundations: newFoundations });
      return;
    }
    if (sourceType === 'column') {
      const emptyCellIndex = newFreecells.findIndex(cell => cell === null);
      if (emptyCellIndex !== -1) {
        saveState();
        newFreecells[emptyCellIndex] = card;
        newColumns[sourceIndex].pop();
        setGameState({ columns: newColumns, freecells: newFreecells, foundations: newFoundations, moves: gameState.moves + 1 });
      }
    }
  };

  useEffect(() => {
    if (!autoPlayEnabled || win || !hasStarted) return;
    const timer = setTimeout(() => {
        let moved = false;
        const newFoundations = { ...gameState.foundations };
        const newFreecells = [...gameState.freecells];
        const newColumns = gameState.columns.map(c => [...c]);
        const canMoveToFoundation = (card, foundationPile) => {
            if (!card) return false;
            if (foundationPile.length === 0) return card.rank === 'A';
            const topCard = foundationPile[foundationPile.length - 1];
            return card.suit === topCard.suit && card.value === topCard.value + 1;
        };
        const isSafe = (card) => {
            if (card.value <= 2) return true;
            const partnerSuits = card.isRed ? ['spades', 'clubs'] : ['hearts', 'diamonds'];
            return partnerSuits.every(suit => newFoundations[suit].length >= card.value - 1);
        };
        const tryMove = (card, sourceFn) => {
            if (canMoveToFoundation(card, newFoundations[card.suit]) && isSafe(card)) {
                newFoundations[card.suit].push(card);
                sourceFn();
                moved = true;
            }
        };
        newFreecells.forEach((card, i) => { if (card && !moved) tryMove(card, () => { newFreecells[i] = null; }); });
        if (!moved) newColumns.forEach((col) => {
            if (col.length > 0 && !moved) {
                const card = col[col.length - 1];
                tryMove(card, () => { col.pop(); });
            }
        });
        if (moved) {
            setGameState({ columns: newColumns, freecells: newFreecells, foundations: newFoundations, moves: gameState.moves + 1 });
            checkWin({ foundations: newFoundations });
        }
    }, 200);
    return () => clearTimeout(timer);
  }, [gameState, autoPlayEnabled, win, hasStarted, checkWin]);

  return (
    <div className={`min-h-screen bg-[#008f83] text-emerald-50 font-sans select-none flex flex-col relative overflow-hidden felt-texture transition-colors duration-500 ${focusedCard ? 'brightness-[0.85]' : ''}`}>
      <style>{`
        :root { touch-action: none; }
        .card-shadow { box-shadow: 1px 2px 5px rgba(0,0,0,0.4); }
        .animate-pop { animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes pop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .no-transition { transition: none !important; }
        .will-change-drag { will-change: transform, opacity; }
        .timer-glow { text-shadow: 0 0 10px rgba(255, 255, 255, 0.2); }
        .card-hover-effect:hover {
            transform: translateY(-8px) scale(1.02);
            filter: brightness(1.1);
            cursor: grab;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 20px rgba(16,185,129,0.2);
            z-index: 50;
        }
        .twin-reveal {
            transform: scale(1.15) translateY(-10px) !important;
            z-index: 9999 !important;
            box-shadow: 0 0 30px 10px rgba(255, 255, 0, 0.4), 0 20px 40px rgba(0,0,0,0.6) !important;
            filter: brightness(1.1) !important;
        }
        .twin-highlight {
            animation: twin-pulse 1.5s infinite;
            z-index: 500 !important;
        }
        @keyframes twin-pulse {
            0%, 100% { box-shadow: 0 0 15px 2px rgba(255, 255, 0, 0.3); transform: scale(1.05); }
            50% { box-shadow: 0 0 25px 8px rgba(255, 255, 0, 0.6); transform: scale(1.08); }
        }
        .recessed-slot {
            background: linear-gradient(145deg, rgba(0,0,0,0.3), rgba(255,255,255,0.05));
            box-shadow: inset 1px 1px 4px rgba(0,0,0,0.5), inset -1px -1px 2px rgba(255,255,255,0.05);
        }
      `}</style>

            <header className="h-20 sm:h-24 xl:h-32 bg-[#062c1e]/80 backdrop-blur-xl flex items-center justify-between px-8 border-b border-emerald-500/20 z-[70] shrink-0 shadow-2xl">
        <div className="flex items-center gap-4 sm:gap-12 w-1/3">
          <button onClick={handleLogoClick} className="text-2xl font-black text-emerald-400 tracking-tighter flex items-center gap-3 hover:brightness-110 transition active:scale-95 group">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-green-950 text-xl font-black shadow-[0_0_20px_rgba(16,185,129,0.4)]">F</div>
            <span className="hidden sm:inline uppercase">FreeCell <span className="text-emerald-600/50 text-xs tracking-widest ml-1 font-bold">Pro</span></span>
          </button>

          {width > 1200 && (
            <button onClick={startNewGame} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/20 transition-all font-black text-xs tracking-widest">
                <Play size={16} fill="currentColor" /> NEW GAME
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 sm:gap-8 bg-black/40 px-4 sm:px-10 py-2 sm:py-3 rounded-2xl sm:rounded-3xl border border-white/5 shadow-inner">
            <div className="flex flex-col items-center min-w-[60px] sm:min-w-[80px]">
                <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.2em] text-emerald-500/60 font-black">Time</span>
                <span className="text-lg sm:text-2xl font-mono font-bold text-emerald-50 leading-tight">{formatTime(time)}</span>
            </div>
            <div className="w-px h-8 sm:h-10 bg-white/10" />
            <div className="flex flex-col items-center min-w-[60px] sm:min-w-[80px]">
                <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.2em] text-emerald-500/60 font-black">Moves</span>
                <span className="text-lg sm:text-2xl font-mono font-bold text-emerald-50 leading-tight">{gameState.moves}</span>
            </div>
        </div>

        <div className="flex items-center justify-end gap-3 sm:gap-6 w-1/3">
          <button onClick={undo} disabled={history.length === 0} title="Undo (Ctrl+Z)" className={`p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all ${history.length === 0 ? 'opacity-20 cursor-not-allowed' : 'active:scale-90 hover:border-emerald-500/40 text-emerald-400'}`}>
            <RotateCcw size={24} />
          </button>
          <button onClick={() => setMenuOpen(true)} className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-90 hover:border-emerald-500/40 text-emerald-400">
            <Settings size={24} />
          </button>
        </div>
      </header>

      <main className={`flex-1 p-2 pb-20 sm:pb-12 sm:p-12 lg:p-16 xl:p-24 overflow-hidden flex flex-row justify-center w-full relative ${width > 2000 ? "px-32" : ""}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent_70%)] pointer-events-none" />
        {/* Left Side Panel - Local Only */}
        {width > 2000 && (
          <aside className="w-96 flex flex-col gap-8 pr-16 shrink-0 py-4 animate-pop">
            <div className="bg-black/30 rounded-[2rem] p-8 border border-white/5 shadow-2xl backdrop-blur-md">
                <h3 className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                    <Trophy size={14} /> Local Hall of Fame
                </h3>
                <div className="space-y-4">
                    {[
                        { name: 'Wins', score: stats.wins },
                        { name: 'Win Rate', score: stats.games > 0 ? `${Math.round((stats.wins / stats.games) * 100)}%` : '0%' },
                        { name: 'Streak', score: stats.streak }
                    ].map((entry, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-emerald-100/70 font-bold uppercase tracking-wider">{entry.name}</span>
                            <span className="font-mono text-emerald-400 font-black text-lg">{entry.score}</span>
                        </div>
                    ))}
                    <div className="h-px bg-white/5 my-4" />
                    <div className="flex items-center justify-between text-sm bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 shadow-inner">
                        <span className="text-emerald-400 font-black uppercase tracking-widest text-xs">Current Session</span>
                        <span className="font-mono text-emerald-400 font-black text-lg">{gameState.moves}</span>
                    </div>
                </div>
            </div>

            <div className="bg-black/30 rounded-[2rem] p-8 border border-white/5 shadow-2xl backdrop-blur-md flex-1 flex flex-col">
                <h3 className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                    <Clock size={14} /> Personal Stats
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: 'Total Games', value: stats.games, unit: 'Played' },
                        { label: 'Current Streak', value: stats.streak, unit: 'Wins' },
                        { label: 'Best Time', value: stats.bestTime ? formatTime(stats.bestTime) : '--:--', unit: '' },
                        { label: 'Least Moves', value: stats.leastMoves || '--', unit: '' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                            <div className="text-[9px] text-emerald-500/50 font-black uppercase tracking-widest mb-1">{stat.label}</div>
                            <div className="text-2xl font-black text-emerald-50">{stat.value} <span className="text-[10px] text-emerald-500/50 font-bold">{stat.unit}</span></div>
                        </div>
                    ))}
                </div>
            </div>
          </aside>
        )}

        <div className="flex-1 flex flex-col max-w-[2500px] w-full relative">
        {/* Slot Row */}
        <div className="grid grid-cols-8 gap-3 sm:gap-6 md:gap-8 lg:gap-12 xl:gap-24 mb-4 sm:mb-8 z-10 w-full">
            {/* Freecells */}
            {gameState.freecells.map((card, i) => (
              <div key={`fc-${i}`} data-drop-type="freecell" data-drop-index={i} className="relative aspect-[2.5/3.6] rounded-lg border-2 border-green-800/40 recessed-slot">
                {!card && <div className="absolute inset-0 border-2 border-dashed border-green-700/20 rounded-lg m-1" />}
                {card && (
                  <div
                    onMouseDown={(e) => onMouseDown(e, 'freecell', i)} onTouchStart={(e) => onMouseDown(e, 'freecell', i)}
                    onContextMenu={(e) => onContextMenu(e, card)}
                    onDoubleClick={() => handleDoubleClick(card, 'freecell', i)}
                    className={`h-full transition-all duration-300 ${dragInfo?.source.type === 'freecell' && dragInfo?.source.index === i ? 'opacity-0' : 'card-hover-effect'} ${focusedCard?.id === card?.id ? 'twin-reveal' : ''} ${focusedCard?.twinId === card?.id ? 'twin-highlight' : ''}`}
                  >
                    <Card card={card} />
                  </div>
                )}
              </div>
            ))}

            {/* Foundations */}
            {SUITS.map((suit, i) => (
              <div key={`fd-${suit}`} data-drop-type="foundation" data-drop-index={i} className="relative aspect-[2.5/3.6] rounded-lg border-2 border-green-800/60 recessed-slot flex items-center justify-center overflow-hidden">
                <div className={`text-6xl sm:text-7xl font-black select-none pointer-events-none transition-colors duration-500 ${SUIT_FILL_COLORS[suit]}`}>
                    {SUIT_ICONS[suit]}
                </div>
                {gameState.foundations[suit].map((card) => (
                  <div key={card.id} data-card-id={card.id} className={`absolute inset-0 transition-all ${focusedCard?.id === card.id ? 'twin-reveal' : ''} ${focusedCard?.twinId === card.id ? 'twin-highlight' : ''}`}>
                    <Card card={card} isStatic />
                  </div>
                ))}
              </div>
            ))}
        </div>

        {/* Tableau Row */}
        <div className="grid grid-cols-8 gap-3 sm:gap-6 md:gap-8 lg:gap-12 xl:gap-24 flex-1 relative z-10 w-full">
          {gameState.columns.map((col, colIndex) => (
            <div key={`col-${colIndex}`} data-drop-type="column" data-drop-index={colIndex} className="relative h-full">
              {col.length === 0 && <div className="absolute top-0 w-full aspect-[2.5/3.6] rounded-lg border-2 border-dashed border-green-800/30" />}
              {col.map((card, cardIndex) => {
                 const isSourceOfDrag = dragInfo?.source.type === 'column' && dragInfo?.source.index === colIndex && cardIndex >= dragInfo.source.cardIndex;
                 const isFocused = focusedCard?.id === card.id;
                 const isTwinHighlight = focusedCard?.twinId === card.id;
                 return (
                  <div
                    key={card.id} data-card-id={card.id}
                    className={`absolute w-full transition-all duration-200 aspect-[2.5/3.6] ${isSourceOfDrag ? 'opacity-0 pointer-events-none' : 'card-hover-effect'} ${isFocused ? 'twin-reveal' : ''} ${isTwinHighlight ? 'twin-highlight' : ''}`}
                    style={{ top: `${cardIndex * getCardOffset(width, height, col.length)}rem`, zIndex: isFocused ? 9999 : cardIndex }}
                    onMouseDown={(e) => onMouseDown(e, 'column', colIndex, cardIndex)} onTouchStart={(e) => onMouseDown(e, 'column', colIndex, cardIndex)}
                    onContextMenu={(e) => onContextMenu(e, card)}
                    onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClick(card, 'column', colIndex); }}
                  >
                    <Card card={card} />
                  </div>
                 );
              })}
            </div>
          ))}
        </div>
        </div>
        {/* Right Side Panel - Move History */}
        {width > 2000 && (
          <aside className="w-96 flex flex-col gap-8 pl-16 shrink-0 py-4 animate-pop">
            <div className="bg-black/30 rounded-[2rem] p-8 border border-white/5 shadow-2xl backdrop-blur-md flex-1 flex flex-col">
                <h3 className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                    <RotateCcw size={14} /> Recent Activity
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {stats.history.length === 0 ? (
                        <div className="text-emerald-500/30 text-xs font-bold uppercase tracking-widest text-center mt-20">No history yet</div>
                    ) : (
                        stats.history.slice(0, 10).map((h, i) => (
                            <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col gap-1">
                                <div className="flex justify-between items-center">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${h.win ? 'text-emerald-400' : 'text-slate-500'}`}>
                                        {h.win ? 'Victory' : 'Finished'}
                                    </span>
                                    <span className="text-[10px] text-white/20 font-mono">
                                        {new Date(h.date).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-xl font-black text-emerald-50">{h.moves} <span className="text-[10px] text-emerald-500/50 uppercase">Moves</span></div>
                                    <div className="text-sm font-mono text-emerald-400/70">{formatTime(h.time)}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="mt-6 pt-6 border-t border-white/5">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-emerald-500/50 font-black uppercase tracking-widest">Lifetime Wins</span>
                        <span className="text-2xl font-black text-emerald-400">{stats.wins}</span>
                    </div>
                </div>
            </div>
          </aside>
        )}
      </main>

      {/* Floating Drag Representation */}
      {dragInfo && (
        <div className="fixed pointer-events-none z-[100] flex flex-col no-transition will-change-drag shadow-2xl"
          style={{ left: 0, top: 0, transform: `translate3d(${dragInfo.x}px, ${dragInfo.y}px, 0) translate(-50%, -15%) rotate(1deg)`, width: 'min(calc((100vw - 12rem) / 8), 8rem)' }}>
          {dragInfo.cards.map((card, i) => (
            <div key={card.id} data-card-id={card.id} className="aspect-[2.5/3.6] w-full" style={{ marginTop: i === 0 ? 0 : "-75%" }}><Card card={card} isDragging /></div>
          ))}
        </div>
      )}

      {/* Overlays */}
      {win && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xl z-[80] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.2),transparent_70%)] animate-pulse" />
          <div className="bg-[#062c1e] text-emerald-50 p-12 rounded-[3rem] shadow-[0_0_100px_rgba(16,185,129,0.3)] border border-emerald-500/20 text-center max-w-md mx-4 animate-pop backdrop-blur-2xl">
            <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4"><Trophy size={40} /></div>
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-1 text-emerald-900">Victory!</h2>
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600/50 mb-4">Saved to Local Hall of Fame</div>
            <p className="text-slate-500 mb-6 font-mono font-bold text-xl flex items-center justify-center gap-2"><Clock size={18} /> {formatTime(time)}</p>
            <button onClick={startNewGame} className="w-full py-4 bg-emerald-500 text-green-950 rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-emerald-400 shadow-[0_10px_30px_rgba(16,185,129,0.4)] transition-all active:scale-95">Play Again</button>
          </div>
        </div>
      )}

      {menuOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-end sm:items-center justify-center">
            <div className="bg-slate-900 text-slate-100 w-full sm:w-96 sm:rounded-2xl rounded-t-2xl p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Settings size={20}/> Settings</h2>
                    <button onClick={() => setMenuOpen(false)} className="p-1 hover:bg-slate-800 rounded-full transition-colors"><X size={20}/></button>
                </div>
                <div className="space-y-4">
                    <button onClick={startNewGame} className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-xl font-semibold flex items-center justify-center gap-2"><Play size={18} /> New Game</button>
                    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <span className="font-medium">Auto-Play Cards</span>
                        <div onClick={() => setAutoPlayEnabled(!autoPlayEnabled)} className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${autoPlayEnabled ? 'bg-green-500' : 'bg-slate-600'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${autoPlayEnabled ? 'left-7' : 'left-1'}`} /></div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      {width <= 640 && (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#008f83]/95 backdrop-blur-2xl border-t border-emerald-500/20 px-8 pb-8 pt-4 flex items-center justify-between z-[90] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <button onClick={undo} disabled={history.length === 0} className={`flex flex-col items-center gap-1.5 ${history.length === 0 ? 'opacity-20' : 'text-emerald-400 active:scale-90 transition-all'}`}>
            <RotateCcw size={24} />
            <span className="text-[9px] font-black uppercase tracking-[0.1em]">Undo</span>
          </button>

          <button onClick={startNewGame} className="flex flex-col items-center justify-center bg-emerald-500 text-green-950 rounded-2xl px-8 py-3 font-black shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 transition-all -mt-8 border-4 border-[#008f83]">
            <Play size={20} fill="currentColor" className="mb-0.5" />
            <span className="text-[10px] uppercase tracking-widest">New Game</span>
          </button>

          <button onClick={() => setMenuOpen(true)} className="flex flex-col items-center gap-1.5 text-emerald-400 active:scale-90 transition-all">
            <Settings size={24} />
            <span className="text-[9px] font-black uppercase tracking-[0.1em]">Menu</span>
          </button>
        </nav>
      )}
    </div>
  );
}

function Card({ card, isDragging, isStatic }) {
  return (
    <div className={`w-full h-full bg-[#fcfcfc] rounded-lg sm:rounded-xl xl:rounded-2xl shadow-2xl select-none overflow-hidden relative ring-1 ring-black/5 ${isStatic ? '' : 'card-shadow'} ${isDragging ? 'scale-[1.05] ring-4 ring-emerald-400/50' : 'border border-slate-200'} shadow-xl transition-transform duration-200`}>
      <div data-testid="card-rank-suit" className={`absolute top-1 left-1.5 sm:top-2 sm:left-3 text-xs sm:text-xl lg:text-3xl xl:text-5xl font-black flex flex-row sm:flex-col items-center sm:items-center gap-0.5 sm:gap-0 leading-none ${SUIT_COLORS[card.suit]}`}>
        <span>{card.rank}</span><span className="text-[10px] sm:text-lg lg:text-2xl xl:text-4xl sm:-mt-1">{SUIT_ICONS[card.suit]}</span>
      </div>
      <div className={`absolute inset-0 hidden sm:flex items-center justify-center text-3xl sm:text-7xl lg:text-9xl xl:text-[14rem] ${SUIT_COLORS[card.suit]} opacity-[0.08]`}>{SUIT_ICONS[card.suit]}</div>
      <div data-testid="card-rank-suit" className={`absolute bottom-1 right-1.5 sm:bottom-2 sm:right-3 text-xs sm:text-xl lg:text-3xl xl:text-5xl font-black flex flex-row sm:flex-col items-center sm:items-center gap-0.5 sm:gap-0 leading-none rotate-180 ${SUIT_COLORS[card.suit]}`}>
        <span>{card.rank}</span><span className="text-[10px] sm:text-lg lg:text-2xl xl:text-4xl sm:-mt-1">{SUIT_ICONS[card.suit]}</span>
      </div>
      {/* Subtle card texture */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/[0.03] to-transparent pointer-events-none" />
    </div>
  );
}
