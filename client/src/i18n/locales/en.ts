export const messages = {
  meta: {
    title: "PathFinder · Career Pivot Engine",
    description:
      "PathFinder helps Vietnamese developers plan their next career move with MongoDB Atlas Vector Search and OpenAI.",
  },
  common: {
    pathfinder: "PathFinder",
    careerPivotEngine: "Career Pivot Engine",
    careerPivot: "Career Pivot",
    benchmark: "Benchmark",
    reset: "Reset",
    step: "Step {n}",
    unknown: "Unknown",
    opening: "Opening PathFinder…",
    goToPathfinder: "Go to PathFinder",
    pageNotFound: "Page not found",
    language: "Language",
    vietnamese: "Tiếng Việt",
    english: "English",
    close: "Close",
  },
  nav: {
    pathfinderGroup: "PathFinder",
    toolsGroup: "Tools",
  },
  skillLevel: {
    beginner: "beginner",
    intermediate: "intermediate",
    advanced: "advanced",
  },
  confidence: {
    high: "high",
    medium: "medium",
    low: "low",
  },
  pivotFlavor: {
    fast: "Fast",
    balanced: "Balanced",
    comprehensive: "Comprehensive",
    fastTagline: "Shortest #skills, fastest landing",
    balancedTagline: "Best months ↔ salary lift trade-off",
    comprehensiveTagline: "Deepest coverage, highest confidence",
  },
  honest: {
    trustworthy: "Trustworthy · N={n}",
    lowConfidence: "Low confidence · N={n}",
    insufficientData: "Insufficient data · N={n}",
    sources: "sources",
    notEnoughTitle: "Not enough data to recommend",
    notEnoughDescription:
      "We won't guess. Seed more entries via the ETL (or pick a more populated target) and re-run the analysis.",
    currentN: "(Current N={n}.)",
  },
  perf: {
    page: {
      title: "Performance benchmark",
      badge: "Latency p50/p95/p99",
      subtitle:
        "Run the /api/analyze orchestrator N times in a row, capture client wall-clock and per-stage server timings, then break them down by phase. Shows the recommender under realistic load.",
    },
    run: {
      title: "Run a benchmark",
      description: "Sequential runs · single user",
      subtitle:
        "Pick a persona to feed the same payload every iteration, then choose how many runs. Each run hits the full pipeline; cooldown 250ms between calls.",
      persona: "Persona",
      runs: "Runs",
      start: "Run {runs} times",
      stop: "Stop",
      progress: "Run {done} of {total}…",
      done: "Benchmark complete.",
      idle: "Idle. Pick a persona and click run.",
    },
    live: {
      title: "Live latency stream",
      description: "Each bar = one /api/analyze call · client wall-clock",
      waiting: "Waiting for the first run to complete…",
    },
    summary: {
      client: "Client wall-clock",
      clientHint: "Browser-perceived latency, includes network + JSON.",
      server: "Server pipeline",
      serverHint: "Sum of MongoDB + LLM stages reported by orchestrator.",
      network: "Network + serdes overhead",
      networkHint: "client − server. Floor = 0 when clocks disagree.",
      avg: "avg",
      failedRuns: "{failed} of {total} runs failed — check server logs.",
    },
    phases: {
      title: "Per-phase breakdown",
      description: "Sorted by p95 latency",
      subtitle:
        "Where the time goes. Bars scale to the slowest phase so you can spot the bottleneck instantly. The first two phases (extract + embed) hit OpenAI; the rest hit MongoDB Atlas.",
    },
    raw: {
      title: "Raw runs",
      description: "Per-run timings",
      subtitle: "Total wall time {wall}s including cooldowns.",
      client: "client",
      server: "server",
      status: "status",
    },
    empty:
      "Pick a persona and run count above, then click run. Nothing has been measured yet.",
    contextHint:
      "These numbers depend on Atlas tier, OpenAI region, network RTT and embedding cache state. Treat them as engineering signals, not benchmark reports.",
  },
  pathfinder: {
    page: {
      badge: "MongoDB Atlas · OpenAI",
      subtitle:
        "Paste a Vietnamese developer's CV, pick a target role, and get a gap analysis, a pivot plan, peer benchmarks, and statistical proof — all in one MongoDB pipeline.",
    },
    form: {
      title: "Plan a developer's next move",
      description:
        "Paste a CV, set a target role. We'll run gap analysis, pivot paths, proof drawer and similar-dev clustering on MongoDB Atlas.",
      cvLabel: "Candidate CV (plain text)",
      charCount: "{count} / 8,000 chars",
      cvPlaceholder: "Paste a full CV here — summary, experience, skills…",
      targetRole: "Target role",
      targetRolePlaceholder: "e.g. AI Engineer",
      pickPreset: "Pick a preset…",
      pipelineTitle: "What runs server-side",
      pipelineExtract: "extract skills, role, years from CV",
      pipelineEmbed: "768-dim vector of CV + target role",
      pipelineAtlas: "$vectorSearch — skills / courses; aggregation fallback for similar devs",
      pipelineAggregation:
        "$facet · $match · $group · $lookup (+ optional $graphLookup when the graph has edges) — proof, JD salary band, pivot paths, evidence branch in gap",
      pipelineGraph: "pivot paths (aggregation + optional $graphLookup)",
      pipelineFacet: "proof drawer: single $facet, four stat branches",
      running: "Running pipeline…",
      runAnalysis: "Run analysis",
      cvLengthError: "CV must be 50–8000 characters. Currently {count}.",
      targetRoleRequired: "Target role is required.",
    },
    analysis: {
      howItWorks: "How it works",
      runToSee: "Run an analysis to see results",
      step1Title: "Paste a CV",
      step1Body: "Long-form text works best — summary, experience, skills.",
      step2Title: "Pick a target role",
      step2Body: "e.g. AI Engineer, Cloud Engineer, Engineering Manager.",
      step3Title: "One orchestrated call",
      step3Body:
        "OpenAI extracts skills; MongoDB runs Vector Search ($vectorSearch) and Aggregation ($facet, $lookup, $group) across collections in parallel.",
      step4Title: "Read the plan",
      step4Body:
        "Profile, gap, three pivot routes, proof of past pivoters, and peer cluster.",
      runningPipeline: "Running pipeline",
      embedding: "Embedding CV + querying MongoDB Atlas…",
      loadingHint:
        "First call may take 5–15s while OpenAI embeds the CV. Subsequent calls reuse Mongo's warmed Atlas Vector Search cache.",
      pipelineFailed: "Pipeline failed",
      errorHint:
        "Common causes: server not running on localhost:4000, Atlas connection down, or OpenAI quota exhausted. Inspect the server console for details.",
    },
    profile: {
      description: "Candidate profile",
      unknownRole: "Unknown role",
      yrsExperience: "{years} yrs experience",
      skillsExtracted: "{count} skills extracted",
      noSkills: "No skills extracted — try a longer CV.",
    },
    aggregation: {
      label: "Aggregation pipeline",
      title: "MongoDB aggregation stages powering this card (see server/src/services).",
      gapHint:
        "Two pipelines in parallel: evidence ($match/$lookup on skill_transitions → skills) and semantic ($vectorSearch + $lookup on skills); results merged server-side.",
    },
    honestControl: {
      description: "Live honesty controls",
      title: "Honest Mode — tune the trust thresholds",
      subtitle:
        "Drag the sliders or pick a preset. Cards below \"hide\" turn into \"Not enough data\" placeholders. This is the recommender refusing to guess.",
      preset: {
        permissive: "Permissive",
        default: "Default",
        strict: "Strict",
        custom: "Custom",
      },
      hideAt: "Hide when",
      hideHelp: "Below this N, the card is replaced by an insufficient-data notice.",
      warnAt: "Warn when",
      warnHelp: "Between hide and warn, cards render with an amber low-confidence badge.",
      hidden: "Hidden",
      lowConfidence: "Low confidence",
      trustworthy: "Trustworthy",
    },
    gap: {
      description: "Gap analysis",
      title: "Missing skills between you and the target role",
      subtitle:
        "Combines skill-transition evidence with Atlas Vector Search over skill descriptions.",
      noGap:
        "No gap detected — your CV already covers this role's core skills.",
      similarity: "similarity",
      pivotMonths: "~ pivot",
      salaryLift: "salary lift",
      vnDemand: "VN demand · {score}",
      why: "Why?",
      whyAriaLabel: "Explain why {skill} is recommended",
    },
    skillExplain: {
      title: "Why “{skill}”?",
      subtitle: "Evidence path for the “{role}” target",
      tabs: {
        evidence: "Evidence",
        metadata: "Metadata",
        pipeline: "Pipeline",
      },
      directEvidence: "Direct transition evidence",
      directEvidenceDesc:
        "row found for {skill} → {role}. Aggregated from synthetic pivot events.",
      frequency: "Frequency",
      avgMonths: "Avg months",
      avgLift: "Avg lift",
      confidence: "Confidence",
      distribution: "Roles where this skill leads",
      distributionHint:
        "Across all trajectories that picked up this skill, here is where they ended up.",
      samplePivoters: "Sample pivoters who learned this skill",
      noSamples:
        "No trajectories matched this skill + target combo in the synthetic cohort.",
      noEvidence:
        "No direct skill_transitions row for {skill} → {role}. The recommendation was driven by semantic similarity only.",
      noMetadata:
        "This skill was returned by Vector Search but is not in the skills taxonomy yet — re-run etl/03 to enrich.",
      emerging: "Emerging",
      prerequisites: "Prerequisites",
      relatedSkills: "Related skills",
      pipelineHint:
        "These are the exact MongoDB aggregation pipelines this endpoint ran.",
      pipelineSubs: {
        evidence: "Direct (skill → target_role) transition row",
        metadata: "Skill metadata, prerequisites, popularity",
        distribution: "Where else this skill leads (collaborative-filtering signal)",
        samples: "Up to 3 trajectories that learned this skill on the way to the target",
      },
      copy: "Copy",
      copied: "Copied",
      loading: "Querying MongoDB…",
      errorTitle: "Could not load explanation",
    },
    pivot: {
      description: "Pivot paths",
      title: "Three routes from your stack to the target",
      subtitle:
        "Three flavors from skill_transitions (ETL 07), aggregated from ~3,000 synthetic career_trajectories.",
      noPath:
        "No path found for this flavor — graph is sparse for this direction.",
      steps: "Steps",
      totalTime: "Total time",
      salaryLift: "Salary lift",
      confidence: "Confidence",
    },
    trajectory: {
      description: "Transition evidence map",
      titleEmpty: "Visualize candidate transition paths",
      empty:
        "No reachable paths in the skill-transitions graph yet — try a more populated source skill or seed more trajectories via the ETL.",
      title: "Candidate paths from the transition graph",
      subtitle:
        "These paths are built from skill_transitions with $graphLookup. Treat them as a synthetic-cohort evidence map, not a deterministic career forecast.",
      evidenceNote:
        "This is a transition map from a synthetic cohort used to show evidence and MongoDB $graphLookup. Months and lift are cohort estimates, not individual guarantees.",
    },
    proof: {
      description: "Proof drawer",
      title: "“Has anyone actually pulled this off?” — yes, here's the evidence",
      subtitle:
        "A single MongoDB $facet over career trajectories returns sample size, conversion rate, salary stats, and 3–4 example pivoters in one round-trip.",
      insufficientDescription:
        "The trajectory cohort that matches your start → target combo is too small to produce a trustworthy conversion rate or salary lift. Re-run with a closer target or seed more rows via the ETL.",
      sampleSize: "Sample size",
      sampleHint: "similar pivots in data",
      conversionRate: "Conversion rate",
      conversionHint: "completed the pivot",
      medianLift: "Median salary lift",
      spreadHint: "spread {min}…+{max}%",
      avgDuration: "Avg duration",
      durationHint: "time-to-target role",
      samplePivoters: "Sample pivoters in the data",
      noExamples: "No example trajectories surfaced.",
      yrsTotal: "{years} yrs total",
    },
    similar: {
      description: "Similar developers",
      title: "What roles do people with your stack actually end up in?",
      subtitle:
        "Currently uses the aggregation fallback: skill-overlap and start-role matching, grouped by current role.",
      unit: "similar devs",
      insufficientTitle: "Not enough peers to cluster",
      insufficientDescription:
        "The trajectory cohort matching your stack is too small to surface a meaningful role distribution. Try a more populated start skill or seed more rows in the ETL.",
      none: "No similar developers found in this slice of the data.",
      devCount: "{count} devs",
    },
    courses: {
      description: "Course recommendations",
      title: "What to study, ordered by your gap",
      subtitle:
        "For each top missing skill we embed its description and ask Atlas Vector Search for the courses whose description best matches — pre-filtered to MongoDB-official, free, or ≤ $50.",
      runFirst:
        "Run an analysis to see recommended courses for your top missing skills.",
      sparse:
        "The course catalog is sparse for these specific skills. Seed more entries via etl/04_load_courses.py.",
      courseCount: "{count} courses",
      mongoOfficial: "{count} MongoDB official",
      freeCount: "{count} free",
      noMatch:
        "No course matched this skill — try seeding the catalog with more entries.",
      openCourse: "Open course",
      mongoBadge: "MongoDB official",
      free: "Free",
    },
    salary: {
      description: "VN salary band",
      marketFor: "Market signal for {role}",
      empty:
        "No matching JDs in the curated jobs collection yet — seed more via etl/02_scrape_itviec.py or drop a JSON override at data/itviec_sample.json.",
      title: "What {role}s actually earn in Vietnam",
      subtitle:
        "One MongoDB $facet over jobs returns per-level VND range, top companies, and most-requested skills. Trajectory data adds the expected post-pivot lift.",
      unit: "job listings",
      matchingJds: "Matching JDs",
      medianRange: "Median range",
      vndHint: "VND million/month",
      floorCap: "Market floor → cap",
      rangeHint: "full range across listings",
      expectedLift: "Expected lift on pivot",
      byLevel: "Salary by seniority level",
      topCompanies: "Top hiring companies",
      noListings: "No listings.",
      topSkills: "Most-requested skills in JDs",
      noSkills: "No skill tags in listings.",
      pivotLift: "Post-pivot salary lift (cohort)",
      fromRole: "from {role}",
    },
    timings: {
      description: "Pipeline timings",
      title: "Total {total} ms server-side",
      subtitle:
        "Per-stage latency. Gap, pivot paths, proof drawer, and similar devs run in parallel; then courses and salary.",
      extract: "extract skills",
      embed: "embed",
      gap: "gap analysis",
      paths: "pivot paths",
      proof: "proof drawer",
      similar: "similar devs",
      courses: "course matching",
      salary: "salary band",
    },
  },
} as const;
