# Atlus Email Spec

## 1. Purpose

The daily email is the main Atlus product surface.

It should feel like a small, carefully chosen reading selection, not a normal newsletter or feed digest.

The email should:

- show the user’s daily recommendations;
- explain why each article was chosen;
- link directly to the original article via Atlus redirect;
- collect lightweight feedback;
- direct users to the web app for more detail.

## 2. Subject line

Default subject:

```text
Atlus: Worth Your Time Today
```

Possible later variants:

```text
Your Atlus Reading List
Atlus: Three Worthwhile Reads
Atlus: Today’s Reading
```

For MVP, use one consistent subject line.

## 3. Sender name

Use:

```text
Atlus
```

Optional later:

```text
Henry from Atlus
Atlus Reading
```

For MVP, keep sender name simple and brand-led.

## 4. Email structure

```text
Header
Short intro
Article cards
Slate feedback
Footer
```

## 5. Header

Example:

```text
Atlus
Worth your time today
```

## 6. Intro copy

Keep intro short.

Example:

```text
Here are today’s recommendations, chosen around your interests, goals, and reading level.
```

Avoid long commentary before the articles.

## 7. Article card

Each article card should include:

```text
[Slot type]
[Article title]
[Publisher] · [reading time, only when known]

Why Atlus chose it:
[Short explanation]

[Read article]
[Good pick] [Not for me] [Save] [More feedback]
```

## 8. Slot labels

Use:

```text
Core
Stretch
Discovery
```

Optional short descriptions:

```text
Core — close to your interests
Stretch — builds a learning goal
Discovery — widens your view
```

In the email, avoid over-explaining these every day.

## 9. Example Standard email

```text
Atlus
Worth your time today

Here are today’s recommendations, chosen around your interests, goals, and reading level.

Core
How Britain should regulate frontier AI
Works in Progress · 9 min read

Why Atlus chose it:
This matches your interest in AI policy and your goal of understanding regulation without hype.

[Read article]
[Good pick] [Not for me] [Save] [More feedback]

Stretch
The housing theory behind Britain’s productivity problem
Publisher · 11 min read

Why Atlus chose it:
You said you want to understand economics better. This gives a clear explanation of a current policy debate without assuming specialist knowledge.

[Read article]
[Good pick] [Not for me] [Save] [More feedback]

Discovery
What electricity grids can teach us about progress
Publisher · 7 min read

Why Atlus chose it:
This is outside your usual reading, but it connects to your interest in how technology changes society.

[Read article]
[Good pick] [Not for me] [Save] [More feedback]

How was today’s selection?
[Great] [Okay] [Poor]

You are receiving this because you signed up for Atlus.
[Open Atlus] [Change settings] [Unsubscribe]
```

## 10. Feedback links

Visible email feedback per article:

```text
Good pick
Not for me
Save
More feedback
```

Do not show every feedback option in the email. It creates too many buttons.

`More feedback` should open a web page with detailed options.

## 11. Link behaviour

### Read article

The read link should route through Atlus first:

```text
User clicks Read article
→ Atlus records read_article/click event
→ Atlus redirects to original article
```

Example URL:

```text
https://joinatlus.com/r/{signed_token}
```

### Feedback links

Feedback links should be signed URLs.

Example:

```text
https://joinatlus.com/f/{signed_token}
```

The token should contain or reference:

```text
user_id
article_id
recommendation_item_id
recommendation_run_id
feedback_type
expiry
```

After clicking feedback, show a simple confirmation page.

Example:

```text
Thanks! Atlus will use this to improve your recommendations.
```

Do not require login for one-click email feedback.

## 12. More feedback page

When the user clicks `More feedback`, show:

```text
What should Atlus learn from this article?

[More like this]
[Less like this]
[Too basic]
[Too advanced]
[Already knew this]
[Too similar]
[Couldn’t access]
```

After selection, show confirmation.

## 13. Slate feedback

At the bottom of the email:

```text
How was today’s selection?
[Great] [Okay] [Poor]
```

These should also be signed feedback links.

In the web app, if the user selects `Poor`, ask for an optional reason.

## 14. Footer

Footer must include:

- why the user is receiving the email;
- open web app link;
- change settings link;
- unsubscribe link;
- company/contact details if required by email provider/compliance.

Example:

```text
You are receiving this because you signed up for Atlus.
Open Atlus · Change settings · Unsubscribe
```

## 15. Email delivery

Use Resend or equivalent.

Requirements:

- daily scheduled send;
- test email to admin;
- per-user delivery time later;
- bounce handling;
- unsubscribe handling;
- logs for send success/failure.

For MVP, daily send can use one global send time.

## Reading-time rule

Only show a reading-time estimate when Atlus had enough article body text to estimate the article itself, or when a publisher supplies an explicit duration. Do not extrapolate a full-article reading time from a headline, metadata or RSS excerpt. When unknown, show the publisher name alone.

## 16. Email rendering

Use React Email or equivalent if using a React/Next.js stack.

Keep design:

- clean;
- minimal;
- mobile-friendly;
- no heavy images required;
- clear buttons;
- readable spacing.

## 17. Email states

Handle:

- normal daily slate;
- fallback slate;
- empty/no-send state;
- test email;
- onboarding incomplete reminder.

For MVP, avoid sending a daily email to users who have not completed onboarding.

## 18. Metrics

Track:

- sent;
- delivered, if provider supports it;
- bounced;
- opened, if used;
- read article clicks;
- Good pick clicks;
- Not for me clicks;
- Save clicks;
- More feedback clicks;
- unsubscribe.

Open tracking is useful but not fully reliable. Treat clicks and explicit feedback as stronger signals.
