# Atlus Feedback System

## 1. Goal

Feedback should help Atlus improve recommendations without making the product feel like homework.

The same feedback taxonomy should be used across email and web app, but the email should show fewer visible options.

Feedback must be stored as append-only events.

## 2. Feedback principles

Feedback should tell Atlus:

- whether the article was useful;
- whether the topic was right;
- whether the difficulty level was right;
- whether the user wants more or less like it;
- whether there was an access/source problem;
- whether the whole daily slate was good.

Do not treat every negative signal as topic dislike.

Examples:

```text
Too basic = user may like topic but needs more advanced articles.
Already knew this = topic may be right, but novelty/depth was wrong.
Couldn’t access = source/access issue, not preference issue.
```

## 3. Email feedback

Visible article-level email actions:

```text
Good pick
Not for me
Save
More feedback
```

Also track:

```text
Read article
```

But `Read article` is primarily a click/redirect action, not a visible feedback label.

## 4. Web app feedback

Web app article card should include:

```text
[Read article] [Save]

Was this useful?
[Good pick] [Not for me]

Tune future recommendations:
[More like this] [Less like this]
[Too basic] [Too advanced]
[Already knew this] [Too similar] [Couldn’t access]
```

## 5. Full feedback taxonomy

Article-level feedback types:

```text
read_article
good_pick
not_for_me
save
more_like_this
less_like_this
too_basic
too_advanced
already_knew_this
too_similar
could_not_access
```

Slate-level feedback types:

```text
slate_great
slate_okay
slate_poor
```

Feedback surfaces:

```text
email
web_app
mobile_web
admin_test
```

## 6. Feedback meanings and effects

| Feedback | Meaning | Main effect |
|---|---|---|
| read_article | User clicked through | Weak positive signal; mark article as seen/read |
| good_pick | Article was valuable | Strong positive signal for topic/source/style/level |
| not_for_me | Recommendation missed | Reduce similar recommendations; do not overreact once |
| save | User wants to return | Strong positive signal for topic/source/style |
| more_like_this | Directional positive | Increase similar articles |
| less_like_this | Directional negative | Reduce similar articles |
| too_basic | Level too easy | Increase assumed knowledge level for topic |
| too_advanced | Level too hard | Lower assumed knowledge level for topic |
| already_knew_this | Not novel enough | Keep topic interest, increase depth/novelty |
| too_similar | Repetition problem | Increase diversity/repetition penalties |
| could_not_access | Link/paywall/access issue | Penalise source/access, flag for admin review |

## 7. Slate feedback

Ask once per email/web Today page:

```text
How was today’s selection?
[Great] [Okay] [Poor]
```

If user selects `Poor` in the web app, optionally ask:

```text
Too much of the same thing
Too far from my interests
Too basic
Too advanced
Too political
Not enough depth
```

For MVP, optional poor-reason can be stored in feedback metadata.

## 8. Storage

Use `feedback_events` table.

Each event must include:

```text
user_id
article_id, if article-level
recommendation_item_id, if available
recommendation_run_id, if available
feedback_type
feedback_surface
model_version
metadata
created_at
```

Never overwrite old feedback.

If a user clicks `Save` and later clicks `Not for me`, store both events.

## 9. Email feedback links

Email feedback links should be signed.

Signed payload should contain:

```text
user_id
article_id
recommendation_item_id
recommendation_run_id
feedback_type
expiry
```

User should not need to log in for email feedback. Email links open a signed confirmation page; the actual write happens only after a POST so automated link scanners cannot cast preference feedback.

After feedback is submitted, show:

```text
Thanks! Atlus will use this to improve your recommendations.
```

## 10. Feedback-to-profile updates

MVP update rules:

### Good pick

```text
Increase topic affinity slightly.
Increase source affinity slightly.
Increase article type affinity slightly.
```

### Not for me

```text
Decrease similarity boost for this article/topic/source.
If repeated, reduce topic/source affinity.
```

### Save

```text
Strongly increase topic/source/style affinity.
Add to saved_articles.
```

### More like this

```text
Boost embedding-near articles.
Boost related topics.
```

### Less like this

```text
Downrank embedding-near articles.
Downrank related topic/source if repeated.
```

### Too basic

```text
Update/add knowledge assumption for topic as more advanced.
Downrank introductory articles in this topic.
```

### Too advanced

```text
Update/add knowledge assumption for topic as less advanced.
Prefer introductory/intermediate articles.
```

### Already knew this

```text
Keep topic preference.
Increase novelty/depth requirement for topic.
```

### Too similar

```text
Increase recent-topic and duplicate penalties.
```

### Couldn’t access

```text
Add article/source access issue.
Flag for admin.
Do not alter user topic preference.
```

## 11. Feedback weights for later model training

These are not needed for the first rule-based MVP, but store data so they can be used later.

Suggested weights:

```text
good_pick: +1.00
save: +0.90
more_like_this: +0.75
read_article: +0.35
not_for_me: -0.80
less_like_this: -0.75
too_basic: -0.50, mainly knowledge update
too_advanced: -0.50, mainly knowledge update
already_knew_this: -0.35, mainly novelty/depth update
too_similar: -0.45, mainly diversity update
could_not_access: access penalty only
```

## 12. Admin view

Admin should be able to view:

- all feedback events;
- feedback by article;
- feedback by user;
- feedback by recommendation run;
- feedback by source;
- Good pick / Not for me / Save rates;
- access issues.

This is important for early MVP debugging.

## 13. Recommender-v2 readiness additions (v1.4 feedback patch)

The implementation now preserves the meaning of each feedback event rather than collapsing every signal into topic preference:

- `more_like_this` and `less_like_this` use the already-stored article/content and concept embeddings as semantic ranking signals. They still provide a modest topic/source update, but future articles are also compared directly with the article the user reacted to.
- `too_similar` never reduces topic preference. It creates a short-lived semantic repetition penalty for candidates close to the flagged article.
- `could_not_access` creates an access issue and applies a small temporary source-reliability penalty. It does not count as topic dislike.
- knowledge feedback (`too_basic`, `too_advanced`, `already_knew_this`) changes the inferred level rather than topic preference.

Feedback insertion plus synchronous derived database effects is performed by `record_feedback_event_atomic(...)` in one PostgreSQL transaction. The function serialises duplicate logical events so retries cannot double-apply learned weights. Aggregate user embeddings remain a derived cache and are refreshed after the transaction.

### Exposure logging

`recommendation_impressions` records a web impression only after at least 50% of an article card enters the viewport. This distinguishes "selected for a slate" from "actually exposed to the user". Missing feedback must not be treated as a negative label.

Email delivery remains available separately through `email_deliveries`; an email being sent is not treated as proof the recipient saw an individual recommendation.

### Exploration propensity

Selected candidates log both `selection_probability` and `selection_policy`. Discovery epsilon exploration therefore retains the propensity required for later off-policy/contextual-bandit evaluation rather than only a boolean `exploration` flag.

### Email scanner safety

Signed email feedback URLs are now GET-only confirmation pages. Preference-changing feedback is written only by a POST after the user confirms it. Web-app feedback buttons POST directly. The read-through redirect remains a deliberately weak click signal and should not be treated as proof that the article was read in full.

### Slate ratings

All slate votes remain append-only raw events. `latest_slate_feedback` exposes only the most recent Great/Okay/Poor vote per user/run for evaluation if the user changes their mind.
