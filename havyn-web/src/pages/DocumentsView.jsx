import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Image, Film, Music, File, Trash2, Download, Loader2, Search, Grid, List, Eye, X } from 'lucide-react';
import Button from '../components/Button';
import GlassCard from '../components/GlassCard';
import Input from '../components/Input';

const API_URL = 'http://localhost:3001';

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
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const isPreviewable = (mimetype) => {
  return mimetype?.startsWith('image/') || mimetype === 'application/pdf';
};

const DocumentsView = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [previewDoc, setPreviewDoc] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => { fetchDocuments(); }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/documents`);
      const data = await res.json();
      if (data.success) setDocuments(data.documents.reverse()); // newest first
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        await fetch(`${API_URL}/api/documents`, { method: 'POST', body: formData });
      }
      await fetchDocuments();
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.originalName}"?`)) return;
    try {
      await fetch(`${API_URL}/api/documents/${doc.id}`, { method: 'DELETE' });
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      if (previewDoc?.id === doc.id) setPreviewDoc(null);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filtered = documents.filter(d =>
    d.originalName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem' }}>Documents</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            style={{ padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            {viewMode === 'grid' ? <List size={18} /> : <Grid size={18} />}
          </button>
        </div>
      </div>

      {/* Search */}
      <Input
        icon={Search}
        placeholder="Search documents..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ marginBottom: '1rem' }}
      />

      {/* Upload area */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          border: '2px dashed var(--primary)', borderRadius: 'var(--radius-lg)',
          padding: '1.5rem', textAlign: 'center', cursor: uploading ? 'default' : 'pointer',
          background: 'rgba(59, 130, 246, 0.04)', marginBottom: '1.25rem',
          transition: 'var(--transition)'
        }}
      >
        {uploading ? (
          <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.5rem' }} />
        ) : (
          <Upload size={32} color="var(--primary)" style={{ margin: '0 auto 0.5rem' }} />
        )}
        <p style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--primary)', margin: '0 0 0.25rem' }}>
          {uploading ? 'Uploading...' : 'Tap to upload files'}
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
          PDF, DOC, Images, Videos — Max 20MB
        </p>
      </div>
      <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleUpload} />

      {/* Stats */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>
          {filtered.length} {filtered.length === 1 ? 'file' : 'files'}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>•</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {formatSize(filtered.reduce((sum, d) => sum + (d.size || 0), 0))} total
        </span>
      </div>

      {/* File Grid / List */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '1rem' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            <File size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>{documents.length === 0 ? 'No documents yet. Upload your first file!' : 'No documents match your search.'}</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {filtered.map(doc => {
              const { icon: Icon, color, label } = getFileIcon(doc.mimetype);
              const isImage = doc.mimetype?.startsWith('image/');
              return (
                <GlassCard key={doc.id} style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'var(--transition)' }}
                  onClick={() => isPreviewable(doc.mimetype) ? setPreviewDoc(doc) : window.open(doc.url, '_blank')}>
                  {/* Thumbnail */}
                  <div style={{ height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isImage ? '#f8fafc' : `${color}10`, position: 'relative', overflow: 'hidden' }}>
                    {isImage ? (
                      <img src={doc.url} alt={doc.originalName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Icon size={40} color={color} style={{ opacity: 0.7 }} />
                    )}
                    <span style={{ position: 'absolute', top: '6px', right: '6px', fontSize: '0.55rem', fontWeight: '700', background: color, color: 'white', padding: '2px 6px', borderRadius: '999px', textTransform: 'uppercase' }}>
                      {label}
                    </span>
                  </div>
                  {/* Info */}
                  <div style={{ padding: '0.65rem 0.75rem' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.2rem' }}>
                      {doc.originalName}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{formatSize(doc.size)}</span>
                      <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                        <a href={doc.url} download={doc.originalName} style={{ color: 'var(--primary)', display: 'flex' }}>
                          <Download size={14} />
                        </a>
                        <button onClick={() => handleDelete(doc)} style={{ color: 'var(--danger)', cursor: 'pointer', display: 'flex' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', opacity: 0.6, marginTop: '0.15rem' }}>{formatDate(doc.uploadedAt)}</p>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filtered.map(doc => {
              const { icon: Icon, color, label } = getFileIcon(doc.mimetype);
              return (
                <GlassCard key={doc.id} style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1rem', gap: '0.75rem', cursor: 'pointer' }}
                  onClick={() => isPreviewable(doc.mimetype) ? setPreviewDoc(doc) : window.open(doc.url, '_blank')}>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={20} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.originalName}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      <span style={{ background: `${color}20`, color, padding: '1px 5px', borderRadius: '4px', fontWeight: '600', fontSize: '0.6rem', marginRight: '6px' }}>{label}</span>
                      {formatSize(doc.size)} • {formatDate(doc.uploadedAt)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <a href={doc.url} download={doc.originalName} style={{ color: 'var(--primary)', display: 'flex' }}>
                      <Download size={18} />
                    </a>
                    <button onClick={() => handleDelete(doc)} style={{ color: 'var(--danger)', cursor: 'pointer', display: 'flex' }}>
                      <Trash2 size={18} />
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', color: 'white' }}>
            <p style={{ fontSize: '0.9rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, marginRight: '1rem' }}>
              {previewDoc.originalName}
            </p>
            <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
              <a href={previewDoc.url} download={previewDoc.originalName} style={{ color: 'white', display: 'flex' }}>
                <Download size={22} />
              </a>
              <button onClick={() => setPreviewDoc(null)} style={{ color: 'white', cursor: 'pointer', display: 'flex' }}>
                <X size={22} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 1rem 1rem', overflow: 'auto' }}>
            {previewDoc.mimetype?.startsWith('image/') ? (
              <img src={previewDoc.url} alt={previewDoc.originalName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 'var(--radius-md)' }} />
            ) : previewDoc.mimetype === 'application/pdf' ? (
              <iframe src={previewDoc.url} style={{ width: '100%', height: '100%', border: 'none', borderRadius: 'var(--radius-md)', background: 'white' }} title="PDF Preview" />
            ) : null}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default DocumentsView;
