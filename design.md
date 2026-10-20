# Design System: "Wanderlight" — Travel Discovery App

> A calm, editorial, nature-first mobile design language for a travel inspiration and trip-planning app. Inspired by a two-screen concept (Onboarding / "Get Inspired" and Home / "Where will you Go Next").

---

## 1. Design Philosophy

**Mood:** Serene, airy, premium, unhurried. The interface should feel like a misty morning in a green valley.

**Core principles**

1. **Atmosphere over decoration.** Full-bleed, soft-focus landscape photography is the primary visual; UI elements float above it rather than compete with it.
2. **Frosted glass layering.** Surfaces are translucent, blurred, and softly lit. Depth comes from blur and light, not heavy shadows.
3. **Editorial typography.** A clean sans-serif carries information; an elegant *italic serif* adds emotional emphasis on one or two key words per headline.
4. **Quiet contrast.** The palette is mostly desaturated greens and mist whites, with a single near-black accent for primary actions.
5. **Generous breathing room.** Large radii, wide margins, and calm vertical rhythm. Never crowd the screen.
6. **Pill-shaped interaction.** Buttons, chips, tabs, and nav items are all rounded to capsule or circle shapes.

---

## 2. Color

### 2.1 Core Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-forest-900` | `#1F3A2A` | Deep text accents, pressed states on green |
| `--color-forest-700` | `#3E6B4B` | Selected chip, active icon accents |
| `--color-sage-500` | `#6F9A78` | Selected chip fill (the "Nature" chip), illustration tint |
| `--color-sage-300` | `#A9C4AE` | Hover/secondary green, dots, progress |
| `--color-mist-100` | `#EEF3F0` | Page background (top gradient) |
| `--color-mist-200` | `#DCE6E0` | Page background (mid gradient), dividers |
| `--color-mist-400` | `#B8C7BE` | Disabled, placeholder, inactive dots |
| `--color-ink-900` | `#111312` | Primary CTA fill, active nav button, headline text |
| `--color-ink-700` | `#2B2F2D` | Body text on light |
| `--color-ink-500` | `#5E6661` | Secondary text, captions |
| `--color-white` | `#FFFFFF` | Glass highlights, text on imagery |
| `--color-sand-300` | `#C9A98A` | Desert/warm photography accent (category variety) |
| `--color-sunrise-400` | `#E9B872` | Star-rating icon (optional warm accent) |

### 2.2 Page Background

A soft vertical gradient that looks like fog:

```css
background: linear-gradient(180deg, #F4F7F5 0%, #E3ECE6 55%, #CBDAD0 100%);
```

Optionally overlay a blurred, low-opacity (8–12%) landscape (tree on a hill) behind the content for depth.

### 2.3 Glass Surfaces

| Token | Value |
|---|---|
| `--glass-light` | `rgba(255,255,255,0.55)` with `backdrop-filter: blur(20px) saturate(140%)` |
| `--glass-medium` | `rgba(255,255,255,0.35)` with `blur(16px)` |
| `--glass-dark` | `rgba(17,19,18,0.55)` with `blur(18px)` (used for dark pill CTA and over-image labels) |
| `--glass-border` | `1px solid rgba(255,255,255,0.65)` |
| `--glass-inner-highlight` | `inset 0 1px 0 rgba(255,255,255,0.7)` |

### 2.4 Image Overlays

For text on photography, apply a gradient scrim so white text remains legible:

```css
background: linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(15,30,20,0.55) 100%);
```

### 2.5 Semantic Colors

| Role | Hex |
|---|---|
| Success | `#4C9A6A` |
| Warning | `#E3A93B` |
| Error | `#C8503F` |
| Info | `#4F7FA6` |

---

## 3. Typography

### 3.1 Font Pairing

| Role | Font | Fallback |
|---|---|---|
| **Primary (UI & body)** | *Inter*, *Manrope*, or *SF Pro Display* | `system-ui, -apple-system, sans-serif` |
| **Accent (emphasis words)** | *Instrument Serif Italic*, *Playfair Display Italic*, or *Cormorant Italic* | `Georgia, serif` (italic) |

**The signature move:** In every hero headline, 1–3 key words switch to the italic serif, set slightly bolder in visual weight, with the same size as surrounding text.

> Escape The Ordinary, Explore *Something Extraordinary.*
> Where will you *Go Next*

### 3.2 Type Scale (mobile, 390pt wide)

