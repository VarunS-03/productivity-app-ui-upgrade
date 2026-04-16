# PERSISTENT BUG TRACKER

## ACTIVE ISSUES

*(No active critical bugs currently tracked. Navigation issues have been stabilized in v6.1.0).*

---

## RESOLVED ISSUES (Do Not Re-introduce)

**[RESOLVED] Navigation Failure: Daily Login -> Quests (`switchTab`)**
- **Description:** Clicking "Daily Login" triggered rewards but failed to actually swap the visible UI to the Quests tab, leaving users staring at the HQ screen.
- **Root Cause:** The `switchTab()` function was successfully adding the `.active` class, but the CSS relied on `visibility: hidden` and delayed transitions. Under heavy JS load (particle physics from the login reward), the browser dropped the paint frame, leaving the Quests tab hidden.
- **Escalation Path Taken:**
  1. *First Fix (Failed):* Changed CSS transition delays.
  2. *Second Fix (Failed):* Added 800ms `setTimeout` to the `switchTab` call.
  3. *Final Architectural Fix (Successful):* Ripped out CSS `visibility` trust. Implemented explicit inline DOM mutations (`next.style.display = 'block'; next.style.opacity = '1';`) combined with a 500ms `window.getComputedStyle()` fallback check inside `dailyLogin()`.

**[RESOLVED] Memory Leak on Reduced Motion**
- **Description:** Devices with `prefers-reduced-motion: reduce` were still executing intense particle physics calculations, draining battery, even though CSS hid the particles.
- **Root Cause:** The JS `_updateParticles()` loop was un-aware of the CSS media query.
- **Fix:** Added `window.matchMedia` check directly inside the JS `_tick()` loop to bypass physics updates entirely.

**[RESOLVED] Save Corruption on Storage Full**
- **Description:** `localStorage.setItem` quota errors were silently caught, resulting in permanent data loss for users with massive quest logs.
- **Fix:** `saveProfile()` now catches `QuotaExceededError`, aggressively truncates `xpHistory` (to 50 items) and clears completed quests, then performs an emergency secondary save to preserve core level/gold state.