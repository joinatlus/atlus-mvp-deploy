# Atlus Recommender v1

## 1. Goal

The first recommender should be simple, explainable, and good enough to test the Atlus loop.

It should not be a trained black-box model.

It should be:

```text
content-based
embedding-supported
rule-constrained
feedback-aware
explainable
versioned
auditable
```

## 2. Inputs

The recommender uses:

- active user profile;
- active user assumptions;
- active articles;
- article topics;
- article embeddings;
- previous recommendations;
- feedback events;
- saved articles;
- blocked topics and sources.

## 3. Hard filters

Before scoring, remove any article that fails a hard rule.

Hard filters:

```text
article is not active
rights status is unknown or blocked
source is inactive or blocked
publisher is blocked
article has already been shown to the user
article is a duplicate/near-duplicate of a recent recommendation
article topic is blocked by the user
article quality is below threshold
article URL is missing
```

The scoring model must not override hard filters.

## 4. Candidate generation

Generate candidates through multiple routes.

### 4.1 Interest candidates

Find articles matching user preference assumptions.

Use:

- topic overlap;
- embedding similarity;
- feedback history for similar topics.

### 4.2 Goal candidates

Find articles matching user learning goals.

Use:

- goal text embedding similarity;
- topic match;
- explanation/educational article type;
- appropriate complexity.

### 4.3 Knowledge-progression candidates

Find articles that fit the user’s knowledge level.

Rules:

```text
If user marked topic as too basic → prefer intermediate/advanced.
If user marked topic as too advanced → prefer introductory/intermediate.
If user marked already knew this → keep topic but increase novelty/depth.
```

### 4.4 Discovery candidates

Find articles outside the user’s usual topics but connected enough to be useful.

Discovery candidates should:

- have high quality;
- not be from blocked topics;
- have some link to an interest or goal;
- not be random;
- be easy to explain.

### 4.5 Fresh and evergreen candidates

Add:

- recent high-quality articles;
- older evergreen articles;
- manually boosted articles.

## 5. Scoring features

For each user/article pair, compute:

```text
preference_fit
goal_fit
knowledge_level_fit
quality_score
freshness_score
evergreen_score
novelty_score
source_fit
reading_time_fit
article_type_fit
recent_topic_penalty
recent_source_penalty
duplicate_penalty
access_penalty
feedback_topic_adjustment
feedback_source_adjustment
feedback_article_type_adjustment
```

All feature values should be normalised to a rough `0.0` to `1.0` range, except penalties.

## 6. Initial scoring formula

Use this as the first model configuration:

```text
score =
  0.25 * preference_fit
+ 0.20 * goal_fit
+ 0.15 * quality_score
+ 0.10 * knowledge_level_fit
+ 0.10 * novelty_score
+ 0.10 * max(freshness_score, evergreen_score)
+ 0.05 * source_fit
+ 0.05 * reading_time_fit
+ feedback_adjustments
- repetition_penalties
- duplicate_penalties
- access_penalties
```

Store weights in config, not hardcoded.

Model version:

```text
recommender_v1_hybrid_001
```

## 7. Slot scoring

The same article may score differently for Core, Stretch, and Discovery.

### Core score

Prioritise:

```text
preference_fit
quality_score
source_fit
knowledge_level_fit
low repetition
```

### Stretch score

Prioritise:

```text
goal_fit
knowledge_level_fit
article_type_fit
quality_score
educational value
```

### Discovery score

Prioritise:

```text
novelty_score
quality_score
some connection to user profile
low recent-topic overlap
explainability
```

Discovery must never mean random.

## 8. Slate construction

Build a daily slate based on reading mode.

```text
Light:    1 article
Standard: 3 articles
Deep:     5 articles
```

Default composition:

```text
Light:    strongest article, with occasional slot rotation
Standard: 1 Core, 1 Stretch, 1 Discovery
Deep:     2 Core, 2 Stretch, 1 Discovery
```

## 9. Diversity rules

When selecting the final slate:

