"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  title: string;
  summary: string;
  ingredients: string[];
  timeMin: number;
  caloriesKcal: number;

  // ここはAPIが返せるなら表示されます（無い場合でも動きます）
  servings?: string;
  seasonNow?: string;
  seasonings?: string[];
  steps?: string[];
  tips?: string[];
};

type ChecklistMap = Record<string, boolean>;

const LS_FAV = "kondate_ai_favorites_v2";
const LS_CHECK_PREFIX = "kondate_ai_checklist_v2__"; // + itemKey

function itemKey(it: Item) {
  // 同名が出ても被りにくいキー（必要なら変えてOK）
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

// 買い物リスト：材料 + 調味料をまとめて、重複はざっくり除外
function buildShoppingList(it: Item): string[] {
  const a = Array.isArray(it.ingredients) ? it.ingredients : [];
  const b = Array.isArray(it.seasonings) ? it.seasonings : [];
  const merged = [...a, ...b]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);

  // 完全一致で重複排除（「醤油 大さじ1」と「醤油 大さじ2」は別物として残る）
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
  // 条件
  const [taste, setTaste] = useState("和食");
  const [dishType, setDishType] = useState("主菜");
  const [target, setTarget] = useState("大人");
  const [mealTime, setMealTime] = useState("夜");
  const [excludedAllergiesText, setExcludedAllergiesText] = useState("");

  // 生成結果
  const [items, setItems] = useState<Item[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // 買い物リスト表示（カードごと）
  const [shoppingOpen, setShoppingOpen] = useState<Record<string, boolean>>({});

  // チェックリスト状態（カードごと）
  const [checklists, setChecklists] = useState<Record<string, ChecklistMap>>({});

  // お気に入り
  const [favorites, setFavorites] = useState<Item[]>([]);

  // UI状態
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初期ロード：お気に入り
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
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taste, dishType, target, excludedAllergies, mealTime }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || data?.message || "不明なエラー");
      if (!data?.items || !Array.isArray(data.items)) throw new Error("返ってきたデータ形式が想定と違います（itemsがありません）");

      setItems(data.items);
    } catch (e: any) {
      setError(e?.message ?? "生成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  // ====== UI（デザイン） ======
  const pageBg = "linear-gradient(180deg, #fff 0%, #fff7fb 45%, #fff 100%)";
  const cardShadow = "0 10px 30px rgba(0,0,0,0.06)";
  const softBorder = "1px solid rgba(0,0,0,0.08)";

  const chipStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "#fff",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  };
  const activeChipStyle: React.CSSProperties = {
    ...chipStyle,
    background: "#111",
    color: "#fff",
    border: "1px solid #111",
  };

  function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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

  function MiniTag({ children }: { children: React.ReactNode }) {
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

  function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
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

  // 詳細（カード直下に表示）
  function DetailBlock({ it }: { it: Item }) {
    const k = itemKey(it);
    const list = buildShoppingList(it);

    const open = !!shoppingOpen[k];
    const checklist = checklists[k] || {};

    return (
      <div style={{ marginTop: 12 }}>
        {/* 詳細 */}
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

          {/* レシピ（詳細の下に表示） */}
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

          {/* 買い物リスト：欲しい時だけトリガー */}
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                ensureChecklistLoaded(it); // チェック状態を読み込み
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

          {/* チェックリスト */}
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
                ※チェック状態はこの端末（localStorage）に保存されます（ブラウザのデータを消すと消えます）
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
        maxWidth: 900,
        margin: "0 auto",
        padding: 18,
        fontFamily: "system-ui",
        background: pageBg,
        minHeight: "100vh",
      }}
    >
      <header style={{ padding: "6px 6px 0" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: 0.2 }}>ラクラクックAI🥗</h1>
        {/* 楽天セールバナー */}
    {/* 楽天セールバナー（AMPタグをimgに置換） */}
        <div style={{ marginTop: 10, marginBottom: 20, textAlign: "center" }}>
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
                borderRadius: 10,
              }}
            />
          </a>
        </div>
        <p style={{ margin: "6px 0 0", color: "#666", fontSize: 13 }}>
          条件を選んで、5つの献立をサクッと提案します 🍳
        </p>
      </header>

      {/* お気に入り */}
      {favorites.length > 0 && (
        <section
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 16,
            background: "rgba(255,255,255,0.85)",
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

      {/* 条件入力（チップUI） */}
      <section
        style={{
          marginTop: 14,
          padding: 14,
          borderRadius: 16,
          background: "rgba(255,255,255,0.9)",
          border: softBorder,
          boxShadow: cardShadow,
        }}
      >
        <div style={{ fontWeight: 900 }}>条件を選ぶ</div>

        <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
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
              除外アレルギー（カンマ区切り）
            </div>
            <input
              value={excludedAllergiesText}
              onChange={(e) => setExcludedAllergiesText(e.target.value)}
              placeholder="卵,乳,小麦"
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
            <div style={{ marginTop: 6, fontSize: 12, color: "#888" }}>例：卵,乳（空欄でもOK）</div>
          </div>

          <button
            onClick={generate}
            disabled={loading}
            style={{
              width: "100%",
              padding: 14,
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
            {loading ? "生成中..." : "5つの献立を生成"}
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

      {/* 提案一覧：カード → その直下に詳細（折りたたみ） */}
      {items.length > 0 && (
        <section style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 900, paddingLeft: 6 }}>提案（{items.length}件）</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginTop: 10 }}>
            {items.map((it, idx) => {
              const k = itemKey(it);
              const fav = isFavorite(it);
              const expanded = expandedKey === k;

              return (
                <div key={idx}>
                  {/* カード */}
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

                          {/* ♡/★（文字なし） */}
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

                  {/* 詳細：カードの直下 */}
                  {expanded && <DetailBlock it={it} />}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div style={{ height: 22 }} />
      {/* ふるさと納税おすすめ */}
<div
  style={{
    marginTop: 40,
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
        価格：10,000円〜（税込・送料無料）
      </p>

      <a
        href="https://hb.afl.rakuten.co.jp/ichiba/51991d4f.dbd89d40.51991d50.e49b6006/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Ff122025-choshi%2Fct-002%2F%3Fscid%3Daf_pc_bbtn"
        target="_blank"
        rel="nofollow sponsored noopener"
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
</div>

<div
  style={{
    marginTop: 40,
    fontSize: 13,
    textAlign: "center",
    color: "#666",
  }}
>
  <a href="/privacy">プライバシーポリシー</a> |
  <a href="/disclaimer">免責事項</a> |
  <a href="/contact">お問い合わせ</a>
</div>
    </main>
  );
}


