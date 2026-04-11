import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Stable web fingerprint mapping
  const generateBrowserFingerprint = () => {
    let installId = localStorage.getItem('install_id');
    if (!installId) {
      installId = crypto.randomUUID();
      localStorage.setItem('install_id', installId);
    }
    // Following backend rule for passing direct identifying hashes from clients. Let node handle secondary DB mapping.
    return installId;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phone || !password) {
      setError('Please enter both phone and password');
      return;
    }

    setLoading(true);
    setError(null);
    const fingerprint = generateBrowserFingerprint();

    try {
      const response = await api.post('/auth/login', {
        phone,
        password,
        device_fingerprint: fingerprint
      });

      const { jwt, session_token, user } = response.data;

      // Lock parameters physically inside Local Storage cache
      localStorage.setItem('jwt_token', jwt);
      localStorage.setItem('session_id', session_token);
      localStorage.setItem('device_fingerprint', fingerprint);
      localStorage.setItem('user_data', JSON.stringify(user));

      // Strictly map React routing against active target roles securely
      if (user.role === 'DISTRIBUTOR') {
        navigate('/distributor');
      } else if (user.role === 'INSPECTOR') {
        navigate('/inspector');
      } else {
        setError('Unauthorized Role mapping for the Web Analytics dashboard.');
      }

    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || 'Authentication Failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', fontFamily: 'sans-serif', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2 style={{ textAlign: 'center' }}>Portal Login</h2>
      
      {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Phone Number:</label>
          <input 
            type="text" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
            placeholder="Enter phone"
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
            placeholder="Enter password"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '10px', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
