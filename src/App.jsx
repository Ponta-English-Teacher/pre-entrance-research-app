import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import LoginPage from "./pages/Login";
import Dashboard from "./Dashboard";
import Stage3Screen from "./pages/Stage3Screen";
import Stage4Screen from "./pages/Stage4Screen";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // which topic has moved to Stage 3
  const [stage3Topic, setStage3Topic] = useState(null);

  // which topic has moved to Stage 4
  const [stage4Topic, setStage4Topic] = useState(null);

  // Check existing session when the app starts
  useEffect(() => {
    async function getSession() {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error.message);
      }
      setUser(data?.session?.user ?? null);
      setLoading(false);
    }

    getSession();

    // Listen for login / logout
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  function handleGoToStage3(topic) {
    setStage3Topic(topic);
    setStage4Topic(null); // ensure Stage 4 is not active
  }

  function handleGoToStage4(topic) {
    // keep stage3Topic so user can go back to Stage 3 later
    setStage4Topic(topic);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setStage3Topic(null);
    setStage4Topic(null);
  }

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        Loading...
      </div>
    );
  }

  // Not logged in → show login page
  if (!user) {
    return <LoginPage />;
  }

  // If Stage 4 is active → show Stage 4 screen
  if (stage4Topic) {
    return (
      <Stage4Screen
        topic={stage4Topic}
        onBack={() => setStage4Topic(null)} // back to Stage 3
        onLogout={handleLogout}
      />
    );
  }

// If a topic is chosen for Stage 3 → show Stage 3 screen
if (stage3Topic) {
  return (
    <Stage3Screen
      topic={stage3Topic}
      onBack={() => setStage3Topic(null)}
      onLogout={handleLogout}
      onNextStage={handleGoToStage4}
    />
  );
}

  // Logged in & not in Stage 3/4 → show dashboard
  return (
    <Dashboard user={user} onLogout={handleLogout} onGoToStage3={handleGoToStage3} />
  );
}

export default App;