import { useState } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Simple login / sign-up component for students.
 * - Uses email + password
 * - Can create a new account (Sign up)
 * - Can log in to an existing account (Log in)
 * - Calls onAuthSuccess() when login succeeds (App will use this later)
 */
function Login({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        setMessage(
          '✅ Sign up successful. Please check your email if confirmation is required, then log in.'
        );
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        setMessage('✅ Logged in successfully.');

        // Notify parent (App) if provided
        if (onAuthSuccess) {
          onAuthSuccess(data.session);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setMessage('❌ ' + (err.message || 'Authentication error'));
    } finally {
      setLoading(false);
    }
  };

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
            marginBottom: '0.5rem',
            textAlign: 'center',
          }}
        >
          Pre-Entrance Research App
        </h1>
        <p
          style={{
            fontSize: '0.95rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
            color: '#555',
          }}
        >
          {mode === 'login'
            ? 'Log in with your email to continue your research.'
            : 'Create your account to start your research project.'}
        </p>

        <form onSubmit={handleAuth}>
          <label
            style={{
              display: 'block',
              fontSize: '0.9rem',
              marginBottom: '0.25rem',
            }}
          >
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              marginBottom: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #ccc',
              fontSize: '0.95rem',
            }}
          />

          <label
            style={{
              display: 'block',
              fontSize: '0.9rem',
              marginBottom: '0.25rem',
            }}
          >
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              marginBottom: '1rem',
              borderRadius: '8px',
              border: '1px solid #ccc',
              fontSize: '0.95rem',
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '999px',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'default' : 'pointer',
              background: loading ? '#999' : '#2563eb',
              color: '#fff',
              marginBottom: '0.75rem',
            }}
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
              ? 'Log In'
              : 'Sign Up'}
          </button>
        </form>

        <button
          type="button"
          onClick={() =>
            setMode((prev) => (prev === 'login' ? 'signup' : 'login'))
          }
          style={{
            width: '100%',
            padding: '0.5rem',
            borderRadius: '999px',
            border: '1px solid #ddd',
            background: '#fafafa',
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          {mode === 'login'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Log in'}
        </button>

        {message && (
          <p
            style={{
              marginTop: '0.75rem',
              fontSize: '0.9rem',
              color: message.startsWith('✅') ? '#15803d' : '#b91c1c',
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;
