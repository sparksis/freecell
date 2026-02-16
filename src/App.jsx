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

  const saveState = useCallback(() => {
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(gameState))]);
  }, [gameState]);

  const checkWin = useCallback((state) => {
    const totalFoundation = Object.values(state.foundations).reduce((acc, pile) => acc + pile.length, 0);
    if (totalFoundation === 52) setWin(true);
  }, []);

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
      setGameState({ columns: newColumns, freecells: newFreecells, foundations: newFoundations });
      checkWin({ foundations: newFoundations });
      setHasStarted(true);
    }
  }, [gameState, checkWin]);

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
            setGameState({ columns: newColumns, freecells: newFreecells, foundations: newFoundations });
            checkWin({ foundations: newFoundations });
        }
    }, 200);
    return () => clearTimeout(timer);
  }, [gameState, autoPlayEnabled, win, hasStarted, checkWin]);

  return (
    <div className={`min-h-screen bg-green-900 text-slate-100 font-sans select-none overflow-hidden flex flex-col transition-colors duration-500 ${focusedCard ? 'brightness-[0.85]' : ''}`}>
      <style>{`
        :root { touch-action: none; }
        .card-shadow { box-shadow: 1px 2px 5px rgba(0,0,0,0.4); }
        .animate-pop { animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes pop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .no-transition { transition: none !important; }
        .will-change-drag { will-change: transform, opacity; }
        .timer-glow { text-shadow: 0 0 10px rgba(255, 255, 255, 0.2); }
        .card-hover-effect:hover { transform: translateY(-4px); filter: brightness(1.05); cursor: grab; }
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

      <header className="h-14 bg-green-950/70 backdrop-blur-md flex items-center justify-between px-6 border-b border-green-800 z-[70] shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={handleLogoClick} className="text-xl font-bold text-green-100 tracking-wider flex items-center gap-2 hover:text-white transition active:scale-95 group">
            <div className="w-6 h-6 bg-yellow-500 rounded flex items-center justify-center text-green-900 text-xs font-black group-hover:bg-yellow-400 transition-colors">F</div>
            FREECELL
          </button>
        </div>

        <div className="flex items-center gap-2 text-green-200 font-mono text-lg bg-green-900/50 px-3 py-1 rounded-full border border-green-700/50 timer-glow">
            <Clock size={16} className={hasStarted && !win ? 'animate-pulse' : ''} />
            {formatTime(time)}
        </div>

        <div className="flex gap-4">
          <button onClick={undo} disabled={history.length === 0} className={`p-2 rounded-full hover:bg-white/10 transition ${history.length === 0 ? 'opacity-30' : ''}`}><RotateCcw size={20} /></button>
          <button onClick={() => setMenuOpen(true)} className="p-2 rounded-full hover:bg-white/10 transition"><Settings size={20} /></button>
        </div>
      </header>

      <main className="flex-1 p-6 sm:p-10 overflow-hidden flex flex-col max-w-[1500px] mx-auto w-full relative">
        {/* Slot Row */}
        <div className="grid grid-cols-8 gap-2 sm:gap-4 md:gap-6 mb-8 z-10 w-full">
            {/* Freecells */}
            {gameState.freecells.map((card, i) => (
              <div key={`fc-${i}`} data-drop-type="freecell" data-drop-index={i} className="relative aspect-[2.5/3.6] rounded-lg border-2 border-green-800/40 recessed-slot">
                {!card && <div className="absolute inset-0 border-2 border-dashed border-green-700/20 rounded-lg m-1" />}
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

            {/* Foundations */}
            {SUITS.map((suit, i) => (
              <div key={`fd-${suit}`} data-drop-type="foundation" data-drop-index={i} className="relative aspect-[2.5/3.6] rounded-lg border-2 border-green-800/60 recessed-slot flex items-center justify-center overflow-hidden">
                <div className={`text-6xl sm:text-7xl font-black select-none pointer-events-none transition-colors duration-500 ${SUIT_FILL_COLORS[suit]}`}>
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

        {/* Tableau Row */}
        <div className="grid grid-cols-8 gap-2 sm:gap-4 md:gap-6 flex-1 relative z-10 w-full">
          {gameState.columns.map((col, colIndex) => (
            <div key={`col-${colIndex}`} data-drop-type="column" data-drop-index={colIndex} className="relative h-full">
              {col.length === 0 && <div className="absolute top-0 w-full aspect-[2.5/3.6] rounded-lg border-2 border-dashed border-green-800/30" />}
              {col.map((card, cardIndex) => {
                 const isSourceOfDrag = dragInfo?.source.type === 'column' && dragInfo?.source.index === colIndex && cardIndex >= dragInfo.source.cardIndex;
                 const isFocused = focusedCard?.id === card.id;
                 const isTwinHighlight = focusedCard?.twinId === card.id;
                 return (
                  <div
                    key={card.id}
                    className={`absolute w-full transition-all duration-200 ${isSourceOfDrag ? 'opacity-0 pointer-events-none' : 'card-hover-effect'} ${isFocused ? 'twin-reveal' : ''} ${isTwinHighlight ? 'twin-highlight' : ''}`}
                    style={{ top: `${cardIndex * (window.innerWidth < 640 ? 1.8 : 3.2)}rem`, zIndex: isFocused ? 9999 : cardIndex }}
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

      {/* Floating Drag Representation */}
      {dragInfo && (
        <div className="fixed pointer-events-none z-[100] flex flex-col no-transition will-change-drag shadow-2xl"
          style={{ left: 0, top: 0, transform: `translate3d(${dragInfo.x}px, ${dragInfo.y}px, 0) translate(-50%, -15%) rotate(1deg)`, width: 'min(calc((100vw - 12rem) / 8), 8rem)' }}>
          {dragInfo.cards.map((card, i) => (
            <div key={card.id} style={{ marginTop: i === 0 ? 0 : '-75%' }}><Card card={card} isDragging /></div>
          ))}
        </div>
      )}

      {/* Overlays */}
      {win && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center">
          <div className="bg-white text-slate-900 p-8 rounded-2xl shadow-2xl text-center max-w-sm mx-4 animate-pop">
            <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4"><Trophy size={40} /></div>
            <h2 className="text-3xl font-bold mb-2">Victory!</h2>
            <p className="text-slate-500 mb-6 font-mono font-bold text-xl flex items-center justify-center gap-2"><Clock size={18} /> {formatTime(time)}</p>
            <button onClick={startNewGame} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg transition-all active:scale-95">Play Again</button>
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
    </div>
  );
}

function Card({ card, isDragging, isStatic }) {
  return (
    <div className={`w-full aspect-[2.5/3.6] bg-white rounded-[4px] select-none overflow-hidden relative ${isStatic ? '' : 'card-shadow'} ${isDragging ? 'scale-[1.05] ring-4 ring-yellow-400/30' : 'border border-slate-300'}`}>
      <div className={`absolute top-0.5 left-1 sm:top-1 sm:left-1.5 text-xs sm:text-lg font-bold flex flex-col items-center leading-none ${SUIT_COLORS[card.suit]}`}>
        <span>{card.rank}</span><span className="text-[10px] sm:text-base -mt-0.5">{SUIT_ICONS[card.suit]}</span>
      </div>
      <div className={`absolute inset-0 flex items-center justify-center text-4xl sm:text-6xl ${SUIT_COLORS[card.suit]} opacity-90`}>{SUIT_ICONS[card.suit]}</div>
      <div className={`absolute bottom-0.5 right-1 sm:bottom-1 sm:right-1.5 text-xs sm:text-lg font-bold flex flex-col items-center leading-none rotate-180 ${SUIT_COLORS[card.suit]}`}>
        <span>{card.rank}</span><span className="text-[10px] sm:text-base -mt-0.5">{SUIT_ICONS[card.suit]}</span>
      </div>
      {/* Subtle card texture */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/[0.02] to-transparent pointer-events-none" />
    </div>
  );
}
