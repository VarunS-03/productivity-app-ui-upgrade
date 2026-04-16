# SYSTEM BLUEPRINT

## 1. CORE MECHANICS
The system operates on a deterministic RPG progression loop tied to productivity tasks:
- **Quests (Tasks)**: Classified by tiers (E, N, H, S).
  - E-Tier: 8 XP, 3 Gold
  - N-Tier: 12 XP, 6 Gold
  - H-Tier: 20 XP, 12 Gold
  - S-Tier: 35 XP, 20 Gold
- **Progression**:
  - Levels: Thresholds at 0 (L1), 100 (L2), 250 (L3), 450 (L4), 700 (L5).
  - Ranks: Progression flows K -> M -> A -> S.
- **Critical Hits**: Base 25% chance on quest completion to yield 2x XP and Gold, enhanced by Dopamine Prediction Error (Anticipation delays of 150-800ms before reward resolution).
- **Daily Login & Streaks**: Initiates the session, grants scaling XP bonuses based on streak multiplier (up to 2.0x), and protects against End-Of-Day failure penalties.
- **End of Day Penalty**: Missing quests deducts 0.5% XP/Gold per failed quest.

## 2. ACTIVE SYSTEMS
- **Forest Dungeon**: A 3-day high-pressure raid zone unlocked at Level 5 + Rank M. Progressing through it grants advanced titles.
- **Arsenal (Shop)**:
  - Sword (+1): 50 Gold
  - Armor (+1): 75 Gold
  - Streak Shield: 30 Gold (Auto-activates to protect a broken streak once).
- **Bonus Gates**: Milestone-based rewards triggered at XP intervals (50, 100, 200, 350, 500, 750, 1000). Rewards include +20 XP, +15 Gold, +1 Streak Day, etc.
- **Skill Tree**: Sequential unlocks based on Level (Swift, Strike, Guard, Mana, Shadow).
- **Achievements & Titles**: Permanent profile badges for milestones (e.g., 10 quests, 7-day streak, Rank M).
- **Momentum & Combo Engine**: Visual tracking of rapid successive actions that applies up to a 2.0x multiplier on XP/Gold if actions are chained before the 8000ms decay timer expires.

## 3. REMOVED SYSTEMS (And Why)
- **Shadow Extraction (Gacha)**:
  - *Concept*: Spending Gold to roll for Shadow Summons.
  - *Removal Reason*: Toxic RNG mechanics misalign with a productivity app. It creates frustration when real-world effort results in bad RNG rolls, leading to burnout. Replaced by deterministic scaling.
- **Real-Time Ticking Combo Timers (Visible Countdown)**:
  - *Concept*: A visible ticking clock showing combo expiration.
  - *Removal Reason*: Induced unnecessary anxiety. Productivity requires focus; a ticking clock breaks flow state. The combo system was shifted to a "soft decay" background momentum bar.
- **Infinite Abyss Scaling (Uncapped Difficulty)**:
  - *Concept*: Enemies/tasks getting infinitely harder to complete.
  - *Removal Reason*: Productivity tasks cannot scale infinitely in difficulty without breaking reality. Replaced with *Invisible Adaptive Difficulty* (adjusting rewards rather than task effort).

## 4. REINTRODUCED / REFINED SYSTEMS
- **Momentum Burn (Active buff)**: Replaced strict combo timers. Triggered by completing 2 tasks within 30 seconds. Grants a 15-second double XP window, emphasizing positive reinforcement over penalty.
- **Shadow Synthesis**: Replaced Gacha. A deterministic, skill-based progression system where user effort directly correlates to power.

## 5. SYSTEM PHILOSOPHY
### Optimization Goal
The system optimizes for the **"Flow State"** (the balance between engagement and burnout). It uses variable rewards (Crits) to spike dopamine, but relies on deterministic progression (XP/Levels) to ensure long-term trust.

### Avoidances
- **Overcomplexity**: No deep inventory management or spreadsheet crafting. One click = one action.
- **Unfair RNG**: RNG only exists as a *bonus* (Critical Hits, Bonus Gates). Base effort is always rewarded 100%. No "misses" or "dodges."
- **Burnout**: The system actively prevents burnout by detecting rapid task addition without completion and advising the user to step back or split tasks.

### Core Design Principles
1. **Dopamine Prediction Error**: UI vibrates and delays for 300-800ms *before* revealing if a task completion was a Critical Hit, maximizing dopamine release.
2. **Living UI (System Identity)**: The application is not a dashboard; it is an active "System" (Solo Leveling inspired) that speaks to the user in a direct, authoritative, and occasionally supportive tone.
3. **Fluid Spatial Depth**: Heavy use of glassmorphism, z-index layering, and CSS grid to make the interface feel like a AAA spatial OS rather than a flat web app.