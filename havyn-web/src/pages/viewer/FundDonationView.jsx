import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, CreditCard, Landmark, QrCode, ArrowLeft, Loader2, CheckCircle, Copy, Check } from 'lucide-react';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import GlassCard from '../../components/GlassCard';
import Button from '../../components/Button';
import Input from '../../components/Input';

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

  useEffect(() => {
    const fetchInstitution = async () => {
      try {
        const docRef = doc(db, 'institutions', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setInstitution(docSnap.data());
        }
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

  const validate = () => {
    const errs = {};
    if (!amount || Number(amount) <= 0) errs.amount = 'Please enter a valid amount.';
    if (!referenceNumber.trim()) errs.ref = 'Required to verify your transaction.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleDonate = async () => {
    if (!validate()) return;
    setProcessing(true);
    try {
      // Record donation with reference number
      await addDoc(collection(db, 'institutions', id, 'fundDonations'), {
        userId: user.uid,
        userEmail: user.email,
        amount: Number(amount),
        referenceNumber: referenceNumber.trim(),
        currency: 'INR',
        status: 'pending', // Now pending verification by admin
        createdAt: serverTimestamp()
      });

      // Create Notification for Admin
      await addDoc(collection(db, 'institutions', id, 'notifications'), {
        type: 'FUND_DONATION',
        title: 'New Fund Donation',
        message: `${user.email} donated ₹${amount}. Ref: ${referenceNumber}`,
        amount: Number(amount),
        read: false,
        createdAt: serverTimestamp()
      });

      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Error recording donation.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--background)' }}>
        <Loader2 size={40} color="var(--primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', padding: '2rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GlassCard style={{ maxWidth: '500px', width: '100%', padding: '3rem', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto' }}>
            <Heart size={48} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '1rem' }}>Generosity Received!</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', lineHeight: '1.6' }}>
            Your contribution of ₹{amount} has been successfully recorded. This direct support makes a real difference in the lives of our residents. Thank you!
          </p>
          <Button variant="primary" fullWidth onClick={() => navigate('/viewer/dashboard')} style={{ backgroundColor: '#ec4899', borderColor: '#ec4899' }}>Return to Home</Button>
        </GlassCard>
      </div>
    );
  }

  const bankDetails = institution?.bankDetails || {
    accountName: institution?.name,
    accountNumber: "50200000012345",
    ifsc: "HDFC0001234",
    bankName: "HDFC Bank Ltd.",
    upiId: `${institution?.name?.toLowerCase().replace(/\s+/g, '')}@upi`
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <button 
          onClick={() => navigate(`/viewer/institution/${id}`)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '1.5rem', fontWeight: '600' }}
        >
          <ArrowLeft size={20} /> Back to Institution
        </button>

        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem', color: '#ec4899' }}>Financial Support</h1>
          <p style={{ color: 'var(--text-muted)' }}>100% of your donation goes directly to the institution.</p>
        </header>

        {/* Amount Input */}
        <GlassCard style={{ padding: '2rem', marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>Enter Contribution Amount (INR)</label>
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <span style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', fontSize: '1.5rem', color: errors.amount ? 'var(--danger)' : 'var(--text-muted)' }}>₹</span>
            <input 
              type="number" 
              placeholder="0.00"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setErrors(p => ({ ...p, amount: '' })); }}
              style={{ width: '100%', padding: '1.25rem 1.25rem 1.25rem 2.75rem', borderRadius: 'var(--radius-lg)', border: `2px solid ${errors.amount ? 'var(--danger)' : 'var(--border)'}`, fontSize: '2rem', fontWeight: '800', outline: 'none', transition: 'border-color 0.2s' }}
              className="amount-input"
            />
          </div>
          {errors.amount && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: '600', marginBottom: '1rem' }}>{errors.amount}</p>}
          
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {[500, 1000, 2000, 5000].map(val => (
              <button 
                key={val} 
                onClick={() => { setAmount(val.toString()); setErrors(p => ({ ...p, amount: '' })); }}
                style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}
              >+₹{val}</button>
            ))}
          </div>
        </GlassCard>

        {/* Reference Information */}
        <GlassCard style={{ padding: '2rem', marginBottom: '2rem', border: `2px solid ${errors.ref ? 'var(--danger)' : 'transparent'}` }}>
          <label style={{ display: 'block', fontSize: '1rem', fontWeight: '700', marginBottom: '0.5rem' }}>Transaction Reference ID</label>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Paste the UTR or Transaction ID from your payment app here.</p>
          <Input 
            icon={CreditCard}
            placeholder="e.g. 123456789012"
            value={referenceNumber}
            onChange={(e) => { setReferenceNumber(e.target.value); setErrors(p => ({ ...p, ref: '' })); }}
            style={{ marginBottom: '0' }}
          />
          {errors.ref && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: '600', marginTop: '0.5rem' }}>{errors.ref}</p>}
        </GlassCard>

        {/* Transfer Methods */}
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.25rem' }}>Transfer Methods</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
          {/* UPI */}
          <GlassCard style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <QrCode size={20} />
              </div>
              <div>
                <p style={{ fontWeight: '700' }}>UPI Payment</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Scan QR or pay via UPI ID</p>
              </div>
            </div>

            {institution?.qrCodeBase64 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                {/* QR Code Image */}
                <div style={{
                  padding: '16px',
                  background: 'white',
                  borderRadius: '16px',
                  border: '2px solid rgba(59, 130, 246, 0.3)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                  display: 'inline-block'
                }}>
                  <img
                    src={institution.qrCodeBase64}
                    alt="UPI QR Code"
                    style={{ width: '220px', height: '220px', objectFit: 'contain', display: 'block' }}
                  />
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Open any UPI app and scan this QR to pay
                </p>

                {/* UPI ID row with Copy */}
                {(institution?.upiId || bankDetails.upiId) && (
                  <div style={{ width: '100%', padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)' }}>
                    <div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>UPI ID</p>
                      <code style={{ fontSize: '0.95rem', fontWeight: '700' }}>{institution?.upiId || bankDetails.upiId}</code>
                    </div>
                    <button onClick={() => handleCopy(institution?.upiId || bankDetails.upiId, 'upi')} style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      padding: '8px 14px', borderRadius: 'var(--radius-md)',
                      background: copied === 'upi' ? '#f0fdf4' : 'var(--primary-light)',
                      color: copied === 'upi' ? 'var(--success)' : 'var(--primary)',
                      border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem',
                      transition: 'all 0.2s'
                    }}>
                      {copied === 'upi' ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy UPI ID</>}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* No QR uploaded yet */
              <div>
                {(institution?.upiId || bankDetails.upiId) ? (
                  <div>
                    <div style={{ padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)', marginBottom: '0.75rem' }}>
                      <div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>UPI ID</p>
                        <code style={{ fontSize: '1rem', fontWeight: '700' }}>{institution?.upiId || bankDetails.upiId}</code>
                      </div>
                      <button onClick={() => handleCopy(institution?.upiId || bankDetails.upiId, 'upi')} style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        padding: '8px 14px', borderRadius: 'var(--radius-md)',
                        background: copied === 'upi' ? '#f0fdf4' : 'var(--primary-light)',
                        color: copied === 'upi' ? 'var(--success)' : 'var(--primary)',
                        border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem',
                        transition: 'all 0.2s'
                      }}>
                        {copied === 'upi' ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy UPI ID</>}
                      </button>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>QR code not configured — use UPI ID above to pay</p>
                  </div>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
                    <QrCode size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
                    <p style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem' }}>Donation details not available</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>This institution has not configured UPI payment details yet.</p>
                  </div>
                )}
              </div>
            )}
          </GlassCard>


          {/* Bank Account */}
          <GlassCard style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Landmark size={20} />
              </div>
              <div>
                <p style={{ fontWeight: '700' }}>Bank Transfer (NEFT/IMPS)</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Direct credit to account</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: "Bank Name", value: institution?.bankDetails?.bankName || bankDetails.bankName },
                { label: "Account Name", value: institution?.bankDetails?.accountName || bankDetails.accountName },
                { label: "Account Number", value: institution?.bankDetails?.accountNumber || bankDetails.accountNumber },
                { label: "IFSC Code", value: institution?.bankDetails?.ifsc || bankDetails.ifsc }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{item.value}</span>
                    <button onClick={() => handleCopy(item.value, i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                       {copied === i ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <Button 
          variant="primary" 
          fullWidth 
          onClick={handleDonate} 
          disabled={processing}
          style={{ background: '#ec4899', borderColor: '#ec4899', padding: '1.25rem', fontSize: '1.1rem' }}
        >
          {processing ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Submitting Details...
            </span>
          ) : 'I have completed the transfer'}
        </Button>
        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          By clicking, you confirm that you have initiated the payment outside this app.
        </p>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .amount-input:focus { border-color: #ec4899 !important; }
      `}</style>
    </div>
  );
};

export default FundDonationView;
