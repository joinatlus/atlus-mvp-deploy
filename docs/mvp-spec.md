# Atlus MVP Spec

## 1. Product goal

Atlus is an email-first personalised article recommendation product.

The MVP should prove the core loop:

```text
user onboarding
→ user profile and assumptions
→ article import/processing
→ daily recommendation slate
→ email delivery
→ feedback collection
→ next recommendations improve
```

The MVP should not be a full publishing platform, social feed, or large-scale recommender system. It should be the smallest real product that sends useful daily article recommendations and learns from user feedback.

## 2. Primary product surface

The daily email is the main product surface.

The web app supports the email. It should let users:

- complete onboarding;
- view today’s recommendations;
- view past recommendations;
- save articles;
- inspect and edit profile assumptions;
- adjust settings;
- give detailed feedback.

The web app should not become an infinite feed.

## 3. Target users for MVP

Initial users are invited testers, friends, founders, and early interested readers.

The product should support a small private beta of roughly 10–100 users before wider launch.

## 4. Core user journey

1. User signs up with email.
2. User completes onboarding.
3. Atlus generates user assumptions:
   - interests;
   - learning goals;
   - knowledge levels;
   - reading mode.
4. User confirms or edits assumptions.
5. Atlus imports and processes articles.
6. Atlus generates a daily slate.
7. User receives the daily email.
8. User clicks articles and gives feedback.
9. Feedback updates future recommendations.

## 5. Reading modes

Support three reading modes:

```text
Light:    1 article per day
Standard: 3 articles per day
Deep:     5 articles per day
```

Default reading mode: `Standard`.

## 6. Recommendation categories

Every recommendation item should have one slot type:

```text
Core
Stretch
Discovery
```

Definitions:

- `Core`: close to the user’s stated interests.
- `Stretch`: connected to a user learning goal.
- `Discovery`: outside the user’s usual topics but still usefully connected.

Default slate composition:

```text
Light:    1 strongest overall article, rotating slot type over time
Standard: 1 Core, 1 Stretch, 1 Discovery
Deep:     2 Core, 2 Stretch, 1 Discovery
```

## 7. MVP pages

### 7.1 Public landing page

Purpose:

- explain Atlus;
- show example daily recommendations;
- collect email signup;
- make the privacy promise clear.

Must include:

- short product description;
- explanation that Atlus sends a few worthwhile articles per day;
- no infinite feed;
- CTA to sign up.

### 7.2 Auth

Use Supabase Auth or equivalent.

MVP auth method:

- email magic link.

### 7.3 Onboarding

Collect:

- topics the user enjoys;
- topics the user wants to understand better;
- topics/sources they want less of;
- current knowledge level for selected topics;
- preferred article length;
- reading mode;
- preferred delivery time.

Onboarding should create visible assumptions, not just hidden model data.

### 7.4 Assumptions page

Show active assumptions in plain English.

Users must be able to:

- confirm assumption;
- edit assumption;
- delete assumption.

Assumption examples:

```text
Preference: interested in AI policy
Goal: wants to understand economics better
Knowledge: already understands basic machine learning
Avoidance: wants less celebrity news
```

### 7.5 Today page

Shows the same articles as the daily email.

Each article card should include:

- slot type;
- title;
- publisher;
- estimated reading time;
- why Atlus chose it;
- Read article button;
- Good pick;
- Not for me;
- Save;
- More feedback.

### 7.6 Archive page

Shows previous recommendation slates.

Users should be able to filter by:

- saved;
- read;
- positive feedback;
- date.

### 7.7 Settings page

Users can change:

- reading mode;
- delivery time;
- email preferences;
- blocked topics;
- blocked sources;
- account deletion/export options.

For MVP, account deletion/export can be manual/admin-assisted if the user-facing controls are not yet fully automated, but the data model should support them.

### 7.8 Admin page

MVP admin must support:

- manually adding articles;
- importing article lists from RSS/API where available;
- editing article metadata;
- marking article topics;
- marking article quality;
- generating recommendations for a test user;
- triggering a daily email test;
- viewing feedback events.

## 8. Article source strategy for MVP

Start with a small approved set of sources.

MVP source methods:

1. Manual article import.
2. RSS import for trusted sources.
3. Partner/import lists where available.

Do not build a large uncontrolled web crawler.

Each article must have:

- publisher;
- canonical URL;
- title;
- publication date if available;
- reading time;
- topic labels;
- quality status;
- rights status.

Only active articles can be recommended.

## 9. MVP article processing

For each imported article:

1. Normalise metadata.
2. Check rights status.
3. Deduplicate by canonical URL.
4. Estimate reading time.
5. Assign topics.
6. Assign complexity level.
7. Generate embedding if text/summary is available.
8. Mark article status as active only after required fields exist.

Use manual review where automation is uncertain.

## 10. Daily recommendation generation

MVP daily generation can run via a scheduled cron job.

For each active user:

1. Load user profile and assumptions.
2. Load active articles not previously shown to the user.
3. Generate candidates.
4. Score candidates.
5. Build slate according to reading mode.
6. Store recommendation run and recommendation items.
7. Send email.

## 11. Email MVP

Subject line:

```text
Atlus: Worth Your Time Today
```

Each article in the email should include:

- slot type;
- title;
- publisher;
- reading time;
- explanation;
- Read article link;
- Good pick link;
- Not for me link;
- Save link;
- More feedback link.

Email links should use signed Atlus URLs, then redirect where necessary.

## 12. Feedback MVP

Feedback must be stored as append-only events.

Email-visible feedback:

```text
Good pick
Not for me
Save
More feedback
```

Web detailed feedback:

```text
More like this
Less like this
Too basic
Too advanced
Already knew this
Too similar
Couldn’t access
```

Feedback should influence future recommendations with simple rules before any trained model exists.

## 13. MVP out of scope

Do not build these in the first MVP:

- publisher dashboard;
- paid subscriptions;
- mobile app;
- contextual bandits;
- learning-to-rank model;
- full model registry UI;
- complex permissions system;
- social features;
- infinite feed;
- broad open-web crawling;
- automated legal/rightsholder workflow;
- chat-based profile editing.

## 14. Success criteria

The MVP succeeds if early users say:

- the emails contain articles they actually want to read;
- recommendations feel personal;
- explanations make sense;
- feedback changes future recommendations;
- the daily format feels calmer than a feed;
- they would keep receiving it.

Track:

- email open rate;
- article click rate;
- Good pick rate;
- Not for me rate;
- Save rate;
- unsubscribe rate;
- repeat usage over 2–4 weeks.

## 15. Suggested build order

1. Project scaffold.
2. Supabase schema.
3. Auth.
4. Landing page.
5. Onboarding.
6. Assumptions page.
7. Admin article import.
8. Article processing helpers.
9. Recommender v1.
10. Today page.
11. Email rendering and sending.
12. Feedback links.
13. Archive/saved articles.
14. Daily cron job.
15. Admin feedback view.
16. Private beta.
