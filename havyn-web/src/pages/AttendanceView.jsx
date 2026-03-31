import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Loader2, Download, CalendarDays, Filter } from 'lucide-react';
import { collection, getDocs, doc, setDoc, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import Button from '../components/Button';
import GlassCard from '../components/GlassCard';

const statusColors = {
  active: 'var(--success)',
  inactive: '#9ca3af',
  discharged: '#f59e0b',
  died: 'var(--danger)'
};

/* ─────────── Attendance Row ─────────── */
const AttendanceRow = ({ resident, isPresent, onToggle }) => {
  const [animatePresent, setAnimatePresent] = useState(false);
  const [animateAbsent, setAnimateAbsent] = useState(false);

  const handlePresentClick = () => {
    if (isPresent !== true) {
      setAnimatePresent(true);
      setTimeout(() => setAnimatePresent(false), 1200);
    }
    onToggle(resident.id, true);
  };

  const handleAbsentClick = () => {
    if (isPresent !== false) {
      setAnimateAbsent(true);
      setTimeout(() => setAnimateAbsent(false), 1200);
    }
    onToggle(resident.id, false);
  };

  return (
    <GlassCard style={{ display: 'flex', alignItems: 'center', padding: '1rem', marginBottom: '0.75rem' }}>
      <div style={{
        width: '44px', height: '44px', borderRadius: '50%',
        backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: '600', marginRight: '1rem', flexShrink: 0, overflow: 'hidden',
        border: `2px solid ${statusColors[resident.status] || 'var(--primary-light)'}`,
        boxShadow: 'var(--shadow-sm)'
      }}>
        {resident.profileImage ? (
          <img src={resident.profileImage} alt={resident.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (resident.name?.charAt(0) || '?')}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ fontSize: '1rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{resident.name}</h4>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{resident.status}</p>
      </div>
      <div style={{ display: 'flex', gap: '0.65rem' }}>
        {/* Present Button */}
        <div style={{ position: 'relative', overflow: 'visible' }}>
          <button onClick={handlePresentClick}
            style={{
              width: '42px', height: '42px', borderRadius: 'var(--radius-md)',
              backgroundColor: isPresent === true ? 'var(--success)' : 'white',
              color: isPresent === true ? 'white' : 'var(--text-muted)',
              border: `1px solid ${isPresent === true ? 'var(--success)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s ease', cursor: 'pointer',
              boxShadow: isPresent === true ? '0 4px 12px rgba(34, 197, 94, 0.3)' : 'none',
              transform: animatePresent ? 'scale(1.1)' : 'scale(1)',
              zIndex: 2
            }}>
            <Check size={22} strokeWidth={3} style={{ transform: animatePresent ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
          </button>
          
          {animatePresent && (
            <div style={{
              position: 'absolute', top: '50%', right: '110%',
              transform: 'translateY(-50%)',
              display: 'flex', alignItems: 'center', gap: '4px',
              color: 'var(--success)', fontWeight: '800', fontSize: '0.85rem',
              backgroundColor: 'white', padding: '4px 12px', borderRadius: '999px',
              boxShadow: '0 4px 12px rgba(34,197,94,0.3)', border: '1px solid rgba(34,197,94,0.3)',
              animation: 'slideLeft 1.2s ease-out forwards', pointerEvents: 'none', zIndex: 10,
              whiteSpace: 'nowrap'
            }}>
              <Check size={14} strokeWidth={4} /> Present!
            </div>
          )}
        </div>

        {/* Absent Button */}
        <div style={{ position: 'relative', overflow: 'visible' }}>
          <button onClick={handleAbsentClick}
            style={{
              width: '42px', height: '42px', borderRadius: 'var(--radius-md)',
              backgroundColor: isPresent === false ? 'var(--danger)' : 'white',
              color: isPresent === false ? 'white' : 'var(--text-muted)',
              border: `1px solid ${isPresent === false ? 'var(--danger)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s ease', cursor: 'pointer',
              boxShadow: isPresent === false ? '0 4px 12px rgba(239, 68, 68, 0.3)' : 'none',
              transform: animateAbsent ? 'scale(1.1)' : 'scale(1)',
              zIndex: 2
            }}>
            <X size={22} strokeWidth={3} style={{ transform: animateAbsent ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
          </button>

          {animateAbsent && (
            <div style={{
              position: 'absolute', top: '50%', right: '110%',
              transform: 'translateY(-50%)',
              display: 'flex', alignItems: 'center', gap: '4px',
              color: 'var(--danger)', fontWeight: '800', fontSize: '0.85rem',
              backgroundColor: 'white', padding: '4px 12px', borderRadius: '999px',
              boxShadow: '0 4px 12px rgba(239,68,68,0.3)', border: '1px solid rgba(239,68,68,0.3)',
              animation: 'slideLeft 1.2s ease-out forwards', pointerEvents: 'none', zIndex: 10,
              whiteSpace: 'nowrap'
            }}>
              <X size={14} strokeWidth={4} /> Absent!
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
};

/* ─────────── Main View ─────────── */
const AttendanceView = () => {
  const navigate = useNavigate();
  const { institutionId, user } = useAuth();
  const [tab, setTab] = useState('mark'); // 'mark' | 'report'
  const [activeSession, setActiveSession] = useState('morning'); // 'morning' | 'evening'

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
    if (institutionId) {
      loadResidents();
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      setEndDate(today.toISOString().split('T')[0]);
      setStartDate(weekAgo.toISOString().split('T')[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  /* ── Mark Attendance helpers ── */
  const loadResidents = async () => {
    setLoading(true);
    try {
      // Fetch institution-specific residents
      const q = query(collection(db, 'institutions', institutionId, 'residents'), orderBy('name'));
      const snapshot = await getDocs(q);
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data(), present: null }));
      
      // Fetch today's records for this institution
      const attSnap = await getDocs(collection(db, 'institutions', institutionId, 'attendance', todayKey, 'records'));
      const attMap = {};
      attSnap.forEach(d => { 
        attMap[d.id] = {
          present: d.data().present,
          eveningPresent: d.data().eveningPresent
        }; 
      });
      
      const merged = all.map(r => ({ 
        ...r, 
        present: attMap[r.id] !== undefined ? attMap[r.id].present : null,
        eveningPresent: attMap[r.id] !== undefined ? attMap[r.id].eveningPresent : null
      }));
      setResidents(merged);
    } catch (err) {
      console.error('Error loading attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id, present) => {
    setResidents(prev => prev.map(r => {
      if (r.id === id) {
        if (activeSession === 'morning') return { ...r, present };
        return { ...r, eveningPresent: present };
      }
      return r;
    }));
  };

  const handleSave = async () => {
    if (!institutionId) return;
    setSaving(true);
    try {
      const promises = residents.map(r => {
        const hasMorning = r.present !== null && r.present !== undefined;
        const hasEvening = r.eveningPresent !== null && r.eveningPresent !== undefined;
        
        if (!hasMorning && !hasEvening) return null;

        const dataToSave = { 
          name: r.name, 
          updatedBy: user.uid 
        };

        if (activeSession === 'morning' && hasMorning) {
          dataToSave.present = r.present;
          dataToSave.timestamp = serverTimestamp();
        } else if (activeSession === 'evening' && hasEvening) {
          dataToSave.eveningPresent = r.eveningPresent;
          dataToSave.eveningTimestamp = serverTimestamp();
        } else {
          return null;
        }

        return setDoc(doc(db, 'institutions', institutionId, 'attendance', todayKey, 'records', r.id), dataToSave, { merge: true });
      }).filter(Boolean);
      
      await Promise.all(promises);
      
      // Log activity
      await addDoc(collection(db, 'activityLogs'), {
        institutionId,
        userId: user.uid,
        action: 'MARK_ATTENDANCE',
        session: activeSession,
        date: todayKey,
        count: residents.filter(r => activeSession === 'morning' ? (r.present !== null && r.present !== undefined) : (r.eveningPresent !== null && r.eveningPresent !== undefined)).length,
        timestamp: serverTimestamp()
      });

      navigate('/dashboard');
    } catch (err) {
      console.error('Error saving attendance:', err);
    } finally {
      setSaving(false);
    }
  };

  const markedCount = residents.filter(r => activeSession === 'morning' ? (r.present !== null && r.present !== undefined) : (r.eveningPresent !== null && r.eveningPresent !== undefined)).length;

  /* ── Report helpers ── */
  const generateReport = async () => {
    if (!startDate || !endDate || !institutionId) return;
    setReportLoading(true);
    try {
      const resSnap = await getDocs(query(collection(db, 'institutions', institutionId, 'residents'), orderBy('name')));
      const allRes = resSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const dates = [];
      const cur = new Date(startDate);
      const end = new Date(endDate);
      while (cur <= end) { dates.push(cur.toISOString().split('T')[0]); cur.setDate(cur.getDate() + 1); }

      const attByDate = {};
      // This is a bit heavy for many dates, but works for weekly/monthly
      for (const date of dates) {
        try {
          const snap = await getDocs(collection(db, 'institutions', institutionId, 'attendance', date, 'records'));
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
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = header.map(() => ({ wch: 16 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `attendance_${startDate}_to_${endDate}.xlsx`);
  };

  if (loading && tab === 'mark') {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700' }}>Attendance</h2>
        {tab === 'mark' && (
          <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '4px 12px', borderRadius: 'var(--radius-full)' }}>
            {markedCount}/{residents.length} Marked
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', p: '4px', marginBottom: '1.5rem', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', backdropFilter: 'blur(5px)' }}>
        {[{ key: 'mark', label: 'Mark Today' }, { key: 'report', label: 'Attendance Report' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '12px 0', fontSize: '0.9rem', fontWeight: '600',
              border: 'none', cursor: 'pointer', transition: 'all 0.3s ease',
              borderRadius: 'calc(var(--radius-lg) - 4px)',
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
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem' }}>
            <button onClick={() => setActiveSession('morning')} style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', background: activeSession === 'morning' ? 'var(--primary-light)' : 'white', color: activeSession === 'morning' ? 'var(--primary)' : 'var(--text-muted)', border: `1px solid ${activeSession === 'morning' ? 'var(--primary)' : 'var(--border)'}`, fontWeight: '600', transition: 'all 0.2s', cursor: 'pointer' }}>☀️ Morning</button>
            <button onClick={() => setActiveSession('evening')} style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', background: activeSession === 'evening' ? 'var(--primary-light)' : 'white', color: activeSession === 'evening' ? 'var(--primary)' : 'var(--text-muted)', border: `1px solid ${activeSession === 'evening' ? 'var(--primary)' : 'var(--border)'}`, fontWeight: '600', transition: 'all 0.2s', cursor: 'pointer' }}>🌙 Evening</button>
          </div>

          <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem', fontSize: '1rem', fontWeight: '500' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '6rem' }}>
            {residents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {residents.map(r => {
                  const isPresent = activeSession === 'morning' ? r.present : r.eveningPresent;
                  return <AttendanceRow key={r.id} resident={r} isPresent={isPresent} onToggle={handleToggle} />;
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)', opacity: 0.6 }}>
                <CalendarDays size={48} style={{ margin: '0 auto 1rem' }} />
                <p>No residents found to mark attendance.</p>
              </div>
            )}
          </div>

          <div style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 3rem)', maxWidth: '480px', zIndex: 100 }}>
            <Button variant="primary" fullWidth onClick={handleSave} disabled={saving} style={{ 
              boxShadow: '0 8px 16px rgba(var(--primary-rgb), 0.3)',
              padding: '16px 0', fontSize: '1rem'
            }}>
              {saving ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Processing...
                </span>
              ) : `Submit ${activeSession === 'morning' ? 'Morning' : 'Evening'} Attendance`}
            </Button>
          </div>
        </>
      )}

      {/* ════════ REPORT TAB ════════ */}
      {tab === 'report' && (
        <>
          <GlassCard style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <CalendarDays size={20} color="var(--primary)" />
              <span style={{ fontSize: '1rem', fontWeight: '700' }}>Analysis Period</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <Button variant="primary" fullWidth onClick={generateReport} disabled={reportLoading} style={{ padding: '14px 0' }}>
              {reportLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Generating Analysis...
                </span>
              ) : 'Run Analysis'}
            </Button>
          </GlassCard>

          {reportData && (
            <>
              {/* Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', padding: '0 4px' }}>
                <Filter size={16} color="var(--text-muted)" style={{ marginRight: '4px' }} />
                {['all','active','inactive','discharged','died'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} style={{
                    padding: '6px 14px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600',
                    textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
                    border: statusFilter === s ? 'none' : '1px solid var(--border)',
                    background: statusFilter === s ? (s === 'all' ? 'var(--primary)' : statusColors[s] || 'var(--primary)') : 'white',
                    color: statusFilter === s ? 'white' : 'var(--text-muted)', transition: 'all 0.2s ease'
                  }}>{s}</button>
                ))}
              </div>
pre
              {/* Stats Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'white', padding: '1.25rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', border: '1px solid var(--border)', borderBottom: '4px solid var(--success)' }}>
                  <p style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--success)', marginBottom: '4px' }}>{filteredReport.reduce((s,r)=>s+r.presentDays,0)}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Present</p>
                </div>
                <div style={{ background: 'white', padding: '1.25rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', border: '1px solid var(--border)', borderBottom: '4px solid var(--danger)' }}>
                  <p style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--danger)', marginBottom: '4px' }}>{filteredReport.reduce((s,r)=>s+r.absentDays,0)}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Absent</p>
                </div>
                <div style={{ background: 'white', padding: '1.25rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', border: '1px solid var(--border)', borderBottom: '4px solid #cbd5e1' }}>
                  <p style={{ fontSize: '1.75rem', fontWeight: '800', color: '#64748b', marginBottom: '4px' }}>{filteredReport.reduce((s,r)=>s+r.unmarkedDays,0)}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Unmarked</p>
                </div>
              </div>

              {/* Per-Resident Analysis */}
              <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '6rem' }}>
                {filteredReport.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filteredReport.map(r => {
                      const pct = r.totalDays > 0 ? ((r.presentDays/r.totalDays)*100).toFixed(0) : 0;
                      return (
                        <GlassCard key={r.id} style={{ padding: '1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                            <div style={{
                              width: '44px', height: '44px', borderRadius: '50%',
                              backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: '600', marginRight: '1rem', flexShrink: 0, overflow: 'hidden',
                              border: `2px solid ${statusColors[r.status] || 'var(--primary'}`
                            }}>
                              {r.profileImage ? (
                                <img src={r.profileImage} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (r.name?.charAt(0)?.toUpperCase() || '?')}
                            </div>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '2px' }}>{r.name}</h4>
                              <span style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '999px', backgroundColor: statusColors[r.status] || 'var(--success)', color: 'white' }}>{r.status}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ fontSize: '1.5rem', fontWeight: '800', color: Number(pct) >= 75 ? 'var(--success)' : Number(pct) >= 50 ? '#f59e0b' : 'var(--danger)' }}>{pct}%</p>
                              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Attendance</p>
                            </div>
                          </div>
                          
                          {/* Calendar View */}
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                            {reportData.dates.map(date => {
                              const val = r.daily[date];
                              const bg = val === 'Present' ? 'var(--success)' : val === 'Absent' ? 'var(--danger)' : val === 'Discharged' ? '#f59e0b' : val === 'Died' ? '#6b7280' : '#e5e7eb';
                              const dt = new Date(date+'T00:00:00');
                              return <div key={date} title={`${dt.getDate()}/${dt.getMonth()+1}: ${val}`} style={{ width: '22px', height: '22px', borderRadius: '5px', backgroundColor: bg, transition: 'transform 0.2s', cursor: 'help' }} className="hover:scale-110" />;
                            })}
                          </div>
                          
                          <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', fontWeight: '600' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--success)'}}></div> {r.presentDays} Present</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--danger)'}}></div> {r.absentDays} Absent</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{width: 8, height: 8, borderRadius: '50%', backgroundColor: '#e5e7eb'}}></div> {r.unmarkedDays} Unmarked</span>
                          </div>
                        </GlassCard>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>No records found for the selected status.</div>
                )}
              </div>

              <div style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 3rem)', maxWidth: '480px', zIndex: 100 }}>
                <Button variant="outline" fullWidth onClick={downloadCSV} style={{ backgroundColor: 'white', border: '2px solid var(--primary)', color: 'var(--primary)', padding: '14px 0', fontSize: '1rem' }}>
                  <Download size={20} style={{ marginRight: '10px' }} /> Export as CSV Report
                </Button>
              </div>
            </>
          )}
        </>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideLeft {
          0%   { opacity: 0; transform: translateY(-50%) translateX(0) scale(0.8); }
          20%  { opacity: 1; transform: translateY(-50%) translateX(-12px) scale(1.05); }
          60%  { opacity: 1; transform: translateY(-50%) translateX(-20px) scale(1); }
          100% { opacity: 0; transform: translateY(-50%) translateX(-36px) scale(0.9); }
        }
      `}</style>
    </div>
  );
};

export default AttendanceView;
