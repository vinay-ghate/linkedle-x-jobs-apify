// main.js - Enterprise LinkedIn Jobs & Search URL Scraper for Apify
const { Actor, log } = require("apify");
const { default: axios } = require("axios");

// Tier limits
const FREE_LIMIT = 10;
const FREE_LIMITS = { maxResults: FREE_LIMIT, maxPages: 1, maxLocations: 1 };
const PAID_LIMITS = { maxResults: null, maxPages: 10, maxLocations: 10 };

// 24-hour cache TTL
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const ALLOWED_INPUT_FIELDS = [
  "searchUrl",
  "includeKeyword",
  "keywords",
  "locationName",
  "countryName",
  "pagesToFetch",
  "companyName",
  "jobType",
  "workplaceType",
  "experienceLevel",
  "datePosted",
  "minSalary",
  "maxSalary",
  "targetLocations",
  "maxResults",
  "fetchFullDescription",
  "forceFresh",
  "proxyConfiguration",
];

const KNOWN_TECH_SKILLS = [
  "React", "Node.js", "TypeScript", "JavaScript", "Python", "Java", "C++", "C#", ".NET",
  "Go", "Golang", "Rust", "PHP", "Ruby", "Swift", "Kotlin", "SQL", "PostgreSQL", "MongoDB",
  "Redis", "GraphQL", "REST API", "AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD",
  "Git", "Microservices", "Spring Boot", "Django", "Flask", "Next.js", "Vue.js", "Angular",
  "Tailwind", "HTML5", "CSS3", "Agile", "Scrum", "DevOps", "Machine Learning", "AI", "AppSec"
];

/**
 * Clean up location string by stripping duplicate country suffixes
 */
function cleanLocation(locStr, country) {
  if (!locStr) return country || "India";
  let loc = locStr.trim();
  if (country) {
    const countryRegex = new RegExp(`,\\s*${country}$`, "i");
    loc = loc.replace(countryRegex, "").trim();
  }
  return loc || country || "India";
}

/**
 * Parse direct LinkedIn Search URL query parameters
 */
function parseLinkedInUrl(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return {};
  try {
    const parsed = new URL(urlStr.trim());
    const params = parsed.searchParams;
    const extracted = {};

    const keywords = params.get("keywords") || params.get("keyword");
    if (keywords) extracted.includeKeyword = decodeURIComponent(keywords);

    const location = params.get("location");
    if (location) extracted.locationName = decodeURIComponent(location);

    const tpr = params.get("f_TPR");
    if (tpr === "r86400") extracted.datePosted = "today";
    else if (tpr === "r604800") extracted.datePosted = "week";
    else if (tpr === "r2592000") extracted.datePosted = "month";

    const wt = params.get("f_WT");
    if (wt) {
      const wtMap = { "1": "on-site", "2": "remote", "3": "hybrid" };
      const parts = wt.split(",").map((v) => wtMap[v.trim()]).filter(Boolean);
      if (parts.length > 0) extracted.workplaceType = parts[0];
    }

    const exp = params.get("f_E");
    if (exp) {
      const expMap = {
        "1": "internship",
        "2": "entry",
        "3": "associate",
        "4": "mid_senior",
        "5": "director",
        "6": "executive",
      };
      const parts = exp.split(",").map((v) => expMap[v.trim()]).filter(Boolean);
      if (parts.length > 0) extracted.experienceLevel = parts[0];
    }

    const jt = params.get("f_JT");
    if (jt) {
      const jtMap = {
        F: "FULLTIME",
        P: "PARTTIME",
        C: "CONTRACTOR",
        I: "INTERN",
      };
      const parts = jt.split(",").map((v) => jtMap[v.trim()]).filter(Boolean);
      if (parts.length > 0) extracted.jobType = parts[0];
    }

    return extracted;
  } catch (err) {
    log.warning(`Could not parse LinkedIn search URL: ${urlStr}. Error: ${err.message}`);
    return {};
  }
}

