import { useState } from 'react';

/**
 * Student entry screen.
 * No email/password. Students enter:
 *   - Student ID  (e.g. s12345)
 *   - Display name (e.g. Tanaka Yuki)
 *
 * Identity is stored in localStorage so students can return later.
 * onAuthSuccess({ studentId, studentName }) is called on submit.
 */
function Login({ onAuthSuccess }) {
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const id = studentId.trim();
    const name = studentName.trim();

    if (!id) {
      setError('Please enter your Student ID.');
      return;
    }
    if (!name) {
      setError('Please enter your name.');
      return;
    }

    // Persist so the browser remembers on next visit
    localStorage.setItem('student_id', id);
    localStorage.setItem('student_name', name);

    onAuthSuccess({ studentId: id, studentName: name });
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
          width: '100%',
          maxWidth: '380px',
        }}
      >
        <h1
          style={{
            fontSize: '1.5rem',
            marginBottom: '0.3rem',
            textAlign: 'center',
          }}
        >
          Research Start App
        </h1>
        <p
          style={{
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
            color: '#666',
          }}
        >
          Developed by Hitoshi Eguchi @ Hokusei Gakuen University
        </p>
        <p
          style={{
            fontSize: '0.95rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
            color: '#555',
          }}
        >
          Enter your student ID and name to continue your research project.
        </p>

        <form onSubmit={handleSubmit}>
          <label
            style={{
              display: 'block',
              fontSize: '0.9rem',
              marginBottom: '0.25rem',
              fontWeight: 600,
            }}
          >
            Student ID
          </label>
          <input
            type="text"
            required
            placeholder="e.g. s12345"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              marginBottom: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #ccc',
              fontSize: '0.95rem',
              boxSizing: 'border-box',
            }}
          />

          <label
            style={{
              display: 'block',
              fontSize: '0.9rem',
              marginBottom: '0.25rem',
              fontWeight: 600,
            }}
          >
            Your Name
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Tanaka Yuki"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              marginBottom: '1rem',
              borderRadius: '8px',
              border: '1px solid #ccc',
              fontSize: '0.95rem',
              boxSizing: 'border-box',
            }}
          />

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '999px',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              background: '#2563eb',
              color: '#fff',
              marginBottom: '0.75rem',
            }}
          >
            Start / Continue Research
          </button>
        </form>

        {error && (
          <p
            style={{
              marginTop: '0.5rem',
              fontSize: '0.9rem',
              color: '#b91c1c',
            }}
          >
            ❌ {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;