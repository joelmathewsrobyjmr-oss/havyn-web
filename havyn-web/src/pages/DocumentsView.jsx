import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, FileText, Image, Film, Music, File, Trash2, Download,
  Loader2, Search, Grid, List, X, FolderPlus, Folder, FolderOpen,
  ArrowLeft, Plus, ChevronRight
} from 'lucide-react';
import { db, storage } from '../firebase';
import {
  collection, addDoc, deleteDoc, doc, query, orderBy,
  onSnapshot, serverTimestamp, setDoc, getDocs
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import GlassCard from '../components/GlassCard';
import Input from '../components/Input';

/* ─── Helpers ─── */
const fileIcons = {
  'application/pdf':              { icon: FileText, color: '#ef4444', label: 'PDF' },
  'image/':                       { icon: Image,    color: '#3b82f6', label: 'Image' },
  'video/':                       { icon: Film,     color: '#8b5cf6', label: 'Video' },
  'audio/':                       { icon: Music,    color: '#f59e0b', label: 'Audio' },
  'application/msword':           { icon: FileText, color: '#2563eb', label: 'DOC' },
  'application/vnd.openxmlformats': { icon: FileText, color: '#2563eb', label: 'DOCX' },
  'application/vnd.ms-excel':     { icon: FileText, color: '#16a34a', label: 'XLS' },
  'text/':                        { icon: FileText, color: '#6b7280', label: 'Text' },
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
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const isPreviewable = (mimetype) => mimetype?.startsWith('image/') || mimetype === 'application/pdf';

/* ─── Component ─── */
const DocumentsView = () => {
  const { institutionId, user } = useAuth();

  // Folder state
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null); // null = root
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [previewDoc, setPreviewDoc] = useState(null);

  // Upload state
  const [uploadQueue, setUploadQueue] = useState([]); // [{name, progress, done, error}]
  const [isUploading, setIsUploading] = useState(false);

  // Folder creation
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const fileInputRef = useRef(null);

  /* ── Load folders ── */
  useEffect(() => {
    if (!institutionId) return;
    const q = query(collection(db, 'institutions', institutionId, 'folders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setFolders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [institutionId]);

  /* ── Load documents (root or inside folder) ── */
  useEffect(() => {
    if (!institutionId) return;
    setLoading(true);

    const collPath = currentFolder
      ? collection(db, 'institutions', institutionId, 'folders', currentFolder.id, 'files')
      : collection(db, 'institutions', institutionId, 'documents');

    const q = query(collPath, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => {
      console.error('Error loading documents:', err);
      setLoading(false);
    });
    return () => unsub();
  }, [institutionId, currentFolder]);

  /* ── Create folder ── */
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      await addDoc(collection(db, 'institutions', institutionId, 'folders'), {
        name: newFolderName.trim(),
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        fileCount: 0
      });
      setNewFolderName('');
      setShowNewFolder(false);
    } catch (err) {
      console.error(err);
      alert('Failed to create folder.');
    } finally {
      setCreatingFolder(false);
    }
  };

  /* ── Upload files ── */
  const handleUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0 || !institutionId) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    const initialQueue = files.map(f => ({ name: f.name, progress: 0, done: false, error: false }));
    setUploadQueue(initialQueue);
    setIsUploading(true);

    const collPath = currentFolder
      ? collection(db, 'institutions', institutionId, 'folders', currentFolder.id, 'files')
      : collection(db, 'institutions', institutionId, 'documents');

    const storagePfx = currentFolder
      ? `institutions/${institutionId}/folders/${currentFolder.id}`
      : `institutions/${institutionId}/documents`;

    let completed = 0;
    files.forEach((file, idx) => {
      const fileId = `${Date.now()}_${idx}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, `${storagePfx}/${fileId}`);
      const task = uploadBytesResumable(storageRef, file);

      task.on('state_changed',
        (snapshot) => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadQueue(prev => prev.map((q, i) => i === idx ? { ...q, progress: pct } : q));
        },
        (err) => {
          console.error('Upload error:', err);
          setUploadQueue(prev => prev.map((q, i) => i === idx ? { ...q, error: true, done: true } : q));
          completed++;
          if (completed === files.length) setIsUploading(false);
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          await addDoc(collPath, {
            name: file.name,
            size: file.size,
            mimetype: file.type,
            url,
            storagePath: `${storagePfx}/${fileId}`,
            createdAt: serverTimestamp(),
            createdBy: user.uid,
            folderId: currentFolder?.id || null
          });
          setUploadQueue(prev => prev.map((q, i) => i === idx ? { ...q, progress: 100, done: true } : q));
          completed++;
          if (completed === files.length) {
            setTimeout(() => {
              setIsUploading(false);
              setUploadQueue([]);
            }, 1200);
          }
        }
      );
    });
  };

  /* ── Delete file ── */
  const handleDelete = async (docData) => {
    if (!window.confirm(`Permanently delete "${docData.name}"?`)) return;
    try {
      if (docData.storagePath) {
        await deleteObject(ref(storage, docData.storagePath)).catch(() => {});
      }
      const collPath = currentFolder
        ? doc(db, 'institutions', institutionId, 'folders', currentFolder.id, 'files', docData.id)
        : doc(db, 'institutions', institutionId, 'documents', docData.id);
      await deleteDoc(collPath);
      if (previewDoc?.id === docData.id) setPreviewDoc(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete.');
    }
  };

  /* ── Delete folder ── */
  const handleDeleteFolder = async (folder) => {
    if (!window.confirm(`Delete folder "${folder.name}" and ALL files inside?`)) return;
    try {
      const filesSnap = await getDocs(collection(db, 'institutions', institutionId, 'folders', folder.id, 'files'));
      for (const fd of filesSnap.docs) {
        const data = fd.data();
        if (data.storagePath) await deleteObject(ref(storage, data.storagePath)).catch(() => {});
        await deleteDoc(fd.ref);
      }
      await deleteDoc(doc(db, 'institutions', institutionId, 'folders', folder.id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete folder.');
    }
  };

  const filtered = documents.filter(d =>
    (d.name || '')?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const rootFolders = folders;

  /* ─── RENDER ─── */
  if (loading) return (
    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Loader2 size={36} color="var(--primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.5s ease-out' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {currentFolder && (
            <button onClick={() => { setCurrentFolder(null); setSearchQuery(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700', fontSize: '0.9rem' }}>
              <ArrowLeft size={18} /> All Folders
            </button>
          )}
          {currentFolder && <ChevronRight size={16} color="var(--text-muted)" />}
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700' }}>
            {currentFolder ? currentFolder.name : 'Document Repository'}
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
          {!currentFolder && (
            <Button variant="outline" style={{ padding: '9px 16px', fontSize: '0.875rem' }}
              onClick={() => setShowNewFolder(true)}>
              <FolderPlus size={16} /> New Folder
            </Button>
          )}
          <Button variant="primary" style={{ padding: '9px 16px', fontSize: '0.875rem' }}
            onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            <Upload size={16} /> Upload Files
          </Button>
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            style={{ padding: '9px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', boxShadow: 'var(--shadow-sm)' }}>
            {viewMode === 'grid' ? <List size={20} /> : <Grid size={20} />}
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleUpload} />

      {/* ── New Folder Modal ── */}
      {showNewFolder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <GlassCard style={{ width: '340px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderPlus size={20} color="var(--primary)" /> Create New Folder
            </h3>
            <Input
              label="Folder Name"
              placeholder="e.g. Medical Records"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <Button variant="primary" fullWidth onClick={handleCreateFolder} disabled={creatingFolder || !newFolderName.trim()}>
                {creatingFolder ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Create Folder'}
              </Button>
              <Button variant="outline" fullWidth onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}>
                Cancel
              </Button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Upload Progress Bar ── */}
      {isUploading && uploadQueue.length > 0 && (
        <GlassCard style={{ padding: '1rem', marginBottom: '1.25rem', border: '1px solid var(--primary)', background: 'rgba(92,203,244,0.04)' }}>
          <p style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>
            Uploading {uploadQueue.filter(q => !q.done).length} of {uploadQueue.length} files…
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {uploadQueue.map((q, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '3px' }}>
                  <span style={{ fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{q.name}</span>
                  <span style={{ color: q.error ? 'var(--danger)' : 'var(--primary)', fontWeight: '700' }}>
                    {q.error ? 'Error' : q.done ? '✓ Done' : `${q.progress}%`}
                  </span>
                </div>
                <div style={{ height: '4px', borderRadius: '99px', background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${q.progress}%`, background: q.error ? 'var(--danger)' : 'var(--primary)', borderRadius: '99px', transition: 'width 0.3s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ── Search ── */}
      <Input
        icon={Search}
        placeholder={currentFolder ? 'Search files in this folder…' : 'Search files and folders…'}
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        style={{ marginBottom: '1rem' }}
      />

      {/* ── ROOT: Show Folders + Root files ── */}
      {!currentFolder && (
        <>
          {/* Folders grid */}
          {rootFolders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Folders</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                {rootFolders
                  .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(folder => (
                    <GlassCard key={folder.id}
                      onClick={() => { setCurrentFolder(folder); setSearchQuery(''); }}
                      style={{ padding: '1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start', transition: 'all 0.2s ease', position: 'relative' }}>
                      <Folder size={32} color="var(--primary)" style={{ opacity: 0.85 }} />
                      <p style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text)', wordBreak: 'break-word' }}>{folder.name}</p>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteFolder(folder); }}
                        style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', opacity: 0.6 }}>
                        <Trash2 size={14} />
                      </button>
                    </GlassCard>
                  ))
                }

                {/* + Create folder card shortcut */}
                <GlassCard onClick={() => setShowNewFolder(true)}
                  style={{ padding: '1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start', border: '2px dashed var(--border)', background: 'transparent', transition: 'all 0.2s ease' }}>
                  <FolderPlus size={32} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                  <p style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-muted)' }}>New Folder</p>
                </GlassCard>
              </div>
            </div>
          )}

          {/* Root-level files label */}
          {filtered.length > 0 && (
            <p style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Root Files ({filtered.length})
            </p>
          )}
        </>
      )}

      {/* ── File Grid / List ── */}
      {filtered.length === 0 && !isUploading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
          <div style={{ opacity: 0.15, marginBottom: '1.25rem' }}><FileText size={72} style={{ margin: '0 auto' }} /></div>
          <p style={{ fontSize: '1rem', fontWeight: '600' }}>
            {currentFolder ? 'No files in this folder yet.' : 'No documents uploaded yet.'}
          </p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.7 }}>
            Click "Upload Files" to add documents{currentFolder ? ' to this folder' : ', or create a new folder above'}.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
          {filtered.map(docData => {
            const { icon: Icon, color, label } = getFileIcon(docData.mimetype);
            const isImage = docData.mimetype?.startsWith('image/');
            return (
              <GlassCard key={docData.id}
                style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative' }}
                onClick={() => isPreviewable(docData.mimetype) ? setPreviewDoc(docData) : window.open(docData.url, '_blank')}>
                <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isImage ? '#f8fafc' : `${color}08`, position: 'relative', overflow: 'hidden' }}>
                  {isImage
                    ? <img src={docData.url} alt={docData.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Icon size={44} color={color} style={{ opacity: 0.6 }} />
                  }
                  <span style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '0.6rem', fontWeight: '800', background: color, color: 'white', padding: '3px 8px', borderRadius: '999px', textTransform: 'uppercase' }}>
                    {label}
                  </span>
                </div>
                <div style={{ padding: '0.85rem' }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.4rem' }}>{docData.name}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatSize(docData.size)}</span>
                    <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                      <a href={docData.url} download target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', display: 'flex' }}><Download size={15} /></a>
                      <button onClick={() => handleDelete(docData)} style={{ color: 'var(--danger)', cursor: 'pointer', display: 'flex', background: 'none', border: 'none' }}><Trash2 size={15} /></button>
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
              <GlassCard key={docData.id}
                style={{ display: 'flex', alignItems: 'center', padding: '1rem', gap: '1rem', cursor: 'pointer' }}
                onClick={() => isPreviewable(docData.mimetype) ? setPreviewDoc(docData) : window.open(docData.url, '_blank')}>
                <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: `${color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={24} color={color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.95rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{docData.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ background: `${color}20`, color, padding: '1px 8px', borderRadius: '999px', fontWeight: '700', fontSize: '0.65rem', textTransform: 'uppercase' }}>{label}</span>
                    {formatSize(docData.size)} · {formatDate(docData.createdAt)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <a href={docData.url} download target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', display: 'flex' }}><Download size={20} /></a>
                  <button onClick={() => handleDelete(docData)} style={{ color: 'var(--danger)', cursor: 'pointer', display: 'flex', background: 'none', border: 'none' }}><Trash2 size={20} /></button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ── Preview Modal ── */}
      {previewDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease-out', backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', color: 'white' }}>
            <p style={{ fontSize: '1rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, marginRight: '1.5rem' }}>{previewDoc.name}</p>
            <div style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
              <a href={previewDoc.url} download target="_blank" rel="noopener noreferrer" style={{ color: 'white', display: 'flex' }}><Download size={24} /></a>
              <button onClick={() => setPreviewDoc(null)} style={{ color: 'white', cursor: 'pointer', display: 'flex', background: 'none', border: 'none' }}><X size={24} /></button>
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
                <p>Preview not available.</p>
                <Button variant="primary" onClick={() => window.open(previewDoc.url, '_blank')} style={{ marginTop: '1.5rem' }}>Open in New Tab</Button>
              </div>
            )}
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