```text
Do not include duplicate articles.
Do not include near-duplicate articles.
Avoid multiple articles from the same publisher in one slate.
Avoid multiple articles about the same entity in one slate.
Avoid too many articles from the same primary topic.
Avoid too many articles with the same article type.
Avoid all articles being too long or too advanced.
```

MVP defaults:

```text
Standard: max 1 article per primary topic unless unavoidable.
Standard: max 1 article per publisher unless user strongly prefers source.
Deep: max 2 articles per broad topic.
Deep: max 2 articles per publisher.
```

## 10. Explanation generation

Every recommendation item must have:

- explanation text;
- explanation reason codes.

Reason codes:

```text
matched_user_interest
matched_learning_goal
appropriate_knowledge_level
high_quality_source
evergreen_article
fresh_article
useful_discovery
similar_to_saved_articles
different_from_recent_reading
```

Example explanations:

```text
Chosen as your Core article because it matches your interest in AI policy and comes from a high-quality source.
```

```text
Chosen as your Stretch article because you said you want to understand economics better. This explains a current policy debate without assuming specialist knowledge.
```

```text
Chosen as your Discovery article because it is outside your usual reading but connects to your interest in how technology changes society.
```

Do not generate explanations that are not supported by reason codes or stored features.

## 11. Feedback updates

Use feedback to update future recommendations with simple rules.

### Good pick

```text
Increase topic affinity.
Increase source affinity.
Increase article type affinity.
Increase confidence in current difficulty level.
```

### Not for me

```text
Reduce similar articles.
Reduce topic/source/style only if repeated.
Do not overreact to one negative event.
```

### Save

```text
Strong positive signal.
Increase topic/source/style affinity.
```

### More like this

```text
Increase similarity-based recommendations.
Boost related topics and article type.
```

### Less like this

```text
Reduce similar articles.
Increase caution for topic/source/style.
```

### Too basic

```text
Increase user knowledge level for that topic.
Prefer deeper articles.
```

### Too advanced

```text
Lower user knowledge level for that topic.
Prefer more accessible explainers.
```

### Already knew this

```text
Keep topic interest.
Increase novelty/depth requirement.
Reduce introductory articles in that topic.
```

### Too similar

```text
Increase repetition penalties.
Increase diversity constraints.
```

### Couldn’t access

```text
Penalise article/source access.
Do not treat as topic dislike.
Flag source/article for admin review.
```

## 12. Fallback behaviour

If a good slate cannot be generated:

1. Try high-quality evergreen articles.
2. Try manually boosted articles.
3. Reduce slate size for that day.
4. Skip sending rather than send bad recommendations.

Always log fallback use.

## 13. Pseudocode

```python
def generate_daily_slate(user_id, run_date):
    user = load_user_profile(user_id)
    assumptions = load_active_assumptions(user_id)
    history = load_user_history(user_id)
    articles = load_active_articles()

    candidates = apply_hard_filters(articles, user, history)

    scored_core = score_candidates(candidates, user, assumptions, slot='core')
    scored_stretch = score_candidates(candidates, user, assumptions, slot='stretch')
    scored_discovery = score_candidates(candidates, user, assumptions, slot='discovery')

    slate = build_slate(
        reading_mode=user.reading_mode,
        core_candidates=scored_core,
        stretch_candidates=scored_stretch,
        discovery_candidates=scored_discovery,
        diversity_rules=DEFAULT_DIVERSITY_RULES,
    )

    if not slate.meets_quality_threshold():
        slate = build_fallback_slate(user, run_date)

    save_recommendation_run(user_id, run_date, slate)
    return slate
```

## 14. MVP implementation notes

Start with simple SQL queries and application-level scoring.

Do not build:

- full learning-to-rank;
- contextual bandits;
- neural recommender;
- complex feature store;
- automated retraining.

Do build:

- clear scoring code;
- configurable weights;
- logged feature snapshots;
- repeatable recommendation runs;
- easy admin inspection.
