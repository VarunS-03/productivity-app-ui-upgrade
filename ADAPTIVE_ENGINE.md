# ADAPTIVE ENGINE

## 1. PERSONALIZATION LOGIC
The Adaptive Engine silently monitors behavioral inputs during a session to deduce the user's current cognitive state.
- **Session Intensity**: Evaluated by the density of actions taken per minute, combined with `peakCombo` (the maximum multiplier reached during the session).
- **Consistency Score**: Evaluated by `consecutiveRapidCompletions` and the `timeBetweenQuests` array. If the average duration between the last 5 quests drops below 30s, the system recognizes a "Flow State" or "High Performance" run.
- **Task Overload Detection**: Tracks `tasksAddedThisSession` versus `questsCompletedThisSession`. If the ratio skews heavily toward addition (>4) while completions remain at 0, the system recognizes a burnout risk or cognitive overload.

## 2. REAL-TIME ADAPTATION RULES
- **Rule 1: The Idle Nudge**
  - *Trigger*: 60 seconds of inactivity without a click or keypress.
  - *Reaction*: If quests are active, nudges the user to maintain momentum. If no quests are active, nudges the user to add a quest.
- **Rule 2: Momentum Burn (Flow State)**
  - *Trigger*: 2 quests completed within 30 seconds of each other.
  - *Reaction*: Triggers the "Momentum Burn" visual effect and a 15-second 2.0x XP multiplier.
- **Rule 3: Pace Dropping (Friction Reduction)**
  - *Trigger*: More than 5 minutes between quest completions.
  - *Reaction*: The system automatically scans the quest board for the lowest-tier (E-Tier) quest and applies a 5-second glowing `var(--primary)` border to highlight the path of least resistance.
- **Rule 4: Task Splitting (Overload Prevention)**
  - *Trigger*: 4+ tasks added rapidly with 0 completions.
  - *Reaction*: Suggests breaking down large tasks into smaller, manageable E-tier objectives.

## 3. REWARD TUNING SYSTEMS (Invisible Difficulty Scaling)
The system adjusts probabilities on the fly based on the user's `systemMode` and `timeBetweenQuests`.

- **Base Values**: 25% Critical Hit Chance, 1.0x XP Multiplier.
- **Pressure Mode (High Performance)**:
  - *Logic*: The user is crushing it. To prevent the economy from inflating too fast and to keep the challenge real, the system slightly nerfs the RNG while boosting the deterministic reward.
  - *Effect*: Crit Chance `-5%` (20%), XP Multiplier `1.2x`.
- **Recovery Mode (Struggling/Overloaded)**:
  - *Logic*: The user is stuck or overwhelmed. The system acts as a safety net, increasing the chance of a "lucky break" to spike dopamine and restore morale.
  - *Effect*: Crit Chance `+15%` (40%), XP Multiplier `1.1x`.
- **Neutral Mode (Micro-adjustments)**:
  - If average completion time < 30s: Crit Chance `-2%` (23%).
  - If average completion time > 5m: Crit Chance `+5%` (30%).

## 4. SYSTEM IDENTITY & PERSONALITY LAYER
The UI shifts its visual tone and copy depending on the evaluated mode.

- **Neutral System (Default)**:
  - *Color*: `var(--primary)` (#66ff00)
  - *Glow*: `rgba(102, 255, 0, 0.3)`
  - *Tone*: Objective, concise.
- **Pressure System**:
  - *Trigger*: 3+ rapid completions or a peak combo >= 3.
  - *Color*: Aggressive Red (`#ff3366`)
  - *Glow*: `rgba(255, 51, 102, 0.4)`
  - *Tone*: Urgent, demanding. Example: *"[URGENT] MOMENTUM BURN ACTIVE! DO NOT STALL."*
- **Recovery System**:
  - *Trigger*: Task Overload (4+ added, 0 completed).
  - *Color*: Soothing Cyan (`#00e6e6`)
  - *Glow*: `rgba(0, 230, 230, 0.4)`
  - *Tone*: Supportive, guiding. Example: *"[Support] High task volume detected. Take it one step at a time."*

## 5. BURNOUT PREVENTION & SAFETY CONSTRAINTS
- **Max Nudges Per Session**: Capped at 5 to prevent the OS from becoming "Clippy."
- **Nudge Cooldown**: A hard 2-minute (120,000ms) cooldown between any proactive system interventions.
- **Silent Mode**: If `_canNudge()` returns false, the system remains entirely silent, allowing the user to work without interruption, regardless of idle time or task pacing.