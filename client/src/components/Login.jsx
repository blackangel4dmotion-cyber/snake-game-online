import { useState } from 'react';

export default function Login({ onLogin, serverUrl }) {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [serverIp, setServerIp] = useState('localhost');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    let endpoint = '';
    let method = 'POST';
    let body = { username, password };

    if (mode === 'register') endpoint = '/api/register';
    else if (mode === 'login') endpoint = '/api/login';
    else if (mode === 'forgot') {
      endpoint = '/api/users/forgot-password';
      method = 'PUT';
      body = { username, newPassword: password };
    }
    
    try {
      const activeServerUrl = `http://${serverIp}:3001`;
      const res = await fetch(`${activeServerUrl}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (data.success) {
        if (mode === 'forgot') {
          alert('Password reset successfully! You can now login.');
          setMode('login');
          setPassword('');
        } else {
          onLogin({ username: data.username, userId: data.userId }, activeServerUrl);
        }
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Could not connect to server. Ensure it is running.');
    }
  };

  return (
    <div className="glass-panel">
      <h1 className="title">Snake & Ladder</h1>
      <h2>
        {mode === 'register' ? 'Create Account' : mode === 'forgot' ? 'Reset Password' : 'Welcome Back'}
      </h2>
      
      <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
        <div className="input-group">
          <label>Username</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
        </div>
        <div className="input-group">
          <label>Server IP</label>
          <input type="text" value={serverIp} onChange={e => setServerIp(e.target.value)} placeholder="e.g. localhost or 192.168.1.5" required />
        </div>
        
        <div className="input-group">
          <label>{mode === 'forgot' ? 'New Password' : 'Password'}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        
        {error && <div className="error">{error}</div>}
        
        <button type="submit">
          {mode === 'register' ? 'Register & Play' : mode === 'forgot' ? 'Reset Password' : 'Login & Play'}
        </button>
      </form>
      
      <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '15px'}}>
        {mode !== 'login' && (
          <p style={{textAlign: 'center', cursor: 'pointer', opacity: 0.8, margin: 0}} onClick={() => setMode('login')}>
            Back to Login
          </p>
        )}
        
        {mode === 'login' && (
          <>
            <p style={{textAlign: 'center', cursor: 'pointer', opacity: 0.8, margin: 0}} onClick={() => setMode('register')}>
              Don't have an account? Register
            </p>
            <p style={{textAlign: 'center', cursor: 'pointer', opacity: 0.8, margin: 0, color: '#f39c12'}} onClick={() => setMode('forgot')}>
              Forgot Password?
            </p>
          </>
        )}
      </div>
    </div>
  );
}
