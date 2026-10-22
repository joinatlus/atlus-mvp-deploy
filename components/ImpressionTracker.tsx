'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export function ImpressionTracker({
  recommendationItemId,
  recommendationRunId,
  articleId,
  surface = 'web_app',
  children
}: {
  recommendationItemId: string;
  recommendationRunId: string;
  articleId: string;
  surface?: 'web_app' | 'mobile_web';
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const sent = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || sent.current) return;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5);
      if (!visible || sent.current) return;
      sent.current = true;
      observer.disconnect();
      void fetch('/api/impressions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ recommendationItemId, recommendationRunId, articleId, surface }),
        keepalive: true
      }).catch(() => {
      });
    }, { threshold: [0.5] });

    observer.observe(element);
    return () => observer.disconnect();
  }, [recommendationItemId, recommendationRunId, articleId, surface]);

  return <div ref={ref}>{children}</div>;
}
