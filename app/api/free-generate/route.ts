import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "OPENAI_API_KEY が未設定です" }, { status: 500 });
    }

    const { prompt } = await req.json();

    const client = new OpenAI({ apiKey });

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `
あなたは料理初心者向けのレシピ提案AIです。
以下のリクエストに沿って、レシピ候補を5件提案してください。

リクエスト:
${prompt}

必ず以下のJSON形式で返してください。
{
  "items": [
    {
      "title": "料理名",
      "summary": "一言説明",
      "ingredients": ["材料1", "材料2"],
      "seasonings": ["調味料1", "調味料2"],
      "timeMin": 15,
      "caloriesKcal": 500,
      "servings": "2人分",
      "steps": ["手順1", "手順2"],
      "tips": ["コツ1", "コツ2"]
    }
  ]
}
      `,
      text: {
        format: {
          type: "json_object",
        },
      },
    });

    const text = response.output_text;
    const parsed = JSON.parse(text || "{}");

    return Response.json(parsed);
  } catch (e: any) {
    return Response.json(
      { error: e?.message || "自由入力レシピ生成に失敗しました" },
      { status: 500 }
    );
  }
}