| Style | Size / Line-height | Weight | Tracking | Notes |
|---|---|---|---|---|
| `display-xl` | 34 / 38 | 400 sans + italic serif accent | -0.02em | Onboarding hero headline, centered |
| `display-lg` | 30 / 36 | 400 sans + italic serif accent | -0.015em | Home screen question, left-aligned |
| `title-md` | 18 / 24 | 500 | -0.005em | Section headers ("Recommended Places", "Explore Places") |
| `title-sm` | 16 / 22 | 600 | 0 | Card titles ("Nature Retreats", "Coast") |
| `body-md` | 14 / 20 | 400 | 0 | Card descriptions |
| `body-sm` | 12 / 16 | 400 | 0.005em | Metadata ("2.6k People Traveled") |
| `label-md` | 14 / 18 | 500 | 0 | Buttons, chips |
| `label-sm` | 11 / 14 | 500 | 0.02em | Badges ("Most Popular"), greeting ("Welcome back") |
| `caption` | 10 / 12 | 400 | 0.02em | Status bar, footnotes |

### 3.3 Typography Rules

- Headlines use **sentence-weight (Regular 400)**, not bold. Elegance comes from size and the serif accent, not heft.
- Never use more than **one** italic-serif phrase per headline.
- Headlines center-aligned on onboarding, left-aligned on app screens.
- Text on imagery is always white with a subtle `text-shadow: 0 1px 8px rgba(0,0,0,0.25)` if the scrim is weak.

---

## 4. Layout & Spacing

### 4.1 Grid

- **Base unit:** 4pt
- **Spacing scale:** 4, 8, 12, 16, 20, 24, 32, 40, 56
- **Screen horizontal padding:** 20pt
- **Safe areas:** Respect Dynamic Island (top) and home indicator (bottom). Content begins ≥ 12pt below the status bar.
- **Section gap:** 24–32pt between major sections
- **Card gap in carousels:** 12pt

### 4.2 Screen Anatomy — Home

```
┌──────────────────────────────┐
│ Status bar                   │
│ Welcome back     [🔔] [👤]   │  ← greeting row
│ Hello Vikas                  │
│                              │
│ Where will you *Go Next*     │  ← display-lg
│                              │
│ Recommended Places           │  ← title-md
│ ┌────────────────────┐ ┌──   │
│ │ Most Popular ★4.9  │ │ M   │  ← large glass hero card (peeking next)
│ │                    │ │     │
│ │ Nature Retreats    │ │     │
│ │ Reconnect with...  │ │     │
│ └────────────────────┘ └──   │
│        • • ● • •             │  ← pager dots
│ Explore Places               │
│ (All)(Nature)(Beach)(Advent) │  ← chip row, horizontal scroll
│ ┌───────┐ ┌───────┐ ┌─       │
│ │★4.9 → │ │★4.7 → │ │        │  ← small image cards
│ │Coast  │ │Deserts│ │        │
│ └───────┘ └───────┘ └─       │
│   ( ⌂  🧳  🌐  🧭  👤 )       │  ← floating pill nav
└──────────────────────────────┘
```

### 4.3 Screen Anatomy — Onboarding

```
┌──────────────────────────────┐
│ Status bar                   │
│     [↗ Get Inspired to Go]   │  ← small glass pill tag
│                              │
│  Escape The Ordinary,        │
│  Explore *Something          │  ← centered display-xl
│  Extraordinary.*             │
│                              │
│ ┌─┐ ┌──────────────┐ ┌─┐     │
│ │ │ │   🌳 tree    │ │ │     │  ← 3D-ish carousel; center card enlarged,
│ │ │ │Nature Retreats│ │ │     │    side cards scaled down & clipped
│ └─┘ │2.6k People    │ └─┘     │
│     └──────────────┘         │
│          • • ● • •           │
│  [ Explore Your Trips   → ]  │  ← dark pill CTA over landscape
└──────────────────────────────┘
```

---

## 5. Shape, Radius & Elevation

### 5.1 Corner Radii

| Token | Value | Usage |
|---|---|---|
| `--radius-xs` | 8px | Tiny badges |
| `--radius-sm` | 12px | Rating chip inside cards |
| `--radius-md` | 20px | Small image cards |
| `--radius-lg` | 28px | Hero cards, carousel cards |
| `--radius-xl` | 36px | Onboarding carousel center card |
| `--radius-pill` | 999px | Buttons, chips, nav bar, tags |
| `--radius-circle` | 50% | Icon buttons, avatar, nav items |