/**
 * Validate input fields against allowed list
 */
function validateInput(input) {
  const unsupported = Object.keys(input).filter(
    (key) => !ALLOWED_INPUT_FIELDS.includes(key)
  );
  if (unsupported.length > 0) {
    throw new Error(
      `Unsupported parameter${unsupported.length > 1 ? "s" : ""}: ` +
        `${unsupported.join(", ")}. Allowed parameters: ` +
        `${ALLOWED_INPUT_FIELDS.join(", ")}.`
    );
  }
}

/**
 * Build idempotent cache key based on query signature
 */
function buildCacheKey(queryInput, isFreeUser) {
  const parts = [
    queryInput.includeKeyword || "all",
    queryInput.countryName || "India",
    queryInput.locationName || "India",
    queryInput.companyName || "",
    queryInput.jobType || "",
    queryInput.workplaceType || "",
    queryInput.experienceLevel || "",
    queryInput.datePosted || "all",
    queryInput.pagesToFetch || 1,
  ];
  const base = parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "_");
  const suffix = isFreeUser ? "_free" : "_paid";
  const truncated = base.slice(0, 250 - suffix.length).replace(/_+$/, "");
  return `${truncated}${suffix}`;
}

/**
 * Perform API request with exponential backoff retries
 */
async function fetchJobsWithRetry(payload, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      const response = await axios.post(
        "https://api.orgupdate.com/search-jobs-v1",
        payload,
        {
          headers: { "User-Agent": "ApifyActor-LinkedInJobs/1.0" },
          timeout: 25000,
        }
      );
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (err) {
      const isLast = attempt >= maxRetries;
      const status = err.response ? err.response.status : null;
      log.warning(
        `API attempt ${attempt}/${maxRetries} failed: ${err.message}${
          status ? ` (HTTP ${status})` : ""
        }`
      );
      if (isLast) {
        log.error(`API request failed after ${maxRetries} retries.`);
        return [];
      }
      const backoffMs = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
  return [];
}

/**
 * Extract unique job key for deduplication
 */
function getJobUniqueKey(job) {
  if (!job || (!job.URL && !job.jobUrl && !job.url)) return Math.random().toString();
  const url = job.URL || job.jobUrl || job.url;
  const match = url.match(/(\d{8,12})/);
  if (match) return match[1];
  return url.toLowerCase().trim();
}

/**
 * Normalize and enrich output job record
 */
function normalizeJobItem(rawItem, fetchFullDescription, searchQuery) {
  const jobTitle = String(rawItem.job_title || rawItem.jobTitle || "Untitled Position").trim();
  const companyName = rawItem.company_name || rawItem.companyName ? String(rawItem.company_name || rawItem.companyName).trim() : null;
  const location = rawItem.location ? String(rawItem.location).trim() : null;
  const postedVia = String(rawItem.posted_via || rawItem.postedVia || "LinkedIn").trim();
  const rawSalary = rawItem.salary;
  const salary = rawSalary && rawSalary !== "N/A" ? String(rawSalary).trim() : null;
  const date = rawItem.date || rawItem.postedDate || rawItem.posted_date ? String(rawItem.date || rawItem.postedDate || rawItem.posted_date).trim() : null;
  const url = String(rawItem.URL || rawItem.jobUrl || rawItem.job_url || "").trim();
  let description = rawItem.description ? String(rawItem.description).trim() : null;

  // Extract job ID from URL
  const idMatch = url.match(/(\d{8,12})/);
  const jobId = idMatch ? idMatch[1] : null;

  // Remote position detection
  const isRemote = Boolean(
    (location && /remote|work from home|wfh/i.test(location)) ||
    (description && /remote|work from home|wfh/i.test(description))
  );

  // Skill detection from description
  const detectedSkills = description
    ? KNOWN_TECH_SKILLS.filter((skill) => {
        const regex = new RegExp("\\b" + skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "\\b", "i");
        return regex.test(description);
      })
    : [];

  if (description && !fetchFullDescription) {
    description = description.slice(0, 200) + "...";
  }

  return {
    job_id: jobId,
    job_title: jobTitle,
    jobTitle: jobTitle,
    company_name: companyName,
    companyName: companyName,
    location: location,
    is_remote: isRemote,
    posted_via: postedVia,
    salary: salary,
    date: date,
    postedDate: date,
    URL: url,
    url: url,
    jobUrl: url,
    description: description,
    skills_detected: detectedSkills,
    scrapedAt: new Date().toISOString(),
    searchQuery: searchQuery,
  };
}

Actor.main(async () => {
  await Actor.setStatusMessage("Initializing LinkedIn Jobs Scraper...");
  const rawInput = (await Actor.getInput()) || {};
  validateInput(rawInput);

  // 1. Parse searchUrl if provided
  let urlParams = {};
  if (rawInput.searchUrl) {
    log.info(`Parsing LinkedIn Search URL: ${rawInput.searchUrl}`);
    urlParams = parseLinkedInUrl(rawInput.searchUrl);
  }

  // 2. Resolve keyword list (supports array, string, or URL extraction)
  let keywordList = [];
  if (Array.isArray(rawInput.keywords) && rawInput.keywords.length > 0) {
    keywordList = rawInput.keywords;
  } else if (typeof rawInput.keywords === "string" && rawInput.keywords.trim()) {
    keywordList = rawInput.keywords.split(",").map((k) => k.trim()).filter(Boolean);
  } else if (urlParams.includeKeyword) {
    keywordList = [urlParams.includeKeyword];
  } else if (rawInput.includeKeyword) {
    keywordList = [rawInput.includeKeyword];
  } else {
    // Default Indian search keyword
    keywordList = ["software engineer"];
  }

  // 3. Resolve location & filter parameters with Indian defaults
  const countryName = rawInput.countryName || "India";
  const rawLocation = urlParams.locationName || rawInput.locationName || "India";
  const primaryLocation = cleanLocation(rawLocation, countryName);
  const companyName = rawInput.companyName || "";
  const jobType = urlParams.jobType || rawInput.jobType || "all";
  const workplaceType = urlParams.workplaceType || rawInput.workplaceType || "all";
  const experienceLevel = urlParams.experienceLevel || rawInput.experienceLevel || "all";
  const datePosted = urlParams.datePosted || rawInput.datePosted || "all";
  const pagesToFetch = rawInput.pagesToFetch || 1;
  const maxResultsCap = rawInput.maxResults || 50;
  const fetchFullDescription = rawInput.fetchFullDescription !== false;
  const forceFresh = Boolean(rawInput.forceFresh);

  // Target locations
  const targetLocations =
    Array.isArray(rawInput.targetLocations) && rawInput.targetLocations.length > 0
      ? rawInput.targetLocations.map((l) => cleanLocation(l, countryName))
      : [primaryLocation];

  // 4. Subscription check & pricing limits
  const env = Actor.getEnv();
  const userIsPaying = Boolean(env.userIsPaying);
  const limits = userIsPaying ? PAID_LIMITS : FREE_LIMITS;

  const actualMaxResults = userIsPaying
    ? maxResultsCap
    : Math.min(maxResultsCap, FREE_LIMIT);
  const actualPagesToFetch = userIsPaying
    ? Math.min(pagesToFetch, limits.maxPages)
    : 1;

  log.info(
    `User Plan: ${userIsPaying ? "PAID" : "FREE"}. Result cap: ${actualMaxResults}, Pages: ${actualPagesToFetch}, Default Market: ${countryName}`
  );

  const store = await Actor.openKeyValueStore();
  const seenJobKeys = new Set();
  const allCollectedJobs = [];

  // 5. Query execution across keywords & locations
  for (const keyword of keywordList) {
    if (allCollectedJobs.length >= actualMaxResults) break;

    for (const loc of targetLocations) {
      if (allCollectedJobs.length >= actualMaxResults) break;

      const queryInput = {
        includeKeyword: keyword,
        countryName,
        locationName: loc,
        companyName,
        jobType,
        workplaceType,
        experienceLevel,
        datePosted,
        pagesToFetch: actualPagesToFetch,
      };

      const searchQueryStr =
        loc.toLowerCase() === countryName.toLowerCase()
          ? `${keyword} in ${countryName}`
          : `${keyword} in ${loc}, ${countryName}`;

      await Actor.setStatusMessage(`Searching: "${searchQueryStr}"...`);

      const cacheKey = buildCacheKey(queryInput, !userIsPaying);
      let rawJobs = null;

      // Check cache unless forceFresh is set
      if (!forceFresh) {
        const cached = await store.getValue(cacheKey);
        if (cached && cached.cachedAt && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
          log.info(`Cache HIT for query: "${searchQueryStr}"`);
          rawJobs = cached.data;
        }
      }

      if (!rawJobs) {
        log.info(`Fetching live data from OrgUpdate API for: "${searchQueryStr}"`);
        rawJobs = await fetchJobsWithRetry({
          ...queryInput,
          isFreeUser: !userIsPaying,
          maxResults: limits.maxResults,
          maxPages: actualPagesToFetch,
          maxLocations: limits.maxLocations,
          source: "linkedin",
        });

        // Fallback check if strict date filter returned 0 items
        if ((!rawJobs || rawJobs.length === 0) && datePosted !== "all") {
          log.info(
            `Strict date filter returned 0 results for "${searchQueryStr}". Retrying with broader timeframe...`
          );
          rawJobs = await fetchJobsWithRetry({
            ...queryInput,
            datePosted: "all",
            isFreeUser: !userIsPaying,
            maxResults: limits.maxResults,
            maxPages: actualPagesToFetch,
            maxLocations: limits.maxLocations,
            source: "linkedin",
          });
        }

        if (Array.isArray(rawJobs) && rawJobs.length > 0) {
          await store.setValue(cacheKey, { data: rawJobs, cachedAt: Date.now() });
        }
      }

      const jobList = Array.isArray(rawJobs) ? rawJobs : [];
      let addedForQuery = 0;

      for (const item of jobList) {
        if (allCollectedJobs.length >= actualMaxResults) break;

        const uniqueKey = getJobUniqueKey(item);
        if (!seenJobKeys.has(uniqueKey)) {
          seenJobKeys.add(uniqueKey);
          const normalized = normalizeJobItem(
            item,
            fetchFullDescription,
            searchQueryStr
          );
          allCollectedJobs.push(normalized);
          addedForQuery++;
        }
      }

      log.info(
        `Added ${addedForQuery} new unique jobs for query "${searchQueryStr}" (Total so far: ${allCollectedJobs.length})`
      );
    }
  }

  // Slice final results to actualMaxResults
  const finalJobs = allCollectedJobs.slice(0, actualMaxResults);

  // Push data to Apify dataset
  await Actor.pushData(finalJobs);
  log.info(`✅ Successfully saved ${finalJobs.length} jobs to dataset.`);

  // Monetization: Pay-per-result charge event
  if (userIsPaying && finalJobs.length > 0) {
    try {
      await Actor.charge({ eventName: "job-scraped", count: finalJobs.length });
      log.info(
        `Monetization: Successfully charged for ${finalJobs.length} job-scraped events.`
      );
    } catch (chargeErr) {
      log.warning(`Charge call skipped/failed: ${chargeErr.message}`);
    }
  }

  await Actor.setStatusMessage(
    `Done! Successfully scraped & saved ${finalJobs.length} jobs.`
  );
});
