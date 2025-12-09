# Style System Documentation

## How Dev Pages Work with Production

✅ **CSS Changes Automatically Apply**: All dev pages use the same CSS class names as production components, so any CSS changes you make will automatically apply to both.

### Example:
- Change `.server-announcement-title` font-size in `styles/v3-server-announcement.css`
- This will update both `/dev/server-announcement` AND the actual `ServerAnnouncement` component

### Why This Works:
1. All styles are imported via `app/globals.css`
2. Dev pages use the same CSS class names (e.g., `server-announcement-title`, `stats-content`, `stat-card`)
3. CSS is global and shared across all pages

## Current Style Structure

```
styles/
├── variables.css          # CSS variables (design tokens)
├── animations.css         # Shared animations
├── layouts.css            # Shared layout patterns
├── court.css              # Court background styles
├── v3-setup.css           # Setup screen styles
├── v3-game.css            # Game scoreboard styles
├── v3-server-announcement.css  # Server announcement styles
├── v3-side-swap.css       # Side swap styles
├── v3-set-win.css         # Set win styles
├── v3-match-win.css       # Match win & analytics styles
└── v3-screensaver.css     # Screensaver styles
```

### CSS Variables (variables.css)
- Colors: `--color-primary`, `--color-team-1`, `--color-bg-primary`, etc.
- Spacing: `--spacing-xs` through `--spacing-xl`
- Font sizes: `--font-size-small` through `--font-size-massive`
- Transitions, shadows, z-index, etc.

## Recommendations

### ✅ Current Structure is Good
- CSS variables are centralized
- Component-specific styles are separated
- Shared utilities are in common files

### 💡 Potential Improvements

1. **More Font Size Variables**: Some hardcoded font sizes could use variables
   - `stat-value`: `12vw` → could be `var(--font-size-stat-value)`
   - `match-win-set-score`: `10vw` → could be `var(--font-size-set-score)`

2. **Consider Component-Scoped CSS**: For better isolation, but current global approach works well for this use case

3. **CSS Variable Naming**: Current naming is clear and consistent

## How to Make Changes

### To Change Text Size:
1. Edit the CSS file (e.g., `styles/v3-server-announcement.css`)
2. Change the `font-size` property for the relevant class
3. Changes apply to both dev pages and production automatically

### To Change Colors:
1. Edit `styles/variables.css`
2. Update the CSS variable (e.g., `--color-primary`)
3. All components using that variable will update

### To Change Layout:
1. Edit `styles/layouts.css` for shared layouts
2. Edit component-specific CSS files for component layouts

