export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const {
      topicTitle = "",
      researchQuestion = "",
      articleTitles = [],
      keyFindingsAll = "",
      summariesAll = "",
      glossaryAll = "",
    } = req.body || {};

    const prompt = `
You are helping a Japanese university student prepare a SHORT English presentation (5–7 slides).
The student will paste your output into Gamma or Felo.

RULES:
- Use the student's writing as the main source. Do NOT invent new factual claims.
- Make it easy to read and copy-paste.
- Output MUST be exactly TWO blocks, in this order:
  1) SLIDE_IDEA
  2) NARRATION
- Slide idea must clearly label "Slide 1:", "Slide 2:", ...
- Each slide MUST include "Image idea:" inside the slide.
- Narration MUST clearly label "Slide 1 narration:", "Slide 2 narration:", ...
- Narration should reflect student ideas (especially in Key Findings).
- Tone: clear, simple, informative (B1–B2). Not too long.

TOPIC:
- Topic title: ${topicTitle}
- Research question: ${researchQuestion}

ARTICLE TITLES (reference only):
${(articleTitles || []).map((t, i) => `${i + 1}. ${t}`).join("\n")}

STUDENT KEY FINDINGS (keep their ideas; rewrite for clarity if needed):
${keyFindingsAll}

STUDENT SUMMARIES (use for "interesting/surprising points" if useful):
${summariesAll}

STUDENT GLOSSARY (pick important terms; you may clean duplicates):
${glossaryAll}

Now produce the TWO blocks.
`.trim();

    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You create slide plans and narration for students. Follow the required output format exactly.",
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
      // If the model didn’t follow the format, still return raw text for debugging.
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
