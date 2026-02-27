# Casual Freecell Solitaire - Engineering Requirements

This document outlines the core requirements and constraints for the Casual Freecell Solitaire project. All future modifications must adhere to these guidelines.

## 1. Responsive Layout Architecture
The application must maintain a polished UI across three primary resolution tiers:
- **Mobile (<= 640px)**:
    - Mobile Portrait: Use "Perfect Layout" with integrated gold-accented header (No bottom HUD).
    - Mobile Landscape: Maintain bottom-anchored HUD for primary actions (Undo, New Game, Menu).
- **Desktop (641px - 2000px)**:
    - Centered game board with a maximum width of 1400px for optimal focus.
- **Ultrawide (>= 2000px)**:
    - Triple-panel layout utilizing the full width.
    - Left sidebar: Local Hall of Fame (Win History).
    - Right sidebar: Recent Activity/Personal Stats.
    - Game board scaled for larger viewports.

## 2. Visual Theme & Identity
- **Primary Color**: Background must use `#008f83` (Emerald Teal).
- **Texture**: Apply a felt texture overlay to simulate a card table environment.
- **Card Styling**:
    - Red suits (Hearts, Diamonds) must use `rose-500`.
    - Black suits (Spades, Clubs) must use `emerald-950`.
    - Use Lucide React icons for suits.
- **Effects**: Use `backdrop-blur-2xl` for overlays and sidebars, and `rose-200/50` for subtle borders.

## 3. Core Mechanics & Logic
- **Dynamic Stacking**: Use the `getCardOffset` logic to adjust tableau spacing dynamically based on viewport height and card count to prevent vertical overflow.
- **Twin Highlight**: When a card is focused/selected, its "twin" (same rank, matching suit color) should be visually highlighted to assist gameplay.
- **Offline Persistence**: All statistics, win counts, and game history MUST be stored locally via `localStorage`. Do not implement server-side leaderboards or social features.

## 4. Performance & Quality
- Maintain zero ESLint warnings/errors.
- Ensure all transitions are smooth (use `transition-all` and `duration-200/500`).
- Performance: Use `useCallback` and `useMemo` for heavy board calculations to ensure 60fps interaction during drags.

## Documentation
- Refer to [docs/style-guide.md](docs/style-guide.md) for detailed design decisions, color palettes, and responsive layout requirements.
