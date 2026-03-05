# Bloomsline Mobile — Design System & Philosophy

## Vision

Bloomsline is a B2C emotional wellness companion. The mobile app lets members capture daily emotional moments (photo, video, voice, text), tag them with moods, and track their emotional journey over time through visualizations — all guided by Bloom, an AI companion.

The design follows one principle: **radical simplicity in service of emotional honesty.**

---

## Design Philosophy

### 1. White is the canvas
Every screen uses `#fff`. Negative space does the layout work. No gradients on backgrounds, no decorative borders, no heavy shadows. The app should feel like a clean sheet of paper.

### 2. Color only carries meaning
Black and white handle all interactive surfaces. Color appears only when it represents something — mood state, brand identity, or data. There is no decorative color.

### 3. Typography as voice
System font only. Weight and size create hierarchy. Large bold headlines (28–34px, weight 700) feel personal and warm. Small uppercase labels (13px, weight 600, letter-spacing 0.5–1) create quiet structure.

### 4. Motion is understated
Animations use spring physics or short timing curves. Nothing bounces, nothing flashes. The breathing orb pulses at human inhale/exhale tempo (2s in, 2s out). Loading dots fade gently. The FAB cards drift open with natural friction.

### 5. No persistent navigation chrome
No tab bar. Stack-only navigation. Every screen is focused and uncluttered. The home screen itself is the hub — cards link to Evolution, Practitioner, and Bloom sits inline at the bottom.

### 6. Emotional language, not metrics language
Charts are "Emotional flow" and "Emotional landscape" — not "Performance" or "Analytics." The Bloom Score rewards honesty — difficult moods contribute positively. Streak badges use a plant emoji, not fire.

---

## Color System

### Base Palette

| Token | Hex | Usage |
|---|---|---|
| `bg` | `#fff` | All screen backgrounds |
| `primary` | `#000` | CTAs, FAB, nav pills, headlines |
| `surface-1` | `#f5f5f5` | Inputs, secondary buttons, back-nav circles |
| `surface-2` | `#f8f8f8` | Cards, empty states |
| `surface-3` | `#fafafa` | Chart cards, stat tiles |
| `text-primary` | `#000` | Headlines, body |
| `text-secondary` | `#999` | Subtitles, greeting name |
| `text-tertiary` | `#bbb` | Timestamps, section labels |
| `text-faint` | `#ccc` | Placeholders, version, disabled |
| `text-muted` | `#d4d4d4` | Chart axis labels, nav chevrons |
| `divider` | `#eee` | Borders |
| `error` | `#DC2626` | Destructive actions, errors |
| `error-bg` | `#FEE2E2` | Error cards |

### Brand

| Token | Hex | Usage |
|---|---|---|
| `bloom` | `#4A9A86` | Bloom AI identity, user chat bubbles, send buttons, Evolution card, score ring |

### Capture Types

| Type | Hex |
|---|---|
| Photo | `#3B82F6` |
| Video | `#8B5CF6` |
| Voice | `#F59E0B` |
| Write | `#10B981` |

### 14 Moods

8 positive moods (warm/vivid) + 6 neutral/difficult (progressively desaturated):

| Mood | Valence | Color | Category |
|---|---|---|---|
| joyful | 95 | `#F59E0B` | positive |
| grateful | 90 | `#10B981` | positive |
| inspired | 88 | `#8B5CF6` | positive |
| proud | 85 | `#EC4899` | positive |
| loved | 82 | `#F43F5E` | positive |
| peaceful | 80 | `#06B6D4` | positive |
| hopeful | 75 | `#F97316` | positive |
| calm | 72 | `#6366F1` | positive |
| tender | 55 | `#A78BFA` | neutral |
| restless | 48 | `#EAB308` | neutral |
| uncertain | 45 | `#94A3B8` | neutral |
| tired | 42 | `#64748B` | difficult |
| overwhelmed | 38 | `#EF4444` | difficult |
| heavy | 32 | `#475569` | difficult |

Valence scores (0–100) map to Y-axis position on emotional timeline charts.

---

## Typography

System font only. No custom fonts.

| Use | Size | Weight | Color | Extra |
|---|---|---|---|---|
| Screen title | 34 | 700 | `#000` | letterSpacing: -0.5 |
| Greeting | 28 | 700 | `#000` | letterSpacing: -0.5, name in `#999` |
| Auth headline | 32 | 700 | `#000` | letterSpacing: -0.5 |
| Card title | 20 | 600 | `#fff`/`#000` | — |
| Body / button | 17 | 600 | varies | — |
| Chat message | 14–15 | 400 | `#fff` (user) / `#1f2937` (AI) | lineHeight: 20–22 |
| Section label | 13 | 600 | `#bbb` | uppercase, letterSpacing: 0.5–1 |
| Suggestion chip | 13 | 400 | `#666` | — |
| Timestamp | 13 | 400 | `#bbb` | — |
| Chart label | 10–12 | 500 | `#d4d4d4` | SVG text |
| Version | 13 | 400 | `#ccc` | absolute bottom |

