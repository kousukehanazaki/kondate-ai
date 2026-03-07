"use client";

import { useState } from "react";

type Item = {
  title: string;
  summary: string;
  ingredients: string[];
  timeMin: number;
  caloriesKcal: number;
  servings?: string;
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

function buildShoppingList(it: Item): string[] {
  const a = Array.isArray(it.ingredients) ? it.ingredients : [];
  const b = Array.isArray(it.seasonings) ? it.seasonings : [];
  const merged = [...a, ...b]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);

  return Array.from(new Set(merged));
}

export default function FreePage() {
  const [prompt, setPrompt] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [shoppingOpen, setShoppingOpen] = useState<Record<number, boolean>>({});
  const [checks, setChecks] = useState<Record<number, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    setItems([]);
    setExpandedIndex(null);
    setShoppingOpen({});
    setChecks({});

    try {
      const res = await fetch("/api/free-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "生成に失敗しました");
      if (!data?.items || !Array.isArray(data.items)) {
        throw new Error("返ってきた形式が想定と違います");
      }

      setItems(data.items);
    } catch (e: any) {
      setError(e?.message || "生成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
      <h1>自由入力レシピAI</h1>
      <p style={{ color: "#666" }}>
        例：「鶏肉とキャベツで夜ごはん」「冷蔵庫の卵と豆腐で簡単レシピ」など自由に入力できます。
      </p>

      <a href="/" style={{ display: "inline-block", marginBottom: 16 }}>
        ← トップに戻る
      </a>

      <div
        style={{
          border: "1px solid #e5e5e5",
          borderRadius: 16,
          padding: 16,
          background: "#fff",
        }}
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="例：鶏肉とキャベツで、夜に食べる簡単で節約できるレシピを教えて"
          rows={5}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            border: "1px solid #ddd",
            resize: "vertical",
            fontSize: 14,
          }}
        />

        <button
          onClick={generate}
          disabled={loading || !prompt.trim()}
          style={{
            marginTop: 12,
            padding: "14px 16px",
            borderRadius: 14,
            border: "none",
            background: "#111",
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
            width: "100%",
          }}
        >
          {loading ? "生成中..." : "自由にレシピを生成"}
        </button>

        {error && (
          <div style={{ marginTop: 12, color: "#a40000" }}>
            エラー：{error}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
          {items.map((it, idx) => {
            const shopping = buildShoppingList(it);
            const open = expandedIndex === idx;
            const shoppingVisible = !!shoppingOpen[idx];
            const check = checks[idx] || {};

            return (
              <div key={idx}>
                <div
                  onClick={() => setExpandedIndex(open ? null : idx)}
                  style={{
                    border: "1px solid #e5e5e5",
                    borderRadius: 16,
                    padding: 14,
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 16 }}>{it.title}</div>
                      <div style={{ color: "#666", marginTop: 6 }}>{it.summary}</div>
                    </div>

                    <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div>⏱ {it.timeMin}分</div>
                      <div>🔥 {it.caloriesKcal}kcal</div>
                    </div>
                  </div>
                </div>

                {open && (
                  <div
                    style={{
                      marginTop: 10,
                      border: "1px solid #e5e5e5",
                      borderRadius: 16,
                      padding: 16,
                      background: "#fff",
                    }}
                  >
                    <h3 style={{ marginTop: 0 }}>{it.title}</h3>
                    <p style={{ color: "#666" }}>{it.summary}</p>

                    <div style={{ marginTop: 14 }}>
                      <h4>材料</h4>
                      <ul style={{ paddingLeft: 18 }}>
                        {(it.ingredients || []).map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>

                    {it.seasonings && it.seasonings.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <h4>調味料</h4>
                        <ul style={{ paddingLeft: 18 }}>
                          {it.seasonings.map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {it.steps && it.steps.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <h4>作り方</h4>
                        <ol style={{ paddingLeft: 18 }}>
                          {it.steps.map((x, i) => (
                            <li key={i} style={{ marginBottom: 6 }}>
                              {x}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    <div style={{ marginTop: 14 }}>
                      <button
                        onClick={() =>
                          setShoppingOpen((prev) => ({ ...prev, [idx]: !prev[idx] }))
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
                    </div>

                    {shoppingVisible && (
                      <div style={{ marginTop: 14 }}>
                        <h4>買い物リスト</h4>
                        <div style={{ display: "grid", gap: 8 }}>
                          {shopping.map((label) => {
                            const checked = !!check[label];
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
                                  onChange={(e) =>
                                    setChecks((prev) => ({
                                      ...prev,
                                      [idx]: {
                                        ...(prev[idx] || {}),
                                        [label]: e.target.checked,
                                      },
                                    }))
                                  }
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
      )}
    </main>
  );
}
