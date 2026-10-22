# Atlus recommender v1.2 (MVP)

`recommender_v1.2_mvp` is the final hand-designed recommender before a learned v2 ranker.

## User state

Atlus keeps two layers:

1. **Explicit**: onboarding, user edits and explicit overrides.
2. **Learned**: feedback/model-derived assumptions.

An explicit `user_edit` with `override_active=true` is authoritative for that concept. Onboarding is otherwise treated as a prior and learned feedback is blended at lower weight. Raw feedback is never deleted when the user corrects the active profile.

## Content representation

- IPTC Media Topics top-level QCode as the stable subject backbone.
- Atlus tags for product-specific/deeper concepts until a curated deeper IPTC mapping is imported.
- Embedding from title + subtitle + summary + available permitted text + topic/tag/entity context.
- Article type, complexity, entities, geographies, content depth and processing confidence.
- Freshness is deterministic with article-type-specific exponential decay.
- Evergreen is LLM judgement blended with an article-type prior.
- Quality is decomposed into depth, substance, clarity and originality rather than one unconstrained LLM number.

## Slot objectives

### Core

Core has a hard preference-fit eligibility threshold. High freshness or quality cannot rescue an unrelated article.

### Stretch

Stretch has a hard learning-goal eligibility threshold and gives extra weight to knowledge-level fit.

### Discovery

Discovery must clear a minimum semantic bridge and quality floor before it can qualify, then scores novelty around a target semantic distance determined by Gentle / Balanced / Adventurous. Maximum distance is not the goal; if no candidate is meaningfully connected, a shorter slate is preferable to random filler.

## Slate construction

Each slot has a ranked candidate set. The slate is then constructed jointly with penalties for repeated IPTC topic, publisher and entity overlap. Discovery has a small controlled exploration probability among safe, high-quality, connected candidates.

## V2 data collection

`recommendation_candidates` stores selected and non-selected candidates, rank-before-slate, raw/final score, eligibility, feature snapshot, exploration flag and model version. `recommendation_runs.user_state_snapshot` captures the active user state at decision time.

This is intentionally more data than v1 needs: it creates the counterfactual/ranking dataset needed for a future LightGBM/LambdaMART learning-to-rank system.
