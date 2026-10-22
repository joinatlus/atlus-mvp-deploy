# Onboarding and My Algorithm

The onboarding is part of the recommender, not a marketing survey. Every required question maps to a cold-start feature:

1. Broad IPTC interests -> topic affinity / Core.
2. Deeper Atlus tags -> stronger semantic/topic specificity.
3. Learning goals -> 1-3 concrete Stretch objectives. Suggestions are contextual to the interests/subtopics already selected, and users can write specific goals in their own words.
4. Starting point -> each learning goal stores the user's current knowledge level plus a learning mode (`foundations`, `deepen`, or `keep_up`). One goal can optionally be marked as the current focus. Interest-level knowledge is stored separately for Core/Discovery complexity matching.
5. Existing outlets (optional) -> exposure rather than ideological/source endorsement.
6. Match / Balance / Challenge -> stored perspective preference for use once article-perspective metadata is reliable.
7. Geographic interests -> geographic ranking feature.
8. Discovery level + exclusions -> novelty target and hard blocks.
9. Light / Standard / Deep -> slate size, with local delivery time stored alongside the user's timezone.

The product does not collect a political-ideology questionnaire or sensitive demographic fields for the MVP.

## Stretch state

Each explicit learning goal is stored as a `goal` assumption. Its `structured_value` includes:

```json
{
  "original_text": "Understand AI safety, security and misuse",
  "knowledge_level": 2,
  "learning_mode": "deepen",
  "priority": "focus",
  "weight": 1
}
```

Goal interpretation then adds concepts and full-hierarchy IPTC anchors without overwriting the onboarding fields. The recommender still requires semantic + concept + taxonomy compatibility, but Stretch now also scores against the knowledge level and learning mode of the *matched goal*, rather than relying only on generic interest knowledge.

Learning modes have deliberately different behaviour:

- `foundations`: favour appropriate-level explainers and durable background pieces;
- `deepen`: favour material slightly above the user's current level;
- `keep_up`: retain level matching but place more weight on freshness/current reporting.

If the user marks one goal as the current focus, that goal receives a modest weight advantage; other goals remain eligible so the slate does not become permanently one-dimensional.

## My Algorithm

The profile UI explicitly separates **What you told Atlus** and **What Atlus has learned**. Explicit goal cards show the stored starting level, learning mode and focus status. Corrections create explicit overrides; they do not erase feedback history. This means users have control while v2 can still learn from historical interactions and preference changes.
