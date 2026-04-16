/* ═══════════════════════════════════════════════════════════════
   IMAGES.JS — Drag & Drop Image System
   Hunter System v5.0

   How it works:
   - Every .img-drop-zone has a data-slot="key" attribute
   - Drop any image file onto a slot
   - Image is read as base64 and stored in localStorage
   - Loaded automatically on every app start
   - No file paths, no folders, no linking required
   - Works offline and in APK

   Storage keys: rpg_img_<slot-name>  (separate from game save)
   Max image size: 2MB per slot (auto-rejected if larger)
═══════════════════════════════════════════════════════════════ */

'use strict';

const IMG_KEY_PREFIX = 'rpg_img_';
const IMG_MAX_BYTES  = 2 * 1024 * 1024; // 2MB per slot

/* ── All defined slots and their img element IDs ─────────── */
const IMAGE_SLOTS = {
  'hq-hero':      'img-hq-hero',
  'quest-board':  'img-quest-board',
  'dungeon-gate': 'img-dungeon-gate',
  'dungeon-bg':   'img-dungeon-bg',
  'dungeon-boss': 'img-dungeon-boss',
  'arsenal-bg':   'img-arsenal-bg',
  'item-sword':   'img-item-sword',
  'item-armor':   'img-item-armor',
  'item-shield':  'img-item-shield',
};

/* ── Save image to localStorage ──────────────────────────── */
function saveImage(slot, dataUrl) {
  try {
    localStorage.setItem(IMG_KEY_PREFIX + slot, dataUrl);
    return true;
  } catch(e) {
    // Storage quota exceeded — common with many large images
    ui.showToast('⚠ Image too large for storage. Try a smaller file.', 'error');
    return false;
  }
}

/* ── Load single image from localStorage ─────────────────── */
function loadImage(slot) {
  try {
    return localStorage.getItem(IMG_KEY_PREFIX + slot);
  } catch(e) { return null; }
}

/* ── Clear single image ───────────────────────────────────── */
function clearImage(slot) {
  try { localStorage.removeItem(IMG_KEY_PREFIX + slot); } catch(e) {}
}

/* ── Apply image to a slot element ───────────────────────── */
function applyImageToSlot(slot, dataUrl) {
  const imgEl  = document.getElementById(IMAGE_SLOTS[slot]);
  const zoneEl = document.querySelector('[data-slot="' + slot + '"]');
  const clearBtn = zoneEl ? zoneEl.querySelector('.drop-clear-btn') : null;

  if (imgEl) imgEl.style.backgroundImage = 'url(' + dataUrl + ')';
  if (zoneEl) zoneEl.classList.add('has-image');
  if (clearBtn) clearBtn.style.display = 'block';
}

/* ── Remove image from a slot element ────────────────────── */
function removeImageFromSlot(slot) {
  const imgEl   = document.getElementById(IMAGE_SLOTS[slot]);
  const zoneEl  = document.querySelector('[data-slot="' + slot + '"]');
  const clearBtn = zoneEl ? zoneEl.querySelector('.drop-clear-btn') : null;

  if (imgEl) imgEl.style.backgroundImage = '';
  if (zoneEl) zoneEl.classList.remove('has-image');
  if (clearBtn) clearBtn.style.display = 'none';
}

/* ── Load all saved images on startup ─────────────────────── */
function loadAllImages() {
  Object.keys(IMAGE_SLOTS).forEach(slot => {
    const saved = loadImage(slot);
    if (saved) applyImageToSlot(slot, saved);
  });
}

/* ── Process a dropped or pasted file ────────────────────── */
function processImageFile(file, slot) {
  if (!file || !file.type.startsWith('image/')) {
    ui.showToast('File must be an image (JPG, PNG, WEBP, GIF).', 'warn');
    return;
  }
  if (file.size > IMG_MAX_BYTES) {
    ui.showToast('Image exceeds 2MB limit. Resize it first.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    if (saveImage(slot, dataUrl)) {
      applyImageToSlot(slot, dataUrl);
      // Flash success
      const zone = document.querySelector('[data-slot="' + slot + '"]');
      if (zone) {
        zone.classList.add('drop-success');
        setTimeout(() => zone.classList.remove('drop-success'), 900);
      }
      ui.showToast('Image set for ' + slot + '.', 'success');
    }
  };
  reader.onerror = () => ui.showToast('Failed to read image file.', 'error');
  reader.readAsDataURL(file);
}

/* ── Init drag-and-drop on all zones ─────────────────────── */
function initImageDropZones() {

  document.querySelectorAll('.img-drop-zone').forEach(zone => {
    const slot = zone.dataset.slot;
    if (!slot || !IMAGE_SLOTS[slot]) return;

    /* ── Drag events ── */
    zone.addEventListener('dragenter', e => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', e => {
      // Only remove if leaving the zone itself (not a child)
      if (!zone.contains(e.relatedTarget)) {
        zone.classList.remove('drag-over');
      }
    });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) processImageFile(file, slot);
    });

    /* ── Click to browse (file picker fallback) ── */
    zone.addEventListener('click', e => {
      // Don't trigger if clicking the clear button
      if (e.target.closest('.drop-clear-btn')) return;
      // Only trigger picker if no image yet, or user explicitly wants to replace
      const input = document.createElement('input');
      input.type   = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.onchange = ev => {
        const file = ev.target.files && ev.target.files[0];
        if (file) processImageFile(file, slot);
        input.remove();
      };
      document.body.appendChild(input);
      input.click();
    });
  });

  /* ── Clear buttons ── */
  document.querySelectorAll('.drop-clear-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation(); // prevent zone click
      const slot = btn.dataset.clear;
      if (!slot) return;
      clearImage(slot);
      removeImageFromSlot(slot);
      ui.showToast(slot + ' image removed.', 'info');
    });
  });

  /* ── Global paste support (Ctrl+V / Cmd+V anywhere) ── */
  document.addEventListener('paste', e => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (!file) continue;
        // Paste goes to whichever slot is currently visible/in-viewport
        const visibleSlot = getVisibleSlot();
        if (visibleSlot) {
          processImageFile(file, visibleSlot);
          e.preventDefault();
        }
        break;
      }
    }
  });
}

/* ── Find the first drop zone visible in current viewport ─ */
function getVisibleSlot() {
  const zones = document.querySelectorAll('.img-drop-zone');
  for (let i = 0; i < zones.length; i++) {
    const r = zones[i].getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) {
      return zones[i].dataset.slot;
    }
  }
  return null;
}

/* ── Clear ALL images (used in profile reset) ─────────────── */
function clearAllImages() {
  Object.keys(IMAGE_SLOTS).forEach(slot => {
    clearImage(slot);
    removeImageFromSlot(slot);
  });
}

/* ── Export images as part of full backup ─────────────────── */
function exportImageBundle() {
  const bundle = {};
  Object.keys(IMAGE_SLOTS).forEach(slot => {
    const saved = loadImage(slot);
    if (saved) bundle[slot] = saved;
  });
  return bundle;
}

/* ── Import images from backup bundle ────────────────────── */
function importImageBundle(bundle) {
  if (!bundle || typeof bundle !== 'object') return;
  Object.keys(bundle).forEach(slot => {
    if (IMAGE_SLOTS[slot] && bundle[slot]) {
      saveImage(slot, bundle[slot]);
      applyImageToSlot(slot, bundle[slot]);
    }
  });
}
