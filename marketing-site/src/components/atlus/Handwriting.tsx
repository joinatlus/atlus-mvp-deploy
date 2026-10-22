import type { CSSProperties } from "react";
import { useInkReveal } from "./useInkReveal";

/**
 * ANIMATED REENIE BEANIE — change `text` freely; letters update automatically.
 * Example: <Handwriting text="chosen for you." />
 * `mode="hero"` lets AnimatedHero own the timing; the default writes on scroll.
 * `delay={0.4}` overrides the scroll delay for just this phrase.
 * Layout is reserved from the first render. Screen readers get one intact phrase.
 */
export function Handwriting({
  text,
  className = "",
  style,
  mode = "scroll",
  delay,
}: {
  text: string;
  className?: string;
  style?: CSSProperties;
  mode?: "scroll" | "hero";
  delay?: number;
}) {
  const rootRef = useInkReveal<HTMLSpanElement>("text", mode !== "hero", delay, text);

  return (
    <span
      ref={rootRef}
      className={`handwriting ${className}`}
      style={style}
      data-handwriting={mode}
      data-writing-delay={delay}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.split(/(\s+)/).map((word, wordIndex) =>
          /\s/.test(word) ? (
            <span
              aria-hidden="true"
              className="handwriting-space"
              data-space={word}
              key={wordIndex}
            />
          ) : (
            <span className="handwriting-word" key={wordIndex}>
              {Array.from(word).map((letter, letterIndex) => (
                <span className="handwriting-letter" data-letter={letter} key={letterIndex} />
              ))}
            </span>
          ),
        )}
      </span>
    </span>
  );
}