---

## Spacing

No shared tokens — all inline values. Consistent implicit scale:

| Context | Value |
|---|---|
| Screen horizontal padding | 24 |
| Top safe area offset | `insets.top + 8` |
| Bottom safe area offset | `insets.bottom + 16–24` |
| Card internal padding | 20–32 |
| Stack gap | 10–12 |
| Section gap | 24–32 |

---

## Component Patterns

### Buttons
- **Primary CTA**: `height: 56, borderRadius: 28, bg: #000`, white text 17/600
- **Secondary CTA**: `height: 56, borderRadius: 28, bg: #f5f5f5`, black text
- **Disabled**: `bg: #e5e5e5`, white text
- **Circular send**: `width: 34–44, borderRadius: 50%, bg: #4A9A86`

### Inputs
- `height: 56, bg: #f5f5f5, borderRadius: 16, paddingHorizontal: 20, fontSize: 17`
- No borders, no shadows. Blend into background.
- `placeholderTextColor: #bbb`

### Cards
- Standard: `bg: #f8f8f8, borderRadius: 20, padding: 20`
- Chart: `bg: #fafafa, borderRadius: 24, overflow: hidden`
- Stat tile: `bg: #fafafa, borderRadius: 16, padding: 16`
- Empty state: `bg: #f8f8f8, borderRadius: 24, padding: 32, center-aligned`

### Back / Close buttons
- Circular: `width: 36, height: 36, borderRadius: 18, bg: #f5f5f5`
- Contains `‹` (back) or `✕` (close) in `#999` or `#000`

### Mood pills
- Selected: `bg: #000, text: #fff`
- Unselected: `bg: #f5f5f5, text: #333`
- In data views: `bg: moodColor at 8% opacity, text: moodColor`

### Suggestion chips
- `paddingH: 14, paddingV: 8, borderRadius: 18, bg: #f5f5f5`

### Bottom sheet handle
- `width: 36, height: 4, borderRadius: 2, bg: #e5e5e5`

---

## Bloom Logo

Three forms:

1. **Welcome screen** — 4-dot cross pattern (48×48, dots 14px, `#000`)
2. **Home screen** — Single teal orb (`size * 0.6`, `#4A9A86`)
3. **Chat header** — Small dot (`10px`, `#4A9A86`) + "Bloom" label

---

## Animation Patterns

All use React Native `Animated` API with `useNativeDriver: true`.

| Animation | Type | Duration/Config |
|---|---|---|
| FAB expand | spring | friction: 8, tension: 60 |
| FAB rotate (+ → ×) | spring | same as expand |
| Breathing orb | loop timing | scale 1 → 1.12 → 1, 2000ms each |
| Typing dots | loop timing | opacity 0.3 → 1 → 0.3, 400ms, 200ms stagger |
| Tagline rotation | timing | fade out 250ms, swap, fade in 250ms, interval 4s |
| Voice record pulse | loop timing | scale 1 → 1.3 → 1, 600ms |
| Bloom chat fade-in | timing | opacity 0 → 1, 200ms |
| Screen transitions | — | fade (main), slide_from_right (auth), slide_from_bottom (capture modal) |

---

## Screen Architecture

### Home (`home.tsx`)
The hub. Contains everything inline — no navigation needed for quick actions.

**Layout (top to bottom):**
1. Header: teal orb logo + settings gear
2. Greeting: time-aware ("Good morning/afternoon/evening"), name in gray
3. Day navigation: whisper chevrons `‹ Today ›` (minimal, not a calendar strip)
4. Emotional Timeline: SVG bezier chart with mood orbs, or empty state card
5. Quick action cards: Evolution (teal) + Practitioner (gray)
6. Bottom area: FAB (capture) with "Talk to Bloom" trigger above, OR inline Bloom chat

**Bloom inline chat (when active):**
- Replaces FAB area seamlessly — no panel, no backdrop
- Input bar: single rounded pill with ✕ (close) | text field | send button
- Messages flow above input, blending into white background
- Suggestion chips shown before first message
- `autoFocus` on input for immediate typing

### Emotional Timeline
SVG visualization (180px tall) showing mood flow through the day:
- Bezier curves through mood points (cubic, midpoint control points)
- Gradient fill under curve (latest mood color, 10% → 0%)
- Colored orbs at each data point (r=5 normal, r=8 latest with glow)
- "now" marker: dashed vertical line at current time
- Time axis: 6a, 12p, 6p labels
- Touch targets: 36×36px invisible overlays for tapping moments

