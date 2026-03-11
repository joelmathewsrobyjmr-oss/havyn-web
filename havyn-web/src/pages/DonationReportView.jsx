import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Utensils, Heart, Download, Loader2, CalendarDays,
  Filter, TrendingUp, ArrowLeft, FileText
} from 'lucide-react';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import GlassCard from '../components/GlassCard';

const DonationReportView = () => {
  const navigate = useNavigate();
  const { institutionId } = useAuth();

  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const [startDate, setStartDate] = useState(monthAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'food' | 'fund'
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!startDate) errs.startDate = 'Start date is required.';
    if (!endDate) errs.endDate = 'End date is required.';
    if (startDate && endDate && startDate > endDate) errs.range = 'Start date must be before end date.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const generateReport = async () => {
    if (!validate() || !institutionId) return;
    setLoading(true);

    try {
      const start = Timestamp.fromDate(new Date(startDate + 'T00:00:00'));
      const end = Timestamp.fromDate(new Date(endDate + 'T23:59:59'));

      // Fetch food donations
      const foodQ = query(
        collection(db, 'institutions', institutionId, 'foodDonations'),
        where('createdAt', '>=', start),
        where('createdAt', '<=', end),
        orderBy('createdAt', 'desc')
      );
      const foodSnap = await getDocs(foodQ);
      const foodDonations = foodSnap.docs.map(d => ({ id: d.id, type: 'food', ...d.data() }));

      // Fetch fund donations
      const fundQ = query(
        collection(db, 'institutions', institutionId, 'fundDonations'),
        where('createdAt', '>=', start),
        where('createdAt', '<=', end),
        orderBy('createdAt', 'desc')
      );
      const fundSnap = await getDocs(fundQ);
      const fundDonations = fundSnap.docs.map(d => ({ id: d.id, type: 'fund', ...d.data() }));

      // Stats
      const totalFund = fundDonations.reduce((s, d) => s + (d.amount || 0), 0);
      const approvedFood = foodDonations.filter(d => d.status === 'approved').length;
      const pendingFood = foodDonations.filter(d => d.status === 'pending').length;
      const rejectedFood = foodDonations.filter(d => d.status === 'rejected').length;

      // Unique donors
      const donorSet = new Set([
        ...foodDonations.map(d => d.userEmail),
        ...fundDonations.map(d => d.userEmail)
      ]);

      setReportData({
        foodDonations,
        fundDonations,
        stats: {
          totalFund,
          totalFood: foodDonations.length,
          approvedFood,
          pendingFood,
          rejectedFood,
          totalFundDonations: fundDonations.length,
          uniqueDonors: donorSet.size
        }
      });
    } catch (err) {
      console.error('Error generating donation report:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredItems = () => {
    if (!reportData) return [];
    const { foodDonations, fundDonations } = reportData;
    if (typeFilter === 'food') return foodDonations;
    if (typeFilter === 'fund') return fundDonations;
    return [...foodDonations, ...fundDonations].sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
  };

  const formatDate = (ts) => {
    if (!ts?.toDate) return '—';
    return ts.toDate().toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const downloadCSV = () => {
    if (!reportData) return;
    const items = getFilteredItems();
    const header = ['Type', 'Donor Email', 'Date', 'Slot / Amount', 'Status'];
    const rows = items.map(item => {
      const type = item.type === 'food' ? 'Food Booking' : 'Fund Donation';
      const slotOrAmt = item.type === 'food' ? `${item.slotLabel} on ${item.date}` : `₹${item.amount}`;
      return [type, item.userEmail || '', formatDate(item.createdAt), slotOrAmt, item.status || 'completed'];
    });

    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `donation_report_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filtered = getFilteredItems();

  const statCards = reportData ? [
    { label: 'Total Funds Raised', value: `₹${reportData.stats.totalFund.toLocaleString('en-IN')}`, color: '#ec4899', bg: 'rgba(236,72,153,0.08)' },
    { label: 'Food Bookings', value: reportData.stats.totalFood, color: 'var(--primary)', bg: 'rgba(59,130,246,0.08)' },
    { label: 'Approved Meals', value: reportData.stats.approvedFood, color: 'var(--success)', bg: 'rgba(22,163,74,0.08)' },
    { label: 'Unique Donors', value: reportData.stats.uniqueDonors, color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
  ] : [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.5s ease-out' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={() => navigate(-1)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', lineHeight: 1.2 }}>Donation Report</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Combined food bookings &amp; financial contributions</p>
        </div>
      </div>

      {/* Filter Card */}
      <GlassCard style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <CalendarDays size={20} color="var(--primary)" />
          <span style={{ fontSize: '1rem', fontWeight: '700' }}>Filter Date Range</span>
        </div>

        {errors.range && (
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: '#fef2f2', color: '#dc2626', fontSize: '0.85rem', fontWeight: '600', marginBottom: '1rem', border: '1px solid #fecaca' }}>
            {errors.range}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '160px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>From Date</label>
            <input
              id="report-start-date"
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setErrors({}); }}
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: `1px solid ${errors.startDate ? '#ef4444' : 'var(--border)'}`, background: 'white', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            />
            {errors.startDate && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>{errors.startDate}</p>}
          </div>
          <div style={{ flex: 1, minWidth: '160px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>To Date</label>
            <input
              id="report-end-date"
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setErrors({}); }}
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: `1px solid ${errors.endDate ? '#ef4444' : 'var(--border)'}`, background: 'white', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            />
            {errors.endDate && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>{errors.endDate}</p>}
          </div>
        </div>

        <Button variant="primary" fullWidth onClick={generateReport} disabled={loading} style={{ padding: '14px 0', boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.2)' }}>
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Generating Report...
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} /> Generate Report
            </span>
          )}
        </Button>
      </GlassCard>

      {/* Results */}
      {reportData && (
        <>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {statCards.map((s, i) => (
              <div key={i} style={{ background: s.bg, border: `1px solid ${s.color}30`, borderRadius: 'var(--radius-lg)', padding: '1.25rem', textAlign: 'center' }}>
                <p style={{ fontSize: '1.6rem', fontWeight: '800', color: s.color, marginBottom: '4px' }}>{s.value}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Type Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Filter size={16} color="var(--text-muted)" style={{ alignSelf: 'center', marginRight: '4px' }} />
            {[
              { key: 'all', label: 'All', color: 'var(--primary)' },
              { key: 'food', label: '🍽 Food', color: 'var(--primary)' },
              { key: 'fund', label: '💰 Fund', color: '#ec4899' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTypeFilter(t.key)}
                style={{
                  padding: '6px 14px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700',
                  cursor: 'pointer', border: typeFilter === t.key ? 'none' : '1px solid var(--border)',
                  background: typeFilter === t.key ? (t.key === 'fund' ? '#ec4899' : 'var(--primary)') : 'white',
                  color: typeFilter === t.key ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.2s ease'
                }}
              >
                {t.label}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center', fontWeight: '600' }}>
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Records */}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '6rem' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
                <FileText size={48} style={{ opacity: 0.15, margin: '0 auto 1rem' }} />
                <p style={{ fontWeight: '600' }}>No records in this date range.</p>
              </div>
            ) : filtered.map(item => {
              const isFood = item.type === 'food';
              const statusColor = item.status === 'approved' ? 'var(--success)'
                : item.status === 'rejected' ? '#ef4444'
                : item.status === 'pending' ? '#f59e0b'
                : '#ec4899'; // fund = completed

              return (
                <GlassCard key={item.id} style={{ padding: '1.1rem 1.25rem', marginBottom: '0.75rem', borderLeft: `4px solid ${statusColor}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Icon */}
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isFood ? 'rgba(59,130,246,0.1)' : 'rgba(236,72,153,0.1)', color: isFood ? 'var(--primary)' : '#ec4899' }}>
                      {isFood ? <Utensils size={20} /> : <Heart size={20} />}
                    </div>

                    {/* Main text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '2px' }}>
                        {isFood ? `${item.slotLabel} — ${item.date}` : `₹${(item.amount || 0).toLocaleString('en-IN')}`}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.userEmail}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {formatDate(item.createdAt)}
                      </p>
                    </div>

                    {/* Badge */}
                    <span style={{
                      fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em',
                      padding: '3px 10px', borderRadius: '999px', flexShrink: 0,
                      background: `${statusColor}20`, color: statusColor
                    }}>
                      {item.status || 'completed'}
                    </span>
                  </div>
                </GlassCard>
              );
            })}
          </div>

          {/* Floating CSV Export */}
          <div style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 3rem)', maxWidth: '480px', zIndex: 100 }}>
            <Button
              variant="outline"
              fullWidth
              onClick={downloadCSV}
              style={{ backgroundColor: 'white', border: '2px solid var(--primary)', color: 'var(--primary)', padding: '14px 0', fontSize: '1rem', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
            >
              <Download size={20} style={{ marginRight: '10px' }} /> Export to CSV
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

export default DonationReportView;
