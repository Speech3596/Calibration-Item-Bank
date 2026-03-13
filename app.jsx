import React, { useMemo, useState } from "react";
import {
  Search,
  Filter,
  FileText,
  ChevronRight,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  Eye,
  Pencil,
  Replace,
  Target,
  Layers3,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";

const COLORS = {
  navy: "#1E3A5F",
  blue: "#3B82F6",
  sky: "#60A5FA",
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
  slate: "#64748B",
};

const examSeeds = [
  {
    id: "MT-GT1-2026-03",
    examName: "2026 3월 MT · GT1",
    testType: "MT",
    schoolGrade: "1학년",
    targetLevel: "GT1",
    boundaryType: "-",
    subjectGroup: ["Speech Building", "English", "Eng. Foundation", "Cultural Conn"],
    studentCount: 84,
  },
  {
    id: "MT-MGT2-2026-03",
    examName: "2026 3월 MT · MGT2",
    testType: "MT",
    schoolGrade: "2학년",
    targetLevel: "MGT2",
    boundaryType: "-",
    subjectGroup: ["Speech Building", "English", "Eng. Foundation", "Cultural Conn"],
    studentCount: 96,
  },
  {
    id: "LT-G1-A-2026-03",
    examName: "2026 3월 LT · Grade 1 · A Type",
    testType: "LT",
    schoolGrade: "1학년",
    targetLevel: "Grade 1",
    boundaryType: "A Type",
    subjectGroup: ["Speech Building", "English", "Eng. Foundation", "Listening"],
    studentCount: 142,
  },
  {
    id: "LT-G2-B-2026-03",
    examName: "2026 3월 LT · Grade 2 · B Type",
    testType: "LT",
    schoolGrade: "2학년",
    targetLevel: "Grade 2",
    boundaryType: "B Type",
    subjectGroup: ["Speech Building", "English", "Eng. Foundation", "Listening"],
    studentCount: 168,
  },
  {
    id: "LT-G3-B-2026-03",
    examName: "2026 3월 LT · Grade 3 · B Type",
    testType: "LT",
    schoolGrade: "3학년",
    targetLevel: "Grade 3",
    boundaryType: "B Type",
    subjectGroup: ["Speech Building", "English", "Eng. Foundation", "Listening"],
    studentCount: 155,
  },
];

const subjectsShort = {
  "Speech Building": "SB",
  English: "EN",
  "Eng. Foundation": "EF",
  "Cultural Conn": "CC",
  Listening: "LS",
};

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function gaussianWeight(b, center, sigma) {
  return Math.exp(-((b - center) ** 2) / (2 * sigma * sigma));
}

function sa(a) {
  return Math.min(100, (100 * a) / 1.5);
}

function pc(c) {
  if (c <= 0.2) return 0;
  if (c <= 0.25) return 10;
  if (c <= 0.3) return 25;
  return 40;
}

function p3pl(a, b, c, theta) {
  return c + (1 - c) / (1 + Math.exp(-a * (theta - b)));
}

function infoFunction(a, b, c, theta) {
  const p = p3pl(a, b, c, theta);
  return (a * a * ((p - c) ** 2)) / (((1 - c) ** 2) * p * (1 - p));
}

function buildCurveSeries(item) {
  const points = [];
  for (let theta = -3; theta <= 3.0001; theta += 0.25) {
    points.push({
      theta: round(theta, 2),
      icc: round(p3pl(item.aParam, item.bParam, item.cParam, theta), 3),
      info: round(infoFunction(item.aParam, item.bParam, item.cParam, theta), 3),
    });
  }
  return points;
}

function getItemGrade(pqi, autoHold) {
  if (autoHold || pqi < 40) return "C";
  if (pqi >= 85) return "S";
  if (pqi >= 70) return "A";
  if (pqi >= 55) return "B";
  return "C";
}

function build4RPlan(item) {
  const grade = item.itemGrade;
  const highExposure = item.exposureRate > 0.25;

  if (grade === "S") {
    return {
      primary: "Recycle",
      secondary: "Review",
      summary: "핵심 자산군으로 재사용하되, Anchor/노출 관리 기준만 주기적으로 점검",
      steps: [
        "핵심 경계 또는 핵심 레벨용 자산군으로 유지",
        "노출률 0.15 초과 시 재사용 주기 조정",
        "동일 구조 신규 문항의 기준 문항으로 활용",
      ],
    };
  }

  if (grade === "A") {
    return {
      primary: highExposure ? "Review" : "Recycle",
      secondary: highExposure ? "Recycle" : "Review",
      summary: "운영 사용 가능군이므로 재사용 중심으로 가되, 경미한 리스크를 점검",
      steps: [
        "현재 시험 또는 인접 시험군에 우선 활용",
        "고노출·경계 편차 여부 점검",
        "다음 배치 시 동일 경계 적합성 재확인",
      ],
    };
  }

  if (grade === "B") {
    return {
      primary: "Review",
      secondary: "Revise",
      summary: "보완 가능군이므로 즉시 폐기보다 원인 진단 후 수정 여부를 결정",
      steps: [
        "오답지 구조, stem 길이, 도메인 적합성 재검토",
        "학년 기준과 경계 기준에 맞춰 wording 보정",
        "재투입 전 파일럿 또는 소표본 점검",
      ],
    };
  }

  return {
    primary: item.autoHold ? "Replace" : "Revise",
    secondary: item.autoHold ? "Review" : "Replace",
    summary: "품질 리스크가 높으므로 운영 보류 후 재작성 또는 교체 우선",
    steps: [
      item.autoHold ? "즉시 Hold 처리 및 운영 제외" : "핵심 결함 항목 우선 수정",
      "선택지 함정, 추측도, 변별력 역전 여부 재점검",
      "교체 시 동일 도메인·난이도 위치의 대체 문항 확보",
    ],
  };
}

function buildItemsForExam(seed) {
  const isMT = seed.testType === "MT";
  const centers = isMT
    ? { MT: seed.targetLevel.includes("GT") ? -0.45 : seed.targetLevel.includes("MGT") ? 0.05 : 0.45 }
    : seed.boundaryType === "A Type"
      ? { GM: -0.45, MS: 0.1, SMAG: 0.75 }
      : { GM: -0.2, MS: 0.35, SMAG: 0.95 };

  const items = [];
  let globalIndex = 1;

  seed.subjectGroup.forEach((subject, subjectIndex) => {
    for (let i = 1; i <= 15; i += 1) {
      const aParam = round(0.38 + (((i * 7 + subjectIndex * 5) % 13) * 0.095), 2);
      const bParam = round(-1.05 + (((i * 11 + subjectIndex * 3) % 19) * 0.14), 2);
      const cParam = round(0.1 + (((i * 5 + subjectIndex * 4) % 8) * 0.025), 2);
      const exposureRate = round(0.06 + (((i * 3 + subjectIndex * 2) % 11) * 0.02), 2);
      const difStatus = i % 14 === 0 ? "Moderate" : "None";
      const iccFlag = i % 17 === 0 ? "NonMonotonic" : "OK";
      const reviewRange = round(0.6 + (((i + subjectIndex) % 5) * 0.08), 2);
      const reviewHours = round(0.62 + (((i + subjectIndex * 2) % 5) * 0.07), 2);
      const reviewAchievement = round(0.64 + (((i * 2 + subjectIndex) % 5) * 0.06), 2);
      const wContent = round(0.4 * reviewRange + 0.3 * reviewHours + 0.3 * reviewAchievement, 3);

      const autoHold = aParam < 0.2 || cParam > 0.35 || iccFlag !== "OK";

      let pqiMT = 0;
      let pqiLTGM = 0;
      let pqiLTMS = 0;
      let pqiLTSMAG = 0;
      let itemInfoGM = 0;
      let itemInfoMS = 0;
      let itemInfoSMAG = 0;
      let targetBoundary = "-";
      let boundaryFit = 0;

      if (isMT) {
        const center = centers.MT;
        const wBMT = gaussianWeight(bParam, center, 0.45);
        pqiMT = autoHold ? 0 : Math.max(0, sa(aParam) * wContent * wBMT - pc(cParam) - (difStatus === "Moderate" ? 15 : 0));
        targetBoundary = seed.targetLevel;
        boundaryFit = round(wBMT, 3);
      } else {
        itemInfoGM = round(infoFunction(aParam, bParam, cParam, centers.GM), 3);
        itemInfoMS = round(infoFunction(aParam, bParam, cParam, centers.MS), 3);
        itemInfoSMAG = round(infoFunction(aParam, bParam, cParam, centers.SMAG), 3);

        const wGM = gaussianWeight(bParam, centers.GM, 0.3);
        const wMS = gaussianWeight(bParam, centers.MS, 0.3);
        const wSMAG = gaussianWeight(bParam, centers.SMAG, 0.3);

        const wInfoGM = Math.min(1, itemInfoGM / 0.8);
        const wInfoMS = Math.min(1, itemInfoMS / 0.8);
        const wInfoSMAG = Math.min(1, itemInfoSMAG / 0.8);

        pqiLTGM = autoHold ? 0 : Math.max(0, sa(aParam) * wGM * wInfoGM - pc(cParam) - (difStatus === "Moderate" ? 15 : 0));
        pqiLTMS = autoHold ? 0 : Math.max(0, sa(aParam) * wMS * wInfoMS - pc(cParam) - (difStatus === "Moderate" ? 15 : 0));
        pqiLTSMAG = autoHold ? 0 : Math.max(0, sa(aParam) * wSMAG * wInfoSMAG - pc(cParam) - (difStatus === "Moderate" ? 15 : 0));

        const maxPQI = Math.max(pqiLTGM, pqiLTMS, pqiLTSMAG);
        targetBoundary = maxPQI === pqiLTGM ? "GM" : maxPQI === pqiLTMS ? "MS" : "SMAG";
        boundaryFit = round(Math.max(wGM, wMS, wSMAG), 3);
      }

      const finalPQI = isMT ? pqiMT : Math.max(pqiLTGM, pqiLTMS, pqiLTSMAG);
      const itemGrade = getItemGrade(finalPQI, autoHold);
      const useStatus = autoHold ? "Hold" : finalPQI < 55 ? "Review" : "Usable";

      const diagnosis = {
        topBottomIndex: round(0.42 + (((globalIndex + subjectIndex) % 6) * 0.09), 2),
        pcram: round(53 + ((globalIndex * 7 + subjectIndex * 5) % 34), 1),
        ciIndex: round(0.18 + (((globalIndex + subjectIndex * 2) % 6) * 0.09), 2),
        swBalance: round(46 + ((globalIndex * 5 + subjectIndex * 4) % 32), 1),
        ted: round(38 + ((globalIndex * 6 + subjectIndex * 3) % 41), 1),
        tpi: round(34 + ((globalIndex * 4 + subjectIndex * 5) % 39), 1),
        odi: round(31 + ((globalIndex * 3 + subjectIndex * 6) % 42), 1),
        fnf: globalIndex % 4 === 0 ? "NF" : "F",
        wrongDomain: ["Grammar", "Inference", "Vocabulary", "Listening", "Context"][(globalIndex + subjectIndex) % 5],
        arDomain: ["Reading", "Structure", "Meaning", "Reasoning"][globalIndex % 4],
        wrongDifficulty: ["상", "중", "하"][globalIndex % 3],
        consecutiveWrongZone: ["Q3~Q5", "Q6~Q8", "Q10~Q12", "없음"][globalIndex % 4],
        readingRatio: `${58 + (globalIndex % 22)}%`,
        wrongSkill: ["주제 파악", "세부정보", "문장삽입", "근거추론", "어휘 맥락"][globalIndex % 5],
      };

      const itemId = `${seed.testType}-${subjectsShort[subject]}-${String(i).padStart(2, "0")}`;
      items.push({
        itemId,
        examId: seed.id,
        testType: seed.testType,
        schoolGrade: seed.schoolGrade,
        subject,
        targetBoundary,
        targetLevel: seed.targetLevel,
        aParam,
        bParam,
        cParam,
        wContent,
        difStatus,
        iccFlag,
        exposureRate,
        pqiMT: round(pqiMT, 1),
        pqiLTGM: round(pqiLTGM, 1),
        pqiLTMS: round(pqiLTMS, 1),
        pqiLTSMAG: round(pqiLTSMAG, 1),
        itemInfoGM,
        itemInfoMS,
        itemInfoSMAG,
        boundaryFit,
        finalPQI: round(finalPQI, 1),
        itemGrade,
        useStatus,
        autoHold,
        actionPlan: build4RPlan({ itemGrade, exposureRate, autoHold }),
        diagnosis,
        curves: buildCurveSeries({ aParam, bParam, cParam }),
      });
      globalIndex += 1;
    }
  });

  return items;
}

function buildExam(seed) {
  const items = buildItemsForExam(seed);
  const examPQI = round(items.reduce((acc, item) => acc + item.finalPQI, 0) / items.length, 1);
  const counts = {
    S: items.filter((item) => item.itemGrade === "S").length,
    A: items.filter((item) => item.itemGrade === "A").length,
    B: items.filter((item) => item.itemGrade === "B").length,
    C: items.filter((item) => item.itemGrade === "C").length,
  };
  const boundaryInfo = {
    GM: round(items.reduce((acc, item) => acc + item.itemInfoGM, 0), 2),
    MS: round(items.reduce((acc, item) => acc + item.itemInfoMS, 0), 2),
    SMAG: round(items.reduce((acc, item) => acc + item.itemInfoSMAG, 0), 2),
  };

  const subjectSummary = seed.subjectGroup.map((subject) => {
    const rows = items.filter((item) => item.subject === subject);
    return {
      subject,
      avgPQI: round(rows.reduce((acc, item) => acc + item.finalPQI, 0) / rows.length, 1),
      reviewCount: rows.filter((item) => item.useStatus !== "Usable").length,
      avgA: round(rows.reduce((acc, item) => acc + item.aParam, 0) / rows.length, 2),
      avgC: round(rows.reduce((acc, item) => acc + item.cParam, 0) / rows.length, 2),
    };
  });

  return {
    ...seed,
    items,
    examPQI,
    counts,
    boundaryInfo,
    subjectSummary,
    reviewCount: items.filter((item) => item.useStatus === "Review").length,
    holdCount: items.filter((item) => item.useStatus === "Hold").length,
    highExposureCount: items.filter((item) => item.exposureRate > 0.25).length,
    primaryMessage:
      seed.testType === "MT"
        ? "MT는 성취 확인형 시험이므로 범위 적합성과 현재 레벨 난이도 적합성을 함께 본다."
        : "LT는 총점 시험이 아니라 경계 판별형 시험이므로 경계별 정보량과 경계 적합성이 핵심이다.",
  };
}

const exams = examSeeds.map(buildExam);

function StatCard({ title, value, sub, icon: Icon }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{title}</div>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <div className="text-3xl font-black tracking-tight text-slate-900">{value}</div>
      <div className="mt-2 text-sm text-slate-500">{sub}</div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function GradeBadge({ grade }) {
  const styleMap = {
    S: "bg-emerald-50 text-emerald-700 border-emerald-200",
    A: "bg-blue-50 text-blue-700 border-blue-200",
    B: "bg-amber-50 text-amber-700 border-amber-200",
    C: "bg-red-50 text-red-700 border-red-200",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${styleMap[grade]}`}>{grade}</span>;
}

function ActionBadge({ action }) {
  const styleMap = {
    Recycle: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Review: "bg-blue-50 text-blue-700 border-blue-200",
    Revise: "bg-amber-50 text-amber-700 border-amber-200",
    Replace: "bg-red-50 text-red-700 border-red-200",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${styleMap[action]}`}>{action}</span>;
}

function MetricMiniCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">{value}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{hint}</div>
    </div>
  );
}

