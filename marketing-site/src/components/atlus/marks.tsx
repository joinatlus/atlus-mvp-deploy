import { useInkReveal } from "./useInkReveal";

/* Double, slightly-imperfect underline in amber.
   Every call site wraps this in a full-width absolutely-positioned span, so the
   underline tracks the word it sits under. A fixed pixel width would instead
   push past the viewport on small screens (a 520px underline on a 390px phone
   forced the whole page to scroll sideways), so size to the parent and cap at
   `w` for the wide case. */
export function DoubleUnderline({
  w = 260,
  color = "var(--color-amber)",
}: {
  w?: number;
  color?: string;
}) {
  const ref = useInkReveal<SVGSVGElement>("mark", true, 0.45);
  return (
    <svg
      ref={ref}
      width="100%"
      height="22"
      viewBox="0 0 260 22"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ display: "block", maxWidth: w }}
    >
      <path
        d="M7 7 C64 11 143 2 253 8"
        fill="none"
        stroke={color}
        strokeWidth="2.6"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
      />
      <path
        d="M34 16 C99 20 180 11 236 15"
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        opacity="0.72"
      />
    </svg>
  );
}

/* Curved arrow annotation — from the underlined word down to the caption */
export function CurvedArrow({ color = "var(--color-amber)" }: { color?: string }) {
  const ref = useInkReveal<SVGSVGElement>("mark");
  return (
    <svg ref={ref} width="70" height="86" viewBox="0 0 70 86" aria-hidden="true">
      <path
        d="M50 4 Q 20 20 22 68"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M22 68 L 10 56 M22 68 L 34 58"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A positionable, hand-drawn photo annotation. */
export function PhotoCircle({
  x,
  y,
  w,
  h,
  label,
  labelPosition,
  color = "var(--color-amber)",
}: {
  x: string;
  y: string;
  w: string;
  h: string;
  label: string;
  labelPosition: "right" | "above";
  color?: string;
}) {
  const ref = useInkReveal<SVGSVGElement>("mark");
  const labelStyle =
    labelPosition === "right"
      ? { left: "104%", top: "46%" }
      : { left: "50%", bottom: "104%", transform: "translateX(-50%)" };

  return (
    <span
      className="pointer-events-none absolute z-10"
      aria-hidden="true"
      style={{ left: x, top: y, width: w, height: h, transform: "translate(-50%, -50%)" }}
    >
      <svg
        ref={ref}
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d="M4 52 C3 23 25 5 51 5 C79 5 97 25 96 50 C96 77 77 96 50 95 C22 95 4 78 4 52Z"
          fill="none"
          stroke={color}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M8 49 C9 22 29 8 52 8 C77 8 93 26 92 52 C91 76 75 91 49 91 C24 90 7 75 8 49Z"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.72"
        />
      </svg>
      <span
        className="hand absolute whitespace-nowrap text-[clamp(1.7rem,3vw,2.6rem)] leading-none"
        style={{ color, ...labelStyle }}
      >
        {label}
      </span>
    </span>
  );
}
