import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import LoginPage from "./pages/Login";
import Dashboard from "./Dashboard";
import Stage3Screen from "./pages/Stage3Screen";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // which topic has moved to Stage 3
  const [stage3Topic, setStage3Topic] = useState(null);

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
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setStage3Topic(null);
  }

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
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

  // If a topic is chosen for Stage 3 → show Stage 3 screen
  if (stage3Topic) {
    return (
      <Stage3Screen
        topic={stage3Topic}
        onBack={() => setStage3Topic(null)}
        onLogout={handleLogout}
      />
    );
  }

  // Logged in & not in Stage 3 → show dashboard
  return (
    <Dashboard
      user={user}
      onLogout={handleLogout}
      onGoToStage3={handleGoToStage3}
    />
  );
}

export default App;