import { useEffect, useState } from "react";
import LoginPage from "./pages/Login";
import Dashboard from "./Dashboard";
import Stage3Screen from "./pages/Stage3Screen";
import Stage4Screen from "./pages/Stage4Screen";

/**
 * Student identity is now { studentId: string, studentName: string }.
 * No Supabase Auth — identity is stored in localStorage.
 */
function App() {
  // null means "not identified yet"; { studentId, studentName } means "active"
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  // which topic has moved to Stage 3
  const [stage3Topic, setStage3Topic] = useState(null);

  // which topic has moved to Stage 4
  const [stage4Topic, setStage4Topic] = useState(null);

  // Restore identity from localStorage on first load
  useEffect(() => {
    const id = localStorage.getItem("student_id");
    const name = localStorage.getItem("student_name");
    if (id && name) {
      setStudent({ studentId: id, studentName: name });
    }
    setLoading(false);
  }, []);

  function handleAuthSuccess({ studentId, studentName }) {
    setStudent({ studentId, studentName });
    setStage3Topic(null);
    setStage4Topic(null);
  }

  function handleGoToStage3(topic) {
    setStage3Topic(topic);
    setStage4Topic(null);
  }

  function handleGoToStage4(topic) {
    setStage4Topic(topic);
  }

  function handleLogout() {
    localStorage.removeItem("student_id");
    localStorage.removeItem("student_name");
    setStudent(null);
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

  // Not identified → show login/entry page
  if (!student) {
    return <LoginPage onAuthSuccess={handleAuthSuccess} />;
  }

  // Stage 4 active
  if (stage4Topic) {
    return (
      <Stage4Screen
        topic={stage4Topic}
        onBack={() => setStage4Topic(null)}
        onLogout={handleLogout}
      />
    );
  }

  // Stage 3 active
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

  // Dashboard
  return (
    <Dashboard
      studentId={student.studentId}
      studentName={student.studentName}
      onLogout={handleLogout}
      onGoToStage3={handleGoToStage3}
    />
  );
}

export default App;