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
You are helping a Japanese first-year university student create a research-synthesis English presentation (8 slides).
The student read 10 articles from five intentional perspectives: cultural, learning difficulty, classroom/situational, comparative, and critical-thinking.
The presentation must synthesize those 10 articles — grouping findings, comparing perspectives, surfacing recurring patterns, noting tensions or disagreements, and adding the student's own interpretation.
The student will paste your output into Gamma or Felo.

ABSOLUTE OUTPUT RULE (MUST FOLLOW):
- Output MUST be exactly TWO blocks in this order, with these EXACT headers on their own lines:
SLIDE_IDEA
NARRATION
- SLIDE_IDEA and NARRATION are SECTION HEADERS. Each appears EXACTLY ONCE in the entire output.
- ALL 8 slide content blocks go under the single SLIDE_IDEA header.
- ALL 8 narration lines go under the single NARRATION header.
- Do NOT put a NARRATION after each individual slide.
- Do NOT repeat SLIDE_IDEA or NARRATION anywhere else in the output.
- Do NOT output anything before SLIDE_IDEA.
- Do NOT ask questions.
- Do NOT request more information.

FORBIDDEN (never do this):
SLIDE_IDEA
Slide 1: ...
NARRATION
Slide 1 narration: ...
SLIDE_IDEA
Slide 2: ...
NARRATION
Slide 2 narration: ...

STYLE:
- English level: CEFR B1–B2.
- Clear, simple sentences.
- Each slide: 3–5 bullets max (keep bullets short — one idea per bullet).
- Each slide MUST include one bullet that begins exactly: "Image idea: ..."

FACT SAFETY RULES:
- Use ONLY the provided information (articles + student notes). Do NOT invent facts, numbers, laws, or organizations.
- If articles disagree, write safely: "Some articles suggest..., while others say..."
- If something is unknown, write a general, safe line without adding new facts.

SYNTHESIS RULES (critical — follow these):
- Do NOT summarize one article per slide. Slides must COMBINE evidence across multiple articles.
- Group articles by the pattern they share, not by their individual titles.
- Identify at least one recurring pattern that appears in three or more articles.
- Identify at least one tension or disagreement between articles.
- The student interpretation slide must go beyond the articles — what does this evidence mean overall?

GOAL:
- Even if student notes are empty, extract repeated points/patterns from the ARTICLE TEXTS and build a synthesis.

TOPIC:
- Topic title: ${topicTitle || "(Topic title)"}
- Research question: ${researchQuestion || "(Research question)"}

ARTICLE TITLES (for reference — group by perspective, do not summarize one by one):
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

Slide 2: Background — Why This Topic Matters
- Define the issue and explain why it is important, using only the texts
- 3–4 short bullets
- Image idea: (simple icons, no text)

Slide 3: How We Researched It — Five Perspectives
- Briefly name the five article perspectives used (cultural, difficulty, classroom, comparative, critical)
- 1–2 bullets per perspective type (keep very short)
- Image idea: (five-category diagram, no text)

Slide 4: Recurring Patterns Across Articles
- 3–4 findings that appeared in multiple articles (synthesis, not one-article facts)
- Label each pattern clearly, e.g. "Pattern: ..."
- Image idea: (connecting dots / web diagram, no text)

Slide 5: Cultural and Comparative Insights
- What the cultural and comparative articles showed about differences or similarities
- Use a simple contrast structure if applicable
- Image idea: (two-culture comparison visual, no text)

Slide 6: Challenges and Tensions
- Where articles disagreed, or where the topic is more complex than it first seems
- Draw from difficulty and critical-thinking articles
- Image idea: (balance scale or tension concept, no text)

Slide 7: Student Interpretation — What This Means
- Based on all 10 articles, what does the evidence suggest overall?
- One clear "what this tells us" message (student voice, careful — no invented facts)
- Image idea: (thinking / reflection theme, no text)

Slide 8: Conclusion + One Question
- Short conclusion tying back to the research question
- One open question to the audience
- Image idea: (closing / thank you mood, no text)

NARRATION
Slide 1 narration: 2–4 short sentences.
Slide 2 narration: 2–4 short sentences.
Slide 3 narration: 2–4 short sentences.
Slide 4 narration: 2–4 short sentences.
Slide 5 narration: 2–4 short sentences.
Slide 6 narration: 2–4 short sentences.
Slide 7 narration: 2–4 short sentences.
Slide 8 narration: 2–4 short sentences.
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
              "You create slide plans and narration scripts. Output exactly two sections: first SLIDE_IDEA (all 8 slides together), then NARRATION (all 8 narrations together). Each section header appears EXACTLY ONCE. Never interleave narration with slides. Never repeat SLIDE_IDEA or NARRATION. Never add any text outside these two sections.",
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