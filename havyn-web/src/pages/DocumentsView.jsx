import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Image, Film, Music, File, Trash2, Download, Loader2, Search, Grid, List, Eye, X } from 'lucide-react';
import { db, storage } from '../firebase';
import { collection, addDoc, deleteDoc, doc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import GlassCard from '../components/GlassCard';
import Input from '../components/Input';

const fileIcons = {
  'application/pdf': { icon: FileText, color: '#ef4444', label: 'PDF' },
  'image/': { icon: Image, color: '#3b82f6', label: 'Image' },
  'video/': { icon: Film, color: '#8b5cf6', label: 'Video' },
  'audio/': { icon: Music, color: '#f59e0b', label: 'Audio' },
  'application/msword': { icon: FileText, color: '#2563eb', label: 'DOC' },
  'application/vnd.openxmlformats': { icon: FileText, color: '#2563eb', label: 'DOCX' },
  'application/vnd.ms-excel': { icon: FileText, color: '#16a34a', label: 'XLS' },
  'text/': { icon: FileText, color: '#6b7280', label: 'Text' },
};

const getFileIcon = (mimetype) => {
  for (const [key, val] of Object.entries(fileIcons)) {
    if (mimetype?.startsWith(key)) return val;
  }
  return { icon: File, color: '#9ca3af', label: 'File' };
};

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (date) => {
  if (!date) return 'Just now';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const isPreviewable = (mimetype) => {
  return mimetype?.startsWith('image/') || mimetype === 'application/pdf';
};

const DocumentsView = () => {
  const { institutionId, user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [previewDoc, setPreviewDoc] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!institutionId) return;

    const q = query(
      collection(db, 'institutions', institutionId, 'documents'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setDocuments(docs);
      setLoading(false);
    }, (err) => {
      console.error('Error listening to documents:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [institutionId]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0 || !institutionId) return;

    setUploading(true);
    try {
      for (const file of files) {
        const fileId = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const storagePath = `institutions/${institutionId}/documents/${fileId}`;
        const storageRef = ref(storage, storagePath);
        
        // 1. Upload to Storage
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        // 2. Add metadata to Firestore
        await addDoc(collection(db, 'institutions', institutionId, 'documents'), {
          name: file.name,
          originalName: file.name,
          size: file.size,
          mimetype: file.type,
          url: url,
          storagePath: storagePath,
          createdAt: serverTimestamp(),
          createdBy: user.uid
        });

        // 3. Log activity
        await addDoc(collection(db, 'activityLogs'), {
          institutionId,
          userId: user.uid,
          action: 'UPLOAD_DOCUMENT',
          fileName: file.name,
          timestamp: serverTimestamp()
        });
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload some files. Please check your connection.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (docData) => {
    if (!window.confirm(`Permanently delete "${docData.name}"?`)) return;
    try {
      // 1. Delete from Storage
      if (docData.storagePath) {
        const storageRef = ref(storage, docData.storagePath);
        await deleteObject(storageRef).catch(e => console.warn('Storage file already gone', e));
      }

      // 2. Delete from Firestore
      await deleteDoc(doc(db, 'institutions', institutionId, 'documents', docData.id));

      // 3. Log activity
      await addDoc(collection(db, 'activityLogs'), {
        institutionId,
        userId: user.uid,
        action: 'DELETE_DOCUMENT',
        fileName: docData.name,
        timestamp: serverTimestamp()
      });

      if (previewDoc?.id === docData.id) setPreviewDoc(null);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete document.');
    }
  };

  const filtered = documents.filter(d =>
    (d.name || d.originalName || '')?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
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
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700' }}>Document Repository</h2>
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            style={{ padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', boxShadow: 'var(--shadow-sm)' }}>
            {viewMode === 'grid' ? <List size={20} /> : <Grid size={20} />}
          </button>
        </div>
      </div>

      {/* Search */}
      <Input
        icon={Search}
        placeholder="Filter by filename or type..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ marginBottom: '1.5rem' }}
      />

      {/* Upload area */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          border: '2px dashed var(--primary)', borderRadius: 'var(--radius-lg)',
          padding: '2.5rem 1.5rem', textAlign: 'center', cursor: uploading ? 'default' : 'pointer',
          background: 'rgba(59, 130, 246, 0.04)', marginBottom: '1.5rem',
          transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden'
        }}
        className="hover:bg-blue-50"
      >
        {uploading ? (
          <Loader2 size={40} color="var(--primary)" style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 1rem' }} />
        ) : (
          <Upload size={40} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
        )}
        <p style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--primary)', margin: '0 0 0.5rem' }}>
          {uploading ? 'Processing Uploads...' : 'Click or Drag to Upload Documents'}
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, opacity: 0.7 }}>
          Supports PDFs, Records, Photos, and Videos (Up to 100MB)
        </p>
      </div>
      <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleUpload} />

      {/* Stats Summary */}
      {documents.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', padding: '0 4px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', backgroundColor: 'var(--surface)', padding: '4px 12px', borderRadius: '999px' }}>
            {filtered.length} {filtered.length === 1 ? 'Record' : 'Records'}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', backgroundColor: 'var(--surface)', padding: '4px 12px', borderRadius: '999px' }}>
            {formatSize(filtered.reduce((sum, d) => sum + (d.size || 0), 0))} Storage Used
          </span>
        </div>
      )}

      {/* File Grid / List */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '2.5rem' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
            <div style={{ opacity: 0.2, marginBottom: '1.5rem' }}>
              <FileText size={80} style={{ margin: '0 auto' }} />
            </div>
            <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>
              {documents.length === 0 ? 'No institutional archives found.' : 'No matches in archives.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
            {filtered.map(docData => {
              const { icon: Icon, color, label } = getFileIcon(docData.mimetype);
              const isImage = docData.mimetype?.startsWith('image/');
              return (
                <GlassCard key={docData.id} style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative' }}
                  onClick={() => isPreviewable(docData.mimetype) ? setPreviewDoc(docData) : window.open(docData.url, '_blank')}>
                  <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isImage ? '#f8fafc' : `${color}08`, position: 'relative', overflow: 'hidden' }}>
                    {isImage ? (
                      <img src={docData.url} alt={docData.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Icon size={44} color={color} style={{ opacity: 0.6 }} />
                    )}
                    <span style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '0.6rem', fontWeight: '800', background: color, color: 'white', padding: '3px 8px', borderRadius: '999px', textTransform: 'uppercase', boxShadow: 'var(--shadow-sm)' }}>
                      {label}
                    </span>
                  </div>
                  <div style={{ padding: '0.85rem' }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.4rem', color: 'var(--text)' }}>
                      {docData.name}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '500' }}>{formatSize(docData.size)}</span>
                      <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                        <a href={docData.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', display: 'flex' }}>
                          <Download size={16} />
                        </a>
                        <button onClick={() => handleDelete(docData)} style={{ color: 'var(--danger)', cursor: 'pointer', display: 'flex', background: 'none', border: 'none' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filtered.map(docData => {
              const { icon: Icon, color, label } = getFileIcon(docData.mimetype);
              return (
                <GlassCard key={docData.id} style={{ display: 'flex', alignItems: 'center', padding: '1rem', gap: '1rem', cursor: 'pointer' }}
                  onClick={() => isPreviewable(docData.mimetype) ? setPreviewDoc(docData) : window.open(docData.url, '_blank')}>
                  <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: `${color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={24} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.95rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>{docData.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center' }}>
                      <span style={{ background: `${color}20`, color, padding: '1px 8px', borderRadius: '999px', fontWeight: '700', fontSize: '0.65rem', marginRight: '8px', textTransform: 'uppercase' }}>{label}</span>
                      {formatSize(docData.size)} • {formatDate(docData.createdAt)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <a href={docData.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', display: 'flex' }}>
                      <Download size={20} />
                    </a>
                    <button onClick={() => handleDelete(docData)} style={{ color: 'var(--danger)', cursor: 'pointer', display: 'flex', background: 'none', border: 'none' }}>
                      <Trash2 size={20} />
                    </button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease-out', backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', color: 'white' }}>
            <p style={{ fontSize: '1rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, marginRight: '1.5rem' }}>
              {previewDoc.name}
            </p>
            <div style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
              <a href={previewDoc.url} target="_blank" rel="noopener noreferrer" style={{ color: 'white', display: 'flex' }}>
                <Download size={24} />
              </a>
              <button onClick={() => setPreviewDoc(null)} style={{ color: 'white', cursor: 'pointer', display: 'flex', background: 'none', border: 'none' }}>
                <X size={24} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 1rem 1.5rem', overflow: 'auto' }}>
            {previewDoc.mimetype?.startsWith('image/') ? (
              <img src={previewDoc.url} alt={previewDoc.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 'var(--radius-md)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} />
            ) : previewDoc.mimetype === 'application/pdf' ? (
              <iframe src={previewDoc.url} style={{ width: '100%', height: '100%', border: 'none', borderRadius: 'var(--radius-md)', background: 'white', maxWidth: '1000px' }} title="PDF Preview" />
            ) : (
              <div style={{ textAlign: 'center', color: 'white' }}>
                <File size={64} style={{ marginBottom: '1rem' }} />
                <p>Preview not available for this file type.</p>
                <Button variant="primary" onClick={() => window.open(previewDoc.url, '_blank')} style={{ marginTop: '1.5rem' }}>Open in New Tab</Button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .hover\:bg-blue-50:hover { background-color: rgba(59, 130, 246, 0.08) !important; }
      `}</style>
    </div>
  );
};

export default DocumentsView;
