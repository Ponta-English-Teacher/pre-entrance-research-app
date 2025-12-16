// api/generate-stage4.js
export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const {
      topicTitle = "",
      researchQuestion = "",
      articleTitles = [],
      // Student-written fields (may be empty)
      keyFindingsAll = "",
      summariesAll = "",
      glossaryAll = "",
      // Full article texts from Stage 3 (recommended)
      articlesAll = "",
    } = req.body || {};

    const hasArticles = String(articlesAll || "").trim().length > 40;

    const prompt = `
You are helping a Japanese first-year university student create a SHORT English presentation (6 slides).
The student will paste your output into Gamma or Felo.

ABSOLUTE OUTPUT RULE (MUST FOLLOW):
- Output MUST be exactly TWO blocks in this order, with these exact headers on their own lines:
SLIDE_IDEA
NARRATION
- Do NOT output anything else.
- Do NOT ask questions.
- Do NOT request more information.

STYLE:
- English level: CEFR B1–B2.
- Clear, simple sentences.
- Each slide: 3–6 bullets max.
- Each slide MUST include one bullet that begins exactly: "Image idea: ..."

FACT SAFETY RULES:
- Use ONLY the provided information (articles + student notes). Do NOT invent facts, numbers, laws, or organizations.
- If articles disagree, write safely: "Some articles suggest..., while others say..."
- If something is unknown, write a general, safe line without adding new facts.

GOAL:
- Even if student notes are empty, you MUST still create a strong slide plan by extracting repeated points/patterns from the ARTICLE TEXTS.

TOPIC:
- Topic title: ${topicTitle || "(Topic title)"}
- Research question: ${researchQuestion || "(Research question)"}

ARTICLE TITLES (reference only):
${(articleTitles || []).map((t, i) => `${i + 1}. ${t}`).join("\n") || "(No titles provided.)"}

STUDENT NOTES (may be empty):
[Key Findings]
${keyFindingsAll}

[Summaries]
${summariesAll}

[Glossary]
${glossaryAll}

ARTICLE TEXTS (MAIN EVIDENCE):
${hasArticles ? articlesAll : "(No article texts provided.)"}

Now produce EXACTLY:

SLIDE_IDEA
Slide 1: Title
- Topic + research question + presenter line
- Image idea: (professional, no text)

Slide 2: Background / What the issue is
- Define the issue using only the texts (e.g., what drunk driving is, why it matters)
- Image idea: (simple icons, no text)

Slide 3: Key findings from the articles (3–5)
- Synthesize repeated points across articles (not one-article summaries)
- Image idea: (infographic style, no text)

Slide 4: Comparison (Japan vs U.S.)
- Use a clear comparison structure (Japan / U.S.) based only on texts
- Image idea: (two-column comparison visual, no text)

Slide 5: Consideration / Interpretation (student voice)
- Careful interpretation without new facts
- One “what this suggests” message
- Image idea: (thinking / analysis theme, no text)

Slide 6: Conclusion + one question
- Short conclusion
- One question to audience
- Image idea: (closing / thank you mood, no text)

NARRATION
Slide 1 narration: 2–4 short sentences.
Slide 2 narration: 2–4 short sentences.
Slide 3 narration: 2–4 short sentences.
Slide 4 narration: 2–4 short sentences.
Slide 5 narration: 2–4 short sentences.
Slide 6 narration: 2–4 short sentences.
`.trim();

    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You create slide plans and narration. You NEVER ask questions and you ALWAYS follow the required two-block output format exactly.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    const json = await openaiResp.json();
    if (!openaiResp.ok) {
      return res.status(500).json({ error: json?.error?.message || "OpenAI error" });
    }

    const text = json?.choices?.[0]?.message?.content || "";

    const slideIdeaMatch = text.match(/SLIDE_IDEA\s*([\s\S]*?)\s*NARRATION\s*([\s\S]*)/);
    if (!slideIdeaMatch) {
      // Debug fallback (still return something)
      return res.status(200).json({ slideIdea: text, narration: "" });
    }

    const slideIdea = slideIdeaMatch[1].trim();
    const narration = slideIdeaMatch[2].trim();

    return res.status(200).json({ slideIdea, narration });
  } catch (e) {
    console.error("generate-stage4 error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}