### 5.2 Elevation (soft, diffuse, green-tinted)

| Level | Shadow |
|---|---|
| `elev-0` | none |
| `elev-1` | `0 2px 8px rgba(31,58,42,0.08)` |
| `elev-2` | `0 8px 24px rgba(31,58,42,0.12)` |
| `elev-3` | `0 16px 40px rgba(31,58,42,0.18)` — floating nav, active carousel card |

Avoid hard black shadows. Always tint shadows with forest green at low opacity.

### 5.3 Borders

Glass components get a 1px white border at 50–65% opacity plus an inner top highlight to simulate light catching the edge.

---

## 6. Iconography

- **Style:** Outline, 1.5–1.75px stroke, rounded caps and joins, 24px grid (20px inside small chips).
- **Set suggestions:** Lucide, Phosphor (Regular), or SF Symbols (Regular weight).
- **Nav icons:** Home, Briefcase/Bag (trips), Globe-with-pin (explore), Compass (discover), User (profile).
- **Utility icons:** Bell (notifications), Star (rating, outline in chip, 14px), Arrow-right (CTA/card action, 16px), Heart (favorite, outline, top-right on hero cards), Sparkle/Arrow-up-right (brand glyph in the "Get Inspired" tag).
- Active nav icon: white on `ink-900`. Inactive: `ink-700` on glass.

---

## 7. Components

### 7.1 Status Bar
System default. Dark content on light backgrounds.

### 7.2 Top Greeting Row
- Left: `label-sm` "Welcome back" in `ink-500`, below it `title-md` "Hello {name}" in `ink-900`.
- Right: two 40px circular items spaced 8pt — a **notification button** (glass-light circle, bell outline, optional 8px dot badge in `sage-500`) and **avatar** (40px circle, 2px white ring).

### 7.3 Tag Pill ("Get Inspired to Go")
- Height 32px, horizontal padding 12px, `radius-pill`
- Background `rgba(111,154,120,0.18)` (sage tint) with blur
- Leading 20px dark rounded-square icon (brand mark, `ink-900` bg, white glyph), then `label-md` text in `ink-900`
- Centered above the headline

### 7.4 Primary CTA — "Explore Your Trips"
- Height 52–56px, full pill, min width 200px (or full width minus 40px margin)
- Fill: `glass-dark` / `ink-900` at ~90% opacity with subtle inner highlight
- Text: white `label-md`, left-aligned with 24px padding
- Trailing: 36px circular button, `rgba(255,255,255,0.14)` fill, white arrow-right icon
- Shadow: `elev-3`
- Press state: scale 0.97, opacity 0.92, 120ms ease-out
- Disabled: 40% opacity

### 7.5 Pager Dots
- 6px circles, 8px gap, inactive `rgba(255,255,255,0.55)` on imagery / `mist-400` on light
- Active dot: 8px, fully opaque white (or `ink-900` on light), animates width on change

### 7.6 Onboarding Glass Carousel Card
- Center card: ~190×210pt, `radius-xl`, `glass-light` + border + inner highlight
- Inside: image area (top ~70%, rounded `radius-lg` inset by 6px), then centered title (`title-sm`) and stat (`body-sm`, `ink-500`), e.g., "2.6k People Traveled"
- Side cards: scale 0.82, opacity 0.85, partially clipped by screen edge, slight blur (2px) to push to background
- Snap-to-center paging with spring animation (response 0.45, damping 0.82)

### 7.7 Hero Recommendation Card (Home)
- Size: ~full width minus 40px, ~190pt height, `radius-lg`
- Full-bleed photo, scrim gradient on bottom
- **Top-left chips (8pt gap):**
  - "Most Popular" — glass-light pill, `label-sm`, `ink-900` text, 28px tall
  - Rating — glass-light pill with star icon + "4.9"
- **Top-right:** 32px circular glass heart button (outline)
- **Bottom-left:** `title-md` white title, `body-sm` white 85% description (max 2 lines)
- Next card peeks 24–32pt on the right edge to hint horizontal scroll
- Border: 1px `rgba(255,255,255,0.5)`

### 7.8 Category Chips
- Height 34px, horizontal padding 16px, `radius-pill`
- **Default:** `glass-light`, 1px white border, `ink-700` text
- **Selected:** fill `sage-500` (or `forest-700`), white text, no border
- Row scrolls horizontally, left edge aligned with page padding, right edge bleeds off screen
- Items: All · Nature · Beach · Adventure · Luxury …
- Tap animation: background cross-fades 180ms; selected chip gently scales to 1.03 then back

