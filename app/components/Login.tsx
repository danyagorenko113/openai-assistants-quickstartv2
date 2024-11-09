import React, { useState } from 'react';
import styles from './Login.module.css';
import SignUp from './SignUp';

interface LoginProps {
  onLogin: (token: string) => void;
  onClose?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        onLogin(data.token);
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    }
  };

  const handleSignUp = (token: string) => {
    onLogin(token);
  };

  return (
    <div className={styles.loginContainer}>
      {isLogin ? (
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <h2>Login</h2>
          {error && <p className={styles.error}>{error}</p>}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          <button type="submit">Login</button>
          <button type="button" onClick={() => setIsLogin(false)} className={styles.switchButton}>
            Don't have an account? Sign Up
          </button>
        </form>
      ) : (
        <>
          <SignUp onSignUp={handleSignUp} />
          <button onClick={() => setIsLogin(true)} className={styles.switchButton}>
            Already have an account? Login
          </button>
        </>
      )}
      {onClose && (
        <button onClick={onClose} className={styles.closeButton}>
          Back to Chat
        </button>
      )}
    </div>
  );
};

export default Login;
