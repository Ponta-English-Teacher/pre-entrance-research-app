// src/components/Stage3Screen.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase, updateStage3Data } from "../supabaseClient";

function Stage3Screen({ topic, onBack, onLogout }) {
  if (!topic) {
    return (
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "20px",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <p>No topic selected.</p>
        <button
          type="button"
          onClick={onBack}
          style={{
            marginTop: "12px",
            padding: "8px 14px",
            borderRadius: "6px",
            border: "1px solid #ddd",
            cursor: "pointer",
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const API_BASE = "";

  // 10 article titles from article_plan
  const titles = topic.article_plan?.titles || [];

  // which article index is selected (0–9)
  const [currentIndex, setCurrentIndex] = useState(0);

  // current article data
  const [fullText, setFullText] = useState("");
  const [simpleText, setSimpleText] = useState("");
  const [summary, setSummary] = useState("");
  const [keyFindings, setKeyFindings] = useState("");
  const [glossary, setGlossary] = useState("");

  // all stage3 data (for Supabase sync)
  const [allStage3Data, setAllStage3Data] = useState(topic.stage3_data || {});

  // UI state
  const [version, setVersion] = useState("full"); // "full" or "simple"
  const [savedMessage, setSavedMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // TTS state
  const [voiceChoice, setVoiceChoice] = useState("alloy");
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);

  // "What does it mean?"
  const [selectionText, setSelectionText] = useState("");
  const [showMeaningButton, setShowMeaningButton] = useState(false);
  const [showMeaningPopup, setShowMeaningPopup] = useState(false);
  const [meaningExplanation, setMeaningExplanation] = useState("");
  const [isAskingMeaning, setIsAskingMeaning] = useState(false);

  const localKey = (id, idx) => `stage3_${id}_${idx}`;

  const currentTitle = titles[currentIndex] || `Article ${currentIndex + 1}`;
  const articleTextToShow = version === "full" ? fullText : simpleText;

  // Optional paragraphs helper (not rendered here — kept for future use)
  const paragraphs = useMemo(() => {
    const raw = (articleTextToShow || "").trim();
    if (!raw) return [];
    return raw
      .split(/\n\s*\n+/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }, [articleTextToShow]);

  // ✅ Fetch latest stage3_data from Supabase when topic changes
  useEffect(() => {
    if (!topic?.id) return;

    (async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("stage3_data")
        .eq("id", topic.id)
        .single();

      if (error) {
        console.error("Failed to fetch latest stage3_data:", error);
        return;
      }
      setAllStage3Data(data?.stage3_data || {});
    })();
  }, [topic?.id]);

  // Load article data when topic/currentIndex changes (prefer localStorage, fallback to stage3_data)
  useEffect(() => {
    const key = localKey(topic.id, currentIndex);
    const localRaw = window.localStorage.getItem(key);

    const loadFromStage3Data = () => {
      const entry =
        (allStage3Data &&
          (allStage3Data[currentIndex] || allStage3Data[String(currentIndex)])) ||
        {};
      setFullText(entry.full || "");
      setSimpleText(entry.simple || "");
      setSummary(entry.summary || "");
      setKeyFindings(entry.keyFindings || "");
      setGlossary(entry.glossary || "");
    };

    if (localRaw) {
      try {
        const d = JSON.parse(localRaw);
        setFullText(d.full || "");
        setSimpleText(d.simple || "");
        setSummary(d.summary || "");
        setKeyFindings(d.keyFindings || "");
        setGlossary(d.glossary || "");
      } catch (e) {
        console.error("Error parsing local Stage 3 data:", e);
        loadFromStage3Data();
      }
    } else {
      loadFromStage3Data();
    }

    setSavedMessage("");
    setSelectionText("");
    setShowMeaningButton(false);
    setShowMeaningPopup(false);
    setMeaningExplanation("");
  }, [topic, currentIndex, allStage3Data]);

  function saveLocal() {
    const key = localKey(topic.id, currentIndex);
    const payload = {
      full: fullText,
      simple: simpleText,
      summary,
      keyFindings,
      glossary,
    };

    try {
      window.localStorage.setItem(key, JSON.stringify(payload));
      setSavedMessage("Saved on this device.");
      setTimeout(() => setSavedMessage(""), 2500);
    } catch (err) {
      console.error("Local save error:", err);
      setSavedMessage("Could not save locally.");
    }
  }

  async function saveToSupabase() {
    const updated = {
      ...(allStage3Data || {}),
      [currentIndex]: {
        full: fullText,
        simple: simpleText,
        summary,
        keyFindings,
        glossary,
      },
    };

    // Also save locally (so switching articles won’t wipe it)
    const key = localKey(topic.id, currentIndex);
    const payload = {
      full: fullText,
      simple: simpleText,
      summary,
      keyFindings,
      glossary,
    };
    window.localStorage.setItem(key, JSON.stringify(payload));

    const { error } = await updateStage3Data(topic.id, updated);
    if (error) {
      console.error("Supabase save error:", error);
      alert("Could not save to Supabase: " + error.message);
      return;
    }

    setAllStage3Data(updated);
    setSavedMessage("Saved to Supabase.");
    setTimeout(() => setSavedMessage(""), 2500);
  }

  async function handleGenerateArticle() {
    if (!titles[currentIndex]) {
      alert("No title for this article.");
      return;
    }

    setIsGenerating(true);
    setSavedMessage("");

    try {
      const resp = await fetch(`${API_BASE}/api/generate-article`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titles[currentIndex],
          researchTopic: topic.research_topic,
          index: currentIndex,
        }),
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || "AI server error");
      }

      const data = await resp.json();

      // Accept both shapes:
      // 1) { full, simple }
      // 2) { original, simplified }
      const nextFull = data.full ?? data.original ?? "";
      const nextSimple = data.simple ?? data.simplified ?? "";

      setFullText(nextFull || "");
      setSimpleText(nextSimple || "");

      // auto-save locally (keep current summary/findings/glossary)
      const key = localKey(topic.id, currentIndex);
      const payload = {
        full: nextFull || "",
        simple: nextSimple || "",
        summary,
        keyFindings,
        glossary,
      };
      window.localStorage.setItem(key, JSON.stringify(payload));
      setSavedMessage("Article generated and saved locally.");
      setTimeout(() => setSavedMessage(""), 2500);
    } catch (err) {
      console.error("Generate article error:", err);
      alert("Could not generate article. Check Node server and /api/generate-article.");
    } finally {
      setIsGenerating(false);
    }
  }

  // Server-based TTS
  async function playTTS(text) {
    if (!text.trim()) {
      alert("No text to read.");
      return;
    }

    setIsPlayingTTS(true);
    try {
      const resp = await fetch(`${API_BASE}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice: voiceChoice,
        }),
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || "TTS server error");
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.onerror = () => URL.revokeObjectURL(url);

      await audio.play();
    } catch (e) {
      console.error("TTS error:", e);
      alert("Could not play TTS. Check Node server /api/tts.");
    } finally {
      setIsPlayingTTS(false);
    }
  }

  // ✅ TTS for selection inside popup (reuses playTTS)
  async function playSelectionTTS() {
    const text = (selectionText || "").trim();
    if (!text) {
      alert("No selection to read.");
      return;
    }
    await playTTS(text);
  }

  function handleArticleSelection(e) {
    const el = e.target;
    if (!el || typeof el.selectionStart !== "number") return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const sel = (el.value || "").slice(start, end).trim();

    if (sel) {
      setSelectionText(sel);
      setShowMeaningButton(true);
    } else {
      setSelectionText("");
      setShowMeaningButton(false);
    }
  }

  async function askMeaning() {
    if (!selectionText) return;

    setIsAskingMeaning(true);
    setMeaningExplanation("");

    try {
      // /api/explain must return { en, ja }
      const resp = await fetch(`${API_BASE}/api/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectionText }),
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || "AI explain error");
      }

      const data = await resp.json();
      const en = (data.en || "").trim();
      const ja = (data.ja || "").trim();
      setMeaningExplanation([en, ja].filter(Boolean).join("\n"));
    } catch (e) {
      console.error("Ask meaning error:", e);
      alert("Could not get meaning. Check Node server /api/explain.");
    } finally {
      setIsAskingMeaning(false);
    }
  }

  function openMeaningPopup() {
    if (!selectionText) {
      alert("Select a word or sentence in the article first.");
      return;
    }
    setMeaningExplanation("");
    setShowMeaningPopup(true);
    askMeaning();
  }

  function addSelectionToGlossary() {
    if (!selectionText) return;

    const cleanSel = selectionText.replace(/\s+/g, " ").trim();
    const cleanMeaning = (meaningExplanation || "").replace(/\s+/g, " ").trim();
    const line = cleanMeaning ? `${cleanSel} — ${cleanMeaning}` : cleanSel;

    setGlossary((prev) => {
      const p = prev || "";
      if (!p.trim()) return line;
      return p.trimEnd() + "\n" + line;
    });

    setShowMeaningPopup(false);
    setSelectionText("");
    setShowMeaningButton(false);
    setMeaningExplanation("");
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
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "2.2rem",
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: "4px",
            }}
          >
            Stage 3 – Article Reading & Writing
          </h1>
          <p style={{ margin: 0, fontSize: "0.95rem", color: "#555" }}>
            Read articles about your topic, then write your summary, key findings, and glossary.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={onLogout}
            style={{
              marginRight: "8px",
              padding: "6px 12px",
              fontSize: "0.9rem",
              borderRadius: "6px",
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
              fontSize: "0.9rem",
              borderRadius: "6px",
              border: "1px solid #2563eb",
              backgroundColor: "#2563eb",
              color: "white",
              cursor: "pointer",
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Topic info */}
      <div
        style={{
          padding: "16px",
          borderRadius: "10px",
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          marginBottom: "16px",
        }}
      >
        <h2 style={{ fontSize: "1.6rem", marginBottom: "8px" }}>{topic.title}</h2>
        <p style={{ marginBottom: "6px", fontWeight: 600 }}>Final research question:</p>
        <p
          style={{
            marginBottom: "10px",
            padding: "8px 10px",
            backgroundColor: "#f3f4f6",
            borderRadius: "6px",
          }}
        >
          {topic.research_topic || "No research question saved yet."}
        </p>
      </div>

      {/* Article selector */}
      <div style={{ marginBottom: "10px" }}>
        <p style={{ marginBottom: "6px", fontWeight: 600 }}>Articles for this topic:</p>
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "8px" }}>
          {titles.map((t, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              style={{
                padding: "6px 10px",
                borderRadius: "999px",
                border: "1px solid #2563eb",
                backgroundColor: currentIndex === idx ? "#2563eb" : "white",
                color: currentIndex === idx ? "white" : "#2563eb",
                fontSize: "0.85rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              title={t}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <div style={{ fontSize: "0.95rem", color: "#374151", marginBottom: "8px" }}>
          <strong>{currentIndex + 1}.</strong> {currentTitle}
        </div>
      </div>

      {/* Article controls */}
      <div
        style={{
          marginBottom: "12px",
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={handleGenerateArticle}
          disabled={isGenerating}
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#059669",
            color: "white",
            cursor: "pointer",
            fontSize: "0.95rem",
          }}
        >
          {isGenerating ? "Generating..." : "Generate Article"}
        </button>

        <div style={{ display: "flex", gap: "6px", marginLeft: "8px" }}>
          <button
            type="button"
            onClick={() => setVersion("full")}
            style={{
              padding: "6px 10px",
              borderRadius: "999px",
              border: "1px solid #2563eb",
              backgroundColor: version === "full" ? "#2563eb" : "white",
              color: version === "full" ? "white" : "#2563eb",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Original (B1/B2)
          </button>
          <button
            type="button"
            onClick={() => setVersion("simple")}
            style={{
              padding: "6px 10px",
              borderRadius: "999px",
              border: "1px solid #2563eb",
              backgroundColor: version === "simple" ? "#2563eb" : "white",
              color: version === "simple" ? "white" : "#2563eb",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Simplified (A2)
          </button>
        </div>

        {/* Voice choice + TTS */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.9rem",
          }}
        >
          <span style={{ color: "#374151" }}>Voice:</span>
          <select
            value={voiceChoice}
            onChange={(e) => setVoiceChoice(e.target.value)}
            style={{ fontSize: "0.9rem", padding: "4px 6px" }}
          >
            <option value="alloy">alloy</option>
            <option value="aria">aria</option>
            <option value="verse">verse</option>
            <option value="sage">sage</option>
            <option value="coral">coral</option>
            <option value="ash">ash</option>
          </select>

          <button
            type="button"
            onClick={() => playTTS(articleTextToShow)}
            disabled={isPlayingTTS}
            style={{
              padding: "6px 10px",
              borderRadius: "8px",
              border: "1px solid #ddd",
              cursor: "pointer",
              fontSize: "0.9rem",
              background: "white",
            }}
          >
            {isPlayingTTS ? "Playing..." : "🔊 Play article"}
          </button>
        </div>
      </div>

      {/* Article text */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>
          Article text ({version === "full" ? "Original B1/B2" : "Simplified A2"})
        </label>

        <textarea
          value={articleTextToShow}
          onChange={(e) => (version === "full" ? setFullText(e.target.value) : setSimpleText(e.target.value))}
          onMouseUp={handleArticleSelection}
          onKeyUp={handleArticleSelection}
          onSelect={handleArticleSelection}
          onTouchEnd={handleArticleSelection}
          placeholder={
            version === "full"
              ? "Original (B1/B2) article. Generate or edit here."
              : "Simplified (A2) version. Generate or edit here."
          }
          style={{
            width: "100%",
            padding: "16px",
            minHeight: "260px",
            fontSize: "17.5px",
            lineHeight: "1.85",
            letterSpacing: "0.01em",
            borderRadius: "10px",
            border: "1px solid #d1d5db",
            whiteSpace: "pre-wrap",
            backgroundColor: "#ffffff",
          }}
        />
      </div>

      {/* What does it mean? */}
      {showMeaningButton && selectionText && (
        <div style={{ marginBottom: "12px" }}>
          <button
            type="button"
            onClick={openMeaningPopup}
            style={{
              padding: "8px 14px",
              borderRadius: "999px",
              backgroundColor: "#f59e0b",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: "0.95rem",
              fontWeight: 700,
            }}
          >
            What does it mean?
          </button>
          <span style={{ marginLeft: "10px", fontSize: "0.9rem", color: "#6b7280" }}>
            Selected: “{selectionText}”
          </span>
        </div>
      )}

      {showMeaningPopup && (
        <div
          style={{
            position: "fixed",
            top: "18%",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "white",
            border: "1px solid #d1d5db",
            borderRadius: "12px",
            padding: "16px",
            width: "420px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: "8px" }}>What does it mean?</h3>

          <div style={{ marginBottom: "10px", fontWeight: 700 }}>{selectionText}</div>

          <label style={{ display: "block", fontSize: "0.9rem", marginBottom: "6px" }}>
            Simple paraphrase (EN) + Japanese translation (JA)
          </label>

          <textarea
            value={meaningExplanation}
            onChange={(e) => setMeaningExplanation(e.target.value)}
            placeholder={isAskingMeaning ? "Asking AI..." : "EN (simple)\nJA (translation)"}
            style={{
              width: "100%",
              minHeight: "110px",
              padding: "10px",
              fontSize: "0.95rem",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              marginBottom: "10px",
              whiteSpace: "pre-wrap",
            }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={askMeaning}
                disabled={isAskingMeaning}
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  background: "white",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                {isAskingMeaning ? "Asking..." : "Ask again"}
              </button>

              <button
                type="button"
                onClick={playSelectionTTS}
                disabled={isPlayingTTS}
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  background: "white",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                {isPlayingTTS ? "Playing..." : "🔊 Play selection"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setShowMeaningPopup(false);
                  setSelectionText("");
                  setShowMeaningButton(false);
                  setMeaningExplanation("");
                }}
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  background: "white",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={addSelectionToGlossary}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#2563eb",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                }}
              >
                Add to Glossary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>
          Summary (5–7 sentences)
        </label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            minHeight: "120px",
            fontSize: "16px",
            borderRadius: "10px",
            border: "1px solid #d1d5db",
            background: "white",
          }}
        />
      </div>

      {/* Key findings */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>
          Key findings (3–5 points)
        </label>
        <textarea
          value={keyFindings}
          onChange={(e) => setKeyFindings(e.target.value)}
          placeholder={`- Point 1\n- Point 2\n- Point 3`}
          style={{
            width: "100%",
            padding: "12px",
            minHeight: "120px",
            fontSize: "16px",
            borderRadius: "10px",
            border: "1px solid #d1d5db",
            background: "white",
          }}
        />
      </div>

      {/* Glossary */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>
          Glossary – your vocabulary book
        </label>
        <textarea
          value={glossary}
          onChange={(e) => setGlossary(e.target.value)}
          placeholder={`Example:\nengagement — EN: the amount of interest and interaction people show\nJA: （SNSの）反応・関わり`}
          style={{
            width: "100%",
            padding: "12px",
            minHeight: "160px",
            fontSize: "16px",
            borderRadius: "10px",
            border: "1px solid #d1d5db",
            background: "white",
            whiteSpace: "pre-wrap",
          }}
        />
      </div>

      {/* Save buttons */}
      <div style={{ marginBottom: "40px" }}>
        <button
          type="button"
          onClick={saveLocal}
          style={{
            padding: "10px 16px",
            borderRadius: "10px",
            border: "none",
            background: "#4b5563",
            color: "white",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: 700,
          }}
        >
          Save on this device
        </button>

        <button
          type="button"
          onClick={saveToSupabase}
          style={{
            padding: "10px 16px",
            borderRadius: "10px",
            border: "none",
            background: "#2563eb",
            color: "white",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: 700,
            marginLeft: "10px",
          }}
        >
          Save to Supabase
        </button>

        {savedMessage && (
          <span style={{ marginLeft: "12px", fontSize: "0.95rem", color: "#059669" }}>
            {savedMessage}
          </span>
        )}
      </div>
    </div>
  );
}

export default Stage3Screen;