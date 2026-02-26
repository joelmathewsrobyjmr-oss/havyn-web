import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Loader2, Download, CalendarDays, Filter } from 'lucide-react';
import { collection, getDocs, doc, setDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import Button from '../components/Button';
import GlassCard from '../components/GlassCard';

const statusColors = {
  active: 'var(--success)',
  inactive: '#9ca3af',
  discharged: '#f59e0b',
  died: 'var(--danger)'
};

/* ─────────── Attendance Row ─────────── */
const AttendanceRow = ({ resident, onToggle }) => (
  <GlassCard style={{ display: 'flex', alignItems: 'center', padding: '1rem', marginBottom: '0.75rem' }}>
    <div style={{
      width: '40px', height: '40px', borderRadius: '50%',
      backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: '600', marginRight: '1rem', flexShrink: 0, overflow: 'hidden',
      border: `2px solid ${statusColors[resident.status] || 'var(--primary-light)'}`
    }}>
      {resident.profileImage ? (
        <img src={resident.profileImage} alt={resident.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (resident.name?.charAt(0) || '?')}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <h4 style={{ fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{resident.name}</h4>
    </div>
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button onClick={() => onToggle(resident.id, true)}
        style={{
          width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
          backgroundColor: resident.present === true ? 'var(--success)' : 'var(--surface)',
          color: resident.present === true ? 'white' : 'var(--text-muted)',
          border: `1px solid ${resident.present === true ? 'var(--success)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'var(--transition)', cursor: 'pointer'
        }}>
        <Check size={20} />
      </button>
      <button onClick={() => onToggle(resident.id, false)}
        style={{
          width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
          backgroundColor: resident.present === false ? 'var(--danger)' : 'var(--surface)',
          color: resident.present === false ? 'white' : 'var(--text-muted)',
          border: `1px solid ${resident.present === false ? 'var(--danger)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'var(--transition)', cursor: 'pointer'
        }}>
        <X size={20} />
      </button>
    </div>
  </GlassCard>
);

/* ─────────── Main View ─────────── */
const AttendanceView = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('mark'); // 'mark' | 'report'

  // ── Mark tab state ──
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const todayKey = new Date().toISOString().split('T')[0];

  // ── Report tab state ──
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadResidents();
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(weekAgo.toISOString().split('T')[0]);
  }, []);

  /* ── Mark Attendance helpers ── */
  const loadResidents = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'residents'), orderBy('name'));
      const snapshot = await getDocs(q);
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data(), present: null }));
      const attSnap = await getDocs(collection(db, 'attendance', todayKey, 'records'));
      const attMap = {};
      attSnap.forEach(d => { attMap[d.id] = d.data().present; });
      const merged = all.map(r => ({ ...r, present: attMap[r.id] !== undefined ? attMap[r.id] : null }));
      setResidents(merged);
    } catch (err) {
      console.error('Error loading attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id, present) => {
    setResidents(prev => prev.map(r => r.id === id ? { ...r, present } : r));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = residents.map(r => {
        if (r.present !== null) {
          return setDoc(doc(db, 'attendance', todayKey, 'records', r.id), {
            name: r.name, present: r.present, timestamp: new Date().toISOString()
          });
        }
        return null;
      }).filter(Boolean);
      await Promise.all(promises);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error saving attendance:', err);
    } finally {
      setSaving(false);
    }
  };

  const markedCount = residents.filter(r => r.present !== null).length;

  /* ── Report helpers ── */
  const generateReport = async () => {
    if (!startDate || !endDate) return;
    setReportLoading(true);
    try {
      const resSnap = await getDocs(query(collection(db, 'residents'), orderBy('name')));
      const allRes = resSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const dates = [];
      const cur = new Date(startDate);
      const end = new Date(endDate);
      while (cur <= end) { dates.push(cur.toISOString().split('T')[0]); cur.setDate(cur.getDate() + 1); }

      const attByDate = {};
      for (const date of dates) {
        try {
          const snap = await getDocs(collection(db, 'attendance', date, 'records'));
          const recs = {};
          snap.forEach(d => { recs[d.id] = d.data(); });
          attByDate[date] = recs;
        } catch { attByDate[date] = {}; }
      }

      const report = allRes.map(r => {
        let presentDays = 0, absentDays = 0, unmarkedDays = 0;
        const daily = {};
        dates.forEach(date => {
          const rec = attByDate[date]?.[r.id];
          if (rec?.present === true) { presentDays++; daily[date] = 'Present'; }
          else if (rec?.present === false) { absentDays++; daily[date] = 'Absent'; }
          else { unmarkedDays++; daily[date] = r.status === 'discharged' ? 'Discharged' : r.status === 'died' ? 'Died' : '--'; }
        });
        return { ...r, presentDays, absentDays, unmarkedDays, totalDays: dates.length, daily };
      });
      setReportData({ dates, report });
    } catch (err) { console.error(err); }
    finally { setReportLoading(false); }
  };

  const filteredReport = reportData?.report.filter(r => statusFilter === 'all' || r.status === statusFilter) || [];

  const downloadCSV = () => {
    if (!reportData) return;
    const { dates } = reportData;
    const dh = dates.map(d => { const dt = new Date(d+'T00:00:00'); return `${dt.getDate()}/${dt.getMonth()+1}`; });
    const header = ['Name', 'Phone', 'Status', ...dh, 'Present', 'Absent', 'Unmarked', '%'];
    const rows = filteredReport.map(r => {
      const pct = r.totalDays > 0 ? ((r.presentDays/r.totalDays)*100).toFixed(1)+'%' : '0%';
      return [r.name||'', r.phone||'', r.status||'', ...dates.map(d => r.daily[d]||'--'), r.presentDays, r.absentDays, r.unmarkedDays, pct];
    });
    const csv = [header,...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `attendance_${startDate}_to_${endDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        <h2 style={{ fontSize: '1.5rem' }}>Attendance</h2>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '1.25rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
        {[{ key: 'mark', label: 'Mark Today' }, { key: 'report', label: '📊 Report' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '10px 0', fontSize: '0.85rem', fontWeight: '600',
              border: 'none', cursor: 'pointer', transition: 'var(--transition)',
              background: tab === t.key ? 'var(--primary)' : 'transparent',
              color: tab === t.key ? 'white' : 'var(--text-muted)'
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════ MARK TAB ════════ */}
      {tab === 'mark' && (
        <>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            <span style={{ float: 'right', fontWeight: '500' }}>{markedCount}/{residents.length}</span>
          </p>

          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '5rem' }}>
            {residents.length > 0 ? residents.map(r => (
              <AttendanceRow key={r.id} resident={r} onToggle={handleToggle} />
            )) : (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>No residents found.</div>
            )}
          </div>

          <div style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 3rem)', maxWidth: '440px' }}>
            <Button variant="primary" fullWidth onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
              {saving ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Saving...
                </span>
              ) : 'Save Attendance'}
            </Button>
          </div>
        </>
      )}

      {/* ════════ REPORT TAB ════════ */}
      {tab === 'report' && (
        <>
          <GlassCard style={{ marginBottom: '1rem', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <CalendarDays size={18} color="var(--primary)" />
              <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>Select Date Range</span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>From</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>To</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <Button variant="primary" fullWidth onClick={generateReport} disabled={reportLoading} style={{ opacity: reportLoading ? 0.7 : 1 }}>
              {reportLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Generating...
                </span>
              ) : 'Generate Report'}
            </Button>
          </GlassCard>

          {reportData && (
            <>
              {/* Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <Filter size={16} color="var(--text-muted)" />
                {['all','active','inactive','discharged','died'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} style={{
                    padding: '4px 12px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '600',
                    textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
                    border: statusFilter === s ? 'none' : '1px solid var(--border)',
                    background: statusFilter === s ? (s === 'all' ? 'var(--primary)' : statusColors[s] || 'var(--primary)') : 'transparent',
                    color: statusFilter === s ? 'white' : 'var(--text-muted)', transition: 'var(--transition)'
                  }}>{s}</button>
                ))}
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <GlassCard style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)' }}>{filteredReport.reduce((s,r)=>s+r.presentDays,0)}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '500' }}>Present</p>
                </GlassCard>
                <GlassCard style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--danger)' }}>{filteredReport.reduce((s,r)=>s+r.absentDays,0)}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '500' }}>Absent</p>
                </GlassCard>
                <GlassCard style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#9ca3af' }}>{filteredReport.reduce((s,r)=>s+r.unmarkedDays,0)}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '500' }}>Unmarked</p>
                </GlassCard>
              </div>

              {/* Per-Resident */}
              <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '5rem' }}>
                {filteredReport.length > 0 ? filteredReport.map(r => {
                  const pct = r.totalDays > 0 ? ((r.presentDays/r.totalDays)*100).toFixed(0) : 0;
                  return (
                    <GlassCard key={r.id} style={{ padding: '1rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '50%',
                          backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: '600', marginRight: '0.75rem', flexShrink: 0, overflow: 'hidden',
                          border: `2px solid ${statusColors[r.status] || 'var(--primary-light)'}`
                        }}>
                          {r.profileImage ? (
                            <img src={r.profileImage} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (r.name?.charAt(0)?.toUpperCase() || '?')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.125rem' }}>{r.name}</h4>
                          <span style={{ fontSize: '0.6rem', fontWeight: '600', textTransform: 'uppercase', padding: '2px 6px', borderRadius: '999px', backgroundColor: statusColors[r.status] || 'var(--success)', color: 'white' }}>{r.status}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '1.25rem', fontWeight: '700', color: Number(pct) >= 75 ? 'var(--success)' : Number(pct) >= 50 ? '#f59e0b' : 'var(--danger)' }}>{pct}%</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                        {reportData.dates.map(date => {
                          const val = r.daily[date];
                          const bg = val === 'Present' ? 'var(--success)' : val === 'Absent' ? 'var(--danger)' : val === 'Discharged' ? '#f59e0b' : val === 'Died' ? '#6b7280' : '#e5e7eb';
                          const dt = new Date(date+'T00:00:00');
                          return <div key={date} title={`${dt.getDate()}/${dt.getMonth()+1}: ${val}`} style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: bg, opacity: 0.8 }} />;
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '0.5rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        <span>🟢{r.presentDays}P</span> <span>🔴{r.absentDays}A</span> <span>⬜{r.unmarkedDays}U</span>
                      </div>
                    </GlassCard>
                  );
                }) : (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>No residents match filter.</div>
                )}
              </div>

              <div style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 3rem)', maxWidth: '440px' }}>
                <Button variant="primary" fullWidth onClick={downloadCSV}>
                  <Download size={18} style={{ marginRight: '8px' }} /> Download CSV Report
                </Button>
              </div>
            </>
          )}
        </>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AttendanceView;
