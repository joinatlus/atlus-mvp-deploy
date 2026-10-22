import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { writeHandwriting } from "@/lib/handwriting";
import { HANDWRITING_MOTION, HERO_MOTION } from "@/lib/motion";

/** One viewport trigger and pace for annotations and drawn marks. */
export function useInkReveal<T extends Element>(
  kind: "text" | "mark",
  enabled = true,
  delay = HANDWRITING_MOTION.delay as number,
  content = "",
) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !enabled || !HANDWRITING_MOTION.enabled) return;
    const media = gsap.matchMedia();
    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        const timeline = gsap.timeline({ paused: true }).timeScale(HERO_MOTION.playbackRate);
        if (kind === "text") {
          writeHandwriting(timeline, element, delay);
        } else {
          element.querySelectorAll<SVGPathElement>("path").forEach((path, index) => {
            const length = path.getTotalLength();
            timeline.fromTo(
              path,
              { strokeDasharray: length, strokeDashoffset: length },
              {
                strokeDashoffset: 0,
                duration: HANDWRITING_MOTION.markDuration,
                ease: "power1.inOut",
              },
              delay + index * HANDWRITING_MOTION.markStagger,
            );
          });
        }
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) return;
            timeline.play();
            observer.disconnect();
          },
          { threshold: 0, rootMargin: "0px 0px -8% 0px" },
        );
        observer.observe(element);
        return () => observer.disconnect();
      },
      element,
    );
    // Reverts inline styles as well as stopping motion when preferences change.
    return () => media.revert();
  }, [content, delay, enabled, kind]);

  return ref;
}
