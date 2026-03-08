"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

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

type ChecklistMap = Record<string, boolean>;

const LS_FAV = "kondate_ai_favorites_v2";
const LS_WEEKLY = "kondate_ai_weekly_v1";
const LS_CHECK_PREFIX = "kondate_ai_checklist_v2__";

type WeekDay = "月" | "火" | "水" | "木" | "金" | "土" | "日";
type WeeklyPlan = Record<WeekDay, Item | null>;

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

function itemKey(it: Item) {
  return `${it.title}__${it.timeMin}__${it.caloriesKcal}`;
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: any) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function buildShoppingList(it: Item): string[] {
  const a = Array.isArray(it.ingredients) ? it.ingredients : [];
  const b = Array.isArray(it.seasonings) ? it.seasonings : [];
  const merged = [...a, ...b]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of merged) {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}

export default function Home() {
  const [taste, setTaste] = useState("和食");
  const [dishType, setDishType] = useState("主菜");
  const [target, setTarget] = useState("大人");
  const [mealTime, setMealTime] = useState("夜");
  const [excludedAllergiesText, setExcludedAllergiesText] = useState("");

  const [items, setItems] = useState<Item[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [shoppingOpen, setShoppingOpen] = useState<Record<string, boolean>>({});
  const [checklists, setChecklists] = useState<Record<string, ChecklistMap>>({});
  const [favorites, setFavorites] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFavorites(loadJson<Item[]>(LS_FAV, []));
  }, []);

  const favoriteKeySet = useMemo(() => new Set(favorites.map(itemKey)), [favorites]);

  function isFavorite(it: Item) {
    return favoriteKeySet.has(itemKey(it));
  }

  function toggleFavorite(it: Item) {
    const key = itemKey(it);
    setFavorites((prev) => {
      const exists = prev.some((x) => itemKey(x) === key);
      const next = exists ? prev.filter((x) => itemKey(x) !== key) : [it, ...prev];
      saveJson(LS_FAV, next);
      return next;
    });
  }

  function ensureChecklistLoaded(it: Item) {
    const k = itemKey(it);
    setChecklists((prev) => {
      if (prev[k]) return prev;
      const loaded = loadJson<ChecklistMap>(LS_CHECK_PREFIX + k, {});
      return { ...prev, [k]: loaded };
    });
  }

  function setChecklistValue(it: Item, label: string, value: boolean) {
    const k = itemKey(it);
    setChecklists((prev) => {
      const nextMap: ChecklistMap = { ...(prev[k] || {}) };
      nextMap[label] = value;
      const next = { ...prev, [k]: nextMap };
      saveJson(LS_CHECK_PREFIX + k, nextMap);
      return next;
    });
  }

  function resetChecklist(it: Item) {
    const k = itemKey(it);
    setChecklists((prev) => {
      const next = { ...prev, [k]: {} };
      saveJson(LS_CHECK_PREFIX + k, {});
      return next;
    });
  }

  async function generate() {
    setLoading(true);
    setError(null);
    setItems([]);
    setExpandedKey(null);
    setShoppingOpen({});
    setChecklists({});

    const excludedAllergies = excludedAllergiesText
      .split(/[、,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taste,
          dishType,
          target,
          excludedAllergies,
          mealTime,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || data?.message || "不明なエラー");
      if (!data?.items || !Array.isArray(data.items)) {
        throw new Error("返ってきたデータ形式が想定と違います（itemsがありません）");
      }

      setItems(data.items);
    } catch (e: any) {
      setError(e?.message ?? "生成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  const pageBg = "linear-gradient(180deg, #fff7f2 0%, #fff 18%, #fff8fb 55%, #fff 100%)";
  const cardShadow = "0 10px 30px rgba(0,0,0,0.06)";
  const strongShadow = "0 14px 40px rgba(0,0,0,0.10)";
  const softBorder = "1px solid rgba(0,0,0,0.08)";

  const chipStyle: CSSProperties = {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "#fff",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  };

  const activeChipStyle: CSSProperties = {
    ...chipStyle,
    background: "#111",
    color: "#fff",
    border: "1px solid #111",
  };

  function Chip({
    label,
    active,
    onClick,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
  }) {
    return (
      <button type="button" onClick={onClick} style={active ? activeChipStyle : chipStyle} aria-pressed={active}>
        {label}
      </button>
    );
  }

  function FavButton({ fav, onClick }: { fav: boolean; onClick: (e: any) => void }) {
    return (
      <button
        onClick={onClick}
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          border: "1px solid rgba(0,0,0,0.12)",
          background: fav ? "#111" : "#fff",
          color: fav ? "#fff" : "#111",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          flexShrink: 0,
        }}
        aria-label="お気に入り"
        title="お気に入り"
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>{fav ? "★" : "♡"}</span>
      </button>
    );
  }

  function MiniTag({ children }: { children: ReactNode }) {
    return (
      <span
        style={{
          padding: "8px 12px",
          borderRadius: 999,
          border: "1px solid rgba(0,0,0,0.10)",
          background: "#fff",
          fontSize: 13,
          fontWeight: 800,
          color: "#333",
        }}
      >
        {children}
      </span>
    );
  }

  function SectionCard({ title, children }: { title: string; children: ReactNode }) {
    return (
      <div
        style={{
          borderRadius: 16,
          border: softBorder,
          background: "#fff",
          boxShadow: cardShadow,
          padding: 14,
          marginTop: 12,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
        {children}
      </div>
    );
  }

  function InfoCard({ title, text }: { title: string; text: string }) {
    return (
      <div
        style={{
          borderRadius: 18,
          background: "#fff",
          border: softBorder,
          boxShadow: cardShadow,
          padding: 16,
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 15 }}>{title}</div>
        <div style={{ color: "#666", marginTop: 8, fontSize: 13, lineHeight: 1.7 }}>{text}</div>
      </div>
    );
  }

  function DetailBlock({ it }: { it: Item }) {
    const k = itemKey(it);
    const list = buildShoppingList(it);
    const open = !!shoppingOpen[k];
    const checklist = checklists[k] || {};

    return (
      <div style={{ marginTop: 12 }}>
        <div
          style={{
            borderRadius: 18,
            border: softBorder,
            background: "#fff",
            boxShadow: cardShadow,
            padding: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{it.title}</div>
              <div style={{ color: "#666", marginTop: 6, fontSize: 13, lineHeight: 1.6 }}>{it.summary}</div>
            </div>
            <button
              onClick={() => {
                setExpandedKey(null);
              }}
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 900,
                height: "fit-content",
                whiteSpace: "nowrap",
              }}
            >
              閉じる
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <MiniTag>⏱ {it.timeMin}分</MiniTag>
            <MiniTag>🔥 {it.caloriesKcal}kcal</MiniTag>
            {it.servings && <MiniTag>👤 {it.servings}</MiniTag>}
            {it.seasonNow && <MiniTag>🌿 {it.seasonNow}</MiniTag>}
          </div>

          <SectionCard title="材料">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {(it.ingredients || []).map((x, i) => (
                <li key={i} style={{ marginBottom: 6 }}>
                  {x}
                </li>
              ))}
            </ul>
          </SectionCard>

          {Array.isArray(it.seasonings) && it.seasonings.length > 0 && (
            <SectionCard title="調味料">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {it.seasonings.map((x, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    {x}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {Array.isArray(it.steps) && it.steps.length > 0 && (
            <SectionCard title="作り方">
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {it.steps.map((x, i) => (
                  <li key={i} style={{ marginBottom: 8 }}>
                    {x}
                  </li>
                ))}
              </ol>
            </SectionCard>
          )}

          {Array.isArray(it.tips) && it.tips.length > 0 && (
            <SectionCard title="コツ">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {it.tips.map((x, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    {x}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <select
              defaultValue=""
              onChange={(e) => {
                const day = e.target.value as WeekDay;
                if (!day) return;
                const current = loadWeeklyPlan();
                const next = { ...current, [day]: it };
                saveWeeklyPlan(next);
                alert(`${day}曜日に保存しました`);
                e.target.value = "";
              }}
              style={{
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              <option value="">1週間献立に保存</option>
              <option value="月">月曜日に保存</option>
              <option value="火">火曜日に保存</option>
              <option value="水">水曜日に保存</option>
              <option value="木">木曜日に保存</option>
              <option value="金">金曜日に保存</option>
              <option value="土">土曜日に保存</option>
              <option value="日">日曜日に保存</option>
            </select>

            <button
              type="button"
              onClick={() => {
                ensureChecklistLoaded(it);
                setShoppingOpen((prev) => ({ ...prev, [k]: !prev[k] }));
              }}
              style={{
                padding: "12px 14px",
                borderRadius: 14,
                border: "none",
                cursor: "pointer",
                fontWeight: 900,
                color: "#fff",
                background: "linear-gradient(90deg, #111 0%, #333 100%)",
                boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
              }}
            >
              {open ? "買い物リストをたたむ" : "買い物リストを表示"}
            </button>

            {open && (
              <button
                type="button"
                onClick={() => resetChecklist(it)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "#fff",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                チェックを全解除
              </button>
            )}
          </div>

          {open && (
            <div style={{ marginTop: 12 }}>
              <SectionCard title="買い物リスト（チェックできます）">
                {list.length === 0 ? (
                  <div style={{ color: "#666" }}>材料情報がありません（APIの返却をご確認ください）</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {list.map((label) => {
                      const checked = !!checklist[label];
                      return (
                        <label
                          key={label}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: 12,
                            borderRadius: 14,
                            border: "1px solid rgba(0,0,0,0.10)",
                            background: checked ? "rgba(17,17,17,0.06)" : "#fff",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setChecklistValue(it, label, e.target.checked)}
                            style={{ width: 18, height: 18 }}
                          />
                          <span style={{ fontWeight: 800, color: checked ? "#555" : "#111" }}>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              <div style={{ marginTop: 10, fontSize: 12, color: "#888" }}>
                ※チェック状態はこの端末に保存されます（ブラウザのデータを消すと消えます）
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <main
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: 18,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        background: pageBg,
        minHeight: "100vh",
      }}
    >
      <header
        style={{
          padding: "8px 6px 0",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "7px 12px",
            borderRadius: 999,
            background: "#fff",
            border: softBorder,
            fontSize: 12,
            fontWeight: 900,
            boxShadow: cardShadow,
          }}
        >
          無料で使える献立提案AI
        </div>

        <h1
          style={{
            fontSize: 34,
            lineHeight: 1.25,
            fontWeight: 900,
            margin: "14px 0 0",
            letterSpacing: 0.2,
          }}
        >
          ラクラクックAI🥗
        </h1>

        <p
          style={{
            margin: "12px 0 0",
            color: "#444",
            fontSize: 16,
            lineHeight: 1.8,
            maxWidth: 760,
            fontWeight: 600,
          }}
        >
          毎日の「何作ろう？」を、AIでかんたん解決。<br />
          条件を選ぶだけで、忙しい日でも使いやすい献立を5つ提案します。
        </p>

        <p
          style={{
            margin: "10px 0 0",
            color: "#666",
            fontSize: 13,
            lineHeight: 1.8,
            maxWidth: 780,
          }}
        >
          夕飯の献立決めに悩む方、1週間献立をまとめて考えたい方、時短レシピを探している方におすすめの無料Webアプリです。
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <a
            href="#generator"
            style={{
              display: "inline-block",
              padding: "12px 16px",
              borderRadius: 999,
              background: "#111",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 900,
              boxShadow: strongShadow,
            }}
          >
            今すぐ献立を作る
          </a>

          <a
            href="/weekly"
            style={{
              display: "inline-block",
              padding: "12px 16px",
              borderRadius: 999,
              border: "1px solid rgba(0,0,0,0.12)",
              textDecoration: "none",
              color: "#111",
              fontWeight: 900,
              background: "#fff",
            }}
          >
            📅 1週間献立を見る
          </a>

          <a
            href="/free"
            style={{
              display: "inline-block",
              padding: "12px 16px",
              borderRadius: 999,
              border: "1px solid rgba(0,0,0,0.12)",
              textDecoration: "none",
              color: "#111",
              fontWeight: 900,
              background: "#fff",
            }}
          >
            🍳 自由レシピを作る
          </a>
        </div>
      </header>

      <section
        style={{
          marginTop: 18,
          padding: 16,
          borderRadius: 20,
          background: "linear-gradient(135deg, #fff 0%, #fff4f6 100%)",
          border: softBorder,
          boxShadow: strongShadow,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          <InfoCard title="忙しい日でも使いやすい" text="テイスト・種別・対象・朝昼夜を選ぶだけで、今の気分に合う献立候補を素早く提案します。" />
          <InfoCard title="買い物前の迷いを減らす" text="献立が先に決まるので、必要な材料の整理がしやすくなり、買い忘れや無駄買いを減らしやすくなります。" />
          <InfoCard title="1週間献立にもつなげやすい" text="気に入った献立は曜日ごとに保存できます。平日まとめて食事計画を立てたい方にも向いています。" />
        </div>
      </section>

      <div style={{ marginTop: 18, textAlign: "center" }}>
        <a
          href="https://hb.afl.rakuten.co.jp/hsc/519911ea.2ec3780d.519911eb.f3703e8d/?link_type=pict&ut=eyJwYWdlIjoic2hvcCIsInR5cGUiOiJwaWN0IiwiY29sIjoxLCJjYXQiOiI0NCIsImJhbiI6Mjc5NDg1OCwiYW1wIjp0cnVlfQ%3D%3D"
          target="_blank"
          rel="nofollow sponsored noopener"
          style={{ wordWrap: "break-word", display: "inline-block" }}
        >
          <img
            src="https://hbb.afl.rakuten.co.jp/hsb/519911ea.2ec3780d.519911eb.f3703e8d/?me_id=1&me_adv_id=2794858&t=pict"
            alt="楽天セール"
            width={468}
            height={60}
            style={{
              margin: 2,
              maxWidth: "100%",
              height: "auto",
              borderRadius: 12,
            }}
          />
        </a>
      </div>

      {favorites.length > 0 && (
        <section
          style={{
            marginTop: 18,
            padding: 14,
            borderRadius: 16,
            background: "rgba(255,255,255,0.88)",
            border: softBorder,
            boxShadow: cardShadow,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <div style={{ fontWeight: 900 }}>★ お気に入り（{favorites.length}）</div>
            <button
              onClick={() => {
                if (confirm("お気に入りを全削除しますか？")) {
                  setFavorites([]);
                  saveJson(LS_FAV, []);
                }
              }}
              style={{
                border: "1px solid rgba(0,0,0,0.12)",
                background: "#fff",
                borderRadius: 12,
                padding: "8px 10px",
                cursor: "pointer",
                fontWeight: 900,
                fontSize: 12,
              }}
            >
              全削除
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 10 }}>
            {favorites.map((it, idx) => (
              <div
                key={`${itemKey(it)}_${idx}`}
                onClick={() => {
                  const k = itemKey(it);
                  setExpandedKey((prev) => (prev === k ? null : k));
                  ensureChecklistLoaded(it);
                }}
                style={{
                  border: softBorder,
                  borderRadius: 14,
                  padding: 12,
                  background: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 900 }}>{it.title}</div>
                  <div style={{ color: "#666", marginTop: 4, fontSize: 13 }}>{it.summary}</div>
                </div>
                <div style={{ textAlign: "right", whiteSpace: "nowrap", color: "#444", fontSize: 13 }}>
                  <div>⏱ {it.timeMin}分</div>
                  <div>🔥 {it.caloriesKcal}kcal</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section
        id="generator"
        style={{
          marginTop: 18,
          padding: 16,
          borderRadius: 20,
          background: "rgba(255,255,255,0.92)",
          border: softBorder,
          boxShadow: strongShadow,
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 18 }}>今日の献立をAIに相談</div>
        <div style={{ marginTop: 6, color: "#666", fontSize: 13, lineHeight: 1.7 }}>
          条件を選ぶだけで、初心者でも作りやすい献立候補を5件提案します。
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: "#666", fontWeight: 900, marginBottom: 8 }}>テイスト</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {["和食", "洋食", "中華", "韓国", "エスニック"].map((v) => (
                <Chip key={v} label={v} active={taste === v} onClick={() => setTaste(v)} />
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#666", fontWeight: 900, marginBottom: 8 }}>種別</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {["主菜", "副菜", "おつまみ", "汁物"].map((v) => (
                <Chip key={v} label={v} active={dishType === v} onClick={() => setDishType(v)} />
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#666", fontWeight: 900, marginBottom: 8 }}>対象</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {["大人", "子供", "家族"].map((v) => (
                <Chip key={v} label={v} active={target === v} onClick={() => setTarget(v)} />
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#666", fontWeight: 900, marginBottom: 8 }}>食事タイミング</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {["朝", "昼", "夜"].map((v) => (
                <Chip key={v} label={v} active={mealTime === v} onClick={() => setMealTime(v)} />
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#666", fontWeight: 900, marginBottom: 8 }}>
              除外アレルギー（カンマ・読点どちらでもOK）
            </div>
            <input
              value={excludedAllergiesText}
              onChange={(e) => setExcludedAllergiesText(e.target.value)}
              placeholder="卵,乳,小麦 または 卵、乳、小麦"
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "#fff",
                outline: "none",
                fontSize: 14,
              }}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: "#888" }}>
              例：卵,乳 または 卵、乳（空欄でもOK）
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading}
            style={{
              width: "100%",
              padding: 15,
              borderRadius: 16,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 900,
              fontSize: 15,
              color: "#fff",
              background: loading ? "#999" : "linear-gradient(90deg, #111 0%, #333 100%)",
              boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
            }}
          >
            {loading ? "生成中..." : "5つの献立を生成する"}
          </button>
        </div>
      </section>

      {error && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 14,
            border: "1px solid #ffcccc",
            color: "#a40000",
            background: "#fff5f5",
          }}
        >
          エラー：{error}
        </div>
      )}

      {items.length > 0 && (
        <section style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 900, paddingLeft: 6, fontSize: 18 }}>提案された献立（{items.length}件）</div>
          <div style={{ color: "#666", fontSize: 13, paddingLeft: 6, marginTop: 4 }}>
            気になる献立はお気に入り保存・買い物リスト表示・1週間献立保存ができます。
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginTop: 12 }}>
            {items.map((it, idx) => {
              const k = itemKey(it);
              const fav = isFavorite(it);
              const expanded = expandedKey === k;

              return (
                <div key={idx}>
                  <div
                    onClick={() => {
                      setExpandedKey((prev) => (prev === k ? null : k));
                      ensureChecklistLoaded(it);
                    }}
                    style={{
                      borderRadius: 18,
                      border: softBorder,
                      background: "#fff",
                      padding: 14,
                      boxShadow: cardShadow,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ fontSize: 16, fontWeight: 900 }}>{it.title}</div>

                          <FavButton
                            fav={fav}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(it);
                            }}
                          />
                        </div>

                        <div style={{ color: "#666", marginTop: 6, fontSize: 13, lineHeight: 1.5 }}>
                          {it.summary}
                        </div>
                      </div>

                      <div style={{ textAlign: "right", whiteSpace: "nowrap", color: "#444", fontSize: 13 }}>
                        <div>⏱ {it.timeMin}分</div>
                        <div>🔥 {it.caloriesKcal}kcal</div>
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontWeight: 900, marginBottom: 8, fontSize: 13 }}>主な材料</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {(it.ingredients || []).map((ing, i) => (
                          <span
                            key={i}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 999,
                              border: "1px solid rgba(0,0,0,0.10)",
                              fontSize: 13,
                              background: "#fff",
                            }}
                          >
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginTop: 10, fontSize: 12, color: "#666", fontWeight: 800 }}>
                      {expanded ? "▲ たたむ" : "▼ 詳細を見る"}
                    </div>
                  </div>

                  {expanded && <DetailBlock it={it} />}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section
        style={{
          marginTop: 28,
          padding: 18,
          borderRadius: 20,
          background: "#fff",
          border: softBorder,
          boxShadow: cardShadow,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 900 }}>目的別に使い分けできます</div>
        <div style={{ color: "#666", fontSize: 13, marginTop: 6, lineHeight: 1.7 }}>
          トップページから他ページへ回遊しやすくして、使いやすさと滞在時間の両方を高めます。
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 14,
            marginTop: 14,
          }}
        >
          <a
            href="/free"
            style={{
              display: "block",
              textDecoration: "none",
              color: "#111",
              border: softBorder,
              borderRadius: 18,
              padding: 16,
              background: "#fffaf7",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 900, color: "#c55b11" }}>自由レシピページ</div>
            <div style={{ marginTop: 8, fontWeight: 900, fontSize: 17 }}>食材や気分からレシピを作りたい人へ</div>
            <div style={{ marginTop: 8, color: "#666", fontSize: 13, lineHeight: 1.7 }}>
              冷蔵庫の中身や「ヘルシーにしたい」「鶏むね肉を使いたい」など、自由条件からレシピを作りたい時に便利です。
            </div>
          </a>

          <a
            href="/weekly"
            style={{
              display: "block",
              textDecoration: "none",
              color: "#111",
              border: softBorder,
              borderRadius: 18,
              padding: 16,
              background: "#f9fbff",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 900, color: "#1556a3" }}>1週間献立ページ</div>
            <div style={{ marginTop: 8, fontWeight: 900, fontSize: 17 }}>平日の食事計画をまとめて立てたい人へ</div>
            <div style={{ marginTop: 8, color: "#666", fontSize: 13, lineHeight: 1.7 }}>
              忙しい週でもラクになるように、曜日ごとの献立を保存して、買い物効率まで上げたい人に向いています。
            </div>
          </a>
        </div>
      </section>

      <section
        style={{
          marginTop: 28,
          padding: 18,
          borderRadius: 20,
          background: "#fff",
          border: softBorder,
          boxShadow: cardShadow,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 900 }}>献立アプリ・時短レシピを探している方へ</div>
        <div style={{ marginTop: 12, color: "#555", fontSize: 14, lineHeight: 1.95 }}>
          ラクラクックAIは、毎日の献立決めをラクにしたい方のための無料Webアプリです。夕飯の献立が決まらない、
          毎回レシピ検索に時間がかかる、1週間献立をまとめて考えたい、そんな悩みに合わせてAIが候補を提案します。
          和食・洋食・中華・韓国・エスニックなどのテイスト選択、主菜・副菜・汁物などの種別指定、
          大人向け・子供向け・家族向けの条件設定にも対応しています。買い物リストや1週間献立の保存にもつなげやすく、
          忙しい平日を少しでもラクにしたい方におすすめです。
        </div>
      </section>

      <section
        style={{
          marginTop: 28,
          paddingTop: 20,
          borderTop: "1px solid #eee",
          textAlign: "center",
        }}
      >
        <h3 style={{ marginBottom: 16 }}>🍖 人気のふるさと納税</h3>

        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            background: "#fff",
            padding: 16,
            borderRadius: 12,
            border: "1px solid #eee",
          }}
        >
          <a
            href="https://hb.afl.rakuten.co.jp/ichiba/51991d4f.dbd89d40.51991d50.e49b6006/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Ff122025-choshi%2Fct-002%2F&link_type=picttext"
            target="_blank"
            rel="nofollow sponsored noopener"
          >
            <img
              src="https://hbb.afl.rakuten.co.jp/hgb/51991d4f.dbd89d40.51991d50.e49b6006/?me_id=1359366&item_id=10000370&pc=https%3A%2F%2Fimage.rakuten.co.jp%2Ff122025-choshi%2Fcabinet%2F09830770%2F10865584%2Fimgrc0094807811.jpg%3F_ex%3D240x240&s=240x240&t=picttext"
              alt="訳あり 厚切り 塩銀鮭 1.5kg"
              style={{
                width: 180,
                borderRadius: 10,
              }}
            />
          </a>

          <div style={{ maxWidth: 260, textAlign: "left" }}>
            <a
              href="https://hb.afl.rakuten.co.jp/ichiba/51991d4f.dbd89d40.51991d50.e49b6006/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Ff122025-choshi%2Fct-002%2F&link_type=picttext"
              target="_blank"
              rel="nofollow sponsored noopener"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#111",
                textDecoration: "none",
              }}
            >
              【ふるさと納税】訳あり 厚切り 塩銀鮭 1.5kg
            </a>

            <p
              style={{
                fontSize: 13,
                marginTop: 6,
                marginBottom: 10,
              }}
            >
              朝食・お弁当・夕飯に使いやすい定番食材。価格：10,000円〜（税込・送料無料）
            </p>

            <a
              href="https://hb.afl.rakuten.co.jp/ichiba/51991d4f.dbd89d40.51991d50.e49b6006/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Ff122025-choshi%2Fct-002%2F%3Fscid%3Daf_pc_bbtn"
              target="_blank"
              rel="nofollow sponsored noopener"
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  background: "#bf0000",
                  color: "white",
                  padding: "10px 16px",
                  borderRadius: 20,
                  fontSize: 13,
                  display: "inline-block",
                  fontWeight: 600,
                }}
              >
                楽天で見る
              </div>
            </a>
          </div>
        </div>
      </section>

      <section
        style={{
          marginTop: 28,
          padding: 18,
          borderRadius: 20,
          background: "#fff",
          border: softBorder,
          boxShadow: cardShadow,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 900 }}>よくある質問</div>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <details style={{ border: softBorder, borderRadius: 14, padding: 14, background: "#fff" }}>
            <summary style={{ cursor: "pointer", fontWeight: 900 }}>ラクラクックAIは無料で使えますか？</summary>
            <div style={{ marginTop: 10, color: "#666", fontSize: 13, lineHeight: 1.8 }}>
              はい。基本機能は無料で使えます。献立提案、1週間献立保存、買い物リスト確認などに活用できます。
            </div>
          </details>

          <details style={{ border: softBorder, borderRadius: 14, padding: 14, background: "#fff" }}>
            <summary style={{ cursor: "pointer", fontWeight: 900 }}>どんな人に向いていますか？</summary>
            <div style={{ marginTop: 10, color: "#666", fontSize: 13, lineHeight: 1.8 }}>
              毎日の献立決めが大変な方、共働き家庭、一人暮らし、忙しくてレシピ検索に時間をかけにくい方に向いています。
            </div>
          </details>

          <details style={{ border: softBorder, borderRadius: 14, padding: 14, background: "#fff" }}>
            <summary style={{ cursor: "pointer", fontWeight: 900 }}>アレルギー食材の除外はできますか？</summary>
            <div style={{ marginTop: 10, color: "#666", fontSize: 13, lineHeight: 1.8 }}>
              入力欄に除外したい食材を入れることで、条件に合わせた提案を行います。最終的な食材確認はご自身でも行ってください。
            </div>
          </details>
        </div>
      </section>

      <div
        style={{
          marginTop: 40,
          fontSize: 13,
          textAlign: "center",
          color: "#666",
        }}
      >
        <a href="/privacy">プライバシーポリシー</a> | <a href="/disclaimer">免責事項</a> |{" "}
        <a href="/contact/contact">お問い合わせ</a>
      </div>

      <a
        href="/free"
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "#111",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textDecoration: "none",
          fontWeight: 900,
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          zIndex: 999,
          fontSize: 12,
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        自由
        <br />
        レシピ
      </a>
    </main>
  );
}
