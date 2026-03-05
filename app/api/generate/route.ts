import OpenAI from "openai";

type ReqBody = {
  taste: string; // 和食/洋食/中華...
  dishType: string; // 主菜/副菜/おつまみ...
  target: string; // 大人/子供/家族...
  excludedAllergies: string[]; // ["卵","乳"] など
  mealTime: string; // 朝/昼/夜
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "OPENAI_API_KEY が未設定です" }, { status: 500 });
    }

    const body = (await req.json()) as ReqBody;

    const openai = new OpenAI({ apiKey });

    const prompt = `
あなたは「料理初心者向け」の献立提案AIです。
以下の条件に合う献立を5つ提案してください。

【条件】
- テイスト: ${body.taste}
- 種別: ${body.dishType}
- 対象: ${body.target}
- 食事タイミング: ${body.mealTime}
- 除外アレルギー: ${body.excludedAllergies?.length ? body.excludedAllergies.join("、") : "なし"}

【食事タイミングの方針】
- 朝: 軽め・時短・洗い物少なめを優先
- 昼: さっと作れる/弁当にも寄せられる
- 夜: 満足感・主菜感を優先

【絶対ルール】
- 除外アレルギーに該当する食材を含む提案は出さない
- 初心者が迷わないように、手順は短く具体的に（5〜8ステップ）
- 料理名は分かりやすく、材料は現実的な家庭の範囲
- 出力はJSONのみ（説明文は禁止）
- itemsは必ず5件

【JSON形式（この形だけを返す）】
{
  "items": [
    {
      "title": "料理名",
      "summary": "1行説明（初心者向け/食事タイミングに合う理由）",
      "timeMin": 10,
      "caloriesKcal": 500,
      "servings": "1〜2人分",
      "ingredients": ["鶏もも肉 200g", "玉ねぎ 1/2個", "..."],
      "seasonings": ["醤油 大さじ1", "みりん 大さじ1", "..."],
      "steps": ["手順1", "手順2", "手順3", "手順4", "手順5"],
      "tips": ["コツ1", "コツ2"]
    }
  ]
}
`.trim();

    const resp = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      text: { format: { type: "json_object" } },
    });

    const text = (resp.output_text ?? "").trim();
    const data = JSON.parse(text);

    // 念のため最低限の形だけ守らせる
    if (!data?.items || !Array.isArray(data.items) || data.items.length !== 5) {
      return Response.json(
        { error: "AIの返答形式が想定と違います", raw: text },
        { status: 500 }
      );
    }

    return Response.json(data);
  } catch (err: any) {
    return Response.json(
      {
        error: "生成に失敗しました",
        message: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
