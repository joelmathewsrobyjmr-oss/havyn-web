import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, CreditCard, Landmark, ArrowLeft, Loader2, Copy, Check, Smartphone, Monitor } from 'lucide-react';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import GlassCard from '../../components/GlassCard';
import Button from '../../components/Button';
import Input from '../../components/Input';

/* ─── UPI App Config ─── */
const UPI_APPS = [
  {
    name: 'GPay',
    color: '#4285F4',
    icon: '🅖',
    scheme: (upiLink) => upiLink, // Universal UPI link works for GPay on Android
  },
  {
    name: 'PhonePe',
    color: '#5f259f',
    icon: '₱',
    scheme: (upiLink) => upiLink,
  },
  {
    name: 'Paytm',
    color: '#00BAF2',
    icon: '₹',
    scheme: (upiLink) => upiLink,
  },
  {
    name: 'BHIM',
    color: '#00A859',
    icon: '🏛',
    scheme: (upiLink) => upiLink,
  },
];

/* ─── Build UPI Deep Link ─── */
const buildUpiLink = (upiId, name, amount, note = 'Havyn Fund Donation') => {
  const params = new URLSearchParams({
    pa: upiId,
    pn: name,
    am: Number(amount).toFixed(2),
    cu: 'INR',
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
};

const FundDonationView = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [institution, setInstitution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [copied, setCopied] = useState(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [paymentInitiated, setPaymentInitiated] = useState(false);

  useEffect(() => {

    // Detect mobile device (for UX display hints only)
    const mobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
    console.debug('Mobile device:', mobile);

    const fetchInstitution = async () => {
      try {
        const docRef = doc(db, 'institutions', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setInstitution(docSnap.data());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInstitution();
  }, [id]);

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const upiId = institution?.upiId;
  const institutionName = institution?.name || 'Havyn Institution';
  const upiLink = upiId && amount && Number(amount) > 0
    ? buildUpiLink(upiId, institutionName, amount)
    : null;

  const handleUpiAppClick = (app) => {
    if (!upiLink) return;
    setPaymentInitiated(true);
    window.location.href = app.scheme(upiLink);
  };

  const validate = () => {
    const errs = {};
    if (!amount || Number(amount) <= 0) errs.amount = 'Please enter a valid amount.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleDonate = async () => {
    if (!validate()) return;
    setProcessing(true);
    try {
      await addDoc(collection(db, 'institutions', id, 'fundDonations'), {
        userId: user.uid,
        userEmail: user.email,
        amount: Number(amount),
        referenceNumber: referenceNumber.trim() || null,
        currency: 'INR',
        status: referenceNumber.trim() ? 'pending' : 'unverified',
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'institutions', id, 'notifications'), {
        type: 'FUND_DONATION',
        title: 'New Fund Donation',
        message: `${user.email} donated ₹${amount}${referenceNumber ? `. Ref: ${referenceNumber}` : ' (no UTR provided)'}`,
        amount: Number(amount),
        read: false,
        createdAt: serverTimestamp()
      });

      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Error recording donation. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--background)' }}>
        <Loader2 size={40} color="var(--primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ─── Success Screen ─── */
  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', padding: '2rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GlassCard style={{ maxWidth: '500px', width: '100%', padding: '3rem', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto' }}>
            <Heart size={48} fill="rgba(236,72,153,0.3)" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '1rem' }}>Thank You! 💖</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: '1.6' }}>
            Your contribution of <strong>₹{amount}</strong> to <strong>{institutionName}</strong> has been recorded.
          </p>
          {!referenceNumber && (
            <p style={{ fontSize: '0.8rem', color: '#f59e0b', background: '#fffbeb', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', border: '1px solid #fde68a' }}>
              💡 Tip: Adding a UTR/transaction ID helps the institution verify your payment faster.
            </p>
          )}
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem', lineHeight: '1.6' }}>
            This direct support makes a real difference in the lives of our residents.
          </p>
          <Button variant="primary" fullWidth onClick={() => navigate('/viewer/dashboard')} style={{ backgroundColor: '#ec4899', borderColor: '#ec4899' }}>
            Return to Home
          </Button>
        </GlassCard>
      </div>
    );
  }

  const bankDetails = institution?.bankDetails || {};

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Back */}
        <button
          onClick={() => navigate(`/viewer/institution/${id}`)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '1.5rem', fontWeight: '600' }}
        >
          <ArrowLeft size={20} /> Back to Institution
        </button>

        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem', color: '#ec4899' }}>Fund Donation</h1>
          <p style={{ color: 'var(--text-muted)' }}>100% of your donation goes directly to <strong>{institutionName}</strong>.</p>
        </header>

        {/* ── Step 1: Amount ── */}
        <GlassCard style={{ padding: '2rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ec489920', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.9rem', flexShrink: 0 }}>1</div>
            <h3 style={{ fontWeight: '700', fontSize: '1rem' }}>Enter Amount (INR)</h3>
          </div>

          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <span style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', fontSize: '1.5rem', color: errors.amount ? 'var(--danger)' : 'var(--text-muted)' }}>₹</span>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              min="1"
              onChange={(e) => { setAmount(e.target.value); setErrors(p => ({ ...p, amount: '' })); setPaymentInitiated(false); }}
              style={{ width: '100%', padding: '1.25rem 1.25rem 1.25rem 2.75rem', borderRadius: 'var(--radius-lg)', border: `2px solid ${errors.amount ? 'var(--danger)' : 'var(--border)'}`, fontSize: '2rem', fontWeight: '800', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
              className="amount-input"
            />
          </div>
          {errors.amount && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: '600', marginBottom: '1rem' }}>{errors.amount}</p>}

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            {[500, 1000, 2000, 5000].map(val => (
              <button
                key={val}
                onClick={() => { setAmount(val.toString()); setErrors(p => ({ ...p, amount: '' })); setPaymentInitiated(false); }}
                style={{ flex: '1 1 60px', padding: '0.65rem 0.5rem', borderRadius: 'var(--radius-md)', border: amount === val.toString() ? '2px solid #ec4899' : '1px solid var(--border)', background: amount === val.toString() ? '#ec489910' : 'white', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem', color: amount === val.toString() ? '#ec4899' : 'inherit', transition: 'all 0.15s' }}
              >
                +₹{val.toLocaleString()}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* ── Step 2: UPI Payment ── */}
        {upiId ? (
          <GlassCard style={{ padding: '2rem', marginBottom: '1.5rem', border: '2px solid rgba(236,72,153,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ec489920', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.9rem', flexShrink: 0 }}>2</div>
              <h3 style={{ fontWeight: '700', fontSize: '1rem' }}>Pay via UPI</h3>
            </div>

            {/* Mobile: App buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <Smartphone size={14} /> <span>Tap to open your UPI app directly</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {UPI_APPS.map(app => (
                <button
                  key={app.name}
                  onClick={() => {
                    if (!validate()) return;
                    handleUpiAppClick(app);
                  }}
                  disabled={!amount || Number(amount) <= 0}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                    padding: '0.85rem 0.5rem', borderRadius: 'var(--radius-md)',
                    border: `2px solid ${app.color}30`,
                    background: `${app.color}08`,
                    cursor: amount && Number(amount) > 0 ? 'pointer' : 'not-allowed',
                    opacity: amount && Number(amount) > 0 ? 1 : 0.5,
                    transition: 'all 0.2s',
                    fontFamily: 'inherit'
                  }}
                  className="upi-app-btn"
                >
                  <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{app.icon}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: '700', color: app.color }}>{app.name}</span>
                </button>
              ))}
            </div>

            {paymentInitiated && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: '#f0fdf4', border: '1px solid #86efac', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ✅ Payment app opened! Complete the payment there, then confirm below.
              </div>
            )}

            {/* Desktop: Dynamic QR Code */}
            {upiLink && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <Monitor size={14} /> <span>Or scan with your phone's UPI app</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ padding: '16px', background: 'white', borderRadius: '16px', border: '2px solid rgba(236,72,153,0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', display: 'inline-block' }}>
                    <QRCodeSVG
                      value={upiLink}
                      size={180}
                      bgColor="#ffffff"
                      fgColor="#1a1a2e"
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    QR auto-updates when you change the amount
                  </p>
                </div>
              </div>
            )}

            {/* UPI ID copy */}
            <div style={{ marginTop: '1.25rem', padding: '0.9rem 1rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)' }}>
              <div>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '1px' }}>UPI ID</p>
                <code style={{ fontSize: '0.9rem', fontWeight: '700' }}>{upiId}</code>
              </div>
              <button
                onClick={() => handleCopy(upiId, 'upi')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '7px 12px', borderRadius: 'var(--radius-md)', background: copied === 'upi' ? '#f0fdf4' : 'var(--primary-light)', color: copied === 'upi' ? 'var(--success)' : 'var(--primary)', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.75rem', transition: 'all 0.2s' }}
              >
                {copied === 'upi' ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
              </button>
            </div>
          </GlassCard>
        ) : (
          <GlassCard style={{ padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center', border: '1px dashed var(--border)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>⚠️ UPI payment not configured for this institution.</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>Please use the bank transfer below.</p>
          </GlassCard>
        )}

        {/* ── Step 3: Bank Transfer (optional) ── */}
        {(bankDetails.accountNumber || bankDetails.bankName) && (
          <GlassCard style={{ padding: '2rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3b82f620', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Landmark size={16} />
              </div>
              <div>
                <h3 style={{ fontWeight: '700', fontSize: '1rem' }}>Bank Transfer (NEFT/IMPS)</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Alternative payment method</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: 'Bank Name', value: bankDetails.bankName },
                { label: 'Account Name', value: bankDetails.accountName },
                { label: 'Account Number', value: bankDetails.accountNumber },
                { label: 'IFSC Code', value: bankDetails.ifsc }
              ].filter(item => item.value).map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{item.value}</span>
                    <button onClick={() => handleCopy(item.value, `bank-${i}`)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: copied === `bank-${i}` ? 'var(--success)' : 'var(--text-muted)', display: 'flex' }}>
                      {copied === `bank-${i}` ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* ── Step 4: Confirm ── */}
        <GlassCard style={{ padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ec489920', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.9rem', flexShrink: 0 }}>{upiId ? '3' : '2'}</div>
            <div>
              <h3 style={{ fontWeight: '700', fontSize: '1rem' }}>Confirm Payment <span style={{ fontWeight: '400', color: 'var(--text-muted)', fontSize: '0.8rem' }}>(optional but recommended)</span></h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enter your UTR / Transaction ID so the institution can verify faster</p>
            </div>
          </div>
          <Input
            icon={CreditCard}
            placeholder="e.g. 123456789012 (UTR from payment app)"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
          />
        </GlassCard>

        <Button
          variant="primary"
          fullWidth
          onClick={handleDonate}
          disabled={processing}
          style={{ background: '#ec4899', borderColor: '#ec4899', padding: '1.25rem', fontSize: '1.1rem', marginBottom: '1rem' }}
        >
          {processing ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...
            </span>
          ) : (
            <span>✅ I have completed the payment</span>
          )}
        </Button>

        <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          By clicking, you confirm that you have initiated the payment outside this app.<br />
          We do not store any payment credentials.
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .amount-input:focus { border-color: #ec4899 !important; }
        .upi-app-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
      `}</style>
    </div>
  );
};

export default FundDonationView;
