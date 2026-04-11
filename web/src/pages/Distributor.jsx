import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function Distributor() {
  const navigate = useNavigate();

  // State mapping for the Data Grid
  const [assignments, setAssignments] = useState([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [tableError, setTableError] = useState('');

  // State mapping for Assignment Form creation
  const [cylinderId, setCylinderId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchAssignments = async () => {
    setTableLoading(true);
    setTableError('');
    try {
      // Mapping specifically to the distributor's ledger authority view
      const res = await api.get('/api/distributor/assignments');
      const data = Array.isArray(res.data) ? res.data : (res.data?.assignments || []);
      setAssignments(data);
    } catch (err) {
      setTableError(err.response?.data?.error || 'Failed to fetch assignment list from the backend.');
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!cylinderId || !agentId) {
      setFormError('Cylinder ID and Agent ID cannot be empty.');
      return;
    }

    setFormLoading(true);
    setFormError('');
    setFormSuccess('');

    try {
      await api.post('/api/assign-cylinder', {
        cylinder_id: cylinderId,
        agent_id: agentId
      });

      setFormSuccess(`Cylinder ${cylinderId} explicitly bound to Agent ${agentId}.`);
      setCylinderId('');
      setAgentId('');
      
      // Auto-trigger grid table refresh natively to prove real-time binding
      fetchAssignments();
      
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || '';
      const status = error.response?.status;
      
      // Explicit duplicate guard constraint natively overriding generic UI alerts
      if (status === 409 || msg.toLowerCase().includes('already') || msg.toLowerCase().includes('assigned')) {
        setFormError('Rejection: Cylinder is already assigned to an active route.');
      } else {
        setFormError(msg || 'Assignment failed. Check fraud logs or server constraints.');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Network failure during explicit server-side logout.');
    }
    localStorage.clear();
    navigate('/');
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2>Distributor Dashboard</h2>
        <button 
          onClick={handleLogout} 
          style={{ padding: '8px 16px', backgroundColor: '#cc0000', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>

      {/* Assignment Generator Panel */}
      <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', marginBottom: '40px' }}>
        <h3>Assign New Cylinder</h3>
        
        {formError && <div style={{ color: 'red', marginBottom: '10px' }}>{formError}</div>}
        {formSuccess && <div style={{ color: 'green', marginBottom: '10px' }}>{formSuccess}</div>}

        <form onSubmit={handleAssignSubmit} style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Cylinder ID</label>
            <input 
              type="text" 
              value={cylinderId} 
              onChange={e => setCylinderId(e.target.value)} 
              placeholder="e.g. CYL-001"
              style={{ padding: '8px', width: '150px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Agent ID</label>
            <input 
              type="number" 
              value={agentId} 
              onChange={e => setAgentId(e.target.value)} 
              placeholder="e.g. 3"
              style={{ padding: '8px', width: '150px' }}
            />
          </div>
          <div style={{ marginTop: '22px' }}>
            <button 
              type="submit" 
              disabled={formLoading}
              style={{ padding: '10px 20px', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: formLoading ? 'not-allowed' : 'pointer'}}
            >
              {formLoading ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </form>
      </div>

      {/* Data Visualization Block */}
      <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3>Active Assigment Ledger</h3>
          <button onClick={fetchAssignments} style={{ padding: '6px 12px', fontSize: '12px' }}>Refresh</button>
        </div>

        {tableError && <div style={{ color: 'red', marginBottom: '10px' }}>{tableError}</div>}

        {tableLoading ? (
          <p>Loading assignments...</p>
        ) : assignments.length === 0 ? (
          <p>No active assignments explicitly found for this distributor domain.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '10px' }}>Cylinder ID</th>
                <th style={{ padding: '10px' }}>Agent ID</th>
                <th style={{ padding: '10px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((item, index) => (
                <tr key={item.id || index} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>{item.cylinder_id}</td>
                  <td style={{ padding: '10px' }}>{item.agent_id}</td>
                  <td style={{ padding: '10px' }}>{item.status || 'ASSIGNED'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
