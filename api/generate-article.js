// api/generate-article.js
import OpenAI from "openai";
import "dotenv/config";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate:
 *  - Full article (B1/B2 level)
 *  - Simplified article (A2 level)
 *
 * Request body:
 * {
 *    "title": "...",
 *    "researchTopic": "...",
 *    "index": 0   // article index 0–9
 * }
 */

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { title, researchTopic, index } = req.body || {};

    if (!title || !researchTopic) {
      return res.status(400).json({
        error: "Missing required fields: title, researchTopic",
      });
    }

    const systemPrompt = `
You are a professional article writer for first-year Japanese university students.

You must write TWO short factual non-fiction articles about the SAME topic:

1) FULL VERSION (CEFR B1–B2)
2) SIMPLIFIED VERSION (CEFR A2)

TOPIC INFORMATION:
- Overall research topic: ${researchTopic}
- Article title: "${title}"

REQUIREMENTS FOR FULL VERSION:
- 2 paragraphs
- Put ONE blank line between the paragraphs
- Indent the FIRST LINE of EACH paragraph with TWO spaces
- About 170–210 words in total
- Clear topic sentence in each paragraph
- Short, readable sentences (no very long sentences)

REQUIREMENTS FOR SIMPLIFIED VERSION:
- 2 paragraphs
- Put ONE blank line between the paragraphs
- About 110–140 words in total
- Easier vocabulary and grammar than the full version
- Very clear, short sentences

GENERAL RULES:
- Non-fiction only. Use general, widely known facts.
- No fantasy, no invented statistics or fake names.
- Do NOT talk about AI or yourself.
- Do NOT use bullet points or headings.

Return ONLY valid JSON in this exact format:

{
  "full": "full article text...",
  "simple": "simplified article text..."
}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Write both versions for the article titled "${title}".`,
        },
      ],
    });

    const raw = completion.choices[0].message.content?.trim() || "{}";
    console.log("AI raw article JSON:", raw);

    let parsed = {};
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return res.status(500).json({
        error: "AI returned invalid JSON",
        raw,
      });
    }

    return res.status(200).json({
      index,
      full: parsed.full || "",
      simple: parsed.simple || "",
    });
  } catch (err) {
    console.error("generate-article error:", err);
    return res.status(500).json({ error: err.message });
  }
}