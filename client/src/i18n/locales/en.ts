export const messages = {
  meta: {
    title: "PathFinder · Career Pivot Engine",
    description:
      "PathFinder helps Vietnamese developers plan their next career move with MongoDB Atlas Vector Search and Google Gemini.",
  },
  common: {
    pathfinder: "PathFinder",
    careerPivotEngine: "Career Pivot Engine",
    careerPivot: "Career Pivot",
    reset: "Reset",
    step: "Step {n}",
    unknown: "Unknown",
    opening: "Opening PathFinder…",
    goToPathfinder: "Go to PathFinder",
    pageNotFound: "Page not found",
    language: "Language",
    vietnamese: "Tiếng Việt",
    english: "English",
  },
  nav: {
    pathfinderGroup: "PathFinder",
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
      pipelineAtlas: "gap, similar devs, course matching",
      pipelineGraph: "recursive pivot paths",
      pipelineFacet: "proof drawer in one round-trip",
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
        "OpenAI extracts skills, MongoDB Atlas runs Vector Search + $graphLookup + $facet in parallel.",
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
    gap: {
      description: "Gap analysis",
      title: "Missing skills between you and the target role",
      subtitle:
        "Powered by Atlas Vector Search. Ranked by similarity between target − cv embedding and each skill's description.",
      noGap:
        "No gap detected — your CV already covers this role's core skills.",
      similarity: "similarity",
      pivotMonths: "~ pivot",
      salaryLift: "salary lift",
      vnDemand: "VN demand · {score}",
    },
    pivot: {
      description: "Pivot paths",
      title: "Three routes from your stack to the target",
      subtitle:
        "Computed by MongoDB's $graphLookup over the pre-computed skill_transitions graph.",
      noPath:
        "No path found for this flavor — graph is sparse for this direction.",
      steps: "Steps",
      totalTime: "Total time",
      salaryLift: "Salary lift",
      confidence: "Confidence",
    },
    trajectory: {
      description: "Trajectory graph",
      titleEmpty: "Visualize pivot routes",
      empty:
        "No reachable paths in the skill-transitions graph yet — try a more populated source skill or seed more trajectories via the ETL.",
      title: "Three routes laid out side-by-side",
      subtitle:
        "Each lane is a separate $graphLookup discovery. Pan & zoom, fit-to-view from the bottom-left controls. Edge labels show average months + salary lift from cohort data.",
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
        "Cosine search over career-trajectory embeddings, grouped by current role.",
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
      subtitle: "Per-stage latency. Gap, paths, proof and similar devs run in parallel.",
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
