# 🚀 Enterprise LinkedIn Jobs & Search URL Scraper

[![Apify Actor](https://img.shields.io/badge/Apify-Actor-orange.svg)](https://apify.com)
[![Pay-Per-Result](https://img.shields.io/badge/Pricing-Pay--Per--Result-blue.svg)](https://apify.com)
[![License: ISC](https://img.shields.io/badge/License-ISC-green.svg)](https://opensource.org/licenses/ISC)

The **LinkedIn Jobs & Search URL Scraper** is an enterprise-grade, high-performance Apify Actor designed to extract structured job listings directly from LinkedIn searches or raw LinkedIn search URLs. 

Whether you are automating recruitment pipelines, analyzing hiring market trends, monitoring competitor hiring, or building job boards, this scraper delivers clean, normalized, deduplicated job data at scale with zero friction.

---

## ✨ Key Features

- 🔗 **Direct LinkedIn Search URL Support**: Simply copy & paste any search URL from LinkedIn (e.g. `https://www.linkedin.com/jobs/search-results/?keywords=React&location=Bengaluru&f_TPR=r86400`). The actor automatically parses keywords, location, recency filters (`f_TPR`), job type (`f_JT`), experience level (`f_E`), and workplace mode (`f_WT`).
- 🇮🇳 **Optimized Indian & Global Market Defaults**: Comes pre-configured with default Indian job market values (`countryName: "India"`, `locationName: "India"`, `includeKeyword: "software engineer"`) while seamlessly supporting any global location or country.
- 🎯 **Comprehensive Filter Suite**: Filter by workplace type (Remote, Hybrid, On-site), experience level (Internship to Executive), employment type (Full-time, Part-time, Contract, Intern), hiring company name, and salary bounds.
- ⚡ **Batch Keywords & Multi-Location Searches**: Pass arrays of target keywords (e.g., `["Frontend", "Backend", "DevOps"]`) and multiple location targets in a single run.
- 🛡️ **In-Run Deduplication**: Automatically deduplicates duplicate job postings across pagination and target locations using unique job identifiers.
- 📦 **24-Hour Built-in Smart Caching**: Prevents redundant upstream requests and saves compute cost by caching search signatures in Apify's `KeyValueStore`. Bypass anytime with `forceFresh: true`.
- 🔄 **Exponential Backoff Resilience**: Built-in HTTP retries handle temporary network blips or rate limits without failing actor execution.
- 💰 **Apify Pay-Per-Result Integration**: Fully compliant with Apify's Pay-Per-Result monetization model via `Actor.charge({ eventName: 'job-scraped' })`.

---

## ⚡ Quick Start

### 1. Simple Run via Apify Console UI
1. Select the Actor in **Apify Store**.
2. Either paste a direct **LinkedIn Search URL** OR enter your search keywords and location (defaults to **India**).
3. Click **Start** to run the scraper and view structured output in the **Output** tab.

### 2. Local Setup & Execution

```bash
# Clone repository
git clone <repository-url>
cd linkedle-x-jobs-apify

# Install dependencies
npm install

# Run locally using test input (storage/key_value_stores/default/INPUT.json)
npm start
```

---

## 🔗 Direct LinkedIn Search URL Parsing

Instead of configuring individual filter dropdowns, you can pass a direct LinkedIn search URL in the `searchUrl` input parameter:

```json
{
  "searchUrl": "https://www.linkedin.com/jobs/search-results/?currentJobId=4477677066&keywords=Schaeffler&origin=JOB_SEARCH_PAGE_JOB_FILTER&referralSearchId=J%2Bk0SjJ72rbzfZS5ZH1ZDA%3D%3D&f_TPR=r86400&f_SAL=f_SA_id_227001%3A276001",
  "maxResults": 25
}
```

### Extracted Parameters Table
| LinkedIn Query Parameter | Extracted Field | Mapped Value Example |
| :--- | :--- | :--- |
| `keywords` / `keyword` | `includeKeyword` | `"Schaeffler"` |
| `location` | `locationName` | `"Bengaluru, India"` |
| `f_TPR=r86400` | `datePosted` | `"today"` (Past 24 hours) |
| `f_TPR=r604800` | `datePosted` | `"week"` (Past 7 days) |
| `f_WT=2` | `workplaceType` | `"remote"` |
| `f_E=2,3` | `experienceLevel` | `"entry,associate"` |
| `f_JT=F` | `jobType` | `"FULLTIME"` |

---

## ⚙️ Input Configuration Reference

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `searchUrl` | `String` | `""` | Direct LinkedIn job search URL. Overrides manual keyword & filter fields. |
| `includeKeyword` | `String` | `"software engineer"` | Primary job title or skills to search (e.g. "React Developer"). |
| `keywords` | `Array<String>` | `[]` | Batch search keyword list (e.g. `["Frontend", "Backend"]`). |
| `locationName` | `String` | `"India"` | City, state, or region (e.g. "Bengaluru", "Mumbai", "New York"). |
| `countryName` | `String` | `"India"` | Country identifier (e.g. "India", "USA", "UK"). |
| `companyName` | `String` | `""` | Filter postings by specific hiring company name. |
| `jobType` | `String` | `"all"` | Filter by employment type: `"all"`, `"FULLTIME"`, `"PARTTIME"`, `"CONTRACTOR"`, `"INTERN"`. |
| `workplaceType` | `String` | `"all"` | Filter workplace mode: `"all"`, `"on-site"`, `"remote"`, `"hybrid"`. |
| `experienceLevel` | `String` | `"all"` | Experience level: `"all"`, `"internship"`, `"entry"`, `"associate"`, `"mid_senior"`, `"director"`, `"executive"`. |
| `datePosted` | `String` | `"all"` | Posting recency: `"all"`, `"today"`, `"3days"`, `"week"`, `"month"`. |
| `minSalary` | `Integer` | `null` | Minimum salary threshold. |
| `maxSalary` | `Integer` | `null` | Maximum salary threshold. |
| `pagesToFetch` | `Integer` | `1` | Number of result pages to fetch per query (1-50). |
| `maxResults` | `Integer` | `50` | Maximum total records cap across all queries. |
| `targetLocations` | `Array<String>` | `[]` | Supplementary batch location list (e.g. `["Bengaluru", "Hyderabad", "Pune"]`). |
| `fetchFullDescription` | `Boolean` | `true` | When `true`, extracts full HTML/text description. |
| `forceFresh` | `Boolean` | `false` | When `true`, bypasses 24-hour cache and retrieves live data. |
| `proxyConfiguration` | `Object` | `null` | Apify Proxy configuration for enterprise routing. |

---

## 📊 Sample Output (Dataset Item)

```json
{
  "job_title": "React JS & Node JS Developer",
  "company_name": "Tata Consultancy Services",
  "location": "Bengaluru, Karnataka",
  "posted_via": "LinkedIn",
  "salary": null,
  "date": "2 days ago",
  "URL": "https://in.linkedin.com/jobs/view/react-js-node-js-developer-at-tata-consultancy-services-4477155165",
  "description": "Role: React JS & Node JS Developer\nExperience: 6–8 Years\nLocation: Chennai / Bangalore / Hyderabad\n\nRequired Skills:\n- 6–8 years of software development experience.\n- Strong expertise in React JS, TypeScript, JavaScript ES6+.\n- Hands-on experience with Node.js and REST API development.",
  "scrapedAt": "2026-10-10T02:13:04.382Z",
  "searchQuery": "React Developer in Bengaluru, India"
}
```

---

## 🧠 How It Works

```
  ┌───────────────────────────┐
  │   Actor Input Received    │
  └─────────────┬─────────────┘
                │
                ▼
  ┌───────────────────────────┐
  │  Parse searchUrl (if any) │
  └─────────────┬─────────────┘
                │
                ▼
  ┌───────────────────────────┐
  │  Validate Parameters      │ ──► Throws descriptive error on unknown parameters
  └─────────────┬─────────────┘
                │
                ▼
  ┌───────────────────────────┐
  │  Check 24h Cache Store    │ (Skipped if forceFresh: true)
  └──────┬─────────────┬──────┘
         │             │
  (Cache Hit)     (Cache Miss)
         │             │
         │             ▼
         │      ┌───────────────────────────────┐
         │      │ Fetch Live Data (With Retries)│
         │      └──────────────┬────────────────┘
         │                     │
         └──────────────┬──────┘
                        ▼
  ┌───────────────────────────┐
  │ In-Run Deduplication      │ ──► Deduplicates by unique job ID / URL
  └─────────────┬─────────────┘
                │
                ▼
  ┌───────────────────────────┐
  │ Normalize & Format Record │ ──► ISO 8601 timestamps, clean text & null fallbacks
  └─────────────┬─────────────┘
                │
                ▼
  ┌───────────────────────────┐
  │ Push to Apify Dataset     │
  └─────────────┬─────────────┘
                │
                ▼
  ┌───────────────────────────┐
  │ Charge Pay-Per-Result Event│ ──► Actor.charge({ eventName: 'job-scraped' })
  └───────────────────────────┘
```

---

## 💎 Monetization & Pay-Per-Result Pricing

This Actor utilizes Apify's **Pay-Per-Event / Pay-Per-Result** pricing model:
- **Free Tier Users**: Runs are capped to **10 results**, 1 page to preserve platform compute resources while offering instant evaluation.
- **Paid / Subscription Users**: Unlocks high-volume multi-page scraping, batch keyword queries, multi-location targeting, and full descriptions. Charged strictly per scraped job result via `Actor.charge({ eventName: 'job-scraped', count: jobs.length })`.

---

## ❓ Frequently Asked Questions (FAQ)

### Q: Can I pass raw LinkedIn search URLs from my browser?
**Yes!** Simply copy the URL from your browser address bar after filtering on LinkedIn and paste it into the `searchUrl` field. The actor will parse the query parameters automatically.

### Q: How are duplicate jobs handled?
The scraper performs in-run deduplication using unique LinkedIn job IDs extracted from URLs. If the same job posting appears across multiple pages or target locations in the same run, it is pushed to the dataset only once.

### Q: How do I force fresh data instead of cached results?
Set `"forceFresh": true` in your input. This instructs the actor to ignore the 24-hour KeyValueStore cache and fetch live listings.

---

## 📄 License & Compliance

Licensed under the **ISC License**. Designed for ethical, rate-limited public data aggregation in accordance with Apify platform guidelines and terms of service.
