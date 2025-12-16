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

    const { topic, keywords } = body || {};

    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: "Missing topic" });
    }

    const messages = [
      {
        role: "system",
        content:
          "You are a helpful research advisor for first-year university students. " +
          "Their English level is around CEFR B1. " +
          "You only create simple research questions.",
      },
      {
        role: "user",
        content:
          `Topic: "${topic}"\n` +
          `Keywords: "${keywords || "none"}"\n\n` +
          "Suggest 5 simple research questions.\n" +
          "Return ONLY JSON:\n" +
          `{"questions":["Q1","Q2","Q3","Q4","Q5"]}`,
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
      questions: parsed.questions || [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI error" });
  }
}