### Evolution (`evolution.tsx`)
Scroll-only analytics page with:
- **Bloom Score Ring**: SVG circular gauge (0–100), color by range (teal ≥70, amber 40–69, slate <40)
- **Score labels**: "Just starting" / "Keep going" / "Building up" / "Going strong" / "Amazing week"
- **Time range pills**: 7 days / 30 days / 90 days
- **Emotional Landscape**: Bezier area chart of daily mood averages
- **Stats row**: 3 tiles (moments, active days, consistency %)
- **Mood Ring**: SVG donut chart with legend
- **Mood Calendar**: 7-column pixel grid with streak indicator

### Capture (`capture.tsx`)
3-step wizard as fullScreenModal:
1. **Capture**: Photo/video picker, voice recorder (140px red pulse button), or text editor
2. **Mood**: Grid of 14 mood pills (at least 1 required)
3. **Save**: Review media + moods + optional note, confirm with check icon

### Bloom Chat (`bloom.tsx`)
Dedicated full-screen chat (also exists inline on home):
- Onboarding: breathing orb + 4 starter cards
- Chat: user bubbles (teal, right) + AI text (no bubble, left)
- Typing dots + suggestion chips
- Uses `useBloomChat` hook → calls `/api/bloom/chat` on web app backend

### Settings (`settings.tsx`)
Minimal: profile card, sign out (with web/native platform-aware confirm), version string.

---

## Navigation

```
app/
├── _layout.tsx              Root Stack (fade)
├── index.tsx                Auth gate → redirect
├── (auth)/
│   ├── _layout.tsx          Auth Stack (slide_from_right)
│   ├── welcome.tsx          Landing
│   ├── sign-in.tsx          Email/password + Google OAuth
│   └── sign-up.tsx          Registration
├── (main)/
│   ├── _layout.tsx          Main Stack (fade)
│   ├── home.tsx             Hub screen
│   ├── capture.tsx          Modal (slide_from_bottom)
│   ├── evolution.tsx        Analytics
│   ├── bloom.tsx            Full chat page
│   ├── practitioner.tsx     Placeholder
│   └── settings.tsx         Settings
└── auth/
    └── callback.tsx         OAuth redirect (web)
```

**No tab bar.** Entirely stack-based. Home is the only persistent surface.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 55, React Native 0.83 |
| Routing | expo-router (file-based) |
| Backend | Supabase (auth, database, storage) |
| AI Chat | `/api/bloom/chat` on Next.js web app |
| Charts | react-native-svg |
| Icons | lucide-react-native |
| Auth | Supabase Auth (email, Google, Azure OAuth) |
| Storage | expo-secure-store (native), localStorage (web) |
| Deployment | Vercel (web export via `npx expo export --platform web`) |

---

## Data Model

### Moments
- `type`: photo | video | voice | write | mixed
- `moods[]`: array of mood strings from the 14-mood system
- `text_content`: optional text note
- `caption`: optional caption
- `media_url`: primary media URL
- `media_items[]`: array of `{ id, media_url, media_type, sort_order }`
- `duration_seconds`: for voice moments

### Bloom Chat
- `conversationId`: thread identifier
- `messages[]`: `{ role: 'user'|'assistant', content, created_at }`
- `suggestions[]`: API returns follow-up prompts
- Greeting fetched on mount (multilingual: en/fr/es fallback)

### Bloom Score Formula
```
score = frequencyScore * 0.3 + valenceScore * 0.35 + consistencyScore * 0.35
```
- Difficult moods still contribute positively (rewards honesty)
- Labels: 0–20 "Just starting", 21–40 "Keep going", 41–60 "Building up", 61–80 "Going strong", 81–100 "Amazing week"

---

## Key UX Decisions

1. **Inline Bloom chat over separate page** — The home screen's bottom area transforms into a chat input. No navigation, no panel chrome. Seamless.

2. **FAB as radial menu** — Single `+` button fans into 4 type cards with spring physics and slight rotations (-6° to +5°). Background dims to near-white, not dark.

3. **Emotional timeline as primary view** — Not a list of moments. A continuous bezier curve that shows the emotional *flow* of the day. Tapping orbs opens moment details.

4. **Whisper navigation for dates** — Not a calendar strip. Just `‹ Today ›` in barely-visible text. Tapping the label returns to today.

5. **Mood selection is mandatory** — Can't save a moment without at least one mood. This is the core data point powering all visualizations.

6. **Voice recording uses oversized touch target** — 140px button for a calm, anxiety-reducing recording experience.

7. **No metrics language** — "Emotional landscape" not "Performance chart." "Bloom Score" not "Wellness Index." Plant emoji streaks, not fire.

8. **Platform-aware patterns** — `Alert.alert` on native, `window.confirm` on web. OAuth via `expo-web-browser` on native, URL hash parsing on web.
