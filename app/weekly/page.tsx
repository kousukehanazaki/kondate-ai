"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  title: string;
  summary: string;
  ingredients: string[];
  timeMin: number;
  caloriesKcal: number;
  servings?: string;
  seasonNow?: string;
  seasonings?: string[];
  steps?: string[];
  tips?: string[];
};

type WeekDay = "月" | "火" | "水" | "木" | "金" | "土" | "日";
type WeeklyPlan = Record<WeekDay, Item | null>;
type ChecklistMap = Record<string, boolean>;

const LS_WEEKLY = "kondate_ai_weekly_v1";
const LS_WEEKLY_CHECK_PREFIX = "kondate_ai_weekly_checklist_v1__";

const EMPTY_WEEKLY: WeeklyPlan = {
  月: null,
  火: null,
  水: null,
  木: null,
  金: null,
  土: null,
  日: null,
};

function loadWeeklyPlan(): WeeklyPlan {
  if (typeof window === "undefined") return EMPTY_WEEKLY;
  try {
    const raw = localStorage.getItem(LS_WEEKLY);
    if (!raw) return EMPTY_WEEKLY;
    return { ...EMPTY_WEEKLY, ...JSON.parse(raw) };
  } catch {
    return EMPTY_WEEKLY;
  }
}

function saveWeeklyPlan(plan: WeeklyPlan) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_WEEKLY, JSON.stringify(plan));
}

function loadChecklist(day: WeekDay): ChecklistMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_WEEKLY_CHECK_PREFIX + day);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveChecklist(day: WeekDay, checklist: ChecklistMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_WEEKLY_CHECK_PREFIX + day, JSON.stringify(checklist));
}

function clearChecklist(day: WeekDay) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_WEEKLY_CHECK_PREFIX + day, JSON.stringify({}));
}

function buildShoppingList(it: Item): string[] {
  const a = Array.isArray(it.ingredients) ? it.ingredients : [];
  const b = Array.isArray(it.seasonings) ? it.seasonings : [];
  const merged = [...a, ...b]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);

  return Array.from(new Set(merged));
}

function buildWeeklyShoppingList(plan: WeeklyPlan): string[] {
  const all = Object.values(plan)
    .filter(Boolean)
    .flatMap((item) => [
      ...((item?.ingredients as string[]) || []),
      ...((item?.seasonings as string[]) || []),
    ])
    .map((x) => x.trim())
    .filter(Boolean);

  return Array.from(new Set(all));
}

