// api/explain.js
import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, lang } = req.body || {};

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: "Missing text" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res
        .status(500)
        .json({ error: "OPENAI_API_KEY is not set on the server" });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const targetLang = lang === "ja" ? "ja" : "ja"; // keep JA default
    const input = String(text).trim();

    const messages = [
      {
        role: "system",
        content:
          "You are a helpful English tutor for Japanese university students (CEFR B1). " +
          "Explain meaning simply and clearly.",
      },
      {
        role: "user",
        content:
          `Text:\n"${input}"\n\n` +
          "Return ONLY JSON in this format:\n" +
          '{"en_simple":"...", "ja":"..."}\n\n' +
          "- en_simple: very simple paraphrase in easy English (B1).\n" +
          `- ja: natural Japanese translation (${targetLang}).\n` +
          "- Do not add extra keys. Do not add markdown.",
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.3,
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";

    let out = null;
    try {
      out = JSON.parse(raw);
    } catch {
      // fallback if model returns plain text
      out = { en_simple: raw.trim(), ja: "" };
    }

    return res.status(200).json({
      en_simple: typeof out.en_simple === "string" ? out.en_simple : "",
      ja: typeof out.ja === "string" ? out.ja : "",
    });
  } catch (err) {
    console.error("explain error:", err);
    return res.status(500).json({ error: "Server error in /api/explain" });
  }
}
