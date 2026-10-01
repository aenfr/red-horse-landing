# DESIGN.md — Red Horse · web (landing 24 OCT)

> Produced with the `web-design` skill (spec first, code second). It derives from
> `_config/visual-style.md` and `_config/brand-identity.md`; those win on any conflict.
> Interaction tier: **L3** (scroll-driven story), mobile first.

## 1 · Visual Theme & Atmosphere
**"La temperatura de la noche."** The manifesto moves from a cold, screen-lit night where
"no pasó nada" to a hot, shared one. The page *literally heats up as you scroll*: a fixed
WebGL heat field shifts from screen-blue to molten red/gold, using the brand's
cold-edge → hot-center gradient as the storytelling device.
Keywords: surreal · solemn · hot · grainy · cinematic · playful-adult. One hero object (the horse), lots of black.

## 2 · Color Palette & Roles
```css
:root {
  /* brand (sampled hex, visual-style §2) */
  --abyss:#011A5F;        --abyss-rgb:1,26,95;
  --ultramarine:#230988;  --ultramarine-rgb:35,9,136;
  --violet:#760282;       --violet-rgb:118,2,130;
  --magenta:#CD0363;      --magenta-rgb:205,3,99;
  --horse-red:#FB1216;    --horse-red-rgb:251,18,22;     /* primary / CTA */
  --orange:#FC4C13;       --orange-rgb:252,76,19;
  --horizon-gold:#FFBF21; --horizon-gold-rgb:255,191,33; /* focus ring, hottest accent */
  --electric-blue:#2B1CF5;--electric-blue-rgb:43,28,245;
  --ink:#020103;          --ink-rgb:2,1,3;               /* page background */
  --bone:#FFFFFF;         --bone-rgb:255,255,255;        /* text */
  --bone-warm:#F7F3EA;    --bone-warm-rgb:247,243,234;
  --acid-lemon:#F5F460;   --acid-lemon-rgb:245,244,96;
  /* narrative-only cold tokens (act 1 "no pasó nada" + the phone screen) */
  --ash:#7C8496;          --ash-rgb:124,132,150;
  --screen:#9DB7FF;       --screen-rgb:157,183,255;
}
```
Roles: background `--ink` (+ WebGL heat field) · text `--bone` · secondary text `rgba(var(--bone-rgb),.62)` ·
CTA `--horse-red` · focus `--horizon-gold` · cold narrative `--ash` / `--screen`.
**Thermal fill** is a texture (`thermal-core.webp`, `thermal-acid.webp`) clipped to text, not a CSS gradient.

## 3 · Typography Rules
`https://fonts.googleapis.com/css2?family=Anton&family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,400..800&display=swap`

