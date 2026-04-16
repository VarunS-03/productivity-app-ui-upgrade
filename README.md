# HUNTER SYSTEM — v5.0
### Solo Leveling RPG Quest Tracker

---

## Project Structure

```
hunter-system/
├── index.html              Main app HTML — clean structure, no inline JS/CSS
├── capacitor.config.json   APK build configuration
├── css/
│   ├── base.css            CSS variables, reset, typography, fonts
│   ├── layout.css          Header, tabs, pages, status window, responsive
│   └── components.css      Buttons, modals, quests, dungeon, cursor, animations
├── js/
│   ├── state.js            localStorage, save/load/reset, export/import
│   ├── engine.js           Quest logic, XP, gold, levels, dungeon, shop, achievements
│   ├── ui.js               All DOM rendering — owns every getElementById call
│   └── main.js             Init, canvas, cursor, ripple, tab nav, event delegation
├── fonts/
│   └── README.md           Font download instructions (woff2 local setup)
└── images/
    └── README.md           Image slot guide + copyright notice
```

---

## Quick Start

### Browser (development)

1. Clone or unzip the project
2. Open `index.html` in Chrome/Firefox
3. Done — no build step required

> **Note:** Must be served via a local server for full features.
> Use VS Code Live Server, or run: `npx serve .`

### Local server (one-liner)
```bash
npx serve .
# or
python3 -m http.server 3000
```

---

## Single-User System

This app is designed for **one hunter per device**.

- On first launch: shows "First Contact" modal — enter hunter name once
- Name is stored permanently — never shown again
- No login/logout system — opens directly to your hunter's state
- Profile persists across sessions via `localStorage` key: `rpg_hunter_v5`

### Resetting Your Profile

Located in: **HQ tab → Data Management → ⚠ RESET PROFILE**

Reset comes with a penalty:
| Reset Count | XP Lost | Gold Lost | Level | Items |
|-------------|---------|-----------|-------|-------|
| 1st reset   | 50%     | 50%       | Reset | Gone  |
| 2nd+ reset  | 75%     | 100%      | Reset | Gone  |

- **24-hour cooldown** between resets
- Streak is always lost
- You may optionally rename your hunter on reset

---

## Manhwa Images

Place Solo Leveling panel images in the `/images/` folder.
See `images/README.md` for exact filenames and scene recommendations.

**All artwork © Chugong / DUBU (Redice Studio) · Ize Press**
Fan display only — personal use only — do not distribute commercially.

---

## Local Fonts (Required for APK)

See `fonts/README.md` for step-by-step download instructions.
For web/development, Google CDN fonts are used automatically.

---

## APK Build Guide (Capacitor)

### Prerequisites
```bash
node --version   # Must be 16+
npx cap --version
```

### Install Capacitor
```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "SHADOW CORE" "com.shadowcore.huntersystem" --web-dir .
```

### Add Android platform
```bash
npx cap add android
```

### Copy web files to native
```bash
npx cap copy android
```

### Open in Android Studio
```bash
npx cap open android
```

### Build APK in Android Studio
```
Build → Generate Signed Bundle / APK
→ APK
→ Create new keystore (first time) or use existing
→ Release build
→ Finish
```

APK output location: `android/app/build/outputs/apk/release/`

---

## APK Performance Notes

All major performance fixes are already applied:
- ❌ No `backdrop-filter: blur()` anywhere (biggest APK killer)
- ❌ No `background-attachment: fixed` (broken on Android WebView)
- ✅ Canvas throttled to 30fps (was 60fps)
- ✅ Particle count reduced 70 → 30
- ✅ Decorative animations disabled on mobile via media query
- ✅ `contain: layout style paint` on all card elements
- ✅ No external network requests at runtime (after local font setup)
- ✅ `will-change` only on actively animating elements
- ✅ Single event listener via delegation (no per-element listeners)

