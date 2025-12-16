// server/api.js
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import generateArticle from "../api/generate-article.js";
import "dotenv/config";

const app = express();
const port = 3001;

// Allow the Vite dev server to talk to this API
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 1) Ask AI for research questions
app.post("/api/research-questions", async (req, res) => {
  try {
    const { topicTitle, keywords } = req.body;

    if (!topicTitle) {
      return res.status(400).json({ error: "topicTitle is required." });
    }

    const prompt = `
You are helping first-year university students decide a research topic.
They will later collect data and write a short academic paper.

Student's topic idea: "${topicTitle}"
Keywords: "${keywords || "(none)"}"

Task:
- Suggest 5 *research questions* that sound like topics for a small academic study.
- Questions should be clear, simple English (CEFR B1~B2).
- Avoid very casual wording.
- Good examples: "How does SNS use affect university students' sleep?",
  "What factors influence Japanese students' motivation to study English?"

Important:
- Return ONLY a JSON array of strings, like:
["Question 1", "Question 2", ...]
No explanations, no extra text.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content: "You are a helpful academic advisor for university students.",
        },
        { role: "user", content: prompt },
      ],
    });

    const text = completion.choices[0].message.content?.trim() || "[]";

    let questions;
    try {
      questions = JSON.parse(text);
    } catch (err) {
      // Fallback: split by lines if JSON parsing fails
      questions = text
        .split("\n")
        .map((line) => line.replace(/^[0-9.\-\s]+/, "").trim())
        .filter(Boolean);
    }

    res.json({ questions });
  } catch (error) {
    console.error("Error in /api/research-questions:", error);
    res.status(500).json({ error: "Failed to generate research questions." });
  }
});

// 2) What does it mean? (SHORT paraphrase + Japanese translation)
app.post("/api/explain", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "text is required." });
    }

    const prompt = `
You are a bilingual (English + Japanese) learner dictionary.

Text:
"${text}"

Return ONLY valid JSON in this format:
{
  "en": "VERY short paraphrase (one sentence, max 15 words).",
  "ja": "自然な日本語訳（1文、短く）"
}

Rules:
- Do NOT explain research questions or study ideas.
- If the text is a word/phrase: give a simple meaning.
- If the text is a full sentence: give a short paraphrase + short Japanese translation.
- No extra keys. No extra text.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You return short learner-friendly meaning + Japanese translation in JSON only.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0].message.content?.trim() || "{}";

    let parsed = { en: "", ja: "" };
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      // Last-resort fallback if the model returns non-JSON
      parsed = { en: raw, ja: "" };
    }

    res.json({
      en: (parsed.en || "").trim(),
      ja: (parsed.ja || "").trim(),
    });
  } catch (error) {
    console.error("Error in /api/explain:", error);
    res.status(500).json({ error: "Failed to explain the text." });
  }
});

// 3) Text-to-Speech for reading questions / explanations
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice } = req.body;
    if (!text) {
      return res.status(400).json({ error: "text is required." });
    }

    const audio = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: voice || "alloy",
      input: text,
      format: "mp3",
    });

    const buffer = Buffer.from(await audio.arrayBuffer());

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(buffer);
  } catch (error) {
    console.error("Error in /api/tts:", error);
    res.status(500).json({ error: "Failed to generate speech." });
  }
});

// 3.5) Generate research plan + 10 article titles
app.post("/api/generate-article-plan", async (req, res) => {
  try {
    const { topic, keywords, researchTopic } = req.body;

    if (!topic || !researchTopic) {
      return res.status(400).json({ error: "Missing topic or researchTopic." });
    }

    const prompt = `
You are helping first-year Japanese university students.

Topic title: "${topic}"
Final research question: "${researchTopic}"
Keywords: "${keywords || "(none)"}"

Tasks:
1) Write ONE short research plan paragraph (CEFR B1).
2) Generate EXACTLY 10 article titles related to the research question.

Return ONLY valid JSON in this format:
{
  "research_plan": "text...",
  "titles": ["Title 1", "Title 2", "..."]
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        { role: "system", content: "You are an academic writing assistant." },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0].message.content || "{}";
    const parsed = JSON.parse(raw);

    res.json({
      research_plan: parsed.research_plan || "",
      titles: parsed.titles || [],
    });
  } catch (err) {
    console.error("Error in /api/generate-article-plan:", err);
    res.status(500).json({ error: "Failed to generate article plan." });
  }
});

// 4) Generate full + simplified article
app.post("/api/generate-article", (req, res) => {
  return generateArticle(req, res);
});

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});