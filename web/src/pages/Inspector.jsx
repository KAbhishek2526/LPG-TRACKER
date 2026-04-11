import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function Inspector() {
  const navigate = useNavigate();

  // Search logic limits
  const [cylinderId, setCylinderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorParse, setErrorParse] = useState('');

  // Target return container
  const [historyLedger, setHistoryLedger] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!cylinderId) {
      setErrorParse('Search parameters missing.');
      return;
    }

    setLoading(true);
    setErrorParse('');
    setHistoryLedger([]); // Flush explicitly before hitting new arrays

    try {
      const response = await api.get(`/api/cylinder-history/${cylinderId}`);
      const payloadData = Array.isArray(response.data) ? response.data : (response.data?.history || []);

      if (payloadData.length === 0) {
        setErrorParse('No history natively found mapped against this Cylinder UUID.');
      } else {
        setHistoryLedger(payloadData);
      }
      
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || 'Server extraction completely failed. Check backend availability.';
      setErrorParse(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Network failure during explicit server-side logout.');
    }
    
    // Purge logic vectors natively representing session closure
    localStorage.clear();
    navigate('/');
  };

  // Fraud detection helper mapping exact node flags explicitly
  const isFraudEvent = (actionCode) => {
    const flags = ['FAILED_OTP', 'ANOMALY_FLAGGED', 'COMMERCIAL_MISUSE'];
    return flags.includes(actionCode);
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2>Inspector Authority Dashboard</h2>
        <button 
          onClick={handleLogout} 
          style={{ padding: '8px 16px', backgroundColor: '#cc0000', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>

      {/* Target Search Box */}
      <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', marginBottom: '40px', backgroundColor: '#fcfcfc' }}>
        <h3>History Extractor</h3>
        
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '15px', alignItems: 'center', marginTop: '15px' }}>
          <div>
            <input 
              type="text" 
              value={cylinderId} 
              onChange={e => setCylinderId(e.target.value)} 
              placeholder="Input Cylinder ID..."
              style={{ padding: '8px', width: '250px' }}
            />
          </div>
          <div>
            <button 
              type="submit" 
              disabled={loading}
              style={{ padding: '10px 20px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer'}}
            >
              {loading ? 'Extracting...' : 'Search Ledger'}
            </button>
          </div>
        </form>

        {errorParse && <div style={{ color: 'red', marginTop: '15px', fontWeight: '500' }}>{errorParse}</div>}
      </div>

      {/* Structured Ledger Timeline */}
      <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
        <h3>Cylinder Lifecycle Timeline</h3>

        {historyLedger.length === 0 && !loading && !errorParse ? (
          <p style={{ color: '#666' }}>Run a search to display event history.</p>
        ) : historyLedger.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#eaeaea', borderBottom: '2px solid #ccc' }}>
                <th style={{ padding: '10px' }}>Timestamp</th>
                <th style={{ padding: '10px' }}>Action Variable</th>
                <th style={{ padding: '10px' }}>Agent ID</th>
                <th style={{ padding: '10px' }}>GPS Location</th>
              </tr>
            </thead>
            <tbody>
              {historyLedger.map((event, index) => {
                const fraudTriggered = isFraudEvent(event.action);
                
                return (
                  <tr 
                    key={event.id || index} 
                    style={{ 
                      borderBottom: '1px solid #eee', 
                      backgroundColor: fraudTriggered ? '#ffe6e6' : 'transparent' 
                    }}
                  >
                    <td style={{ padding: '10px', color: fraudTriggered ? '#cc0000' : 'inherit' }}>
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    
                    <td style={{ padding: '10px', fontWeight: fraudTriggered ? 'bold' : 'normal', color: fraudTriggered ? '#cc0000' : 'inherit' }}>
                      {event.action} {fraudTriggered && <span style={{ marginLeft: '10px', fontSize: '11px', backgroundColor: '#cc0000', color: 'white', padding: '3px 6px', borderRadius: '12px' }}>🚨 FRAUD ALERT</span>}
                    </td>

                    <td style={{ padding: '10px', color: fraudTriggered ? '#cc0000' : 'inherit' }}>
                      {event.agent_id || 'SYSTEM'}
                    </td>

                    <td style={{ padding: '10px', color: fraudTriggered ? '#cc0000' : 'inherit' }}>
                      {event.location_address ? (
                        <div>
                          <div style={{ fontWeight: '500' }}>{event.location_address}</div>
                          <div style={{ fontSize: '11px', color: fraudTriggered ? '#ff6666' : '#888', marginTop: '3px' }}>
                            {Number(event.location_lat).toFixed(4)}, {Number(event.location_lng).toFixed(4)}
                          </div>
                        </div>
                      ) : event.location_lat && event.location_lng ? (
                        `${Number(event.location_lat).toFixed(4)}, ${Number(event.location_lng).toFixed(4)}`
                      ) : (
                        'Unavailable'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
      </div>

    </div>
  );
}
