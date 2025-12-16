import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

function Stage4Screen({ topic, onBack, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [topicRow, setTopicRow] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Editable outputs (saved to Supabase)
  const [slideIdea, setSlideIdea] = useState("");
  const [imagePrompts, setImagePrompts] = useState("");
  const [narration, setNarration] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

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

        // Restore Stage 4 if already saved
        const s4 = data?.stage4_data || {};
        setSlideIdea(s4.slideIdea || "");
        setImagePrompts(s4.imagePrompts || "");
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

    const articleTitles = topicRow?.article_plan?.titles || topic?.article_plan?.titles || [];
    const stage3 = topicRow?.stage3_data || {};

    // Collect stage3 entries across 0-9 (if present)
    const all = [];
    for (let i = 0; i < 10; i++) {
      const entry = stage3[i] || stage3[String(i)];
      if (!entry) continue;
      all.push({ i, ...entry });
    }

    const findingsAll = all
      .map((x) => (x.keyFindings || "").trim())
      .filter(Boolean)
      .join("\n\n");

    const summariesAll = all
      .map((x) => (x.summary || "").trim())
      .filter(Boolean)
      .join("\n\n");

    const glossaryAll = all
      .map((x) => (x.glossary || "").trim())
      .filter(Boolean)
      .join("\n");

    return {
      title,
      rq,
      articleTitles,
      findingsAll,
      summariesAll,
      glossaryAll,
    };
  }, [topicRow, topic]);

  async function generateWithAI() {
    setIsGenerating(true);
    setSavedMessage("");

    try {
      const resp = await fetch("/api/generate-stage4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicTitle: computed.title,
          researchQuestion: computed.rq,
          articleTitles: computed.articleTitles,
          keyFindingsAll: computed.findingsAll,
          summariesAll: computed.summariesAll,
          glossaryAll: computed.glossaryAll,
        }),
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || "Stage 4 AI error");
      }

      const data = await resp.json();
      setSlideIdea(data.slideIdea || "");
      setImagePrompts(data.imagePrompts || "");
      setNarration(data.narration || "");
    } catch (e) {
      console.error("Stage4 AI generate error:", e);
      alert("Could not generate Stage 4 with AI: " + (e?.message || "unknown error"));
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
        imagePrompts,
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
          Back to Stage 3
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
            AI will generate a Gamma/Felo-friendly plan. Everything is editable.
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
          onClick={generateWithAI}
          disabled={isGenerating}
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
          {isGenerating ? "Generating..." : "AI Generate Slide Idea + Narration"}
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
          Slide Idea (Gamma / Felo friendly)
        </label>
        <textarea
          value={slideIdea}
          onChange={(e) => setSlideIdea(e.target.value)}
          placeholder={"Slide 1: ...\nSlide 2: ...\nSlide 3: ..."}
          style={{
            width: "100%",
            minHeight: 220,
            padding: 12,
            fontSize: 15.5,
            lineHeight: 1.6,
            borderRadius: 10,
            border: "1px solid #d1d5db",
            whiteSpace: "pre-wrap",
          }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 800, marginBottom: 6 }}>
          Image creation prompts
        </label>
        <textarea
          value={imagePrompts}
          onChange={(e) => setImagePrompts(e.target.value)}
          placeholder={"Slide 1 image prompt: ...\nSlide 2 image prompt: ..."}
          style={{
            width: "100%",
            minHeight: 180,
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
            minHeight: 220,
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
