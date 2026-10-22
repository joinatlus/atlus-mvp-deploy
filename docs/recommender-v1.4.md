# Recommender v1.4 — full IPTC hierarchy

`recommender_v1.4_full_iptc` keeps the precomputed semantic/concept architecture from v1.3 and upgrades the taxonomy layer from the 17 roots to the full official IPTC Media Topics hierarchy.

## What changed

- Onboarding still shows the 17 broad IPTC roots.
- Article processing receives a compact candidate subset of the full local IPTC vocabulary and is instructed to choose the deepest accurate topic.
- Learning-goal interpretation can attach deep IPTC QCodes rather than root-only anchors.
- Taxonomy similarity is hierarchical: broad interests match descendants strongly; a narrow interest matching only a broad article is weaker evidence; close siblings retain only a modest relationship.
- Topic exclusions apply to descendants, so excluding Sport also excludes football, tennis, Formula One, and other Sport descendants.
- Atlus concepts/concept embeddings remain separate and continue to resolve meanings that IPTC does not model finely enough.

## Runtime architecture

There are still zero external API calls during ranking. IPTC is loaded from a checked-in local JSON snapshot. Article/user semantic model calls happen only when content or user state changes. After the final slate is fixed, Atlus may make one optional LLM call for the whole slate to write concise, grounded `Why this one` copy; that call cannot change ranking.

## Vocabulary sync

Run:

```bash
npm run sync:iptc
```

The sync fetches the official English IPTC Media Topics JSON, removes retired concepts, derives parent/depth/top-level relationships, and writes `lib/iptc-media-topics.generated.json`. Dev, build, and typecheck trigger this sync automatically; if a complete snapshot already exists and the network is unavailable, it is retained. The small bootstrap is only for explicit limited offline development (`IPTC_ALLOW_BOOTSTRAP=1`).

## Upgrade from v1.3

After applying migration `0005_full_iptc.sql`, reprocess active articles and run `/api/admin/backfill-user-representations` so existing articles and goals receive deep-topic representations.


## Stretch learning-goal upgrade

The current v1.4 deployment identifier is `recommender_v1.4_explanations`. The full-IPTC goal representation is unchanged, but onboarding now supplies stronger goal state: 1-3 concrete learning goals, a per-goal starting knowledge level, a learning mode (`foundations`, `deepen`, `keep_up`), and an optional focus goal.

Stretch still requires semantic, concept and IPTC compatibility. Once a goal is matched, ranking additionally scores article complexity against that goal's starting level. `foundations` favours clear/durable explanatory material; `deepen` aims slightly above the current level; `keep_up` gives more weight to fresh reporting and analysis.

## Explanation generation

Ranking remains deterministic and uses only stored features/embeddings at slate time. After the final slate is selected, Atlus may make one optional LLM call for the entire slate to produce concise, article-specific `Why this one` copy from the selected article metadata/summary and the actual matched interest/goal/reason codes. This call must not alter the selected articles. If it fails or produces invalid output, use the deterministic explanation.

Reading time is not a ranking feature in this version because most RSS sources do not expose enough article text to estimate it consistently. Display it only when the stored value came from sufficiently complete article text.
