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

const LS_WEEKLY = "kondate_ai_weekly_v1";

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

function buildWeeklyShoppingList(plan: WeeklyPlan): string[] {
  const all = Object.values(plan)
    .filter(Boolean)
    .flatMap((item) => [...(item?.ingredients || []), ...(item?.seasonings || [])])
    .map((x) => x.trim())
    .filter(Boolean);

  return Array.from(new Set(all));
}

export default function WeeklyPage() {
  const [plan, setPlan] = useState<WeeklyPlan>(EMPTY_WEEKLY);
  const [selectedDay, setSelectedDay] = useState<WeekDay | null>(null);

  useEffect(() => {
    setPlan(loadWeeklyPlan());
  }, []);

  const shoppingList = useMemo(() => buildWeeklyShoppingList(plan), [plan]);
  const selectedItem = selectedDay ? plan[selectedDay] : null;

  function clearDay(day: WeekDay) {
    const next = { ...plan, [day]: null };
    setPlan(next);
    saveWeeklyPlan(next);
    if (selectedDay === day) setSelectedDay(null);
  }

  function clearAll() {
    setPlan(EMPTY_WEEKLY);
    saveWeeklyPlan(EMPTY_WEEKLY);
    setSelectedDay(null);
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 20 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>1週間献立</h1>
      <p style={{ color: "#666" }}>
        ホーム画面で保存した献立を、1週間分まとめて確認できます。
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
        {(Object.keys(plan) as WeekDay[]).map((day) => {
          const item = plan[day];

          return (
            <div
              key={day}
              style={{
                border: "1px solid #e5e5e5",
                borderRadius: 16,
                padding: 14,
                background: "#fff",
                cursor: item ? "pointer" : "default",
              }}
              onClick={() => {
                if (item) setSelectedDay(day);
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{day}曜日</div>
                  {item ? (
                    <>
                      <div style={{ marginTop: 6, fontWeight: 700 }}>{item.title}</div>
                      <div style={{ color: "#666", marginTop: 4 }}>{item.summary}</div>
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
          );
        })}
      </div>

      {shoppingList.length > 0 && (
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
            {shoppingList.map((x, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {x}
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedItem && (
        <div
          style={{
            marginTop: 24,
            border: "1px solid #e5e5e5",
            borderRadius: 16,
            padding: 16,
            background: "#fff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            {selectedDay}曜日：{selectedItem.title}
          </h2>
          <p style={{ color: "#666" }}>{selectedItem.summary}</p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            <span>⏱ {selectedItem.timeMin}分</span>
            <span>🔥 {selectedItem.caloriesKcal}kcal</span>
            {selectedItem.servings && <span>👤 {selectedItem.servings}</span>}
          </div>

          <div style={{ marginTop: 16 }}>
            <h3>材料</h3>
            <ul style={{ paddingLeft: 18 }}>
              {(selectedItem.ingredients || []).map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>

          {selectedItem.seasonings && selectedItem.seasonings.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3>調味料</h3>
              <ul style={{ paddingLeft: 18 }}>
                {selectedItem.seasonings.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          )}

          {selectedItem.steps && selectedItem.steps.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3>作り方</h3>
              <ol style={{ paddingLeft: 18 }}>
                {selectedItem.steps.map((x, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    {x}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {selectedItem.tips && selectedItem.tips.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3>コツ</h3>
              <ul style={{ paddingLeft: 18 }}>
                {selectedItem.tips.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
