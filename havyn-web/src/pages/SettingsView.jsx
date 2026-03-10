import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Building2, Shield, Database, Moon, Sun, LogOut, ChevronRight, Save, Loader2, Info, Trash2, Download } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

const API_URL = 'http://localhost:3001';

const SettingsView = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [activeSection, setActiveSection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Organization settings
  const [orgSettings, setOrgSettings] = useState({
    orgName: 'HAVYN Care Home',
    orgAddress: '',
    orgPhone: '',
    orgEmail: ''
  });

  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Theme
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'organization'));
      if (snap.exists()) setOrgSettings(prev => ({ ...prev, ...snap.data() }));
    } catch (err) { console.error('Error loading settings:', err); }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // Save org settings
  const saveOrgSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'organization'), orgSettings, { merge: true });
      showMessage('Organization settings saved!');
    } catch (err) {
      showMessage('Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('Passwords do not match.', 'error');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      showMessage('Password must be at least 6 characters.', 'error');
      return;
    }
    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, passwordData.newPassword);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showMessage('Password updated successfully!');
    } catch (err) {
      showMessage(err.code === 'auth/wrong-password' ? 'Current password is incorrect.' : 'Failed to change password.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Export data
  const handleExportData = async () => {
    setSaving(true);
    try {
      const { collection: col, getDocs } = await import('firebase/firestore');
      const residentsSnap = await getDocs(col(db, 'residents'));
      const residents = residentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const data = { exportedAt: new Date().toISOString(), residents };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `havyn_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage('Data exported successfully!');
    } catch (err) {
      showMessage('Export failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Clear server uploads
  const handleClearUploads = async () => {
    if (!window.confirm('This will delete ALL uploaded documents from the server. This cannot be undone. Continue?')) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/documents`);
      const data = await res.json();
      if (data.success) {
        for (const doc of data.documents) {
          await fetch(`${API_URL}/api/documents/${doc.id}`, { method: 'DELETE' });
        }
      }
      showMessage('All uploaded documents cleared.');
    } catch (err) {
      showMessage('Failed to clear uploads.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/role');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const menuItems = [
    { key: 'org', icon: Building2, title: 'Organization', desc: 'Care home name, address, contact', color: '#3b82f6' },
    { key: 'security', icon: Shield, title: 'Security', desc: 'Change password', color: '#8b5cf6' },
    { key: 'data', icon: Database, title: 'Data Management', desc: 'Export, backup & clear data', color: '#16a34a' },
    { key: 'about', icon: Info, title: 'About', desc: 'App version & info', color: '#6b7280' },
  ];

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)', background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(10px)', fontSize: '0.9rem', outline: 'none',
    fontFamily: 'var(--font-sans)', boxSizing: 'border-box', marginBottom: '0.75rem'
  };

  const labelStyle = {
    fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-muted)',
    display: 'block', marginBottom: '0.3rem'
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.5s ease-out' }}>

      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>Settings</h2>

      {/* Message Toast */}
      {message.text && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem',
          backgroundColor: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
          color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
          border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          fontSize: '0.875rem', fontWeight: '500', animation: 'fadeIn 0.3s ease-out'
        }}>
          {message.text}
        </div>
      )}

      {/* Account Card */}
      <GlassCard style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{
          width: '50px', height: '50px', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary), #818cf8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: '700', fontSize: '1.25rem'
        }}>
          {user?.email?.charAt(0)?.toUpperCase() || 'A'}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: '600', fontSize: '1rem' }}>{user?.displayName || user?.email?.split('@')[0] || 'User'}</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user?.email || 'admin@havyn.com'}</p>
        </div>
      </GlassCard>

      {/* Menu or Active Section */}
      {!activeSection ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {menuItems.map(item => (
            <GlassCard key={item.key} onClick={() => setActiveSection(item.key)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', cursor: 'pointer', transition: 'var(--transition)' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: 'var(--radius-md)',
                background: `${item.color}15`, display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0
              }}>
                <item.icon size={20} color={item.color} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{item.title}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.desc}</p>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </GlassCard>
          ))}

          {/* Logout */}
          <GlassCard onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', cursor: 'pointer', marginTop: '0.5rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LogOut size={20} color="var(--danger)" />
            </div>
            <p style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--danger)' }}>Log Out</p>
          </GlassCard>
        </div>
      ) : (
        <div>
          {/* Back to menu */}
          <button onClick={() => setActiveSection(null)}
            style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600', marginBottom: '1rem', cursor: 'pointer', background: 'none', border: 'none' }}>
            ← Back to Settings
          </button>

          {/* Organization */}
          {activeSection === 'org' && (
            <GlassCard style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>🏠 Organization</h3>
              <label style={labelStyle}>Care Home Name</label>
              <input style={inputStyle} value={orgSettings.orgName}
                onChange={(e) => setOrgSettings(p => ({ ...p, orgName: e.target.value }))} placeholder="e.g. HAVYN Care Home" />
              <label style={labelStyle}>Address</label>
              <input style={inputStyle} value={orgSettings.orgAddress}
                onChange={(e) => setOrgSettings(p => ({ ...p, orgAddress: e.target.value }))} placeholder="123 Care Street, City" />
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} value={orgSettings.orgPhone}
                onChange={(e) => setOrgSettings(p => ({ ...p, orgPhone: e.target.value }))} placeholder="+91 99999 00000" />
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} value={orgSettings.orgEmail}
                onChange={(e) => setOrgSettings(p => ({ ...p, orgEmail: e.target.value }))} placeholder="info@havyn.org" />
              <Button variant="primary" fullWidth onClick={saveOrgSettings} disabled={saving} style={{ marginTop: '0.5rem', opacity: saving ? 0.7 : 1 }}>
                {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite', marginRight: '6px' }} /> Saving...</> : <><Save size={16} style={{ marginRight: '6px' }} /> Save Changes</>}
              </Button>
            </GlassCard>
          )}

          {/* Security */}
          {activeSection === 'security' && (
            <GlassCard style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>🔒 Change Password</h3>
              <label style={labelStyle}>Current Password</label>
              <input style={inputStyle} type="password" value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(p => ({ ...p, currentPassword: e.target.value }))} placeholder="Enter current password" />
              <label style={labelStyle}>New Password</label>
              <input style={inputStyle} type="password" value={passwordData.newPassword}
                onChange={(e) => setPasswordData(p => ({ ...p, newPassword: e.target.value }))} placeholder="Enter new password" />
              <label style={labelStyle}>Confirm New Password</label>
              <input style={inputStyle} type="password" value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))} placeholder="Confirm new password" />
              <Button variant="primary" fullWidth onClick={handleChangePassword} disabled={saving} style={{ marginTop: '0.5rem', opacity: saving ? 0.7 : 1 }}>
                {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite', marginRight: '6px' }} /> Updating...</> : 'Update Password'}
              </Button>
            </GlassCard>
          )}

          {/* Data Management */}
          {activeSection === 'data' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <GlassCard style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>📦 Export Data</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Download all resident data as a JSON backup file.
                </p>
                <Button variant="primary" fullWidth onClick={handleExportData} disabled={saving}>
                  <Download size={16} style={{ marginRight: '6px' }} /> Export Residents Data
                </Button>
              </GlassCard>
              <GlassCard style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--danger)' }}>🗑️ Clear Uploaded Documents</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Delete all files from the Documents section. Resident photos are not affected.
                </p>
                <Button variant="outline" fullWidth onClick={handleClearUploads} disabled={saving}
                  style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                  <Trash2 size={16} style={{ marginRight: '6px' }} /> Clear All Documents
                </Button>
              </GlassCard>
            </div>
          )}

          {/* About */}
          {activeSection === 'about' && (
            <GlassCard style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🪶</div>
              <h3 style={{ fontSize: '1.5rem', fontFamily: 'serif', letterSpacing: '0.05em' }}>HAVYN</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Resident Care Management</p>
              <div style={{ textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span>Version</span><span style={{ fontWeight: '600', color: 'var(--text)' }}>1.0.0</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span>Built With</span><span style={{ fontWeight: '600', color: 'var(--text)' }}>React + Vite</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span>Backend</span><span style={{ fontWeight: '600', color: 'var(--text)' }}>Express + Firebase</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0' }}>
                  <span>Server Status</span>
                  <ServerStatus />
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

// Mini component to show live server status
const ServerStatus = () => {
  const [status, setStatus] = useState('checking');
  useEffect(() => {
    fetch(`${API_URL}/api/health`).then(r => r.json())
      .then(() => setStatus('online'))
      .catch(() => setStatus('offline'));
  }, []);
  return (
    <span style={{ fontWeight: '600', color: status === 'online' ? 'var(--success)' : status === 'offline' ? 'var(--danger)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: status === 'online' ? 'var(--success)' : status === 'offline' ? 'var(--danger)' : '#9ca3af' }} />
      {status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : '...'}
    </span>
  );
};

export default SettingsView;