export default function WeeklyPage() {
  const [plan, setPlan] = useState<WeeklyPlan>(EMPTY_WEEKLY);
  const [expandedDay, setExpandedDay] = useState<WeekDay | null>(null);
  const [shoppingOpen, setShoppingOpen] = useState<Record<WeekDay, boolean>>({
    月: false,
    火: false,
    水: false,
    木: false,
    金: false,
    土: false,
    日: false,
  });
  const [checklists, setChecklists] = useState<Record<WeekDay, ChecklistMap>>({
    月: {},
    火: {},
    水: {},
    木: {},
    金: {},
    土: {},
    日: {},
  });

  useEffect(() => {
    setPlan(loadWeeklyPlan());
    setChecklists({
      月: loadChecklist("月"),
      火: loadChecklist("火"),
      水: loadChecklist("水"),
      木: loadChecklist("木"),
      金: loadChecklist("金"),
      土: loadChecklist("土"),
      日: loadChecklist("日"),
    });
  }, []);

  const weeklyShoppingList = useMemo(() => buildWeeklyShoppingList(plan), [plan]);

  function clearDay(day: WeekDay) {
    const next = { ...plan, [day]: null };
    setPlan(next);
    saveWeeklyPlan(next);
    clearChecklist(day);
    setChecklists((prev) => ({ ...prev, [day]: {} }));
    setShoppingOpen((prev) => ({ ...prev, [day]: false }));
    if (expandedDay === day) setExpandedDay(null);
  }

  function clearAll() {
    setPlan(EMPTY_WEEKLY);
    saveWeeklyPlan(EMPTY_WEEKLY);

    (["月", "火", "水", "木", "金", "土", "日"] as WeekDay[]).forEach((day) =>
      clearChecklist(day)
    );

    setChecklists({
      月: {},
      火: {},
      水: {},
      木: {},
      金: {},
      土: {},
      日: {},
    });
    setShoppingOpen({
      月: false,
      火: false,
      水: false,
      木: false,
      金: false,
      土: false,
      日: false,
    });
    setExpandedDay(null);
  }

  function toggleChecklist(day: WeekDay, label: string, checked: boolean) {
    setChecklists((prev) => {
      const nextDay = {
        ...(prev[day] || {}),
        [label]: checked,
      };
      saveChecklist(day, nextDay);
      return {
        ...prev,
        [day]: nextDay,
      };
    });
  }

  function resetDayChecklist(day: WeekDay) {
    clearChecklist(day);
    setChecklists((prev) => ({
      ...prev,
      [day]: {},
    }));
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 20 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>1週間献立</h1>
      <p style={{ color: "#666" }}>
        ホーム画面や自由レシピで保存した献立を、1週間分まとめて確認できます。
      </p>

      <div style={{ marginTop: 16, marginBottom: 20 }}>
        <a href="/" style={{ marginRight: 12 }}>
          ← トップへ戻る
        </a>
        <button
          onClick={clearAll}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          1週間分をクリア
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        {(["月", "火", "水", "木", "金", "土", "日"] as WeekDay[]).map((day) => {
          const item = plan[day];
          const open = expandedDay === day;
          const shoppingVisible = !!shoppingOpen[day];
          const shoppingList = item ? buildShoppingList(item) : [];
          const checklist = checklists[day] || {};

          return (
            <div key={day}>
              <div
                style={{
                  border: "1px solid #e5e5e5",
                  borderRadius: 16,
                  padding: 14,
                  background: "#fff",
                  cursor: item ? "pointer" : "default",
                }}
                onClick={() => {
                  if (item) setExpandedDay((prev) => (prev === day ? null : day));
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{day}曜日</div>
                    {item ? (
                      <>
                        <div style={{ marginTop: 6, fontWeight: 700 }}>{item.title}</div>
                        <div style={{ color: "#666", marginTop: 4 }}>{item.summary}</div>
                        <div style={{ marginTop: 8, fontSize: 12, color: "#666", fontWeight: 700 }}>
                          {open ? "▲ 詳細を閉じる" : "▼ 詳細を見る"}
                        </div>
                      </>
                    ) : (
                      <div style={{ color: "#888", marginTop: 8 }}>まだ保存されていません</div>
                    )}
                  </div>

                  {item && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearDay(day);
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid #ddd",
                        background: "#fff",
                        cursor: "pointer",
                        height: "fit-content",
                      }}
                    >
                      削除
                    </button>
                  )}
                </div>
              </div>

              {item && open && (
                <div
                  style={{
                    marginTop: 10,
                    border: "1px solid #e5e5e5",
                    borderRadius: 16,
                    padding: 16,
                    background: "#fff",
                  }}
                >
                  <h2 style={{ marginTop: 0 }}>
                    {day}曜日：{item.title}
                  </h2>
                  <p style={{ color: "#666", lineHeight: 1.6 }}>{item.summary}</p>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                    <span>⏱ {item.timeMin}分</span>
                    <span>🔥 {item.caloriesKcal}kcal</span>
                    {item.servings && <span>👤 {item.servings}</span>}
                    {item.seasonNow && <span>🌿 {item.seasonNow}</span>}
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <h3>材料</h3>
                    <ul style={{ paddingLeft: 18 }}>
                      {(item.ingredients || []).map((x, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>
                          {x}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {item.seasonings && item.seasonings.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <h3>調味料</h3>
                      <ul style={{ paddingLeft: 18 }}>
                        {item.seasonings.map((x, i) => (
                          <li key={i} style={{ marginBottom: 6 }}>
                            {x}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {item.steps && item.steps.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <h3>作り方</h3>
                      <ol style={{ paddingLeft: 18 }}>
                        {item.steps.map((x, i) => (
                          <li key={i} style={{ marginBottom: 6 }}>
                            {x}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {item.tips && item.tips.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <h3>コツ</h3>
                      <ul style={{ paddingLeft: 18 }}>
                        {item.tips.map((x, i) => (
                          <li key={i} style={{ marginBottom: 6 }}>
                            {x}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() =>
                        setShoppingOpen((prev) => ({
                          ...prev,
                          [day]: !prev[day],
                        }))
                      }
                      style={{
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: "none",
                        background: "#111",
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      {shoppingVisible ? "買い物リストをたたむ" : "買い物リストを表示"}
                    </button>

                    {shoppingVisible && (
                      <button
                        type="button"
                        onClick={() => resetDayChecklist(day)}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 12,
                          border: "1px solid #ddd",
                          background: "#fff",
                          cursor: "pointer",
                          fontWeight: 900,
                        }}
                      >
                        チェックを全解除
                      </button>
                    )}
                  </div>

                  {shoppingVisible && (
                    <div style={{ marginTop: 16 }}>
                      <h3>買い物リスト</h3>
                      <div style={{ display: "grid", gap: 8 }}>
                        {shoppingList.map((label) => {
                          const checked = !!checklist[label];
                          return (
                            <label
                              key={label}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: 10,
                                borderRadius: 12,
                                border: "1px solid #ddd",
                                background: checked ? "rgba(17,17,17,0.06)" : "#fff",
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => toggleChecklist(day, label, e.target.checked)}
                              />
                              <span>{label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {weeklyShoppingList.length > 0 && (
        <div
          style={{
            marginTop: 24,
            border: "1px solid #e5e5e5",
            borderRadius: 16,
            padding: 16,
            background: "#fafafa",
          }}
        >
          <h2 style={{ marginTop: 0 }}>🛒 1週間の買い物リスト</h2>
          <ul style={{ paddingLeft: 18 }}>
            {weeklyShoppingList.map((x, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {x}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
