import { useState, useEffect } from 'react';

const SERVER_URL = `http://${window.location.hostname}:3001`;

export default function AdminPanel({ onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${SERVER_URL}/api/admin/users`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      alert('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleResetScores = async () => {
    if (!window.confirm('Are you sure you want to reset ALL scores to 0?')) return;
    
    try {
      const res = await fetch(`${SERVER_URL}/api/admin/users/reset-scores`, {
        method: 'PUT'
      });
      if (res.ok) {
        alert('All scores have been reset to 0');
        fetchUsers();
      } else {
        alert('Failed to reset scores');
      }
    } catch (err) {
      alert('Error resetting scores');
    }
  };

  const handleDelete = async (username) => {
    if (username === 'admin') {
      alert('Cannot delete admin user');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ${username}?`)) return;
    
    try {
      const res = await fetch(`${SERVER_URL}/api/admin/users/${username}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('User deleted');
        fetchUsers();
      } else {
        alert('Failed to delete user');
      }
    } catch (err) {
      alert('Error deleting user');
    }
  };

  const handleResetPassword = async (username) => {
    const newPassword = window.prompt(`Enter new password for ${username}:`);
    if (!newPassword) return;

    try {
      const res = await fetch(`${SERVER_URL}/api/admin/users/${username}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword })
      });
      if (res.ok) {
        alert(`Password for ${username} has been reset successfully.`);
      } else {
        alert('Failed to reset password');
      }
    } catch (err) {
      alert('Error resetting password');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div className="glass-panel" style={{ width: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Admin Panel - User Management</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleResetScores} style={{ background: '#8e44ad', padding: '5px 15px' }}>Reset All Scores</button>
            <button onClick={onClose} style={{ background: '#e74c3c', padding: '5px 15px' }}>Close</button>
          </div>
        </div>

        {loading ? (
          <p>Loading users...</p>
        ) : (
          <table style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #555' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>ID</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Username</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Wins</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '10px' }}>{u.id}</td>
                  <td style={{ padding: '10px' }}>{u.username}</td>
                  <td style={{ padding: '10px' }}>{u.wins}</td>
                  <td style={{ padding: '10px', display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => handleResetPassword(u.username)}
                      style={{ padding: '5px 10px', fontSize: '0.8rem', background: '#f39c12' }}
                    >
                      Reset Password
                    </button>
                    {u.username !== 'admin' && (
                      <button 
                        onClick={() => handleDelete(u.username)}
                        style={{ padding: '5px 10px', fontSize: '0.8rem', background: '#c0392b' }}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
