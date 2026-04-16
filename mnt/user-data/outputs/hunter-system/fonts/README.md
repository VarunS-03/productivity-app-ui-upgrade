# FONTS — Local Setup Guide

Place your `.woff2` font files in this directory.
Then uncomment the `@font-face` blocks in `css/base.css`
and remove the Google Fonts `<link>` from `index.html`.

---

## Step-by-Step Download

1. Go to: **https://gwfh.mranftl.com/fonts**
   (Google Webfonts Helper — free, no account needed)

2. Download each font and rename as shown:

| Font Name        | Weight(s) to Download | Save As                     |
|-----------------|----------------------|-----------------------------|
| Black Ops One   | 400                  | `blackopsone-400.woff2`     |
| Rajdhani        | 400, 600, 700        | `rajdhani-400.woff2`        |
|                 |                      | `rajdhani-600.woff2`        |
|                 |                      | `rajdhani-700.woff2`        |
| Bebas Neue      | 400                  | `bebasneuе-400.woff2`       |
| Share Tech Mono | 400                  | `sharetechmono-400.woff2`   |

3. In **gwfh.mranftl.com**, for each font:
   - Search the font name
   - Select the weights listed above
   - Set "Support" to "Modern Browsers" (woff2 only)
   - Click **"Download files"**
   - Copy only the `.woff2` files here

---

## After Placing Files

Uncomment the `@font-face` section in `css/base.css`:

```css
@font-face {
  font-family: 'Black Ops One';
  src: url('../fonts/blackopsone-400.woff2') format('woff2');
  font-weight: 400; font-style: normal; font-display: block;
}
@font-face {
  font-family: 'Rajdhani';
  src: url('../fonts/rajdhani-400.woff2') format('woff2');
  font-weight: 400; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'Rajdhani';
  src: url('../fonts/rajdhani-600.woff2') format('woff2');
  font-weight: 600; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'Rajdhani';
  src: url('../fonts/rajdhani-700.woff2') format('woff2');
  font-weight: 700; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'Bebas Neue';
  src: url('../fonts/bebasneuе-400.woff2') format('woff2');
  font-weight: 400; font-style: normal; font-display: block;
}
@font-face {
  font-family: 'Share Tech Mono';
  src: url('../fonts/sharetechmono-400.woff2') format('woff2');
  font-weight: 400; font-style: normal; font-display: swap;
}
```

Then remove these lines from `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?..." rel="stylesheet"/>
```

---

## Why Local Fonts for APK?

- Removes 300–800ms first-paint block (no network request)
- Works fully offline
- Prevents Google Fonts rate limiting on repeated APK installs
- APK file size increase: ~180KB (negligible, compressed further in APK)

---

## Expected Final File List

```
fonts/
├── blackopsone-400.woff2     (~18KB)
├── rajdhani-400.woff2        (~30KB)
├── rajdhani-600.woff2        (~30KB)
├── rajdhani-700.woff2        (~30KB)
├── bebasneuе-400.woff2       (~20KB)
├── sharetechmono-400.woff2   (~25KB)
└── README.md                 (this file)
```

Total font size: ~153KB before APK compression (~80KB after)
