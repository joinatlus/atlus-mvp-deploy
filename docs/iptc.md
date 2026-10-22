# IPTC Media Topics in Atlus

Atlus uses the official IPTC Media Topics vocabulary as its canonical news-subject hierarchy.

- Onboarding deliberately presents the familiar 17 top-level subjects.
- Article processing selects the most specific accurate IPTC Media Topic supported by the article.
- Learning goals may also be anchored to deep IPTC topics.
- The recommender compares QCodes hierarchically, so a broad preference such as Science & technology still matches a descendant such as Artificial intelligence.
- Atlus concepts and concept embeddings remain separate and capture distinctions that are finer than the IPTC vocabulary.

The checked-in file `lib/iptc-media-topics.generated.json` is a local snapshot. `npm run sync:iptc` refreshes it from the official IPTC endpoint and filters retired concepts. Dev, build and typecheck run the sync first. If a complete snapshot already exists and the network is temporarily unavailable, it is retained. The small checked-in bootstrap is not treated as a full vocabulary; first-time setup must successfully sync (or explicitly set `IPTC_ALLOW_BOOTSTRAP=1` for limited offline development).

Source: https://cv.iptc.org/newscodes/mediatopic/?format=json&lang=en-GB

IPTC Media Topics are published by the International Press Telecommunications Council (IPTC) under CC BY 4.0.
