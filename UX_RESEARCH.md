# UX RESEARCH & ADDICTION ENGINEERING

## Visual Inspirations (CodePen-Style)
- **Glassmorphism + Neon:** Deep violet/black bases (`rgba(5, 0, 15, 0.6)`) heavily blurred (`16px`) over dynamic Unsplash imagery.
- **AAA Game HUDs:** Hard, sharp transitions (`translateY(-30px) scale(0.98)`).
- **Spatial UI:** Full-bleed backgrounds with centered, responsive focal columns. The user is in a "System Hub", not looking at a web dashboard.

## Psychological Hooks Applied
1. **Dopamine Prediction Error (Anticipation Engine):** 
   - A deliberate 300ms–450ms visual tension delay (vibration + glow) before revealing quest rewards maximizes dopamine spiking prior to the actual number increment.
2. **Variable Reward Schedule (Slot Machine Effect):**
   - 25% Critical Hit chance. The unpredictable `x2` multiplier drives continuous interaction.
   - 2-5% Rare Events ("SHADOW SURGE", "SYSTEM OVERRIDE").
3. **Zeigarnik Effect (Near-Miss Framing):**
   - When a user is ≤ 30 XP from a level-up, the HQ subtext violently changes to neon green: `ONLY [X] XP AWAY FROM LEVEL UP`. This prevents them from closing the app until the loop is closed.
4. **Momentum (Combo System):**
   - Rapidly completing tasks applies a decaying multiplier. The fear of losing the multiplier creates urgency.

## What Worked vs Failed
- **Failed:** Trusting CSS transitions for critical navigation (`switchTab`). The browser dropped frames during heavy particle physics, breaking the user flow.
- **Worked:** Aggressive JS inline DOM mutation for navigation. Enforcing `display: block` directly guarantees the transition fires.
- **Worked:** Shifting the UI tone from passive ("Start your day") to commanding ("SYSTEM OFFLINE: INITIATE DAILY LOGIN"). It aligns perfectly with the Solo Leveling power fantasy.