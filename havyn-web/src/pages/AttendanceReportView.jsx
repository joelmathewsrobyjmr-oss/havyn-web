import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, CalendarDays, Filter } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import Button from '../components/Button';
import GlassCard from '../components/GlassCard';

const statusColors = {
  active: 'var(--success)',
  inactive: '#9ca3af',
  discharged: '#f59e0b',
  died: 'var(--danger)'
};

const statusLabels = {
  active: 'Active',
  inactive: 'Inactive',
  discharged: 'Discharged',
  died: 'Died'
};

const AttendanceReportView = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(weekAgo.toISOString().split('T')[0]);
  }, []);

  const generateReport = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);

    try {
      const resSnap = await getDocs(query(collection(db, 'residents'), orderBy('name')));
      const allResidents = resSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Generate date range
      const dates = [];
      const current = new Date(startDate);
      const end = new Date(endDate);
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }

      // Fetch attendance for each date
      const attendanceByDate = {};
      for (const date of dates) {
        try {
          const attSnap = await getDocs(collection(db, 'attendance', date, 'records'));
          const records = {};
          attSnap.forEach(d => { records[d.id] = d.data(); });
          attendanceByDate[date] = records;
        } catch {
          attendanceByDate[date] = {};
        }
      }

      // Build report
      const report = allResidents.map(resident => {
        let presentDays = 0;
        let absentDays = 0;
        let unmarkedDays = 0;
        const dailyRecords = {};

        dates.forEach(date => {
          const record = attendanceByDate[date]?.[resident.id];
          if (record?.present === true) { presentDays++; dailyRecords[date] = 'Present'; }
          else if (record?.present === false) { absentDays++; dailyRecords[date] = 'Absent'; }
          else { unmarkedDays++; dailyRecords[date] = '--'; }
        });

        // Override for discharged/died residents
        if (resident.status === 'discharged') {
          dates.forEach(date => {
            if (dailyRecords[date] === '--') dailyRecords[date] = 'Discharged';
          });
        }
        if (resident.status === 'died') {
          dates.forEach(date => {
            if (dailyRecords[date] === '--') dailyRecords[date] = 'Died';
          });
        }

        return { ...resident, presentDays, absentDays, unmarkedDays, totalDays: dates.length, dailyRecords };
      });

      setReportData({ dates, report, attendanceByDate });
    } catch (err) {
      console.error('Error generating report:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredReport = () => {
    if (!reportData) return [];
    return reportData.report.filter(r => statusFilter === 'all' || r.status === statusFilter);
  };

  // Detailed CSV with per-day attendance
  const downloadCSV = () => {
    if (!reportData) return;
    const filtered = getFilteredReport();
    const { dates } = reportData;

    // Header: Name, Phone, Status, each date, Present Days, Absent Days, Attendance %
    const dateHeaders = dates.map(d => {
      const dt = new Date(d + 'T00:00:00');
      return `${dt.getDate()}/${dt.getMonth() + 1}`;
    });
    const header = ['Name', 'Phone', 'Status', ...dateHeaders, 'Present', 'Absent', 'Unmarked', 'Attendance %'];

    const rows = filtered.map(r => {
      const pct = r.totalDays > 0 ? ((r.presentDays / r.totalDays) * 100).toFixed(1) + '%' : '0%';
      const dailyCells = dates.map(d => r.dailyRecords[d] || '--');
      return [r.name || '', r.phone || '', statusLabels[r.status] || r.status, ...dailyCells, r.presentDays, r.absentDays, r.unmarkedDays, pct];
    });

    const csv = [header, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filtered = getFilteredReport();

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.5s ease-out' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={() => navigate(-1)} style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.5rem' }}>Attendance Report</h2>
      </div>

      {/* Date Range */}
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
        <Button variant="primary" fullWidth onClick={generateReport} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Generating...
            </span>
          ) : 'Generate Report'}
        </Button>
      </GlassCard>

      {reportData && (
        <>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <Filter size={16} color="var(--text-muted)" />
            {['all', 'active', 'inactive', 'discharged', 'died'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{
                  padding: '4px 12px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '600',
                  textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
                  border: statusFilter === s ? 'none' : '1px solid var(--border)',
                  background: statusFilter === s ? (s === 'all' ? 'var(--primary)' : (statusColors[s] || 'var(--primary)')) : 'transparent',
                  color: statusFilter === s ? 'white' : 'var(--text-muted)',
                  transition: 'var(--transition)'
                }}>
                {s}
              </button>
            ))}
          </div>

          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <GlassCard style={{ padding: '0.75rem', textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)' }}>{filtered.reduce((s, r) => s + r.presentDays, 0)}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '500' }}>Present</p>
            </GlassCard>
            <GlassCard style={{ padding: '0.75rem', textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--danger)' }}>{filtered.reduce((s, r) => s + r.absentDays, 0)}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '500' }}>Absent</p>
            </GlassCard>
            <GlassCard style={{ padding: '0.75rem', textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#9ca3af' }}>{filtered.reduce((s, r) => s + r.unmarkedDays, 0)}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '500' }}>Unmarked</p>
            </GlassCard>
          </div>

          {/* Per-Resident Cards */}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '5rem' }}>
            {filtered.length > 0 ? filtered.map(r => {
              const pct = r.totalDays > 0 ? ((r.presentDays / r.totalDays) * 100).toFixed(0) : 0;
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
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '0.6rem', fontWeight: '600', textTransform: 'uppercase',
                          padding: '2px 6px', borderRadius: '999px',
                          backgroundColor: statusColors[r.status] || 'var(--success)', color: 'white'
                        }}>{r.status}</span>
                        {r.phone && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.phone}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '1.25rem', fontWeight: '700', color: Number(pct) >= 75 ? 'var(--success)' : Number(pct) >= 50 ? '#f59e0b' : 'var(--danger)' }}>{pct}%</p>
                    </div>
                  </div>
                  {/* Mini daily grid */}
                  <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                    {reportData.dates.map(date => {
                      const val = r.dailyRecords[date];
                      const bg = val === 'Present' ? 'var(--success)' 
                        : val === 'Absent' ? 'var(--danger)' 
                        : val === 'Discharged' ? '#f59e0b'
                        : val === 'Died' ? '#6b7280'
                        : '#e5e7eb';
                      const dt = new Date(date + 'T00:00:00');
                      return (
                        <div key={date} title={`${dt.getDate()}/${dt.getMonth()+1}: ${val}`}
                          style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: bg, opacity: 0.8, cursor: 'default' }} />
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '0.5rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    <span>🟢 {r.presentDays}P</span>
                    <span>🔴 {r.absentDays}A</span>
                    <span>⬜ {r.unmarkedDays}U</span>
                  </div>
                </GlassCard>
              );
            }) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                No residents match the selected filter.
              </div>
            )}
          </div>

          {/* Download */}
          <div style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 3rem)', maxWidth: '440px' }}>
            <Button variant="primary" fullWidth onClick={downloadCSV}>
              <Download size={18} style={{ marginRight: '8px' }} /> Download CSV Report
            </Button>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AttendanceReportView;
