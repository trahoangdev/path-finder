export const messages = {
  meta: {
    title: "PathFinder · Công cụ chuyển hướng sự nghiệp",
    description:
      "PathFinder giúp lập trình viên Việt Nam lên kế hoạch bước chuyển nghề tiếp theo với MongoDB Atlas Vector Search và OpenAI.",
  },
  common: {
    pathfinder: "PathFinder",
    careerPivotEngine: "Công cụ chuyển hướng sự nghiệp",
    careerPivot: "Chuyển hướng sự nghiệp",
    benchmark: "Benchmark",
    reset: "Đặt lại",
    step: "Bước {n}",
    unknown: "Chưa rõ",
    opening: "Đang mở PathFinder…",
    goToPathfinder: "Về PathFinder",
    pageNotFound: "Không tìm thấy trang",
    language: "Ngôn ngữ",
    vietnamese: "Tiếng Việt",
    english: "English",
    close: "Đóng",
  },
  nav: {
    pathfinderGroup: "PathFinder",
    toolsGroup: "Công cụ",
  },
  skillLevel: {
    beginner: "cơ bản",
    intermediate: "trung cấp",
    advanced: "nâng cao",
  },
  confidence: {
    high: "cao",
    medium: "trung bình",
    low: "thấp",
  },
  pivotFlavor: {
    fast: "Nhanh",
    balanced: "Cân bằng",
    comprehensive: "Toàn diện",
    fastTagline: "Ít kỹ năng nhất, vào vai nhanh nhất",
    balancedTagline: "Cân bằng thời gian ↔ tăng lương",
    comprehensiveTagline: "Bao phủ sâu nhất, độ tin cậy cao nhất",
  },
  honest: {
    trustworthy: "Đáng tin · N={n}",
    lowConfidence: "Độ tin thấp · N={n}",
    insufficientData: "Dữ liệu chưa đủ · N={n}",
    sources: "nguồn",
    notEnoughTitle: "Chưa đủ dữ liệu để đề xuất",
    notEnoughDescription:
      "Chúng tôi không đoán mò. Hãy nạp thêm dữ liệu qua ETL (hoặc chọn vai đích phổ biến hơn) rồi chạy lại phân tích.",
    currentN: "(Hiện tại N={n}.)",
  },
  perf: {
    page: {
      title: "Benchmark hiệu năng",
      badge: "Latency p50/p95/p99",
      subtitle:
        "Chạy /api/analyze orchestrator N lần liên tiếp, đo wall-clock từ phía browser và timings server theo từng stage, sau đó breakdown theo phase. Cho thấy recommender hoạt động dưới tải thực tế.",
    },
    run: {
      title: "Chạy benchmark",
      description: "Tuần tự · single user",
      subtitle:
        "Chọn persona để gửi cùng payload mỗi lần, rồi chọn số lần chạy. Mỗi run trải qua toàn bộ pipeline; cooldown 250ms giữa các call.",
      persona: "Persona",
      runs: "Số lần",
      start: "Chạy {runs} lần",
      stop: "Dừng",
      progress: "Run {done}/{total}…",
      done: "Hoàn thành benchmark.",
      idle: "Đang chờ. Chọn persona và bấm chạy.",
    },
    live: {
      title: "Live latency stream",
      description: "Mỗi cột = một /api/analyze · wall-clock client",
      waiting: "Đang đợi run đầu tiên hoàn tất…",
    },
    summary: {
      client: "Wall-clock client",
      clientHint: "Độ trễ thấy từ browser, gồm network + JSON.",
      server: "Pipeline server",
      serverHint: "Tổng các stage MongoDB + LLM mà orchestrator báo cáo.",
      network: "Overhead network + serdes",
      networkHint: "client − server. Floor = 0 khi đồng hồ lệch.",
      avg: "avg",
      failedRuns: "{failed}/{total} run lỗi — kiểm tra log server.",
    },
    phases: {
      title: "Breakdown theo phase",
      description: "Sắp theo p95 latency giảm dần",
      subtitle:
        "Thời gian đang đi đâu. Bar scale theo phase chậm nhất để dễ thấy bottleneck. Hai phase đầu (extract + embed) gọi OpenAI; phần còn lại gọi MongoDB Atlas.",
    },
    raw: {
      title: "Raw runs",
      description: "Per-run timings",
      subtitle: "Tổng wall time {wall}s tính cả cooldown.",
      client: "client",
      server: "server",
      status: "trạng thái",
    },
    empty:
      "Chọn persona và số lần chạy bên trên, bấm chạy. Chưa có dữ liệu nào.",
    contextHint:
      "Các số này phụ thuộc Atlas tier, region OpenAI, RTT mạng và trạng thái cache embedding. Coi là tín hiệu kỹ thuật, không phải benchmark chính thức.",
  },
  pathfinder: {
    page: {
      badge: "MongoDB Atlas · OpenAI",
      subtitle:
        "Dán CV lập trình viên Việt Nam, chọn vai mục tiêu, nhận phân tích khoảng cách kỹ năng, lộ trình pivot, chuẩn so sánh đồng nghiệp và bằng chứng thống kê — tất cả trong một pipeline MongoDB.",
    },
    form: {
      title: "Lên kế hoạch bước tiếp theo cho developer",
      description:
        "Dán CV, đặt vai mục tiêu. Chúng tôi chạy phân tích gap, lộ trình pivot, proof drawer và nhóm dev tương tự trên MongoDB Atlas.",
      cvLabel: "CV ứng viên (văn bản thuần)",
      charCount: "{count} / 8.000 ký tự",
      cvPlaceholder: "Dán toàn bộ CV — tóm tắt, kinh nghiệm, kỹ năng…",
      targetRole: "Vai mục tiêu",
      targetRolePlaceholder: "vd. AI Engineer",
      pickPreset: "Chọn mẫu có sẵn…",
      pipelineTitle: "Xử lý phía server",
      pipelineExtract: "trích xuất kỹ năng, vai, số năm từ CV",
      pipelineEmbed: "vector 768 chiều của CV + vai mục tiêu",
      pipelineAtlas: "$vectorSearch — skills / courses; aggregation fallback cho dev tương tự",
      pipelineAggregation:
        "$facet · $match · $group · $lookup (+ $graphLookup khi đủ đồ thị) — proof, lương JD, pivot, nhánh evidence trong gap",
      pipelineGraph: "lộ trình pivot (aggregation + tuỳ chọn $graphLookup)",
      pipelineFacet: "proof drawer: một $facet, bốn nhánh thống kê",
      running: "Đang chạy pipeline…",
      runAnalysis: "Chạy phân tích",
      cvLengthError: "CV phải từ 50–8000 ký tự. Hiện tại {count}.",
      targetRoleRequired: "Vai mục tiêu là bắt buộc.",
    },
    analysis: {
      howItWorks: "Cách hoạt động",
      runToSee: "Chạy phân tích để xem kết quả",
      step1Title: "Dán CV",
      step1Body: "Văn bản dài hoạt động tốt nhất — tóm tắt, kinh nghiệm, kỹ năng.",
      step2Title: "Chọn vai mục tiêu",
      step2Body: "vd. AI Engineer, Cloud Engineer, Engineering Manager.",
      step3Title: "Một lần gọi điều phối",
      step3Body:
        "OpenAI trích xuất kỹ năng; MongoDB chạy song song Vector Search ($vectorSearch) và Aggregation ($facet, $lookup, $group) trên nhiều collection.",
      step4Title: "Đọc kế hoạch",
      step4Body:
        "Hồ sơ, gap, ba lộ trình pivot, bằng chứng người đã pivot, và nhóm đồng nghiệp.",
      runningPipeline: "Đang chạy pipeline",
      embedding: "Đang embed CV + truy vấn MongoDB Atlas…",
      loadingHint:
        "Lần đầu có thể mất 5–15 giây khi OpenAI embed CV. Các lần sau tái sử dụng cache Atlas Vector Search đã ấm.",
      pipelineFailed: "Pipeline thất bại",
      errorHint:
        "Nguyên nhân thường gặp: server chưa chạy trên localhost:4000, Atlas mất kết nối, hoặc hết quota OpenAI. Kiểm tra console server để biết chi tiết.",
    },
    profile: {
      description: "Hồ sơ ứng viên",
      unknownRole: "Vai chưa xác định",
      yrsExperience: "{years} năm kinh nghiệm",
      skillsExtracted: "Đã trích {count} kỹ năng",
      noSkills: "Chưa trích được kỹ năng — thử CV dài hơn.",
    },
    aggregation: {
      label: "Aggregation pipeline",
      title: "Các stage MongoDB Aggregation dùng cho card này (xem server/src/services).",
      gapHint:
        "Hai pipeline song song: evidence ($match/$lookup trên skill_transitions → skills) và semantic ($vectorSearch + $lookup trên skills); kết quả gộp ở server.",
    },
    honestControl: {
      description: "Điều khiển độ trung thực",
      title: "Honest Mode — chỉnh ngưỡng tin cậy",
      subtitle:
        "Kéo slider hoặc chọn preset. Card dưới ngưỡng \"ẩn\" sẽ chuyển thành \"Chưa đủ dữ liệu\". Đây là cách recommender từ chối đoán mò.",
      preset: {
        permissive: "Dễ dãi",
        default: "Mặc định",
        strict: "Nghiêm ngặt",
        custom: "Tuỳ chỉnh",
      },
      hideAt: "Ẩn khi",
      hideHelp: "Dưới ngưỡng N này, card sẽ bị thay bằng thông báo thiếu dữ liệu.",
      warnAt: "Cảnh báo khi",
      warnHelp: "Giữa hai ngưỡng ẩn và cảnh báo, card hiển thị nhãn vàng độ tin thấp.",
      hidden: "Đã ẩn",
      lowConfidence: "Độ tin thấp",
      trustworthy: "Đáng tin",
    },
    gap: {
      description: "Phân tích khoảng cách",
      title: "Kỹ năng còn thiếu giữa bạn và vai mục tiêu",
      subtitle:
        "Kết hợp evidence từ skill_transitions với Atlas Vector Search trên mô tả kỹ năng.",
      noGap:
        "Không phát hiện gap — CV của bạn đã bao phủ các kỹ năng cốt lõi của vai này.",
      similarity: "tương đồng",
      pivotMonths: "~ pivot",
      salaryLift: "tăng lương",
      vnDemand: "Nhu cầu VN · {score}",
      why: "Tại sao?",
      whyAriaLabel: "Giải thích vì sao gợi ý {skill}",
    },
    skillExplain: {
      title: "Tại sao chọn “{skill}”?",
      subtitle: "Nguồn bằng chứng cho vai đích “{role}”",
      tabs: {
        evidence: "Bằng chứng",
        metadata: "Metadata",
        pipeline: "Pipeline",
      },
      directEvidence: "Bằng chứng chuyển tiếp trực tiếp",
      directEvidenceDesc:
        "tìm thấy dòng cho {skill} → {role}. Tổng hợp từ các pivot event synthetic.",
      frequency: "Tần suất",
      avgMonths: "Số tháng TB",
      avgLift: "Tăng lương TB",
      confidence: "Độ tin cậy",
      distribution: "Kỹ năng này dẫn tới vai nào",
      distributionHint:
        "Trên toàn bộ trajectory đã học kỹ năng này, đây là các vai họ kết thúc.",
      samplePivoters: "Ví dụ người đã học kỹ năng này khi pivot",
      noSamples:
        "Chưa có trajectory nào khớp combo kỹ năng + vai đích trong cohort synthetic.",
      noEvidence:
        "Chưa có dòng skill_transitions trực tiếp cho {skill} → {role}. Recommendation dựa trên similarity ngữ nghĩa.",
      noMetadata:
        "Kỹ năng này được trả về bởi Vector Search nhưng chưa có trong taxonomy skills — chạy lại etl/03 để bổ sung.",
      emerging: "Mới nổi",
      prerequisites: "Prerequisites",
      relatedSkills: "Kỹ năng liên quan",
      pipelineHint:
        "Đây là các MongoDB aggregation pipeline thật mà endpoint này đã chạy.",
      pipelineSubs: {
        evidence: "Dòng transition trực tiếp (skill → vai đích)",
        metadata: "Metadata kỹ năng, prerequisites, độ phổ biến",
        distribution: "Kỹ năng này còn dẫn đến đâu (collaborative filtering)",
        samples: "Tối đa 3 trajectory đã học kỹ năng này trên đường tới đích",
      },
      copy: "Copy",
      copied: "Đã copy",
      loading: "Đang truy vấn MongoDB…",
      errorTitle: "Không tải được phần giải thích",
    },
    pivot: {
      description: "Lộ trình pivot",
      title: "Ba hướng từ stack hiện tại tới vai mục tiêu",
      subtitle:
        "Ba lộ trình từ collection skill_transitions (ETL 07), tổng hợp từ ~3.000 career_trajectories synthetic — không phải roadmap.sh.",
      noPath:
        "Không tìm thấy lộ trình cho kiểu này — đồ thị còn thưa theo hướng này.",
      steps: "Bước",
      totalTime: "Tổng thời gian",
      salaryLift: "Tăng lương",
      confidence: "Độ tin cậy",
    },
    trajectory: {
      description: "Bản đồ evidence chuyển hướng",
      titleEmpty: "Trực quan hóa candidate transition paths",
      empty:
        "Chưa có lộ trình khả thi trên đồ thị skill-transitions — thử kỹ năng nguồn phổ biến hơn hoặc nạp thêm trajectory qua ETL.",
      title: "Candidate paths từ transition graph",
      subtitle:
        "Các path này được dựng từ skill_transitions bằng $graphLookup. Chúng là evidence map từ cohort synthetic, không phải dự báo nghề nghiệp chắc chắn.",
      evidenceNote:
        "Đây là bản đồ chuyển tiếp từ synthetic cohort dùng để minh họa evidence và MongoDB $graphLookup. Tháng và mức tăng lương là ước tính theo cohort, không phải cam kết cho từng cá nhân.",
    },
    proof: {
      description: "Ngăn bằng chứng",
      title: "“Có ai thực sự làm được không?” — Có, đây là bằng chứng",
      subtitle:
        "Một $facet MongoDB trên career trajectories trả về cỡ mẫu, tỷ lệ chuyển đổi, thống kê lương và 3–4 ví dụ pivot trong một round-trip.",
      insufficientDescription:
        "Cohort trajectory khớp combo bắt đầu → đích quá nhỏ để có tỷ lệ chuyển đổi hoặc tăng lương đáng tin. Chạy lại với vai gần hơn hoặc nạp thêm dòng qua ETL.",
      sampleSize: "Cỡ mẫu",
      sampleHint: "pivot tương tự trong dữ liệu",
      conversionRate: "Tỷ lệ chuyển đổi",
      conversionHint: "hoàn thành pivot",
      medianLift: "Tăng lương trung vị",
      spreadHint: "khoảng {min}…+{max}%",
      avgDuration: "Thời gian TB",
      durationHint: "tới vai mục tiêu",
      samplePivoters: "Ví dụ người đã pivot",
      noExamples: "Chưa có trajectory mẫu.",
      yrsTotal: "{years} năm tổng",
    },
    similar: {
      description: "Developer tương tự",
      title: "Người có stack giống bạn thường kết thúc ở vai nào?",
      subtitle:
        "Hiện dùng aggregation fallback: so khớp overlap kỹ năng và vai bắt đầu, rồi nhóm theo vai hiện tại.",
      unit: "dev tương tự",
      insufficientTitle: "Chưa đủ đồng nghiệp để nhóm",
      insufficientDescription:
        "Cohort trajectory khớp stack của bạn quá nhỏ để có phân bố vai có ý nghĩa. Thử kỹ năng nguồn phổ biến hơn hoặc nạp thêm dòng qua ETL.",
      none: "Không tìm thấy developer tương tự trong lát dữ liệu này.",
      devCount: "{count} dev",
    },
    courses: {
      description: "Gợi ý khóa học",
      title: "Nên học gì, theo thứ tự gap của bạn",
      subtitle:
        "Với mỗi kỹ năng thiếu hàng đầu, embed mô tả và dùng Atlas Vector Search tìm khóa phù hợp — lọc trước MongoDB chính thức, miễn phí hoặc ≤ $50.",
      runFirst:
        "Chạy phân tích để xem khóa học gợi ý cho các kỹ năng thiếu hàng đầu.",
      sparse:
        "Catalog khóa học còn thưa cho các kỹ năng này. Nạp thêm qua etl/04_load_courses.py.",
      courseCount: "{count} khóa",
      mongoOfficial: "{count} MongoDB chính thức",
      freeCount: "{count} miễn phí",
      noMatch:
        "Chưa khớp khóa nào — thử nạp thêm mục vào catalog.",
      openCourse: "Mở khóa học",
      mongoBadge: "MongoDB chính thức",
      free: "Miễn phí",
    },
    salary: {
      description: "Dải lương VN",
      marketFor: "Tín hiệu thị trường cho {role}",
      empty:
        "Chưa có JD khớp trong collection jobs — nạp thêm qua etl/02_scrape_itviec.py hoặc đặt JSON tại data/itviec_sample.json.",
      title: "{role} thực tế kiếm bao nhiêu tại Việt Nam",
      subtitle:
        "Một $facet MongoDB trên jobs trả về dải VND theo cấp, công ty hàng đầu và kỹ năng được yêu cầu nhiều. Dữ liệu trajectory bổ sung mức tăng sau pivot.",
      unit: "tin tuyển dụng",
      matchingJds: "JD khớp",
      medianRange: "Khoảng trung vị",
      vndHint: "triệu VND/tháng",
      floorCap: "Sàn → trần thị trường",
      rangeHint: "toàn dải trong tin",
      expectedLift: "Tăng lương kỳ vọng khi pivot",
      byLevel: "Lương theo cấp bậc",
      topCompanies: "Công ty tuyển nhiều nhất",
      noListings: "Chưa có tin.",
      topSkills: "Kỹ năng được yêu cầu nhiều trong JD",
      noSkills: "Chưa có tag kỹ năng trong tin.",
      pivotLift: "Tăng lương sau pivot (cohort)",
      fromRole: "từ {role}",
    },
    timings: {
      description: "Thời gian pipeline",
      title: "Tổng {total} ms phía server",
      subtitle:
        "Per-stage latency. Gap, lộ trình pivot, proof drawer và similar devs chạy song song; sau đó khóa học và lương.",
      extract: "trích xuất kỹ năng",
      embed: "embed",
      gap: "phân tích gap",
      paths: "lộ trình pivot",
      proof: "proof drawer",
      similar: "dev tương tự",
      courses: "khớp khóa học",
      salary: "dải lương",
    },
  },
} as const;
