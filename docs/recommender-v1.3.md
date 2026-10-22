# Recommender v1.3 — precomputed concepts

`recommender_v1.3_precomputed_concepts` keeps the interpretable v1.2 ranking design but moves expensive semantic work out of slate generation.

## No external calls at slate time

When user state changes, Atlus rebuilds the same aggregate text representations v1.2 embedded at slate time:

- preferences
- goals
- avoidances

Those vectors are stored in `user_recommendation_embeddings`. Core therefore keeps the v1.2 aggregate preference signal rather than approximating it by averaging individual vectors.

Learning goals also receive one-time semantic processing. Each goal stores:

- 3–8 disambiguated concepts
- up to 3 IPTC top-level anchors
- a semantic embedding of the original goal
- a concept embedding of the interpreted concepts

These live in `user_assumptions` + `user_assumption_embeddings`.

Articles similarly receive:

- ordinary content embedding (`article_embeddings.embedding_version = v1`)
- concepts extracted during article processing
- concept embedding (`embedding_version = concept_v1`)

The classification + both article embeddings are produced during ingestion, not recommendation generation.

## Stretch

Stretch first finds the best *individual* learning goal for an article. It combines:

- 55% concept-vector match
- 30% full semantic match
- 15% IPTC compatibility

The user's goal weight is then applied. Eligibility additionally requires:

- a stored article and goal concept vector
- minimum semantic match
- minimum concept match
- minimum total goal match
- either a strong concept bridge or IPTC bridge

This is deliberately a gate: article quality, freshness or reading-time fit cannot rescue an article that does not genuinely advance a goal.

The purpose is general disambiguation. For example, a goal about secure AI systems should have concepts such as model robustness / AI vulnerabilities, while an article about a film concerning an intelligence agency should have concepts such as intelligence agencies / documentary filmmaking. Word overlap on “intelligence” or “security” is therefore insufficient.

## Core

Core keeps the v1.2 scoring equation and aggregate preference representation. The only architecture change is that the embedding is cached when user state changes instead of generated each time a slate is requested.

## Feedback

Raw feedback remains append-only. Preference-changing feedback updates the learned assumption layer and then refreshes the cached aggregate preference representation. Knowledge/source feedback continues to update structured features directly. If an embedding refresh fails, the feedback itself is still preserved and a later backfill can rebuild the cache.

## Backfill

After migration `0004_precomputed_representations.sql`:

1. Reprocess existing articles so `concepts` and `concept_v1` embeddings exist.
2. POST `/api/admin/backfill-user-representations` with `Authorization: Bearer $CRON_SECRET` so existing users receive aggregate and per-goal representations.

New onboarding/profile edits maintain these representations automatically.
