export const messages = {
  meta: {
    title: "PathFinder · Công cụ chuyển hướng sự nghiệp",
    description:
      "PathFinder giúp lập trình viên Việt Nam lên kế hoạch bước chuyển nghề tiếp theo với MongoDB Atlas Vector Search và Google Gemini.",
  },
  common: {
    pathfinder: "PathFinder",
    careerPivotEngine: "Công cụ chuyển hướng sự nghiệp",
    careerPivot: "Chuyển hướng sự nghiệp",
    reset: "Đặt lại",
    step: "Bước {n}",
    unknown: "Chưa rõ",
    opening: "Đang mở PathFinder…",
    goToPathfinder: "Về PathFinder",
    pageNotFound: "Không tìm thấy trang",
    language: "Ngôn ngữ",
    vietnamese: "Tiếng Việt",
    english: "English",
  },
  nav: {
    pathfinderGroup: "PathFinder",
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
      pipelineAtlas: "$vectorSearch — skills / courses / trajectories (gap, khóa học, dev tương tự)",
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
    gap: {
      description: "Phân tích khoảng cách",
      title: "Kỹ năng còn thiếu giữa bạn và vai mục tiêu",
      subtitle:
        "Dựa trên Atlas Vector Search. Xếp hạng theo độ tương đồng giữa embedding target − cv và mô tả từng kỹ năng.",
      noGap:
        "Không phát hiện gap — CV của bạn đã bao phủ các kỹ năng cốt lõi của vai này.",
      similarity: "tương đồng",
      pivotMonths: "~ pivot",
      salaryLift: "tăng lương",
      vnDemand: "Nhu cầu VN · {score}",
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
      description: "Đồ thị lộ trình",
      titleEmpty: "Trực quan hóa lộ trình pivot",
      empty:
        "Chưa có lộ trình khả thi trên đồ thị skill-transitions — thử kỹ năng nguồn phổ biến hơn hoặc nạp thêm trajectory qua ETL.",
      title: "Ba lộ trình xếp cạnh nhau",
      subtitle:
        "Cùng dữ liệu với card Lộ trình pivot — mỗi làn một flavor (Nhanh / Cân bằng / Toàn diện). Nhãn cạnh = tháng + tăng lương từ cohort synthetic.",
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
        "Tìm cosine trên embedding career-trajectory, nhóm theo vai hiện tại.",
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
