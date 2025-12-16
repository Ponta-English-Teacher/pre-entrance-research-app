import { useEffect, useState } from "react";
import { supabase, insertTopic } from "./supabaseClient";

/**
 * Pre-Entrance Research Dashboard
 *
 * Stage 1: Generate 5 research questions from title + keywords.
 * Stage 2: From the chosen research question, generate:
 *          - a short research plan (CEFR B1)
 *          - 10 article titles
 * Finally, save everything into the `topics` table:
 *   title, research_topic, article_plan (JSONB).
 */
export default function Dashboard({ user, onLogout, onGoToStage3 }) {
  // Saved topics for this student
  const [topics, setTopics] = useState([]);

  // Stage 1 – topic & questions
  const [title, setTitle] = useState("");
  const [keywords, setKeywords] = useState("");
  const [researchTopic, setResearchTopic] = useState(""); // final research question
  const [aiQuestions, setAiQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState("");

  // Stage 2 – research plan & article titles
  const [researchPlan, setResearchPlan] = useState("");
  const [articleTitles, setArticleTitles] = useState([]);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState("");

  // Stage 3 – which topic is selected for the next stage
  const [selectedTopic, setSelectedTopic] = useState(null);

  const userId = user?.id ?? null;

  // Load topics for the logged-in user
  useEffect(() => {
    if (!userId) return;

    async function loadTopics() {
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading topics:", error);
        return;
      }
      setTopics(data || []);
    }

    loadTopics();
  }, [userId]);

  // === Stage 1: ask AI for research questions ===
  async function handleAskQuestions() {
    setQuestionsError("");
    setAiQuestions([]);
    setLoadingQuestions(true);

    try {
      if (!title.trim()) {
        setQuestionsError("Please enter a topic title first.");
        return;
      }

      const resp = await fetch(
        "http://localhost:3001/api/research-questions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
          topicTitle: title,
          keywords,
}),
        }
      );

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || "AI server error");
      }

      const data = await resp.json();

      // Accept either { questions: [...] } or { suggestions: [...] }
      const list = data.questions || data.suggestions || [];
      setAiQuestions(list);
      if (list.length === 0) {
        setQuestionsError("AI did not return any questions.");
      }
    } catch (err) {
      console.error("AI request error:", err);
      setQuestionsError(
        "Could not reach the AI server. Please check if `node api/generate-questions.js` is running."
      );
    } finally {
      setLoadingQuestions(false);
    }
  }

  // === Stage 2: ask AI for research plan + 10 titles ===
  async function handleGenerateArticlePlan() {
    setPlanError("");
    setLoadingPlan(true);
    setResearchPlan("");
    setArticleTitles([]);

    try {
      if (!title.trim()) {
        setPlanError("Please enter a topic title first.");
        return;
      }
      if (!researchTopic.trim()) {
        setPlanError("Please choose or write your final research question first.");
        return;
      }

      const resp = await fetch(
        "http://localhost:3001/api/generate-article-plan",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: title,
            keywords,
            researchTopic,
          }),
        }
      );

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || "AI server error");
      }

      const data = await resp.json();
      const planText = data.research_plan || "";
      const titles = data.titles || [];

      if (!planText) {
        setPlanError("AI did not return a research plan.");
      }
      if (!Array.isArray(titles) || titles.length === 0) {
        setPlanError((prev) =>
          prev
            ? prev + " AI did not return article titles."
            : "AI did not return article titles."
        );
      }

      setResearchPlan(planText);
      setArticleTitles(titles);
    } catch (err) {
      console.error("AI article plan error:", err);
      setPlanError(
        "Could not reach the AI server for article plan. Please check if `node api/generate-questions.js` is running."
      );
    } finally {
      setLoadingPlan(false);
    }
  }

  // Save everything into Supabase
  async function handleSaveArticlePlan(e) {
    e.preventDefault();
    if (!userId) {
      alert("No logged-in user. Please log in again.");
      return;
    }

    if (!title.trim() || !researchTopic.trim()) {
      alert("Please fill in the topic title and final research question.");
      return;
    }

    const cleanedTitles = articleTitles.map((t) => t.trim()).filter(Boolean);

    if (!researchPlan.trim() || cleanedTitles.length === 0) {
      const ok = window.confirm(
        "You have not generated a research plan and 10 article titles yet. Save anyway?"
      );
      if (!ok) return;
    }

    const topicData = {
      user_id: userId,
      title: title.trim(),
      research_topic: researchTopic.trim(),
      article_plan: researchPlan
        ? {
            research_plan: researchPlan.trim(),
            titles: cleanedTitles,
          }
        : null,
    };

    const { data, error } = await insertTopic(topicData);
    if (error) {
      alert("Error saving topic: " + error.message);
      return;
    }

    // Prepend new record to the list
    if (data && Array.isArray(data) && data[0]) {
      setTopics((prev) => [data[0], ...prev]);
    } else {
      // Reload from server as a fallback
      const { data: fresh } = await supabase
        .from("topics")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setTopics(fresh || []);
    }

    // Clear fields for the next topic
    setTitle("");
    setKeywords("");
    setResearchTopic("");
    setAiQuestions([]);
    setResearchPlan("");
    setArticleTitles([]);
  }

  function handleUseQuestion(q) {
    setResearchTopic(q);
  }

  function handleTitleChange(index, value) {
    setArticleTitles((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
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
      {/* Header + logout */}
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
              fontSize: "2.4rem",
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: "4px",
            }}
          >
            Pre-Entrance Research Dashboard
          </h1>
          <p style={{ margin: 0, fontSize: "0.95rem", color: "#555" }}>
            Step 2: Decide your research question, then create a research plan
            and 10 article titles.
          </p>
        </div>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            style={{
              padding: "6px 12px",
              fontSize: "0.9rem",
              borderRadius: "6px",
              border: "1px solid #ddd",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        )}
      </div>

      {/* Stage 1 description */}
      <p style={{ marginBottom: "24px" }}>
        <strong>Stage 1.</strong> First, decide your research topic. Then give a
        few keywords so AI can suggest possible research questions. Choose one,
        edit the English, and save it as your topic.
      </p>

      {/* TOPIC TITLE */}
      <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
        Topic title (short phrase)
      </label>
      <input
        type="text"
        placeholder="Examples: Jazz in Japan, Anime tourism, Coffee shops in Sapporo"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "16px",
          fontSize: "16px",
        }}
      />

      {/* KEYWORDS */}
      <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
        Keywords (to help AI)
      </label>
      <input
        type="text"
        placeholder="Give 3–5 keywords, separated by commas."
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "12px",
          fontSize: "16px",
        }}
      />

      <button
        type="button"
        onClick={handleAskQuestions}
        disabled={loadingQuestions}
        style={{
          padding: "10px 18px",
          marginBottom: "16px",
          background: "#2563eb",
          color: "white",
          fontSize: "16px",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
        }}
      >
        {loadingQuestions ? "Asking AI..." : "Ask AI for Research Questions"}
      </button>

      {questionsError && (
        <p style={{ color: "red", marginBottom: "12px" }}>{questionsError}</p>
      )}

      {/* AI questions list */}
      {aiQuestions.length > 0 && (
        <div
          style={{
            background: "#f3f4f6",
            padding: "12px 16px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          <p style={{ marginBottom: "8px" }}>
            <strong>AI suggestions</strong>
            <br />
            Click one you like. You can edit the English afterwards.
          </p>
          <ol style={{ paddingLeft: "20px", margin: 0 }}>
            {aiQuestions.map((q, idx) => (
              <li key={idx} style={{ marginBottom: "8px" }}>
                {q}{" "}
                <button
                  type="button"
                  onClick={() => handleUseQuestion(q)}
                  style={{
                    marginLeft: "8px",
                    padding: "2px 8px",
                    fontSize: "0.8rem",
                    borderRadius: "999px",
                    border: "1px solid #2563eb",
                    background: "white",
                    color: "#2563eb",
                    cursor: "pointer",
                  }}
                >
                  Use this
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* FINAL RESEARCH TOPIC / QUESTION + Stage 2 + Save */}
      <form onSubmit={handleSaveArticlePlan} style={{ marginBottom: "30px" }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
          Research Topic / Final Research Question
        </label>
        <textarea
          placeholder="Write your final research topic or question here. You can edit the English freely."
          value={researchTopic}
          onChange={(e) => setResearchTopic(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            height: "90px",
            marginBottom: "16px",
            fontSize: "16px",
          }}
        />

        <p style={{ marginBottom: "8px" }}>
          <strong>Stage 2.</strong> After you decide your final research
          question, ask AI to create a short research plan and 10 article
          titles. You can edit them and then save everything.
        </p>

        <button
          type="button"
          onClick={handleGenerateArticlePlan}
          disabled={loadingPlan}
          style={{
            padding: "8px 14px",
            marginBottom: "16px",
            background: "#059669",
            color: "white",
            fontSize: "15px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
          }}
        >
          {loadingPlan
            ? "Generating Article Plan..."
            : "Generate Article Plan (10 Titles)"}
        </button>

        {planError && (
          <p style={{ color: "red", marginBottom: "12px" }}>{planError}</p>
        )}

        {(researchPlan || articleTitles.length > 0) && (
          <div
            style={{
              background: "#f9fafb",
              padding: "12px 16px",
              borderRadius: "10px",
              marginBottom: "16px",
            }}
          >
            <label
              style={{ display: "block", fontWeight: 600, marginBottom: 4 }}
            >
              Research Plan (short paragraph)
            </label>
            <textarea
              value={researchPlan}
              onChange={(e) => setResearchPlan(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                height: "80px",
                marginBottom: "12px",
                fontSize: "15px",
              }}
            />

            <label
              style={{ display: "block", fontWeight: 600, marginBottom: 4 }}
            >
              10 Article Titles (you can edit them)
            </label>
            <ol style={{ paddingLeft: "20px", margin: 0 }}>
              {articleTitles.map((t, idx) => (
                <li key={idx} style={{ marginBottom: "6px" }}>
                  <input
                    type="text"
                    value={t}
                    onChange={(e) => handleTitleChange(idx, e.target.value)}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      fontSize: "14px",
                    }}
                  />
                </li>
              ))}
            </ol>
          </div>
        )}

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "12px",
            background: "#2563eb",
            color: "white",
            fontSize: "18px",
            borderRadius: "8px",
            cursor: "pointer",
            border: "none",
          }}
        >
          Save Article Plan
        </button>
      </form>

      {/* TOPIC LIST */}
      <h2 style={{ fontSize: "1.5rem", marginBottom: "12px" }}>Your Topics</h2>

      {topics.length === 0 ? (
        <p>No topics yet.</p>
      ) : (
        <ul style={{ listStyle: "none", paddingLeft: 0 }}>
          {topics.map((t) => (
            <li
              key={t.id}
              style={{
                marginBottom: "14px",
                padding: "12px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                background: "#f9fafb",
              }}
            >
              <div style={{ fontWeight: 700 }}>{t.title}</div>

              <div style={{ fontSize: "0.9rem", marginTop: "4px" }}>
                {t.research_topic || "(no research topic saved yet)"}
              </div>

              <button
                type="button"
                onClick={() => onGoToStage3 && onGoToStage3(t)}
                style={{
                  marginTop: "8px",
                  padding: "6px 10px",
                  fontSize: "0.9rem",
                  borderRadius: "6px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Go to Next Stage
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedTopic && (
        <div
          style={{
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <h2 style={{ fontSize: "1.4rem", marginBottom: "8px" }}>
            Stage 3 (Preview) – {selectedTopic.title}
          </h2>

          <p style={{ marginBottom: "8px" }}>Final research question:</p>

          <p
            style={{
              marginBottom: "12px",
              padding: "8px 10px",
              backgroundColor: "#f3f4f6",
              borderRadius: "6px",
            }}
          >
            {selectedTopic.research_topic ||
              "No research question saved yet."}
          </p>

          <p style={{ fontSize: "0.9rem", color: "#4b5563" }}>
            This area will become your Stage 3 work area where students
            will read AI-generated articles, write summaries, key findings,
            glossary items, and sentence explanations.
          </p>
        </div>
      )}
    </div>
  );
}