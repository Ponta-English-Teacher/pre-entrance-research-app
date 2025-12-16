import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { topic, keywords, researchTopic } = body || {};

    if (!topic || !researchTopic) {
      return res.status(400).json({ error: "Missing data" });
    }

    const messages = [
      {
        role: "system",
        content:
          "You are a research advisor for first-year university students (CEFR B1).",
      },
      {
        role: "user",
        content:
          `Final research question: "${researchTopic}"\n` +
          `Topic title: "${topic}"\n` +
          `Keywords: "${keywords || "none"}"\n\n` +
          "1) Write ONE short research plan paragraph (3–4 sentences).\n" +
          "2) Give 10 article titles.\n\n" +
          "Return ONLY JSON:\n" +
          `{"research_plan":"...","titles":["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10"]}`,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    return res.status(200).json({
      research_plan: parsed.research_plan || "",
      titles: parsed.titles || [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI error" });
  }
}
