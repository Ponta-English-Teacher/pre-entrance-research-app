// api/explain.js
import OpenAI from "openai";
import "dotenv/config";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text } = req.body || {};

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Missing text" });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful English teacher. Explain the meaning of the given sentence or phrase in simple English (CEFR B1).",
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const explanation =
      completion.choices[0]?.message?.content?.trim() || "";

    return res.status(200).json({ explanation });
  } catch (err) {
    console.error("api/explain error:", err);
    return res.status(500).json({ error: "Failed to explain text" });
  }
}
