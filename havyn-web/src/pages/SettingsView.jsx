import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Building2, Shield, Database, Moon, Sun, LogOut, ChevronRight, Save, Loader2, Info, Trash2, Download, QrCode } from 'lucide-react';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db, auth, storage } from '../firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

const SettingsView = () => {
  const navigate = useNavigate();
  const { user, logout, institutionId, userData } = useAuth();

  const [activeSection, setActiveSection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Organization settings
  const [orgSettings, setOrgSettings] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    district: '',
    upiId: '',
    about: '',
    bankDetails: {
      bankName: '',
      accountName: '',
      accountNumber: '',
      ifsc: ''
    }
  });

  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (institutionId) loadSettings();
  }, [institutionId]);

  const loadSettings = async () => {
    try {
      const snap = await getDoc(doc(db, 'institutions', institutionId));
      if (snap.exists()) {
        const data = snap.data();
        setOrgSettings({
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          district: data.district || '',
          upiId: data.upiId || '',
          about: data.about || '',
          bankDetails: data.bankDetails || {
            bankName: '',
            accountName: '',
            accountNumber: '',
            ifsc: ''
          }
        });
      }
    } catch (err) { console.error('Error loading settings:', err); }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const saveOrgSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'institutions', institutionId), orgSettings, { merge: true });
      showMessage('Institution profile updated successfully!');
    } catch (err) {
      showMessage('Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

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
      showMessage('Account security updated. Next login will require the new password.');
    } catch (err) {
      showMessage(err.code === 'auth/wrong-password' ? 'Current password is incorrect.' : 'Security update failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    setSaving(true);
    try {
      const residentsSnap = await getDocs(collection(db, 'institutions', institutionId, 'residents'));
      const residents = residentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const attendanceSnap = await getDocs(collection(db, 'institutions', institutionId, 'attendance'));
      // Note: Attendance records are nested by date, a full export would be complex. 
      // This exports the top level metadata.
      
      const data = { 
        exportedAt: new Date().toISOString(), 
        institutionId,
        institutionName: orgSettings.name,
        residents 
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `havyn_export_${orgSettings.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage('Institutional data backup generated.');
    } catch (err) {
      showMessage('Export failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      try {
        await logout();
        navigate('/role');
      } catch (err) {
        console.error('Logout failed:', err);
      }
    }
  };

  const menuItems = [
    { key: 'org', icon: Building2, title: 'Institution Profile', desc: 'Name, contact, and about info', color: '#3b82f6' },
    { key: 'bank', icon: QrCode, title: 'Donation Settings', desc: 'UPI ID and bank details for donors', color: '#ec4899' },
    { key: 'security', icon: Shield, title: 'Account Security', desc: 'Manage your admin credentials', color: '#8b5cf6' },
    { key: 'data', icon: Database, title: 'Data & Privacy', desc: 'Export datasets or clear history', color: '#16a34a' },
    { key: 'about', icon: Info, title: 'Software Info', desc: 'System status and versioning', color: '#6b7280' },
  ];

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)', background: 'white',
    fontSize: '0.95rem', outline: 'none',
    fontFamily: 'var(--font-sans)', boxSizing: 'border-box', marginBottom: '1.25rem',
    transition: 'border-color 0.2s'
  };

  const labelStyle = {
    fontSize: '0.85rem', fontWeight: '700', color: 'var(--text)',
    display: 'block', marginBottom: '0.5rem'
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease-out', maxWidth: '800px', margin: '0 auto', width: '100%' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>Settings</h1>
      </div>

      {message.text && (
        <div style={{
          padding: '1rem', borderRadius: 'var(--radius-md)',
          backgroundColor: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
          color: message.type === 'error' ? '#dc2626' : '#16a34a',
          border: `1px solid ${message.type === 'error' ? '#fee2e2' : '#dcfce7'}`,
          fontSize: '0.9rem', fontWeight: '600', animation: 'fadeIn 0.3s ease-out'
        }}>
          {message.text}
        </div>
      )}

      {!activeSection ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Admin Header */}
          <GlassCard style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem', background: 'linear-gradient(135deg, white, #f8fafc)' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: 'var(--radius-lg)', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '1.5rem' }}>
              {userData?.adminName?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>{userData?.adminName || 'Institution Admin'}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user?.email}</p>
            </div>
          </GlassCard>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {menuItems.map(item => (
              <GlassCard key={item.key} onClick={() => setActiveSection(item.key)}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', cursor: 'pointer', transition: 'transform 0.2s' }} className="hover:scale-[1.02]">
                <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: `${item.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.icon size={22} color={item.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: '700', fontSize: '1rem' }}>{item.title}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.desc}</p>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" />
              </GlassCard>
            ))}
          </div>

          <Button variant="outline-danger" onClick={handleLogout} style={{ marginTop: '1rem', height: '52px', fontSize: '1rem', width: '100%' }}>
            <LogOut size={20} /> Log Out from Portal
          </Button>
        </div>
      ) : (
        <div>
          <button onClick={() => setActiveSection(null)}
            style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '700', marginBottom: '1.5rem', cursor: 'pointer', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /> Return to Settings
          </button>

          {/* Institution Profile */}
          {activeSection === 'org' && (
            <GlassCard style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Building2 size={24} color="var(--primary)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Institution Profile</h3>
              </div>
              
              <label style={labelStyle}>Official Name</label>
              <input style={inputStyle} value={orgSettings.name} onChange={(e) => setOrgSettings(p => ({ ...p, name: e.target.value }))} placeholder="e.g. HAVYN Care Home" />
              
              <label style={labelStyle}>Physical Address</label>
              <input style={inputStyle} value={orgSettings.address} onChange={(e) => setOrgSettings(p => ({ ...p, address: e.target.value }))} placeholder="123 Care Street, City" />
              
              <label style={labelStyle}>Contact Number</label>
              <input style={inputStyle} value={orgSettings.phone} onChange={(e) => setOrgSettings(p => ({ ...p, phone: e.target.value }))} placeholder="+91 99999 00000" />
              
              <label style={labelStyle}>Official Email</label>
              <input style={inputStyle} value={orgSettings.email} onChange={(e) => setOrgSettings(p => ({ ...p, email: e.target.value }))} placeholder="info@havyn.org" />

              <label style={labelStyle}>Administrative District</label>
              <select 
                style={inputStyle} 
                value={orgSettings.district || ''} 
                onChange={(e) => setOrgSettings(p => ({ ...p, district: e.target.value }))}
              >
                <option value="" disabled>Select District</option>
                {['Kannur', 'Kozhikode', 'Ernakulam', 'Thrissur', 'Thiruvananthapuram', 'Malappuram', 'Palakkad', 'Kollam', 'Alappuzha', 'Kottayam', 'Idukki', 'Pathanamthitta', 'Wayanad', 'Kasaragod'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <label style={labelStyle}>About the Institution</label>
              <textarea 
                style={{ ...inputStyle, height: '120px', resize: 'none' }} 
                value={orgSettings.about} 
                onChange={(e) => setOrgSettings(p => ({ ...p, about: e.target.value }))} 
                placeholder="Briefly describe your institution for potential donors..."
              />

              <Button variant="primary" fullWidth onClick={saveOrgSettings} disabled={saving}
                style={{ 
                  padding: '18px 0', fontSize: '1.05rem', fontWeight: '800',
                  boxShadow: '0 8px 20px rgba(92, 203, 244, 0.35)',
                  letterSpacing: '0.02em'
                }}>
                {saving ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <><Save size={20} /> Update Institution Profile</>}
              </Button>
            </GlassCard>
          )}

          {/* Donation Settings */}
          {activeSection === 'bank' && (
            <GlassCard style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <QrCode size={24} color="#ec4899" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Donation Setup</h3>
              </div>
              
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Provide payment details for viewers to contribute financially. This info is visible to all registered viewers.
              </p>

              <label style={labelStyle}>UPI ID (for instant transfers)</label>
              <input style={inputStyle} value={orgSettings.upiId} onChange={(e) => setOrgSettings(p => ({ ...p, upiId: e.target.value }))} placeholder="e.g. institution@upi" />

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                <label style={labelStyle}>Bank Name</label>
                <input style={inputStyle} value={orgSettings.bankDetails.bankName} onChange={(e) => setOrgSettings(p => ({ ...p, bankDetails: { ...p.bankDetails, bankName: e.target.value } }))} placeholder="e.g. HDFC Bank" />
                
                <label style={labelStyle}>Account Holder Name</label>
                <input style={inputStyle} value={orgSettings.bankDetails.accountName} onChange={(e) => setOrgSettings(p => ({ ...p, bankDetails: { ...p.bankDetails, accountName: e.target.value } }))} placeholder="Exact name as in bank" />
                
                <label style={labelStyle}>Account Number</label>
                <input style={inputStyle} value={orgSettings.bankDetails.accountNumber} onChange={(e) => setOrgSettings(p => ({ ...p, bankDetails: { ...p.bankDetails, accountNumber: e.target.value } }))} placeholder="Bank account number" />
                
                <label style={labelStyle}>IFSC Code</label>
                <input style={inputStyle} value={orgSettings.bankDetails.ifsc} onChange={(e) => setOrgSettings(p => ({ ...p, bankDetails: { ...p.bankDetails, ifsc: e.target.value } }))} placeholder="Bank IFSC" />
              </div>

              <Button variant="primary" fullWidth onClick={saveOrgSettings} disabled={saving}
                style={{ 
                  padding: '18px 0', fontSize: '1.05rem', fontWeight: '800',
                  background: 'linear-gradient(135deg, #ec4899, #db2777)',
                  borderColor: '#ec4899',
                  boxShadow: '0 8px 20px rgba(236, 72, 153, 0.4)'
                }}>
                {saving ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <><QrCode size={20} /> Save Donation Details</>}
              </Button>
            </GlassCard>
          )}

          {/* Account Security */}
          {activeSection === 'security' && (
            <GlassCard style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Shield size={24} color="#8b5cf6" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Account Security</h3>
              </div>
              
              <label style={labelStyle}>Current Master Password</label>
              <input style={inputStyle} type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData(p => ({ ...p, currentPassword: e.target.value }))} placeholder="Confirm identity" />
              
              <label style={labelStyle}>New Admin Password</label>
              <input style={inputStyle} type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData(p => ({ ...p, newPassword: e.target.value }))} placeholder="Minimum 6 characters" />
              
              <label style={labelStyle}>Verify New Password</label>
              <input style={inputStyle} type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))} placeholder="Re-type new password" />
              
              <Button variant="primary" fullWidth onClick={handleChangePassword} disabled={saving}
                style={{ 
                  padding: '18px 0', fontSize: '1.05rem', fontWeight: '800',
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  borderColor: '#8b5cf6',
                  boxShadow: '0 8px 20px rgba(139, 92, 246, 0.4)'
                }}>
                {saving ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <><Shield size={20} /> Update Secure Credentials</>}
              </Button>
            </GlassCard>
          )}

          {/* Data Management */}
          {activeSection === 'data' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <GlassCard style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <Download size={20} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Local Backup</h3>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Download all resident data from your institution as a structured JSON file for your local records.
                </p>
                <Button variant="primary" fullWidth onClick={handleExportData} disabled={saving}
                  style={{ 
                    padding: '16px 0', fontSize: '1rem', fontWeight: '800',
                    boxShadow: '0 8px 20px rgba(92, 203, 244, 0.3)'
                  }}>
                  {saving ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <><Download size={20} /> Download Resident Database</>}
                </Button>
              </GlassCard>

              <GlassCard style={{ padding: '1.5rem', border: '1px solid #fee2e2', background: '#fffcfc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <Trash2 size={20} color="var(--danger)" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--danger)' }}>Clear Audit Logs</h3>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Remove all institutional activity logs. This action is permanent and only clears logs, not core data.
                </p>
                <Button variant="outline-danger" fullWidth onClick={() => alert('Log clearing functionality available in enterprise version.')}
                  style={{ padding: '16px 0', fontSize: '1rem' }}>
                  <Trash2 size={20} /> Factory Reset Logs
                </Button>
              </GlassCard>
            </div>
          )}

          {/* About */}
          {activeSection === 'about' && (
            <GlassCard style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                  <Building2 size={40} />
                </div>
                <h3 style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em' }}>HAVYN <span style={{ color: 'var(--primary)' }}>DigiCare</span></h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Version 1.5.0 (Build 2026.03)</p>
              </div>
              
              <div style={{ textAlign: 'left', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>License</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>Administrative Standard</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Engine</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>Cloud Firestore</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>System Pulse</span>
                  <span style={{ 
                    fontSize: '0.85rem', fontWeight: '700', color: 'var(--success)',
                    display: 'flex', alignItems: 'center', gap: '5px' 
                  }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', animation: 'pulse 2s infinite' }} />
                    Operational
                  </span>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        input:focus, textarea:focus { border-color: var(--primary) !important; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
      `}</style>
    </div>
  );
};

export default SettingsView;
