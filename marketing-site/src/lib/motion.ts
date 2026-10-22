/**
 * ATLUS MOTION CONTROLS — start here when tuning the animations.
 * Times are seconds, distances are pixels. Keep normal scrolling native.
 * All effects automatically opt out for prefers-reduced-motion.
 * See docs/ANIMATION-GUIDE.md for examples and where each control is used.
 */
export const SCROLL_MOTION = {
  enabled: true, // false shows every section immediately.
  start: "top 88%", // Start when the element reaches 88% down the viewport.
  distance: 24, // How far headings / cards travel upward. Try 12 for subtler motion.
  mobileDistance: 14,
  duration: 0.75,
  ease: "power3.out", // Smooth deceleration; no bounce.
  columnStagger: 0.09, // Small delay between columns on desktop; zero on mobile.
  once: true, // false replays when scrolling back through a section.
  markers: false, // true displays GSAP's trigger guides for local tuning.
} as const;

export const HANDWRITING_MOTION = {
  enabled: true,
  start: "top 84%",
  delay: 0.22, // Lets a section heading arrive before its annotation writes in.
  letterDuration: 0.28, // Solid ink reveals without fading each letter.
  letterStagger: 0.06,
  maxDuration: 1.7, // Caps long phrases so readers aren't kept waiting.
  ease: "none", // Constant movement through each glyph, without repeated starts/stops.
  markDuration: 0.75, // Time to draw one underline / arrow stroke.
  markStagger: 0.45,
} as const;

export const HERO_MOTION = {
  playbackRate: 0.7, // Shared ink pace; the editorial sequence takes about 5.6 seconds.
  title: { liftPercent: 10, duration: 0.8, stagger: 0.12, ease: "power3.out" },
  writing: { uAt: 0.55, signatureAt: 1.05, taglineAt: 1.25, signatureDuration: 0.7 },
  visibleThreshold: 0.25, // Fraction of the illustration visible before it starts.
  // Edit these poses to change the initial loose arrangement of the three cards.
  cardPoses: [
    { x: -24, y: 18, rotation: -5 },
    { x: 18, y: -10, rotation: 4 },
    { x: -12, y: -28, rotation: -3 },
  ],
  // Named beats in the editorial sequence. Overlap is deliberate.
  beats: {
    arrive: 0,
    select: 1.35,
    arrange: 1.5,
    frame: 1.45,
    masthead: 2.15,
    explain: 2.75,
    finish: 3.3,
    check: 3.55,
  },
} as const;
