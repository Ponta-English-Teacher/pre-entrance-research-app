// api/generate-questions.js
// Small Express server that provides two AI helpers:
//
// 1) POST /api/generate-research-questions
//    → returns { questions: [...] }  (5 simple research questions)
//
// 2) POST /api/generate-article-plan
//    → returns { research_plan: "...", titles: [ ...10 items... ] }

import express from "express";
import cors from "cors";
import OpenAI from "openai";
import "dotenv/config";

const app = express();
const PORT = 3001;

if (!process.env.OPENAI_API_KEY) {
  console.error("ERROR: OPENAI_API_KEY is not set in .env");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

// === 1. Generate 5 research questions from topic + keywords ===
app.post("/api/generate-research-questions", async (req, res) => {
  try {
    const { topic, keywords } = req.body || {};

    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: "Missing topic" });
    }

    const safeTopic = topic.trim();
    const kwText =
      keywords && keywords.trim().length > 0 ? keywords.trim() : "none";

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
          `Student research topic (short phrase): "${safeTopic}".\n` +
          `Student keywords: "${kwText}".\n\n` +
          "Please suggest 5 possible research questions.\n" +
          "- Use simple English (B1–B2 level).\n" +
          "- Each question should be clear and different.\n" +
          "- Questions should be about the topic as a whole, not tiny details.\n\n" +
          "Return ONLY this JSON format:\n" +
          `{"questions": ["Question 1", "Question 2", "Question 3", "Question 4", "Question 5"]}`,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    console.log("Raw AI reply (research questions):", raw);

    let questions = [];

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.questions)) {
        questions = parsed.questions;
      } else if (Array.isArray(parsed.titles)) {
        // fallback key name
        questions = parsed.titles;
      }
    } catch {
      // Fallback: split numbered lines like "1. xxx"
      questions = raw
        .split(/\n+/)
        .map((line) => line.replace(/^\d+[\).\-\s]*/, "").trim())
        .filter(Boolean);
    }

    if (questions.length === 0) {
      questions = [`What are some important questions about ${safeTopic}?`];
    }

    return res.json({ questions });
  } catch (err) {
    console.error("AI server error (research questions):", err);
    return res.status(500).json({ error: "Server error talking to OpenAI" });
  }
});

// === 2. Generate research plan + 10 article titles ===
app.post("/api/generate-article-plan", async (req, res) => {
  try {
    const { topic, keywords, researchTopic } = req.body || {};

    const safeTopic = (topic || "").trim();
    const safeResearchTopic = (researchTopic || "").trim();
    const kwText =
      keywords && keywords.trim().length > 0 ? keywords.trim() : "none";

    if (!safeTopic || !safeResearchTopic) {
      return res
        .status(400)
        .json({ error: "Missing topic or researchTopic" });
    }

    const messages = [
      {
        role: "system",
        content:
          "You are a research advisor for first-year university students. " +
          "Their English level is around CEFR B1. " +
          "You create a short research plan and 10 possible article titles.",
      },
      {
        role: "user",
        content:
          `Student's final research question: "${safeResearchTopic}".\n` +
          `Short topic title: "${safeTopic}".\n` +
          `Keywords: "${kwText}".\n\n` +
          "First, write ONE short paragraph (3–4 sentences) that explains the student's research plan.\n" +
          "- Use simple English (CEFR B1).\n" +
          "- Explain what aspects they will look at.\n" +
          "- Do NOT mention AI.\n\n" +
          "Second, make a list of 10 possible article titles the student could read.\n" +
          "- Use simple English (B1–B2).\n" +
          "- Each title should be clear and specific.\n" +
          "- The 10 titles together should cover ALL important areas suggested by the keywords and question.\n" +
          "- Do NOT write explanations, only titles.\n\n" +
          "Return ONLY this JSON format:\n" +
          `{"research_plan": "short paragraph here", ` +
          `"titles": ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5", "Title 6", "Title 7", "Title 8", "Title 9", "Title 10"]}`,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    console.log("Raw AI reply (article plan):", raw);

    let research_plan = "";
    let titles = [];

    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.research_plan === "string") {
        research_plan = parsed.research_plan;
      }
      if (Array.isArray(parsed.titles)) {
        titles = parsed.titles;
      }
    } catch {
      // Fallback: try to split the raw text
      const parts = raw.split(/\n{2,}/); // double newline separates paragraph & list
      research_plan = parts[0]?.trim() ?? "";

      const listPart = parts.slice(1).join("\n");
      titles = listPart
        .split(/\n+/)
        .map((line) => line.replace(/^\d+[\).\-\s]*/, "").trim())
        .filter(Boolean);
    }

    if (!research_plan) {
      research_plan = `The student will research "${safeResearchTopic}" by reading articles about ${safeTopic} and related topics.`;
    }

    if (titles.length === 0) {
      titles = [`Reading about ${safeTopic} – basic background`];
    }

    return res.json({ research_plan, titles });
  } catch (err) {
    console.error("AI server error (article plan):", err);
    return res.status(500).json({ error: "Server error talking to OpenAI" });
  }
});

app.listen(PORT, () => {
  console.log(`AI helper server listening on http://localhost:${PORT}`);
});