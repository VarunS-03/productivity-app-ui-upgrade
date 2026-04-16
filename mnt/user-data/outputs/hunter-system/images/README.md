# IMAGES — Manhwa Artwork Placement Guide

## ⚠️ COPYRIGHT NOTICE

All Solo Leveling artwork belongs to the original creators:
- **Story:** Chugong
- **Art:** DUBU (Redice Studio)  
- **Publisher (KR):** D&C Webtoon Biz / KakaoPage
- **Publisher (EN):** Ize Press (Yen Press)
- **Anime adaptation:** A-1 Pictures / Crunchyroll

Images placed here are for **personal fan display only**.
Do NOT redistribute this app with copyrighted images included.
Do NOT use this commercially.
This project does not claim ownership of any Solo Leveling artwork.

---

## Image Slot Reference

Place your images in this folder with the exact filenames listed below.

### `hq-hero.jpg`
- **Location:** HQ tab — top banner
- **Dimensions:** 1200 × 260px (or wider, will crop to fill)
- **Suggested scene:** Sung Jin-woo in full black armor / post-Monarch transformation with shadow soldiers rising behind him. Chapters 170+ or any full-spread awakening scene.
- **Search terms:** "Solo Leveling Sung Jin-woo Shadow Monarch full spread" / "Solo Leveling arise panel"

---

### `quest-board.jpg`
- **Location:** Quests tab — top banner
- **Dimensions:** 1200 × 160px
- **Suggested scene:** The System window pop-up from early chapters (blue notification screen), or the Daily Quest notification panels from Chapter 1–5.
- **Search terms:** "Solo Leveling system window quest" / "Solo Leveling daily quest notification panel"

---

### `dungeon-gate.jpg`
- **Location:** Dungeon tab — top banner
- **Dimensions:** 1200 × 200px
- **Suggested scene:** The Red Gate exterior / Double Dungeon entrance portal. Blue/black swirling gate in darkness. Chapters 10–15 or any gate exterior scene.
- **Search terms:** "Solo Leveling Red Gate" / "Solo Leveling double dungeon portal"

---

### `dungeon-bg.jpg`
- **Location:** Forest Dungeon card — background behind gate animation
- **Dimensions:** 1200 × 180px (fills container)
- **Suggested scene:** Dark dungeon interior / stone corridor / dungeon atmosphere. Anything dark, moody, with some ambient lighting.
- **Search terms:** "Solo Leveling dungeon interior" / "Solo Leveling double dungeon inside"

---

### `dungeon-boss.jpg`
- **Location:** Boss section inside Forest Dungeon
- **Dimensions:** 400 × 300px (portrait)
- **Suggested scene:** Igris / Baruka / any S-rank boss silhouette. Dark figures, red eyes. Or the Knight Commander from early chapters.
- **Search terms:** "Solo Leveling Igris knight" / "Solo Leveling boss monster"

---

### `arsenal-bg.jpg`
- **Location:** Arsenal tab — top banner
- **Dimensions:** 1200 × 160px
- **Suggested scene:** Equipment screen / inventory window / Demon King armor reveal. Or the scene where Jin-woo receives the Orb of Avarice.
- **Search terms:** "Solo Leveling equipment" / "Solo Leveling Demon King armor" / "Solo Leveling item acquisition"

---

### `item-sword.jpg`
- **Location:** Arsenal tab — Shadow Blade item card image
- **Dimensions:** 220 × 120px
- **Suggested scene:** Demon King's Longsword / Kamish's Wrath / any dark blade weapon art.
- **Search terms:** "Solo Leveling Demon King sword" / "Solo Leveling Kamish's Wrath"

---

### `item-armor.jpg`
- **Location:** Arsenal tab — Monarch Armor item card image
- **Dimensions:** 220 × 120px
- **Suggested scene:** Black shadow armor / Jin-woo's full dark equipment set / Monarch regalia.
- **Search terms:** "Solo Leveling Shadow Monarch armor" / "Solo Leveling black armor"

---

### `silhouette.png`
- **Location:** Fixed background right side — ambient decoration (opacity 8%)
- **Dimensions:** 420 × 520px (portrait, PNG with transparency preferred)
- **Suggested scene:** Jin-woo silhouette / shadow form / standing pose. PNG transparency works best here as the element uses very low opacity.
- **Search terms:** "Solo Leveling Jin-woo silhouette" / "Solo Leveling standing pose"

---

## Where To Find Images

Good sources for manhwa panels:
- **MangaDex** — original scan quality panels
- **Naver Webtoon** (KR original) — highest quality official art  
- **Ize Press** website — official EN release panels
- **Solo Leveling Wiki** (soloLeveling.fandom.com) — scene art and stills
- **ArtStation** — fan art (clearly labeled, no copyright issues)

---

## How Images Are Applied In The App

Every image slot uses this HTML pattern:
```html
<div class="manhwa-frame-img"
     style="background-image: url('images/FILENAME.jpg');"
     role="img" aria-label="Description">
</div>
```

Images are displayed with:
- `opacity: 0.40` (40% — enough to see, not overwhelming UI)
- `mix-blend-mode: luminosity` (desaturates to match the dark palette)
- Scanline texture overlay
- Purple border glow on hover

If an image is not placed, the frame shows a placeholder label.
The app functions 100% without any images placed.

---

## Expected Final Image Directory

```
images/
├── hq-hero.jpg           (~200KB recommended, JPEG 85% quality)
├── quest-board.jpg       (~100KB)
├── dungeon-gate.jpg      (~150KB)
├── dungeon-bg.jpg        (~120KB)
├── dungeon-boss.jpg      (~80KB)
├── arsenal-bg.jpg        (~100KB)
├── item-sword.jpg        (~40KB)
├── item-armor.jpg        (~40KB)
├── silhouette.png        (~100KB)
└── README.md             (this file)
```

Total images: ~930KB before APK compression (~600KB after)

---

*All rights to Solo Leveling artwork belong to Chugong, DUBU, and their respective publishers.*
*This fan project is not affiliated with or endorsed by any rights holders.*