### 7.9 Place Card (small, Explore grid / row)
- ~150×150pt, `radius-md`, full-bleed photo
- Top-left: rating pill (star + "4.9"), glass-light, 24px tall
- Top-right: 24px circular glass arrow button (arrow-right / arrow-up-right)
- Bottom-left: white `title-sm` (e.g., "Coast"), `body-sm` white 80% subtitle (e.g., "Ocean…")
- Horizontal scroll, 12pt gap, last card clipped by screen edge

### 7.10 Floating Bottom Navigation
- Detached **capsule** floating 16–20pt above the home indicator, horizontally centered, width ≈ screen − 40pt
- Background: `glass-light` with `blur(24px)`, 1px white border, `elev-3`
- 5 circular items of 44px, evenly spaced
  - **Active:** solid `ink-900` circle, white icon
  - **Inactive:** `rgba(255,255,255,0.7)` circle, `ink-700` icon
- Active change: circle morphs/slides with spring animation (200–260ms); icon cross-fades
- Haptic: light impact on selection

### 7.11 Notification / Avatar Buttons
40×40, circular, glass-light with white border; icon 20px, `ink-900`.

---

## 8. Imagery Guidelines

- **Subject matter:** Minimal landscapes — rolling green hills, a lone tree, misty fields, desert dunes, quiet coastlines, mountain ridges at dawn.
- **Treatment:** Soft focus on distance, desaturated greens, lifted shadows, low contrast, light haze. Warm accents (sand, terracotta) allowed in desert/mountain categories but muted.
- **Composition:** Single focal point, lots of negative space (sky/fog) for UI overlay, horizon in lower third.
- **Aspect ratios:** Hero cards 16:10, small cards 1:1, onboarding card image 4:5.
- **Do not** use busy, saturated, or crowded tourist imagery; no people faces in hero cards.
- **Color grading:** Apply a subtle green-teal tint in shadows, warm cream in highlights, so all photos feel part of one family.

---

## 9. Motion & Interaction

| Interaction | Spec |
|---|---|
| Screen transition | Cross-fade + 12px upward slide, 320ms, `cubic-bezier(0.22, 1, 0.36, 1)` |
| Carousel swipe | Spring, response 0.45s, damping 0.82; scale & opacity interpolate with distance from center |
| Parallax | Background photo moves at 0.3× scroll speed; hero card image shifts ±8px with horizontal drag |
| Button press | Scale 0.97, 120ms ease-out; release spring back |
| Chip select | Fill cross-fade 180ms; label color cross-fade |
| Nav switch | Active circle slides/morphs 240ms spring; icon fills slightly |
| Card appear | Staggered fade-up (40ms stagger, 16px translate) |
| Skeleton loading | Shimmering mist gradient (`mist-200` → `mist-100`), 1.4s loop, same radii as final cards |
| Headline reveal | Words fade up sequentially; italic serif phrase delays by 120ms for emphasis |

**Reduced Motion:** Replace slides/springs with simple 150ms opacity fades. Disable parallax.

---

## 10. Accessibility

- **Contrast:** White text on image cards must achieve ≥ 4.5:1 against the scrim; verify per image. Use stronger scrim when needed.
- **Tap targets:** Minimum 44×44pt (nav items, icon buttons, chips have padded hit areas).
- **Dynamic Type:** Support up to 130% scaling; headlines wrap gracefully; cards grow in height rather than truncating critical info.
- **Glass legibility:** Provide a "Reduce Transparency" fallback — replace blur with solid `rgba(244,247,245,0.95)` surfaces.
- **Labels:** All icon-only buttons need accessible labels ("Notifications", "Profile", "Favorite Nature Retreats").
- **Selected state** must not rely on color alone — chips also change text color and weight (500 → 600).
- **Carousel:** Pager exposes "Page 3 of 5"; support VoiceOver swipe and next/previous actions.

---

## 11. Content & Voice

- **Tone:** Calm, inviting, quietly aspirational. Short, evocative sentences.
- **Headline pattern:** `[Imperative or question], *[emotional phrase in italic serif].*`
- **Microcopy examples:**
  - "Escape The Ordinary, Explore *Something Extraordinary.*"
  - "Where will you *Go Next*"
  - "Reconnect with nature, slow down and escape the everyday."
  - "2.6k People Traveled"
  - CTA: "Explore Your Trips"
