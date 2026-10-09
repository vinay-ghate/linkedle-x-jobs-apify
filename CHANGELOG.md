# Changelog

All notable changes to the LinkedIn Jobs & Search URL Scraper actor will be documented in this file.

## [1.0.0] - 2026-10-10

### Added
- Direct **LinkedIn Search URL** parsing (`searchUrl`), automatically extracting keywords, location, recency (`f_TPR`), workplace mode (`f_WT`), experience level (`f_E`), and employment type (`f_JT`).
- Default **Indian job market** presets (`countryName: "India"`, `locationName: "India"`, `includeKeyword: "software engineer"`).
- Multi-filter search suite: `workplaceType` (On-site, Remote, Hybrid), `experienceLevel`, `jobType`, `companyName`, `minSalary`, `maxSalary`.
- Batch keyword list input (`keywords`) and batch target locations (`targetLocations`).
- Apify **Pay-Per-Result monetization** (`Actor.charge`) integration.
- Apify UI Console input schema (`.actor/input_schema.json`) with proxy configuration editor support.
- Apify dataset schema (`.actor/dataset_schema.json`) with interactive Overview table view.
- In-run job deduplication by unique job ID / URL.
- Exponential backoff retries for upstream network resilience.
- Real-time run log status messages via `Actor.setStatusMessage`.
- `forceFresh` boolean flag to bypass 24-hour KeyValueStore caching when live data is explicitly required.
- Dockerfile (`.actor/Dockerfile`) for standard Apify container builds.
