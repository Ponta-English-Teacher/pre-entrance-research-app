// api/explain.js
// POST /api/explain
// Body: { text: "..." }
// Returns: { en: "...", ja: "..." }

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text } = req.body || {};
    const t = (text || "").toString().trim();

    if (!t) {
      return res.status(400).json({ error: "Missing text" });
    }
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not set" });
    }

    const messages = [
      {
        role: "system",
        content:
          "You are a helpful English tutor for Japanese students (CEFR B1). " +
          "Given an English word/phrase/sentence, return (1) a very simple English paraphrase and (2) a natural Japanese translation. " +
          "Keep both short and clear.",
      },
      {
        role: "user",
        content:
          `Text: "${t}"\n\n` +
          "Return ONLY this JSON format:\n" +
          '{"en":"simple paraphrase in easy English","ja":"natural Japanese translation"}',
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.2,
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";

    let en = "";
    let ja = "";

    try {
      const parsed = JSON.parse(raw);
      en = (parsed.en || "").toString().trim();
      ja = (parsed.ja || "").toString().trim();
    } catch {
      // fallback (very rare): return raw as English
      en = raw.toString().trim();
      ja = "";
    }

    return res.status(200).json({ en, ja });
  } catch (err) {
    console.error("Explain API error:", err);
    return res.status(500).json({ error: "Server error talking to OpenAI" });
  }
}
