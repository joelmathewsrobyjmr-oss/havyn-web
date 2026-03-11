import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, CalendarDays, Filter, PieChart, Printer } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
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
  const { institutionId } = useAuth();
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
    if (!startDate || !endDate || !institutionId) return;
    setLoading(true);

    try {
      // 1. Fetch all residents for this institution
      const resSnap = await getDocs(query(collection(db, 'institutions', institutionId, 'residents'), orderBy('name')));
      const allResidents = resSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 2. Generate date range
      const dates = [];
      const current = new Date(startDate);
      const end = new Date(endDate);
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }

      // 3. Fetch attendance records for each date (scoped to institution)
      const attendanceByDate = {};
      for (const date of dates) {
        try {
          const attSnap = await getDocs(collection(db, 'institutions', institutionId, 'attendance', date, 'records'));
          const records = {};
          attSnap.forEach(d => { records[d.id] = d.data(); });
          attendanceByDate[date] = records;
        } catch {
          attendanceByDate[date] = {};
        }
      }

      // 4. Build report data
      const report = allResidents.map(resident => {
        let presentDays = 0;
        let absentDays = 0;
        let unmarkedDays = 0;
        const dailyRecords = {};

        dates.forEach(date => {
          const record = attendanceByDate[date]?.[resident.id];
          if (record?.present === true) { 
            presentDays++; 
            dailyRecords[date] = 'Present'; 
          }
          else if (record?.present === false) { 
            absentDays++; 
            dailyRecords[date] = 'Absent'; 
          }
          else { 
            unmarkedDays++; 
            dailyRecords[date] = '--'; 
          }
        });

        // Context-aware labels for status-specific records
        if (resident.status === 'discharged' || resident.status === 'died') {
          dates.forEach(date => {
            if (dailyRecords[date] === '--') {
              dailyRecords[date] = resident.status.charAt(0).toUpperCase() + resident.status.slice(1);
            }
          });
        }

        return { ...resident, presentDays, absentDays, unmarkedDays, totalDays: dates.length, dailyRecords };
      });

      setReportData({ dates, report });
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

  const downloadCSV = () => {
    if (!reportData) return;
    const filtered = getFilteredReport();
    const { dates } = reportData;

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
    a.download = `attendance_analytics_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filtered = getFilteredReport();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.5s ease-out' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
        <button onClick={() => navigate(-1)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700' }}>Attendance Analytics</h2>
      </div>

      {/* Date Range Selection */}
      <GlassCard style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <CalendarDays size={20} color="var(--primary)" />
          <span style={{ fontSize: '1rem', fontWeight: '700' }}>Specify Report Range</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Starting Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Ending Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <Button variant="primary" fullWidth onClick={generateReport} disabled={loading} style={{ padding: '14px 0', boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.2)' }}>
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Generating Insights...
            </span>
          ) : 'Generate Full Analysis'}
        </Button>
      </GlassCard>

      {reportData && (
        <>
          {/* Dashboard Summary Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', padding: '0 4px' }}>
            <Filter size={16} color="var(--text-muted)" style={{ marginRight: '4px' }} />
            {['all', 'active', 'inactive', 'discharged', 'died'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{
                  padding: '6px 14px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600',
                  textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
                  border: statusFilter === s ? 'none' : '1px solid var(--border)',
                  background: statusFilter === s ? (s === 'all' ? 'var(--primary)' : (statusColors[s] || 'var(--primary)')) : 'white',
                  color: statusFilter === s ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.2s ease'
                }}>
                {s}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: 'white', padding: '1.25rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', border: '1px solid var(--border)', borderBottom: '4px solid var(--success)' }}>
              <p style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--success)', marginBottom: '4px' }}>{filtered.reduce((s, r) => s + r.presentDays, 0)}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Present</p>
            </div>
            <div style={{ background: 'white', padding: '1.25rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', border: '1px solid var(--border)', borderBottom: '4px solid var(--danger)' }}>
              <p style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--danger)', marginBottom: '4px' }}>{filtered.reduce((s, r) => s + r.absentDays, 0)}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Absent</p>
            </div>
            <div style={{ background: 'white', padding: '1.25rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', border: '1px solid var(--border)', borderBottom: '4px solid #cbd5e1' }}>
              <p style={{ fontSize: '1.75rem', fontWeight: '800', color: '#64748b', marginBottom: '4px' }}>{filtered.reduce((s, r) => s + r.unmarkedDays, 0)}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>No Data</p>
            </div>
          </div>

          {/* Records List */}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '6rem' }}>
            {filtered.length > 0 ? filtered.map(r => {
              const pct = r.totalDays > 0 ? ((r.presentDays / r.totalDays) * 100).toFixed(0) : 0;
              return (
                <GlassCard key={r.id} style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: '700', marginRight: '1rem', flexShrink: 0, overflow: 'hidden',
                      border: `2px solid ${statusColors[r.status] || 'var(--primary-light)'}`
                    }}>
                      {r.profileImage ? (
                        <img src={r.profileImage} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (r.name?.charAt(0)?.toUpperCase() || '?')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '2px' }}>{r.name}</h4>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase',
                          padding: '3px 8px', borderRadius: '999px',
                          backgroundColor: statusColors[r.status] || 'var(--success)', color: 'white'
                        }}>{r.status}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '1.5rem', fontWeight: '800', color: Number(pct) >= 75 ? 'var(--success)' : Number(pct) >= 50 ? '#f59e0b' : 'var(--danger)' }}>{pct}%</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Overall</p>
                    </div>
                  </div>
                  
                  {/* Daily Pulse Graph */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {reportData.dates.map(date => {
                      const val = r.dailyRecords[date];
                      const bg = val === 'Present' ? 'var(--success)' 
                        : val === 'Absent' ? 'var(--danger)' 
                        : val === 'Discharged' ? '#f59e0b'
                        : val === 'Died' ? '#6b7280'
                        : '#e2e8f0';
                      const dt = new Date(date + 'T00:00:00');
                      return (
                        <div key={date} title={`${dt.getDate()}/${dt.getMonth()+1}: ${val}`}
                          style={{ width: '22px', height: '22px', borderRadius: '5px', backgroundColor: bg, transition: 'transform 0.2s' }} 
                          className="hover:scale-110" />
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', fontWeight: '700' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--success)'}}></div> {r.presentDays} Days Present</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--danger)'}}></div> {r.absentDays} Days Absent</span>
                  </div>
                </GlassCard>
              );
            }) : (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)', opacity: 0.6 }}>
                <PieChart size={48} style={{ margin: '0 auto 1rem' }} />
                <p>No records match your current filter.</p>
              </div>
            )}
          </div>

          {/* Export Action */}
          <div className="no-print" style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 3rem)', maxWidth: '480px', zIndex: 100, display: 'flex', gap: '1rem' }}>
            <Button variant="outline" fullWidth onClick={handlePrint} style={{ backgroundColor: 'white', border: '2px solid var(--primary)', color: 'var(--primary)', padding: '14px 0', fontSize: '1rem' }}>
              <Printer size={20} style={{ marginRight: '10px' }} /> Print Report
            </Button>
            <Button variant="primary" fullWidth onClick={downloadCSV} style={{ padding: '14px 0', fontSize: '1rem' }}>
              <Download size={20} style={{ marginRight: '10px' }} /> Export CSV
            </Button>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .print-header { display: none; }

        @media print {
          .no-print { display: none !important; }
          .glass { border: none !important; box-shadow: none !important; background: white !important; }
          body { background: white !important; }
          .print-container { position: static; width: 100%; padding: 0 !important; margin: 0 !important; }
          .print-header { 
            display: block !important; 
            text-align: center; 
            margin-bottom: 2rem; 
            padding-bottom: 1rem;
            border-bottom: 2px solid #eee;
          }
          .stats-grid { 
            display: grid !important; 
            grid-template-columns: 1fr 1fr 1fr !important; 
            gap: 10px !important;
            margin-bottom: 20px !important;
          }
          .glass-card { 
            break-inside: avoid;
            margin-bottom: 15px !important;
            border: 1px solid #eee !important;
          }
        }
      `}</style>

      {/* Print-only Header */}
      <div className="print-header">
        <h1 style={{ fontSize: '24pt', fontWeight: '800', margin: '0 0 5pt', fontFamily: 'serif' }}>HAVYN Analytics Report</h1>
        <p style={{ fontSize: '12pt', color: '#666' }}>Attendance Summary: {startDate} to {endDate}</p>
        <p style={{ fontSize: '10pt', color: '#999', marginTop: '10pt' }}>Generated on {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
};

export default AttendanceReportView;