### Expected APK metrics
| File | Size |
|------|------|
| index.html | ~34KB |
| css/base.css | ~8KB |
| css/layout.css | ~21KB |
| css/components.css | ~42KB |
| js/state.js | ~8KB |
| js/engine.js | ~19KB |
| js/ui.js | ~27KB |
| js/main.js | ~19KB |
| fonts (woff2) | ~153KB |
| **Total (no images)** | **~331KB** |
| **Total (with images)** | **~1.3MB** |
| **APK compressed** | **~600KB–1MB** |

---

## Game Mechanics Reference

### XP & Levelling
| Level | XP Required |
|-------|------------|
| 1     | 0 XP       |
| 2     | 100 XP     |
| 3     | 250 XP     |
| 4     | 450 XP     |
| 5     | 700 XP     |

### Rank System
| Rank | XP Required | Gold Required |
|------|------------|---------------|
| K    | 0          | 0             |
| M    | 500        | 50            |
| A    | 1000       | 100           |

### Quest Tier Rewards
| Tier | XP    | Gold  | Crit (x2) |
|------|-------|-------|-----------|
| E    | 8 XP  | 3 G   | 15% chance|
| N    | 12 XP | 6 G   | 15% chance|
| H    | 20 XP | 12 G  | 15% chance|
| S    | 35 XP | 20 G  | 15% chance|

### EOD Penalty
- -0.5% XP/Gold per failed quest at end of day
- Dungeon chain advances +1 day on EOD
- Streak carries over if logged in that day

### Bonus Gates
Triggered at XP milestones: 50, 100, 200, 350, 500, 750, 1000
Rewards from random pool: +XP, +Gold, +Streak Day

### Dungeon — Forest Dungeon
- **Unlock:** Level 5 + Rank M or above
- **Chain:** 3-day quest chain
- **Boss:** Forest Guardian (S-Rank)
- **Trigger:** Enter on dungeon tab

---

## Adding More Dungeon Zones

To add a new dungeon, copy the `#forest-dungeon` block in `index.html`
and add unlock logic in `engine.js → updateDungeonStatus()`.

---

## Feature Summary

| Feature | Status |
|---------|--------|
| Single-user persistent profile | ✅ |
| Daily login + streak | ✅ |
| Quest add/complete/fail | ✅ |
| Tier system (E/N/H/S) | ✅ |
| Critical hit (15% chance) | ✅ |
| XP + Gold + Level + Rank | ✅ |
| End of Day penalty | ✅ |
| Bonus Gate system | ✅ |
| Forest Dungeon chain | ✅ |
| Shop / Arsenal (3 items) | ✅ |
| Achievements (10 + 2 hidden) | ✅ |
| Skill tree (5 nodes) | ✅ |
| Export / Import JSON | ✅ |
| Reset with escalating penalty | ✅ |
| 24h reset cooldown | ✅ |
| Power Level composite bar | ✅ |
| Shadow Army counter | ✅ |
| EOD countdown timer | ✅ |
| Streak danger state | ✅ |
| Diamond cursor + trail | ✅ |
| Tap ripple (mobile) | ✅ |
| Canvas magic circle (30fps) | ✅ |
| Rank-up dramatic event | ✅ |
| XP float particles | ✅ |
| Number count-up animation | ✅ |
| Manhwa image slots (9 slots) | ✅ |
| Awakening intro overlay | ✅ |
| Tab wipe transitions | ✅ |
| 3D card tilt (Arsenal) | ✅ |
| Parallax depth layer | ✅ |

---

## Browser / WebView Compatibility

| Platform | Support |
|----------|---------|
| Chrome 80+ | ✅ Full |
| Firefox 78+ | ✅ Full |
| Safari 14+ | ✅ Full |
| Android WebView 60+ | ✅ Full |
| iOS Safari 14+ | ✅ Full |
| Samsung Internet 12+ | ✅ Full |

---

## Known Limitations

- `localStorage` is cleared if user clears browser data — **use Export Save regularly**
- Multi-tab usage shows a warning toast (last save wins)
- Canvas animation is disabled automatically on `prefers-reduced-motion` systems
- Cursor effects only appear on desktop (hidden on touch devices by CSS media query)

---

*Hunter System v5.0 · Built for performance · Designed for the shadow realm*