- Avoid exclamation marks and urgency language ("Hurry!", "Limited!").

---

## 12. Design Tokens (Reference)

### 12.1 CSS Custom Properties

```css
:root {
  /* Colors */
  --forest-900: #1F3A2A;
  --forest-700: #3E6B4B;
  --sage-500:   #6F9A78;
  --sage-300:   #A9C4AE;
  --mist-100:   #EEF3F0;
  --mist-200:   #DCE6E0;
  --mist-400:   #B8C7BE;
  --ink-900:    #111312;
  --ink-700:    #2B2F2D;
  --ink-500:    #5E6661;
  --white:      #FFFFFF;

  /* Glass */
  --glass-light:  rgba(255,255,255,0.55);
  --glass-medium: rgba(255,255,255,0.35);
  --glass-dark:   rgba(17,19,18,0.55);
  --glass-border: rgba(255,255,255,0.65);

  /* Radius */
  --radius-sm: 12px;
  --radius-md: 20px;
  --radius-lg: 28px;
  --radius-xl: 36px;
  --radius-pill: 999px;

  /* Spacing */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-5: 20px; --space-6: 24px;
  --space-8: 32px; --space-10: 40px;

  /* Shadow */
  --elev-1: 0 2px 8px rgba(31,58,42,0.08);
  --elev-2: 0 8px 24px rgba(31,58,42,0.12);
  --elev-3: 0 16px 40px rgba(31,58,42,0.18);

  /* Type */
  --font-sans:  "Inter", "Manrope", system-ui, sans-serif;
  --font-serif: "Instrument Serif", "Playfair Display", Georgia, serif;
}
```

### 12.2 Glass Card Mixin

```css
.glass {
  background: var(--glass-light);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--elev-2), inset 0 1px 0 rgba(255,255,255,0.7);
}
```

### 12.3 Headline Accent

```css
.headline em {
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 400;
  letter-spacing: -0.01em;
}
```

### 12.4 Tailwind Config Snippet

```js
theme: {
  extend: {
    colors: {
      forest: { 700: '#3E6B4B', 900: '#1F3A2A' },
      sage:   { 300: '#A9C4AE', 500: '#6F9A78' },
      mist:   { 100: '#EEF3F0', 200: '#DCE6E0', 400: '#B8C7BE' },
      ink:    { 500: '#5E6661', 700: '#2B2F2D', 900: '#111312' },
    },
    borderRadius: { md: '20px', lg: '28px', xl: '36px' },
    fontFamily: {
      sans:  ['Inter', 'system-ui', 'sans-serif'],
      serif: ['"Instrument Serif"', 'Georgia', 'serif'],
    },
    boxShadow: {
      soft:  '0 8px 24px rgba(31,58,42,0.12)',
      float: '0 16px 40px rgba(31,58,42,0.18)',
    },
  },
}
```

---

## 13. Do & Don't

**Do**
- Let photography breathe; keep UI minimal on top of it.
- Use the italic serif accent sparingly and consistently.
- Keep every interactive element pill- or circle-shaped.
- Tint shadows green and keep them soft.
- Use one dark accent (ink) for the single most important action per screen.

**Don't**
- Don't use pure black shadows or hard 1px dividers.
- Don't mix more than two typefaces.
- Don't use saturated brand colors (neon green, bright blue) that break the misty mood.
- Don't stack multiple glass layers more than two deep (blur becomes muddy).
- Don't use sharp corners or rectangular buttons.
- Don't overload cards with text; max title + two-line description.

---

## 14. Implementation Checklist

- [ ] Fog gradient background with optional blurred landscape layer
- [ ] Font pairing loaded (sans + italic serif) with fallbacks
- [ ] Glass surface utility with Reduce Transparency fallback
- [ ] Hero carousel with scale/opacity interpolation and snap paging
- [ ] Category chip row with selected state
- [ ] Floating pill nav with morphing active state
- [ ] Image scrim + consistent color grading pipeline
- [ ] Haptics on nav, chip, and CTA interactions
- [ ] Dynamic Type & VoiceOver audit
- [ ] Skeleton loaders for all image cards

---

*Inspired by a UI concept by Vikas Morvadiya. This document is an original interpretation of the visual language; all tokens and specs are suggested starting points to refine against real brand and platform requirements.*
