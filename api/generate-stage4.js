// api/generate-stage4.js
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

    const safeTitles = Array.isArray(articleTitles) ? articleTitles : [];

    const prompt = `
You are helping a Japanese university student create a SHORT presentation (5–7 slides) for "Pre-Entrance Research".
The student already wrote some parts (key findings, summaries, glossary). You MUST use them if they exist.

OUTPUT FORMAT (MUST follow exactly):
SLIDE_IDEA
Slide 1: ...
Slide 2: ...
Slide 3: ...
Slide 4: ...
Slide 5: ...
(Optionally Slide 6 or 7)

IMAGE_PROMPTS
Slide 1 image prompt: ...
Slide 2 image prompt: ...
Slide 3 image prompt: ...
Slide 4 image prompt: ...
Slide 5 image prompt: ...
(Optionally Slide 6 or 7)

NARRATION
Slide 1 narration: ...
Slide 2 narration: ...
Slide 3 narration: ...
Slide 4 narration: ...
Slide 5 narration: ...
(Optionally Slide 6 or 7)

RULES:
- Slide Idea must be Gamma/Felo-friendly (clear bullet structure).
- Narration MUST explicitly say "Slide 1", "Slide 2", etc.
- Narration must be informative (not empty greetings only).
- If student findings exist, weave them into Slide 2–4 narration naturally.
- Keep English simple and clear for learners (B1-B2).
- Do NOT ask the user for missing info. Just do your best with what you have.
- No Markdown.

INPUT DATA:
Topic title:
${topicTitle}

Research question:
${researchQuestion}

Article titles (10):
${safeTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Student key findings (all articles, raw):
${keyFindingsAll}

Student summaries (all articles, raw):
${summariesAll}

Student glossary (all articles, raw):
${glossaryAll}
`.trim();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY on server." });
    }

    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const json = await openaiResp.json();
    if (!openaiResp.ok) {
      return res.status(500).json({ error: json?.error?.message || "OpenAI error" });
    }

    const text = json?.choices?.[0]?.message?.content || "";

    // Parse sections
    const match = text.match(
      /SLIDE_IDEA\s*([\s\S]*?)\s*IMAGE_PROMPTS\s*([\s\S]*?)\s*NARRATION\s*([\s\S]*)/i
    );

    if (!match) {
      // Return raw text for debugging if formatting failed
      return res.status(200).json({
        slideIdea: text,
        imagePrompts: "",
        narration: "",
      });
    }

    const slideIdea = match[1].trim();
    const imagePrompts = match[2].trim();
    const narration = match[3].trim();

    return res.status(200).json({ slideIdea, imagePrompts, narration });
  } catch (e) {
    console.error("generate-stage4 error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
