import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw, Play, Settings, Trophy, X, Clock, Search } from 'lucide-react';

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

// High contrast colors for slot backgrounds/watermarks
const SUIT_WATERMARK_COLORS = {
  spades: 'text-black/20',
  hearts: 'text-red-900/20',
  clubs: 'text-black/20',
  diamonds: 'text-red-900/20',
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

  return { columns, freecells, foundations };
};

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * MAIN COMPONENT
 */
export default function App() {
  const [gameState, setGameState] = useState(dealGame());
  const [history, setHistory] = useState([]);
  const [win, setWin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [dragInfo, setDragInfo] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [time, setTime] = useState(0);
  const [focusedCard, setFocusedCard] = useState(null);

  const dragStartPos = useRef(null);
  const logoClickTimer = useRef(null);
  const logoClicks = useRef(0);

  // External API for state restoration
  useEffect(() => {
    window.loadGame = (state) => {
        if (state && state.columns && state.freecells && state.foundations) {
            setGameState(state);
            setHasStarted(true);
            setWin(false);
            setHistory([]);
            setFocusedCard(null);
        }
    };
  }, []);

  const saveState = useCallback(() => {
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(gameState))]);
  }, [gameState]);

  const undo = () => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setGameState(previousState);
    setHistory(prev => prev.slice(0, -1));
    setWin(false);
    setFocusedCard(null);
  };

  const startNewGame = () => {
    setHistory([]);
    setGameState(dealGame());
    setWin(false);
    setMenuOpen(false);
    setHasStarted(false);
    setTime(0);
    setFocusedCard(null);
  };

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
        } catch (e) { console.log(stateStr); }
        return;
    }
    logoClickTimer.current = setTimeout(() => { logoClicks.current = 0; }, 400);
  };

  const onMouseDown = (e, sourceType, sourceIndex, cardIndex = -1) => {
    if (e.button !== 0 && e.type !== 'touchstart') return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartPos.current = { x: clientX, y: clientY, sourceType, sourceIndex, cardIndex, isDragging: false };
  };

  const onContextMenu = (e, card) => {
    e.preventDefault();
    if (!card) return;
    setFocusedCard({ id: card.id, twinId: getTwinId(card) });
  };

  const onMouseMove = useCallback((e) => {
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
        setDragInfo({ source: { type: sourceType, index: sourceIndex, cardIndex }, cards, x: clientX, y: clientY });
      }
    } else if (dragInfo) {
      setDragInfo(prev => prev ? { ...prev, x: clientX, y: clientY } : null);
    }
  }, [dragInfo, gameState]);

  const onMouseUp = useCallback((e) => {
    if (e.button === 2) setFocusedCard(null);
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
  }, [dragInfo]);

  useEffect(() => {
    const handleGlobalClick = (e) => { if (focusedCard && e.button !== 2) setFocusedCard(null); };
    window.addEventListener('mousedown', handleGlobalClick);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('touchmove', onMouseMove, { passive: false });
    window.addEventListener('touchend', onMouseUp);
    return () => {
      window.removeEventListener('mousedown', handleGlobalClick);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [onMouseMove, onMouseUp, focusedCard]);

  const attemptMove = (from, to) => {
    const newColumns = gameState.columns.map(c => [...c]);
    const newFreecells = [...gameState.freecells];
    const newFoundations = { ...gameState.foundations };
    let cardsToMove = from.type === 'freecell' ? [newFreecells[from.index]] : newColumns[from.index].slice(from.cardIndex);
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
      const topCard = targetCol[targetCol.length - 1];
      const canPlace = targetCol.length === 0 || (isAlternateColor(primaryCard, topCard) && topCard.value === primaryCard.value + 1);
      if (canPlace && cardsToMove.length <= getMaxMoveSize(targetCol.length === 0)) {
        valid = true;
        targetCol.push(...cardsToMove);
        if (from.type === 'freecell') newFreecells[from.index] = null;
        else newColumns[from.index].splice(from.cardIndex, cardsToMove.length);
      }
    } else if (to.type === 'foundation' && cardsToMove.length === 1) {
        const suit = SUITS[to.index];
        const fCol = newFoundations[suit];
        const canPlace = (fCol.length === 0 && primaryCard.rank === 'A') || (fCol.length > 0 && primaryCard.suit === suit && primaryCard.value === fCol[fCol.length - 1].value + 1);
        if (primaryCard.suit === suit && canPlace) {
            valid = true;
            fCol.push(primaryCard);
            if (from.type === 'freecell') newFreecells[from.index] = null;
            else newColumns[from.index].pop();
        }
    }

    if (valid) {
      saveState();
      setGameState({ columns: newColumns, freecells: newFreecells, foundations: newFoundations });
      checkWin({ foundations: newFoundations });
      setHasStarted(true);
    }
  };

  const handleDoubleClick = (card, sourceType, sourceIndex) => {
    setHasStarted(true);
    if (sourceType === 'column') {
      const col = gameState.columns[sourceIndex];
      if (col[col.length - 1].id !== card.id) return;
    }
    const newFoundations = { ...gameState.foundations };
    const newFreecells = [...gameState.freecells];
    const newColumns = gameState.columns.map(c => [...c]);

    const fCol = newFoundations[card.suit];
    if ((fCol.length === 0 && card.rank === 'A') || (fCol.length > 0 && card.value === fCol[fCol.length - 1].value + 1)) {
      saveState();
      newFoundations[card.suit] = [...fCol, card];
      if (sourceType === 'freecell') newFreecells[sourceIndex] = null;
      else newColumns[sourceIndex].pop();
      setGameState({ columns: newColumns, freecells: newFreecells, foundations: newFoundations });
      checkWin({ foundations: newFoundations });
      return;
    }
    if (sourceType === 'column') {
      const emptyCellIndex = newFreecells.findIndex(cell => cell === null);
      if (emptyCellIndex !== -1) {
        saveState();
        newFreecells[emptyCellIndex] = card;
        newColumns[sourceIndex].pop();
        setGameState({ columns: newColumns, freecells: newFreecells, foundations: newFoundations });
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

        const isSafe = (card) => {
            if (card.value <= 2) return true;
            const partnerSuits = card.isRed ? ['spades', 'clubs'] : ['hearts', 'diamonds'];
            return partnerSuits.every(suit => newFoundations[suit].length >= card.value - 1);
        };

        const tryMove = (card, sourceFn) => {
            const fCol = newFoundations[card.suit];
            if (((fCol.length === 0 && card.rank === 'A') || (fCol.length > 0 && card.value === fCol[fCol.length - 1].value + 1)) && isSafe(card)) {
                newFoundations[card.suit].push(card);
                sourceFn();
                moved = true;
            }
        };

        newFreecells.forEach((card, i) => { if (card && !moved) tryMove(card, () => { newFreecells[i] = null; }); });
        if (!moved) newColumns.forEach((col) => {
            if (col.length > 0 && !moved) tryMove(col[col.length - 1], () => { col.pop(); });
        });
        if (moved) {
            setGameState({ columns: newColumns, freecells: newFreecells, foundations: newFoundations });
            checkWin({ foundations: newFoundations });
        }
    }, 250);
    return () => clearTimeout(timer);
  }, [gameState, autoPlayEnabled, win, hasStarted]);

  const checkWin = (state) => {
    const total = Object.values(state.foundations).reduce((acc, pile) => acc + pile.length, 0);
    if (total === 52) setWin(true);
  };

  return (
    <div className={`min-h-screen bg-[#1a4d2e] text-slate-100 font-sans select-none overflow-hidden flex flex-col transition-colors duration-500 ${focusedCard ? 'brightness-[0.85]' : ''}`}>
      <style>{`
        :root { touch-action: none; }
        .card-shadow { box-shadow: 0 1px 3px rgba(0,0,0,0.4); }
        .recessed-slot {
            background: rgba(0,0,0,0.15);
            box-shadow: inset 2px 2px 6px rgba(0,0,0,0.3);
            border: 1.5px solid rgba(255,255,255,0.05);
        }
        .card-hover-effect:hover { transform: translateY(-3px); filter: brightness(1.05); cursor: grab; }
        .twin-reveal {
            transform: scale(1.15) translateY(-10px) !important;
            z-index: 9999 !important;
            box-shadow: 0 0 30px 10px rgba(255, 255, 0, 0.4), 0 20px 40px rgba(0,0,0,0.6) !important;
            filter: brightness(1.1) !important;
        }
        .twin-highlight { animation: twin-pulse 1.5s infinite; z-index: 500 !important; }
        @keyframes twin-pulse {
            0%, 100% { box-shadow: 0 0 15px 2px rgba(255, 255, 0, 0.3); transform: scale(1.05); }
            50% { box-shadow: 0 0 25px 8px rgba(255, 255, 0, 0.6); transform: scale(1.08); }
        }
      `}</style>

      <header className="h-12 bg-black/20 flex items-center justify-between px-6 z-[70] shrink-0 border-b border-white/5">
        <div className="flex items-center gap-6">
          <button onClick={handleLogoClick} className="text-sm font-bold tracking-widest text-white/80 hover:text-white flex items-center gap-2">
            <div className="w-5 h-5 bg-yellow-500 rounded-sm flex items-center justify-center text-green-900 text-[10px] font-black">F</div>
            FREECELL PRO
          </button>
          <div className="flex gap-4 text-xs font-semibold text-white/40 uppercase tracking-tighter">
            <button onClick={startNewGame} className="hover:text-white transition">New</button>
            <button onClick={undo} className="hover:text-white transition">Undo</button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-white/90 font-mono text-sm">
            <Clock size={14} className="opacity-50" /> {formatTime(time)}
        </div>

        <button onClick={() => setMenuOpen(true)} className="p-1.5 rounded hover:bg-white/10 transition opacity-60 hover:opacity-100">
            <Settings size={18} />
        </button>
      </header>

      <main className="flex-1 p-4 sm:p-8 flex flex-col max-w-[1400px] mx-auto w-full relative">
        {/* Top Row Slots */}
        <div className="grid grid-cols-8 gap-3 sm:gap-4 md:gap-5 mb-8 z-10 w-full">
            {gameState.freecells.map((card, i) => (
              <div key={`fc-${i}`} data-drop-type="freecell" data-drop-index={i} className="relative aspect-[2.5/3.6] rounded-md recessed-slot">
                {card && (
                  <div
                    onMouseDown={(e) => onMouseDown(e, 'freecell', i)}
                    onContextMenu={(e) => onContextMenu(e, card)}
                    onDoubleClick={() => handleDoubleClick(card, 'freecell', i)}
                    className={`h-full transition-all duration-300 ${dragInfo?.source.type === 'freecell' && dragInfo?.source.index === i ? 'opacity-0' : 'card-hover-effect'} ${focusedCard?.id === card?.id ? 'twin-reveal' : ''} ${focusedCard?.twinId === card?.id ? 'twin-highlight' : ''}`}
                  >
                    <Card card={card} />
                  </div>
                )}
              </div>
            ))}

            {SUITS.map((suit, i) => (
              <div key={`fd-${suit}`} data-drop-type="foundation" data-drop-index={i} className="relative aspect-[2.5/3.6] rounded-md recessed-slot flex items-center justify-center overflow-hidden">
                <div className={`text-6xl sm:text-7xl font-black select-none pointer-events-none ${SUIT_WATERMARK_COLORS[suit]}`}>
                    {SUIT_ICONS[suit]}
                </div>
                {gameState.foundations[suit].map((card) => (
                  <div key={card.id} className={`absolute inset-0 transition-all ${focusedCard?.id === card.id ? 'twin-reveal' : ''} ${focusedCard?.twinId === card.id ? 'twin-highlight' : ''}`}>
                    <Card card={card} isStatic />
                  </div>
                ))}
              </div>
            ))}
        </div>

        {/* Tableau columns */}
        <div className="grid grid-cols-8 gap-3 sm:gap-4 md:gap-5 flex-1 relative z-10 w-full">
          {gameState.columns.map((col, colIndex) => (
            <div key={`col-${colIndex}`} data-drop-type="column" data-drop-index={colIndex} className="relative h-full">
              {col.map((card, cardIndex) => {
                 const isSourceOfDrag = dragInfo?.source.type === 'column' && dragInfo?.source.index === colIndex && cardIndex >= dragInfo.source.cardIndex;
                 const isFocused = focusedCard?.id === card.id;
                 const isTwinHighlight = focusedCard?.twinId === card.id;
                 return (
                  <div
                    key={card.id}
                    className={`absolute w-full transition-all duration-150 ${isSourceOfDrag ? 'opacity-0 pointer-events-none' : 'card-hover-effect'} ${isFocused ? 'twin-reveal' : ''} ${isTwinHighlight ? 'twin-highlight' : ''}`}
                    style={{ top: `${cardIndex * (window.innerWidth < 640 ? 1.4 : 2.5)}rem`, zIndex: isFocused ? 9999 : cardIndex }}
                    onMouseDown={(e) => onMouseDown(e, 'column', colIndex, cardIndex)}
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
      </main>

      {/* Dragging layer */}
      {dragInfo && (
        <div className="fixed pointer-events-none z-[100] flex flex-col no-transition will-change-drag shadow-2xl"
          style={{ left: 0, top: 0, transform: `translate3d(${dragInfo.x}px, ${dragInfo.y}px, 0) translate(-50%, -15%)`, width: 'min(calc((100vw - 12rem) / 8), 7rem)' }}>
          {dragInfo.cards.map((card, i) => (
            <div key={card.id} style={{ marginTop: i === 0 ? 0 : '-100%' }}><Card card={card} isDragging /></div>
          ))}
        </div>
      )}

      {/* Victory Modal */}
      {win && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 p-8 rounded-2xl shadow-2xl text-center max-w-xs w-full animate-pop">
            <Trophy size={48} className="text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black mb-2">WELL DONE</h2>
            <p className="text-slate-500 mb-6 font-mono font-bold text-lg">{formatTime(time)}</p>
            <button onClick={startNewGame} className="w-full py-3 bg-green-700 text-white rounded-lg font-bold hover:bg-green-800 transition-all active:scale-95 shadow-md">New Game</button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {menuOpen && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={() => setMenuOpen(false)}>
            <div className="bg-slate-900 text-white w-full max-w-sm rounded-xl p-6 shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold flex items-center gap-2 tracking-tight">OPTIONS</h2>
                    <button onClick={() => setMenuOpen(false)}><X size={20}/></button>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                        <span className="text-sm font-medium">Auto-Play Cards</span>
                        <div onClick={() => setAutoPlayEnabled(!autoPlayEnabled)} className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${autoPlayEnabled ? 'bg-green-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${autoPlayEnabled ? 'left-6' : 'left-1'}`} /></div>
                    </div>
                    <button onClick={startNewGame} className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold">RESTART GAME</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

function Card({ card, isDragging, isStatic }) {
  return (
    <div className={`w-full aspect-[2.5/3.6] bg-white rounded-sm select-none overflow-hidden relative ${isStatic ? '' : 'card-shadow'} ${isDragging ? 'ring-2 ring-yellow-400 opacity-90' : 'border border-slate-300'}`}>
      <div className={`absolute top-0.5 left-1 text-sm sm:text-base font-bold flex flex-col items-center leading-none ${SUIT_COLORS[card.suit]}`}>
        <span>{card.rank}</span><span className="text-[10px] sm:text-xs">{SUIT_ICONS[card.suit]}</span>
      </div>
      <div className={`absolute inset-0 flex items-center justify-center text-3xl sm:text-4xl ${SUIT_COLORS[card.suit]} opacity-90`}>{SUIT_ICONS[card.suit]}</div>
      <div className={`absolute bottom-0.5 right-1 text-sm sm:text-base font-bold flex flex-col items-center leading-none rotate-180 ${SUIT_COLORS[card.suit]}`}>
        <span>{card.rank}</span><span className="text-[10px] sm:text-xs">{SUIT_ICONS[card.suit]}</span>
      </div>
      <div className="absolute inset-0 bg-gradient-to-tr from-black/[0.03] to-transparent pointer-events-none" />
    </div>
  );
}
