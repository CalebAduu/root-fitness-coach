"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../../components/AppHeader";
import {
  CheckCircleIcon,
  ClockIcon,
  FireIcon,
  RocketIcon,
  ScaleIcon,
  SunriseIcon,
  TargetIcon,
  TrendingUpIcon,
} from "../../components/icons";

interface Point {
  label: string;
  value: number;
}

const CHART_W = 640;
const CHART_H = 240;
const PAD = { left: 44, right: 24, top: 20, bottom: 32 };
const INK_MUTED = "#6b7280";
const GRID = "#e5e7eb";
const SERIES = "#0d9488";
const SERIES_HOVER = "#0f766e";

function WeightChart({ data, unit }: { data: Point[]; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);

  const values = data.map((d) => d.value);
  const yMin = Math.floor(Math.min(...values)) - 1;
  const rawMax = Math.ceil(Math.max(...values)) + 1;
  const step = Math.ceil((rawMax - yMin) / 3);
  const yMax = yMin + step * 3;
  const ticks = [0, 1, 2, 3].map((i) => yMin + step * i);

  const plotW = CHART_W - PAD.left - PAD.right;
  const plotH = CHART_H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i * plotW) / (data.length - 1);
  const y = (v: number) => PAD.top + ((yMax - v) / (yMax - yMin)) * plotH;

  const path = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.value)}`).join(" ");
  const last = data[data.length - 1];
  const bandW = plotW / (data.length - 1);

  return (
    <div className="relative overflow-x-auto -mt-12 pt-12">
      <div className="relative min-w-[480px]" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full h-auto" role="img" aria-label="Weight trend over the last 12 weeks">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={CHART_W - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={12} fill={INK_MUTED}>{t}</text>
            </g>
          ))}
          {data.map((d, i) =>
            i % 2 === 0 || i === data.length - 1 ? (
              <text key={d.label} x={x(i)} y={CHART_H - 10} textAnchor="middle" fontSize={12} fill={INK_MUTED}>{d.label}</text>
            ) : null
          )}

          <path d={path} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {hover !== null && (
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={CHART_H - PAD.bottom} stroke="#9ca3af" strokeWidth={1} strokeDasharray="3 3" />
          )}
          {/* End-point marker + direct label; hovered point gets the same 8px marker with a surface ring */}
          {[data.length - 1, ...(hover !== null && hover !== data.length - 1 ? [hover] : [])].map((i) => (
            <circle key={i} cx={x(i)} cy={y(data[i].value)} r={4} fill={SERIES} stroke="#ffffff" strokeWidth={2} />
          ))}
          <text x={x(data.length - 1)} y={y(last.value) - 12} textAnchor="end" fontSize={13} fontWeight={600} fill="#111827">
            {last.value} {unit}
          </text>

          {data.map((d, i) => (
            <rect
              key={d.label}
              x={x(i) - bandW / 2}
              y={PAD.top}
              width={bandW}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onClick={() => setHover(i)}
            />
          ))}
        </svg>

        {hover !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
            style={{ left: `${(x(hover) / CHART_W) * 100}%`, top: `${(y(data[hover].value) / CHART_H) * 100}%`, marginTop: -10 }}
          >
            <div className="text-gray-300">{data[hover].label}</div>
            <div className="font-semibold">{data[hover].value} {unit}</div>
          </div>
        )}
      </div>

      <div className="sr-only"><table>
        <caption>Weight by week</caption>
        <thead><tr><th>Week</th><th>Weight ({unit})</th></tr></thead>
        <tbody>
          {data.map((d) => (<tr key={d.label}><td>{d.label}</td><td>{d.value}</td></tr>))}
        </tbody>
      </table></div>
    </div>
  );
}

function roundedTopBar(bx: number, by: number, w: number, h: number, r: number) {
  const radius = Math.min(r, h, w / 2);
  return `M${bx},${by + h} V${by + radius} Q${bx},${by} ${bx + radius},${by} H${bx + w - radius} Q${bx + w},${by} ${bx + w},${by + radius} V${by + h} Z`;
}

function SessionsChart({ data, target }: { data: Point[]; target: number }) {
  const [hover, setHover] = useState<number | null>(null);

  const yMax = Math.max(target, ...data.map((d) => d.value)) + 1;
  const tickStep = yMax > 5 ? 2 : 1;
  const ticks = Array.from({ length: yMax + 1 }, (_, i) => i).filter((i) => i % tickStep === 0);

  const plotW = CHART_W - PAD.left - PAD.right;
  const plotH = CHART_H - PAD.top - PAD.bottom;
  const band = plotW / data.length;
  const barW = Math.min(36, band * 0.55);
  const y = (v: number) => PAD.top + ((yMax - v) / yMax) * plotH;
  const cx = (i: number) => PAD.left + band * i + band / 2;

  return (
    <div className="relative overflow-x-auto -mt-12 pt-12">
      <div className="relative min-w-[480px]" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full h-auto" role="img" aria-label="Workouts completed per week against your weekly goal">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={CHART_W - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={12} fill={INK_MUTED}>{t}</text>
            </g>
          ))}

          {data.map((d, i) => (
            <g key={d.label}>
              <path
                d={roundedTopBar(cx(i) - barW / 2, y(d.value), barW, y(0) - y(d.value), 4)}
                fill={hover === i ? SERIES_HOVER : SERIES}
              />
              <text x={cx(i)} y={CHART_H - 10} textAnchor="middle" fontSize={12} fill={INK_MUTED}>{d.label}</text>
            </g>
          ))}

          <line x1={PAD.left} x2={CHART_W - PAD.right} y1={y(target)} y2={y(target)} stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="5 4" />
          <text x={CHART_W - PAD.right} y={y(target) - 6} textAnchor="end" fontSize={12} fontWeight={600} fill="#374151">
            Goal: {target}/wk
          </text>

          {data.map((d, i) => (
            <rect
              key={d.label}
              x={PAD.left + band * i}
              y={PAD.top}
              width={band}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onClick={() => setHover(i)}
            />
          ))}
        </svg>

        {hover !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
            style={{ left: `${(cx(hover) / CHART_W) * 100}%`, top: `${(y(data[hover].value) / CHART_H) * 100}%`, marginTop: -8 }}
          >
            <div className="text-gray-300">{data[hover].label}</div>
            <div className="font-semibold">{data[hover].value} of {target} workouts</div>
          </div>
        )}
      </div>

      <div className="sr-only"><table>
        <caption>Workouts completed per week (goal {target})</caption>
        <thead><tr><th>Week</th><th>Workouts</th></tr></thead>
        <tbody>
          {data.map((d) => (<tr key={d.label}><td>{d.label}</td><td>{d.value}</td></tr>))}
        </tbody>
      </table></div>
    </div>
  );
}

const DEFAULT_FOCUSES = ["Full Body Strength", "Upper Body & Core", "Lower Body Strength", "Cardio & Core", "Full Body Strength"];
const RECENT_WHEN = ["Today", "Yesterday", "3 days ago", "5 days ago", "6 days ago"];
const RECENT_DURATION = ["42 min", "38 min", "45 min", "35 min", "41 min"];

const ACHIEVEMENTS = [
  { title: "First Workout", detail: "Completed your first session", earned: true, Icon: CheckCircleIcon },
  { title: "7-Day Streak", detail: "Trained 7 days in a row", earned: true, Icon: FireIcon },
  { title: "10 Workouts", detail: "Ten sessions logged", earned: true, Icon: TargetIcon },
  { title: "Early Bird", detail: "Five workouts before 8am", earned: true, Icon: SunriseIcon },
  { title: "30-Day Streak", detail: "Train 30 days in a row", earned: false, Icon: RocketIcon },
  { title: "50 Workouts", detail: "Fifty sessions logged", earned: false, Icon: TrendingUpIcon },
];

export default function ProgressPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [focuses, setFocuses] = useState<string[]>(DEFAULT_FOCUSES);

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem("userData");
      if (storedUser) setUserData(JSON.parse(storedUser));
      const storedPlan = sessionStorage.getItem("workoutPlan");
      if (storedPlan) {
        const plan = JSON.parse(storedPlan);
        const planFocuses = Object.values<any>(plan.weeklyPlan || {}).map((d) => d.focus).filter(Boolean);
        if (planFocuses.length > 0) {
          setFocuses(Array.from({ length: 5 }, (_, i) => planFocuses[i % planFocuses.length]));
        }
      }
    } catch {
      // No stored session data - the page still renders with sample defaults
    }
  }, []);

  const name = userData?.name || "Athlete";
  const targetDays = Math.max(2, Math.min(Number(userData?.workoutDays) || 4, 7));
  const startWeight = Number(userData?.weight) || 170;
  const goalText = String(userData?.fitnessGoals || "").toLowerCase();
  const direction = goalText.includes("lose") || goalText.includes("weight") ? -1 : 1;

  const wobble = [0, 0.3, 0.1, 0.6, 0.4, 0.9, 0.7, 1.1, 1.0, 1.4, 1.3, 1.6];
  const weightData: Point[] = wobble.map((w, i) => ({
    label: i === wobble.length - 1 ? "Now" : `Wk ${i + 1}`,
    value: Math.round((startWeight + direction * w) * 10) / 10,
  }));
  const weightChange = Math.round((weightData[weightData.length - 1].value - startWeight) * 10) / 10;

  const sessionOffsets = [-1, 0, 0, -2, 0, -1, 0, -1];
  const sessionsData: Point[] = sessionOffsets.map((o, i) => ({
    label: i === sessionOffsets.length - 1 ? "This wk" : `Wk ${i + 1}`,
    value: Math.max(1, targetDays + o),
  }));
  const totalWorkouts = sessionsData.reduce((sum, d) => sum + d.value, 0);

  const stats = [
    { label: "Current Streak", value: "12 days", Icon: FireIcon, tone: "from-orange-500 to-amber-500" },
    { label: "Workouts Completed", value: String(totalWorkouts), Icon: CheckCircleIcon, tone: "from-teal-500 to-blue-600" },
    { label: "Time Trained", value: `${Math.floor((totalWorkouts * 42) / 60)}h ${(totalWorkouts * 42) % 60}m`, Icon: ClockIcon, tone: "from-blue-500 to-indigo-600" },
    {
      label: "Weight Change",
      value: `${weightChange > 0 ? "+" : ""}${weightChange} lbs`,
      Icon: ScaleIcon,
      tone: "from-purple-500 to-indigo-600",
    },
  ];

  const goals = [
    { label: "Consistency", percent: 85, detail: `${targetDays} workouts a week` },
    { label: "Strength", percent: 62, detail: "Progressive overload on main lifts" },
    { label: "Endurance", percent: 48, detail: "Cardio and conditioning" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        active="progress"
        rightSlot={
          <button
            onClick={() => router.push("/workout-plan")}
            className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors border border-white/10"
          >
            ← Back to Dashboard
          </button>
        }
      />

      <div className="bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <span className="inline-block bg-white/15 text-white text-sm font-medium rounded-full px-4 py-1 mb-4 border border-white/20">
            Sample data preview
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Your Progress</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Keep it up, {name}. Here's a look at how your training is trending.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map(({ label, value, Icon, tone }) => (
            <div key={label} className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <div className={`w-11 h-11 rounded-full bg-gradient-to-r ${tone} flex items-center justify-center mb-4`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</div>
              <div className="text-sm text-gray-600 mt-1">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-gray-900">Weight Trend</h2>
            <p className="text-sm text-gray-600 mb-6">Last 12 weeks, in lbs</p>
            <WeightChart data={weightData} unit="lbs" />
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-gray-900">Weekly Workouts</h2>
            <p className="text-sm text-gray-600 mb-6">Sessions completed vs. your weekly goal</p>
            <SessionsChart data={sessionsData} target={targetDays} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Goal Progress</h2>
            <div className="space-y-6">
              {goals.map((g) => (
                <div key={g.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{g.label}</span>
                    <span className="text-sm font-semibold text-teal-700">{g.percent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-teal-500 to-blue-600 h-2 rounded-full" style={{ width: `${g.percent}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{g.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h2>
            <ul className="divide-y divide-gray-100">
              {focuses.map((focus, i) => (
                <li key={i} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-teal-500 to-blue-600 flex items-center justify-center mr-4 flex-shrink-0">
                      <CheckCircleIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{focus}</div>
                      <div className="text-sm text-gray-500">{RECENT_WHEN[i]}</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-600">{RECENT_DURATION[i]}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Achievements</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {ACHIEVEMENTS.map(({ title, detail, earned, Icon }) => (
              <div
                key={title}
                className={`rounded-xl border p-4 text-center ${earned ? "bg-gradient-to-b from-teal-50 to-blue-50 border-teal-200" : "bg-gray-50 border-gray-200"}`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                    earned ? "bg-gradient-to-r from-teal-500 to-blue-600" : "bg-gray-300"
                  }`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className={`text-sm font-semibold ${earned ? "text-gray-900" : "text-gray-500"}`}>{title}</div>
                <div className="text-xs text-gray-500 mt-1">{earned ? detail : `Locked - ${detail}`}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-2xl p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Live tracking is coming soon</h3>
            <p className="text-gray-600 mt-1">The numbers above are a preview. Soon this page will fill in from your real workouts.</p>
          </div>
          <button
            onClick={() => router.push("/workout")}
            className="bg-gradient-to-r from-teal-500 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-teal-600 hover:to-blue-700 transition-all shadow-lg whitespace-nowrap"
          >
            Go to Workouts
          </button>
        </div>
      </div>
    </div>
  );
}