**Revised after review:** no serif anywhere (the user's call: sans and less serious). Two families only: Anton + Bricolage Grotesque.

| Role | Brand voice | Family | Size (mobile → desktop) | Notes |
|---|---|---|---|---|
| Wordmark | T1 | **image** `wordmark.webp` (extracted from the approved flyer) | 78vw → 560px | never re-typeset |
| Statement | T4 | Anton, caps, **line-height 1.04 + .08em top padding** (room for accents) | clamp(4rem, 20vw, 12.5rem) | thermal fill, inline-block with headroom |
| Narrative | web voice | Bricolage Grotesque 700, emphasis lines in `--horizon-gold` | clamp(1.6rem, 6.6vw, 3.2rem), lh 1.18 | Red Horse speaks as *nosotros* |
| Label / eyebrow | web voice | Bricolage Grotesque 700 caps, tracking .2em | .72rem → .8rem | |
| UI / buttons | web voice | Bricolage Grotesque 800 caps, tracking .08em | .95rem | |
Fallbacks: `Impact, 'Arial Narrow', sans-serif` · `Georgia, serif` · `system-ui, sans-serif`.
Banned: Inter/Roboto as display, italic Anton, outlined or shadowed wordmark. Max 2 voices per screen + wordmark.
Text decoration: statements use the texture fill (no gradient text, no shadow). Narrative stays plain bone.

## 4 · Component Stylings
- **Button.primary**: pill, `--horse-red` background, bone Montserrat 800 caps, min 48px tall.
  Hover → thermal texture background + scale 1.03 · Active → scale .97 · Focus-visible → 3px `--horizon-gold` ring, offset 3px · Disabled → `--ash` 40 % background, `cursor:not-allowed`, label "Entradas · próximamente".
- **Button.ghost**: 1px `rgba(bone,.4)` border, transparent. Hover → border bone + bg `rgba(bone,.06)` · Active/Focus/Disabled as primary.
- **Nav**: fixed, transparent over the hero. After the hero it gets `rgba(ink,.72)` + `backdrop-filter: blur(10px)` and the mini wordmark fades in. It holds only the date + ticket CTA (single page: nothing to collapse).
- **Chip** (things that happen): Cormorant italic, 1px `rgba(bone,.35)` border, pill. Hover/focus → border `--horizon-gold`.
- **Statement card**: the approved IG statement images, 4:5, radius 4px, no shadow.
- **Flyer card**: tilt ±6° plus a glare on hover devices; static on touch.
- **Link**: bone, underline offset .2em. Hover → `--horizon-gold` · Focus → gold ring.

## 5 · Layout Principles
Mobile first. Gutter 20px (≥900px: 48px). Max text measure 18ch for narrative, 12ch for statements.
Story chapters: **mobile** = full-bleed sticky media + text panels scrolling over it with a dark scrim.
**≥900px** = 2-column grid with the sticky 9:16 media panel left (86svh tall) and text right.
Spacing scale: 8 · 16 · 24 · 40 · 64 · 104 · 168 px. Sticky scrub sections use `n × 100svh` heights.

## 6 · Depth & Elevation
Flat by default. Depth comes from light, not shadows: (0) WebGL heat field, (1) media panels, (2) scrim
`linear-gradient(transparent, rgba(ink,.85))`, (3) text, (4) nav. Shadows only on the flyer card
(`0 30px 80px rgba(var(--horse-red-rgb),.25)`).

## 7 · Animation & Interaction (L3)
- **Engine:** vanilla JS. One rAF loop computes a progress value `p` (0–1) per `[data-scrub]` section and
  writes CSS vars and transforms. Uses transform, opacity and clip-path only (no animated blur).
- **Signature moments (9):**
  1. Hero pin-scrub: empty sea → the horse appears → wordmark mask-reveal → date
  2. Cold list that dims and strikes through as you pass
  3. Phone screen expands to full screen and ignites into heat ("Por eso creamos Red Horse")
  4. Music pin-swap: ear and mane Veo loops
  5. Chips scatter → converge → collapse into "Un momento que nadie planeó"
  6. "PODEMOS ___" word swap
  7. Horizontal statement-card scrub spelling the tagline
  8. UNA CANCIÓN / ENERGÍA / MOMENTO / NOCHE sequence
  9. Flyer tilt + magnetic CTA
- **Atmosphere:** a single WebGL fragment shader (domain-warped fbm + grain) with `uTemp` driven by scroll.
  It renders at a 0.5× scale on mobile, is capped at 30 fps, and pauses when the tab is hidden. Fallback: a CSS gradient.
- **Text:** words reveal word by word with scroll (`[data-words]`); the hero H1 uses a mask reveal; labels fade up.
- **Detail (巧思):** the end of the page answers the opening question: "¿Ya está? ¿Esto era todo?" → "No. Esto acaba de empezar."
- **Reduced motion / no JS:** every sticky sequence becomes a normal stacked layout, all text is visible,
  videos show their poster frame, and WebGL is off.

## 8 · Do's and Don'ts
Do: cold → hot temperature arc · real brand assets only · exact facts from the brief · Spanish (Spain) copy ·
one hero object per screen · black space · thermal fill only on statements · keep the founder's voice.
Don't:
1. Use a flat red background (red is light)
2. Show the horse anywhere other than the approved assets
3. Use emojis, stickers or "¡¡NO TE LO PIERDAS!!" energy
4. Animate blur on moving elements
5. Run more than one WebGL scene
6. Use scroll-jacking libraries (native scroll only)
7. Generate partner logos
8. Put text over the horse
9. Use the acid palette on the main event block
10. Invent ticket URLs, addresses or prices

## 9 · Responsive Behavior
Breakpoints: base (mobile ≤599) · 600 · 900 (2-col chapters) · 1280 (wide).
Touch targets ≥ 48px. No horizontal overflow (the horizontal gallery lives inside an `overflow:hidden` sticky stage).
Use `svh` for sticky stages (iOS address bar). Pointer effects only under `(hover:hover)`.
Videos are `muted playsinline`, lazy-attached and played only in view.