function GradeDistribution({ exam }) {
  const data = [
    { grade: "S", count: exam.counts.S, fill: COLORS.green },
    { grade: "A", count: exam.counts.A, fill: COLORS.blue },
    { grade: "B", count: exam.counts.B, fill: COLORS.amber },
    { grade: "C", count: exam.counts.C, fill: COLORS.red },
  ];

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="grade" tick={{ fill: "#64748B", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#64748B", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip />
          <Bar dataKey="count" radius={[10, 10, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.grade} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ItemCurveCard({ title, data, dataKey, lines = [] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-black tracking-tight text-slate-900">{title}</div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="theta" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip />
            {lines.map((line) => (
              <Line key={line.key} type="monotone" dataKey={line.key} stroke={line.color} dot={false} strokeWidth={2.2} />
            ))}
            {!lines.length && <Line type="monotone" dataKey={dataKey} stroke={COLORS.blue} dot={false} strokeWidth={2.2} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function CalibratedItemBankReactDashboard() {
  const [testType, setTestType] = useState("전체");
  const [schoolGrade, setSchoolGrade] = useState("전체");
  const [boundaryType, setBoundaryType] = useState("전체");
  const [query, setQuery] = useState("");

  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchType = testType === "전체" || exam.testType === testType;
      const matchGrade = schoolGrade === "전체" || exam.schoolGrade === schoolGrade;
      const matchBoundary = boundaryType === "전체" || exam.boundaryType === boundaryType;
      const matchQuery = !query.trim() || exam.examName.toLowerCase().includes(query.toLowerCase()) || exam.targetLevel.toLowerCase().includes(query.toLowerCase());
      return matchType && matchGrade && matchBoundary && matchQuery;
    });
  }, [testType, schoolGrade, boundaryType, query]);

  const [selectedExamId, setSelectedExamId] = useState(exams[0].id);
  const selectedExam = filteredExams.find((exam) => exam.id === selectedExamId) || filteredExams[0] || exams[0];

  const [selectedItemId, setSelectedItemId] = useState(exams[0].items[0].itemId);
  const selectedItem = selectedExam.items.find((item) => item.itemId === selectedItemId) || selectedExam.items[0];

  const filteredItems = useMemo(() => {
    return selectedExam.items.sort((a, b) => {
      const statusOrder = { Hold: 0, Review: 1, Usable: 2 };
      return statusOrder[a.useStatus] - statusOrder[b.useStatus] || a.finalPQI - b.finalPQI;
    });
  }, [selectedExam]);

  const itemFormula = selectedExam.testType === "MT"
    ? `PQI_MT = max(0, S_a × W_content × W_b,MT − P_c − P_DIF)`
    : `PQI_LT,j = max(0, S_a × W_b,j × W_info,j − P_c − P_DIF), j ∈ {GM, MS, SMAG}`;

  const diagnosisRows = [
    ["상/하단 지수", selectedItem.diagnosis.topBottomIndex],
    ["PCRAM", selectedItem.diagnosis.pcram],
    ["CI 지수", selectedItem.diagnosis.ciIndex],
    ["S/W 과목 정보", selectedItem.diagnosis.swBalance],
    ["오답 Domain", selectedItem.diagnosis.wrongDomain],
    ["AR Domain", selectedItem.diagnosis.arDomain],
    ["오답 난이도", selectedItem.diagnosis.wrongDifficulty],
    ["연속 오답 위치", selectedItem.diagnosis.consecutiveWrongZone],
    ["F/NF", selectedItem.diagnosis.fnf],
    ["독서 비율", selectedItem.diagnosis.readingRatio],
    ["오답 Skill", selectedItem.diagnosis.wrongSkill],
    ["TED / TPI / ODI", `${selectedItem.diagnosis.ted} / ${selectedItem.diagnosis.tpi} / ${selectedItem.diagnosis.odi}`],
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <div className="mb-3 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                Calibrated Item Bank · 교육사업본부 기준 반영 React 구조
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900">
                시험 검색 → 시험 선택 → 상세 분석 → 4R 액션 플랜
              </h1>
              <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">
                이 구조는 기존 MT/LT 데모형 화면을 보고용 문서 방향에 맞게 재설계한 버전이다. 문항을 단순 저장소가 아니라 품질 자산으로 보고,
                시험 단위에서는 학년별 기준과 시험 목적을 분리하고, 상세 화면에서는 문항별 평가 지수와 4R 액션 플랜을 직접 연결한다.
              </p>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[420px]">
              <StatCard title="선택 시험" value={selectedExam.examName} sub={selectedExam.primaryMessage} icon={FileText} />
              <StatCard title="선택 문항" value={selectedItem.itemId} sub={`${selectedItem.subject} · ${selectedItem.targetBoundary}`} icon={Target} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-2 text-lg font-black tracking-tight text-slate-900">
                <Search className="h-5 w-5 text-blue-600" /> 시험 검색 조건
              </div>
              <div className="grid gap-4">
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">시험명 / 레벨 검색</div>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="예: GT1, LT, 3월"
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-blue-400"
                    />
                  </div>
                </div>
                <FilterSelect label="시험 유형" value={testType} onChange={setTestType} options={["전체", "MT", "LT"]} />
                <FilterSelect label="학년" value={schoolGrade} onChange={setSchoolGrade} options={["전체", "1학년", "2학년", "3학년"]} />
                <FilterSelect label="LT Boundary Type" value={boundaryType} onChange={setBoundaryType} options={["전체", "-", "A Type", "B Type"]} />
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-900">
                  <Layers3 className="h-5 w-5 text-blue-600" /> 시험 목록
                </div>
                <div className="text-xs font-bold text-slate-500">{filteredExams.length}건</div>
              </div>
              <div className="space-y-3">
                {filteredExams.map((exam) => {
                  const active = selectedExam.id === exam.id;
                  return (
                    <button
                      key={exam.id}
                      onClick={() => {
                        setSelectedExamId(exam.id);
                        setSelectedItemId(exam.items[0].itemId);
                      }}
                      className={`w-full rounded-3xl border p-4 text-left transition ${
                        active ? "border-blue-300 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-black tracking-tight text-slate-900">{exam.examName}</div>
                          <div className="mt-1 text-xs leading-5 text-slate-500">
                            {exam.testType} · {exam.schoolGrade} · {exam.targetLevel} · {exam.boundaryType}
                          </div>
                        </div>
                        <ChevronRight className="mt-1 h-4 w-4 text-slate-400" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">Avg PQI {exam.examPQI}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">Review {exam.reviewCount}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">Hold {exam.holdCount}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-4">
              <StatCard title="평균 PQI" value={selectedExam.examPQI} sub={selectedExam.testType === "MT" ? "시험 평균 PQI_MT" : "시험 평균 Best PQI_LT"} icon={BarChart3} />
              <StatCard title="Review" value={selectedExam.reviewCount} sub="재검토 필요 문항 수" icon={Eye} />
              <StatCard title="Hold" value={selectedExam.holdCount} sub="즉시 보류 문항 수" icon={AlertTriangle} />
              <StatCard title="고노출" value={selectedExam.highExposureCount} sub="Exposure > 0.25" icon={RefreshCw} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_420px]">
              <div className="space-y-6">
                <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.12em] text-blue-700">시험 상세</div>
                      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{selectedExam.examName}</h2>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                        {selectedExam.primaryMessage} 현재 화면은 문항은행 품질관리, 플래그 관리, 기준 관리를 하나로 묶어,
                        시험 선택 직후 운영 리스크와 4R 우선순위를 바로 판독할 수 있도록 설계했다.
                      </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <div className="font-bold text-slate-900">Boundary / 기준 메모</div>
                      <div className="mt-2 leading-6">
                        {selectedExam.testType === "MT"
                          ? "MT는 레벨 내 성취 확인이 목적이므로 범위 적합성과 현재 레벨 난이도 적합성 기준을 함께 본다."
                          : `LT는 ${selectedExam.boundaryType} 구조에 따라 경계 정보량과 경계 적합성 기준으로 본다.`}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                    <MetricMiniCard label="학생수" value={selectedExam.studentCount} hint="응시 학생 기준" />
                    <MetricMiniCard label="S / A / B / C" value={`${selectedExam.counts.S} / ${selectedExam.counts.A} / ${selectedExam.counts.B} / ${selectedExam.counts.C}`} hint="문항 등급 분포" />
                    <MetricMiniCard label="GM / MS / SMAG" value={`${selectedExam.boundaryInfo.GM} / ${selectedExam.boundaryInfo.MS} / ${selectedExam.boundaryInfo.SMAG}`} hint="경계별 시험 정보량" />
                    <MetricMiniCard label="핵심 메시지" value={selectedExam.testType} hint={selectedExam.testType === "MT" ? "성취 확인형" : "경계 판별형"} />
                  </div>

                  <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div>
                      <div className="mb-3 text-sm font-black tracking-tight text-slate-900">과목별 요약</div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {selectedExam.subjectSummary.map((row) => (
                          <div key={row.subject} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-black tracking-tight text-slate-900">{row.subject}</div>
                              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600">Risk {row.reviewCount}/15</span>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-sm text-slate-600">
                              <div>
                                <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Avg PQI</div>
                                <div className="mt-1 text-lg font-black text-slate-900">{row.avgPQI}</div>
                              </div>
                              <div>
                                <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Avg a</div>
                                <div className="mt-1 text-lg font-black text-slate-900">{row.avgA}</div>
                              </div>
                              <div>
                                <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Avg c</div>
                                <div className="mt-1 text-lg font-black text-slate-900">{row.avgC}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mb-3 text-sm font-black tracking-tight text-slate-900">문항 등급 분포</div>
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <GradeDistribution exam={selectedExam} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black tracking-tight text-slate-900">문항 테이블</div>
                      <div className="mt-1 text-sm text-slate-500">시험에서 상세로 들어가면 문항별 평가 지수와 운영 상태를 바로 볼 수 있도록 구성</div>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">정렬 기준: Hold → Review → PQI</div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-y-2">
                      <thead>
                        <tr className="text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                          <th className="px-3 py-2">Item</th>
                          <th className="px-3 py-2">과목</th>
                          <th className="px-3 py-2">a</th>
                          <th className="px-3 py-2">b</th>
                          <th className="px-3 py-2">c</th>
                          <th className="px-3 py-2">PQI</th>
                          <th className="px-3 py-2">등급</th>
                          <th className="px-3 py-2">4R</th>
                          <th className="px-3 py-2">상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map((item) => {
                          const active = selectedItem.itemId === item.itemId;
                          return (
                            <tr
                              key={item.itemId}
                              onClick={() => setSelectedItemId(item.itemId)}
                              className={`cursor-pointer rounded-2xl border ${
                                active ? "bg-blue-50" : "bg-slate-50 hover:bg-slate-100"
                              }`}
                            >
                              <td className="rounded-l-2xl px-3 py-3 text-sm font-black text-slate-900">{item.itemId}</td>
                              <td className="px-3 py-3 text-sm text-slate-600">{item.subject}</td>
                              <td className="px-3 py-3 text-sm text-slate-600">{item.aParam}</td>
                              <td className="px-3 py-3 text-sm text-slate-600">{item.bParam}</td>
                              <td className="px-3 py-3 text-sm text-slate-600">{item.cParam}</td>
                              <td className="px-3 py-3 text-sm font-bold text-slate-900">{item.finalPQI}</td>
                              <td className="px-3 py-3"><GradeBadge grade={item.itemGrade} /></td>
                              <td className="px-3 py-3"><ActionBadge action={item.actionPlan.primary} /></td>
                              <td className="rounded-r-2xl px-3 py-3 text-sm font-bold text-slate-700">{item.useStatus}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.12em] text-blue-700">문항 상세 분석</div>
                      <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">{selectedItem.itemId}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {selectedItem.subject} · {selectedItem.testType} · {selectedItem.targetBoundary}
                      </div>
                    </div>
                    <GradeBadge grade={selectedItem.itemGrade} />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <MetricMiniCard label="최종 PQI" value={selectedItem.finalPQI} hint={selectedItem.testType === "MT" ? "PQI_MT" : "Best PQI_LT"} />
                    <MetricMiniCard label="Use Status" value={selectedItem.useStatus} hint={selectedItem.autoHold ? "즉시 Hold 후보" : "현재 운영 상태"} />
                    <MetricMiniCard label="Boundary Fit" value={selectedItem.boundaryFit} hint="난이도 위치의 경계 적합성" />
                    <MetricMiniCard label="Exposure" value={selectedItem.exposureRate} hint="고노출 여부 확인" />
                  </div>

                  <div className="mt-5 grid gap-3 grid-cols-3">
                    <MetricMiniCard label="a" value={selectedItem.aParam} hint="변별도" />
                    <MetricMiniCard label="b" value={selectedItem.bParam} hint="난이도 위치" />
                    <MetricMiniCard label="c" value={selectedItem.cParam} hint="추측도" />
                  </div>

                  <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 text-sm font-black tracking-tight text-slate-900">평가 지수</div>
                    <div className="grid gap-2 text-sm text-slate-600">
                      <div className="flex items-center justify-between"><span>W_content</span><span className="font-bold text-slate-900">{selectedItem.wContent}</span></div>
                      <div className="flex items-center justify-between"><span>PQI_MT</span><span className="font-bold text-slate-900">{selectedItem.pqiMT}</span></div>
                      <div className="flex items-center justify-between"><span>PQI_LT_GM</span><span className="font-bold text-slate-900">{selectedItem.pqiLTGM}</span></div>
                      <div className="flex items-center justify-between"><span>PQI_LT_MS</span><span className="font-bold text-slate-900">{selectedItem.pqiLTMS}</span></div>
                      <div className="flex items-center justify-between"><span>PQI_LT_SMAG</span><span className="font-bold text-slate-900">{selectedItem.pqiLTSMAG}</span></div>
                      <div className="flex items-center justify-between"><span>ITEM_INFO_GM / MS / SMAG</span><span className="font-bold text-slate-900">{selectedItem.itemInfoGM} / {selectedItem.itemInfoMS} / {selectedItem.itemInfoSMAG}</span></div>
                      <div className="flex items-center justify-between"><span>DIF / ICC</span><span className="font-bold text-slate-900">{selectedItem.difStatus} / {selectedItem.iccFlag}</span></div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 text-lg font-black tracking-tight text-slate-900">4R 액션 플랜</div>
                  <div className="flex flex-wrap gap-2">
                    <ActionBadge action={selectedItem.actionPlan.primary} />
                    <ActionBadge action={selectedItem.actionPlan.secondary} />
                  </div>
                  <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                    {selectedItem.actionPlan.summary}
                  </div>
                  <div className="mt-4 grid gap-3">
                    {selectedItem.actionPlan.steps.map((step, index) => (
                      <div key={step} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-700">{index + 1}</div>
                        <div className="text-sm leading-6 text-slate-600">{step}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <ItemCurveCard title="ICC Curve" data={selectedItem.curves} dataKey="icc" />
              <ItemCurveCard
                title="Information Curve / Boundary View"
                data={selectedItem.curves.map((row) => ({
                  ...row,
                  GM: selectedExam.testType === "LT" ? selectedItem.itemInfoGM : null,
                  MS: selectedExam.testType === "LT" ? selectedItem.itemInfoMS : null,
                  SMAG: selectedExam.testType === "LT" ? selectedItem.itemInfoSMAG : null,
                }))}
                lines={[
                  { key: "info", color: COLORS.blue },
                  ...(selectedExam.testType === "LT"
                    ? [
                        { key: "GM", color: COLORS.green },
                        { key: "MS", color: COLORS.amber },
                        { key: "SMAG", color: COLORS.red },
                      ]
                    : []),
                ]}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
              <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 text-lg font-black tracking-tight text-slate-900">공식 / 해석 메모</div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-7 text-slate-700">
                  {itemFormula}
                  <br />
                  ITEM_GRADE = S / A / B / C
                  <br />
                  ACTION = 4R(Recycle / Review / Revise / Replace)
                  <br />
                  학년별 기준, 시험 목적, 경계 적합성은 동일 문항이라도 다르게 적용
                </div>
                <div className="mt-4 rounded-3xl border border-slate-200 bg-blue-50 p-4 text-sm leading-7 text-slate-700">
                  {selectedExam.testType === "MT"
                    ? "MT에서는 범위 적합성과 현재 레벨 난이도 적합성이 약하면 좋은 문항처럼 보여도 운영 가치가 낮아질 수 있다."
                    : "LT에서는 총점이 높아도 특정 경계를 가르지 못하면 좋은 문항이 아니다. 경계 정보량과 boundary fit이 우선이다."}
                </div>
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-lg font-black tracking-tight text-slate-900">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" /> 학생 진단 관점 메타데이터
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {diagnosisRows.map(([label, value]) => (
                    <div key={label} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}</div>
                      <div className="mt-2 text-xl font-black tracking-tight text-slate-900">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 text-lg font-black tracking-tight text-slate-900">4R 운영 의미</div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-black text-emerald-700"><RefreshCw className="h-4 w-4" /> Recycle</div>
                  <div className="text-sm leading-7 text-slate-700">핵심 자산군 또는 주사용군을 재사용하되, 노출 관리와 기준 유지 점검을 함께 수행</div>
                </div>
                <div className="rounded-3xl border border-blue-200 bg-blue-50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-black text-blue-700"><Eye className="h-4 w-4" /> Review</div>
                  <div className="text-sm leading-7 text-slate-700">운영 사용 전후로 리스크 원인을 확인하고, 경계 적합성·학년 기준·노출 상태를 재점검</div>
                </div>
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-black text-amber-700"><Pencil className="h-4 w-4" /> Revise</div>
                  <div className="text-sm leading-7 text-slate-700">stem, 선택지, 도메인, wording, 난이도 위치를 수정하여 보완 가능한 문항을 재설계</div>
                </div>
                <div className="rounded-3xl border border-red-200 bg-red-50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-black text-red-700"><Replace className="h-4 w-4" /> Replace</div>
                  <div className="text-sm leading-7 text-slate-700">구조적 결함 또는 운영 리스크가 큰 문항을 교체하고, 동일 도메인 대체 자산을 확보</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
