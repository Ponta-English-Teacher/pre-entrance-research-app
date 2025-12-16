// src/pages/Stage4Screen.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

function Stage4Screen({ topic, onBack, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [topicRow, setTopicRow] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Stage 4 outputs (editable)
  // ✅ Image prompts are INCLUDED inside Slide Idea (as you requested).
  const [slideIdea, setSlideIdea] = useState("");
  const [narration, setNarration] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  // AI generation UI state
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!topic?.id) return;

    (async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const { data, error } = await supabase
          .from("topics")
          .select("id,title,research_topic,article_plan,stage3_data,stage4_data")
          .eq("id", topic.id)
          .single();

        if (error) throw error;

        setTopicRow(data || null);

        // Restore Stage 4 if already saved (reproducible across sessions)
        const s4 = data?.stage4_data || {};
        setSlideIdea(s4.slideIdea || "");
        setNarration(s4.narration || "");
      } catch (e) {
        console.error("Stage4 fetch error:", e);
        setErrorMsg(e?.message || "Failed to load data from Supabase.");
      } finally {
        setLoading(false);
      }
    })();
  }, [topic?.id]);

  const computed = useMemo(() => {
    const title = topicRow?.title || topic?.title || "Your Topic";
    const rq = topicRow?.research_topic || topic?.research_topic || "";

    const stage3 = topicRow?.stage3_data || {};

    // Collect article data across 0–9
    const all = [];
    for (let i = 0; i < 10; i++) {
      const entry = stage3[i] || stage3[String(i)];
      if (!entry) continue;
      all.push({ i, ...entry });
    }

    // We keep the exact column names used in your Stage 3 JSON:
    // full, simple, summary, keyFindings, glossary
    const summaries = all.map((x) => (x.summary || "").trim()).filter(Boolean);
    const findings = all.map((x) => (x.keyFindings || "").trim()).filter(Boolean);

    const glossaryLines = all
      .map((x) => (x.glossary || "").trim())
      .filter(Boolean)
      .join("\n")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    // De-duplicate glossary lines
    const seen = new Set();
    const glossaryUnique = [];
    for (const line of glossaryLines) {
      const k = line.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      glossaryUnique.push(line);
    }

    return { title, rq, summaries, findings, glossaryUnique };
  }, [topicRow, topic]);

  function buildDraftFromStudentData() {
    const { title, rq, summaries, findings, glossaryUnique } = computed;

    // ✅ 5–7 slides, Gamma/Felo-friendly, clear boundaries: Slide 1, Slide 2, ...
    // ✅ Image prompt is inside each slide block
    const draft = [
      "Slide 1: Title (Research Question)",
      `- Research Question: ${rq || "(write your research question here)"}`,
      `- Topic: ${title}`,
      "- Image prompt: clean academic title slide background, minimal, professional, no text.",
      "",
      "Slide 2: Key findings (3–5 points)",
      "- Use YOUR wording (your own findings / comments).",
      ...findings.slice(0, 5).map((f) => `- ${f}`),
      "- Image prompt: simple infographic icons (law, safety, road, comparison), minimal, no text.",
      "",
      "Slide 3: Interesting / surprising findings",
      "- Pick 1–3 points you found interesting.",
      ...summaries.slice(0, 3).map((s) => `- From summary: ${s}`),
      "- Image prompt: Japan vs America comparison visual (two columns, simple icons), minimal, no text.",
      "",
      "Slide 4: Consideration (your interpretation)",
      "- What do these findings suggest?",
      "- Your comment / interpretation (write in your own words).",
      "- Image prompt: thoughtful student / analysis mood (notes, thinking), minimal, no text.",
      "",
      "Slide 5: Important terms (glossary)",
      ...glossaryUnique.slice(0, 8).map((g) => `- ${g}`),
      "- Image prompt: vocabulary/terms theme (book + simple icons), minimal, no text.",
      "",
      "Slide 6: Closing",
      "- Thank you for listening.",
      "- (Optional) One question to the audience.",
      "- Image prompt: friendly closing atmosphere, minimal, no text.",
    ].join("\n");

    const nar = [
      "Slide 1 narration:",
      `Hello everyone. Today I will present my research question: ${rq || "(research question)"}.`,
      "I read ten articles and wrote my summary, key findings, and important terms.",
      "",
      "Slide 2 narration:",
      "Slide 2 shows my key findings. These points came from the articles, and I also added my own comments.",
      "The most important pattern I noticed was: (add your most important point).",
      "",
      "Slide 3 narration:",
      "Slide 3 shows interesting or surprising points. One point that surprised me was: (add your point).",
      "I think it is important because: (add your reason).",
      "",
      "Slide 4 narration:",
      "Slide 4 is my consideration. In my interpretation, these findings suggest: (your interpretation).",
      "My personal comment is: (your comment).",
      "",
      "Slide 5 narration:",
      "Slide 5 lists important terms. I will quickly explain a few key words that appeared many times.",
      "",
      "Slide 6 narration:",
      "Slide 6 is my closing. Thank you for listening.",
    ].join("\n");

    setSlideIdea(draft);
    setNarration(nar);
    setSavedMessage("");
  }

  async function generateWithAI() {
    // This will fail unless your server endpoint exists and works.
    // But the app will STILL work because Draft button works without AI.
    setIsGenerating(true);
    setSavedMessage("");

    try {
      const resp = await fetch("/api/generate-stage4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // pass everything the AI might need
          topicId: topic?.id,
          title: computed.title,
          research_topic: computed.rq,
          stage3_data: topicRow?.stage3_data || {},
          // IMPORTANT: keep the exact key names: summary, keyFindings, glossary
        }),
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || "AI server error");
      }

      const data = await resp.json();
      setSlideIdea(data.slideIdea || "");
      setNarration(data.narration || "");
    } catch (e) {
      console.error("generate-stage4 error:", e);
      alert("Could not generate Stage 4 with AI: " + (e?.message || "AI server error"));
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveStage4ToSupabase() {
    if (!topic?.id) return;

    setSavedMessage("");
    try {
      const payload = {
        slideIdea,
        narration,
        updatedAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("topics")
        .update({ stage4_data: payload })
        .eq("id", topic.id);

      if (error) throw error;

      setSavedMessage("Saved to Supabase.");
      setTimeout(() => setSavedMessage(""), 2500);
    } catch (e) {
      console.error("Stage4 save error:", e);
      alert("Could not save Stage 4 to Supabase: " + (e?.message || "unknown error"));
    }
  }

  if (!topic) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
        <p>No topic selected.</p>
        <button type="button" onClick={onBack}>
          Back
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
        <p>Loading Stage 4...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
        <p style={{ color: "crimson" }}>{errorMsg}</p>
        <button type="button" onClick={onBack}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "20px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 800, margin: 0 }}>
            Stage 4 – Slide Idea & Narration
          </h1>
          <p style={{ margin: "6px 0 0 0", color: "#555" }}>
            Gamma/Felo-friendly output. Image prompt is included inside Slide Idea. Everything is editable.
          </p>
        </div>

        <div style={{ whiteSpace: "nowrap" }}>
          <button
            type="button"
            onClick={onLogout}
            style={{
              marginRight: 8,
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #ddd",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #2563eb",
              backgroundColor: "#2563eb",
              color: "white",
              cursor: "pointer",
            }}
          >
            Back to Stage 3
          </button>
        </div>
      </div>

      <div
        style={{
          padding: 16,
          borderRadius: 10,
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: "1.4rem", margin: 0 }}>{computed.title}</h2>
        <p style={{ margin: "8px 0 0 0", fontWeight: 700 }}>Research question:</p>
        <p style={{ margin: "6px 0 0 0", background: "#f3f4f6", padding: "8px 10px", borderRadius: 6 }}>
          {computed.rq || "No research question saved yet."}
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <button
          type="button"
          onClick={buildDraftFromStudentData}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "none",
            background: "#059669",
            color: "white",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          Create Draft (from Stage 3 data)
        </button>

        <button
          type="button"
          onClick={generateWithAI}
          disabled={isGenerating}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "none",
            background: "#111827",
            color: "white",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          {isGenerating ? "Generating..." : "Generate with AI"}
        </button>

        <button
          type="button"
          onClick={saveStage4ToSupabase}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "none",
            background: "#2563eb",
            color: "white",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          Save Stage 4 to Supabase
        </button>

        {savedMessage && <span style={{ color: "#059669", fontWeight: 700 }}>{savedMessage}</span>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 800, marginBottom: 6 }}>
          Slide Idea (Gamma / Felo friendly) + Image prompts inside
        </label>
        <textarea
          value={slideIdea}
          onChange={(e) => setSlideIdea(e.target.value)}
          placeholder={"Slide 1: ...\nSlide 2: ...\nSlide 3: ..."}
          style={{
            width: "100%",
            minHeight: 260,
            padding: 12,
            fontSize: 15.5,
            lineHeight: 1.6,
            borderRadius: 10,
            border: "1px solid #d1d5db",
            whiteSpace: "pre-wrap",
          }}
        />
      </div>

      <div style={{ marginBottom: 30 }}>
        <label style={{ display: "block", fontWeight: 800, marginBottom: 6 }}>
          Narration (must say Slide 1, Slide 2, ...)
        </label>
        <textarea
          value={narration}
          onChange={(e) => setNarration(e.target.value)}
          placeholder={"Slide 1 narration: ...\nSlide 2 narration: ..."}
          style={{
            width: "100%",
            minHeight: 240,
            padding: 12,
            fontSize: 15.5,
            lineHeight: 1.6,
            borderRadius: 10,
            border: "1px solid #d1d5db",
            whiteSpace: "pre-wrap",
          }}
        />
      </div>
    </div>
  );
}

export default Stage4Screen;
