# Source expansion before MVP

The ingestion code is now built for dozens of RSS/API sources and runs four times daily, but source acquisition is still a product/rights task rather than something the recommender can solve automatically.

## MVP target

- 20–50 permitted sources.
- Hundreds to low thousands of active articles.
- Mix of news, analysis, essays and explainers.
- Different editorial perspectives and specialist publications.
- Current and evergreen inventory.

## Adding a source

Each source must have an explicit `rights_status`. Use `metadata_only` unless Atlus has permission to temporarily process or retain fuller content. Metadata-only sources should never write RSS article bodies to `temporary_article_texts`.

The included seed provides Guardian section feeds as a local metadata-only test pack. It is deliberately not presented as a production rights catalogue. Publisher/API/RSS terms must be reviewed before commercial use.

## Operations

The ingestion job now:

- runs every six hours;
- canonicalises tracking URLs;
- skips URL and exact-content duplicates;
- times out unresponsive feeds;
- records source errors;
- retries failed feeds with exponential backoff;
- retries failed article processing up to three times;
- deletes temporary processing text after successful derivation;
- exposes source health in the article admin page.
