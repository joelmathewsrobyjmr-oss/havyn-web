import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// CORS
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Serve uploaded images
app.use('/uploads', express.static(uploadsDir));

// ──────────────────────────────────────────────────
//  Multer storage — organises files per resident:
//    uploads/residents/{residentId}/profile.jpg
//    uploads/residents/{residentId}/aadhaar.jpg
// ──────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const residentId = req.params.residentId || 'unlinked';
    const dir = path.join(uploadsDir, 'residents', residentId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const type = req.params.type; // 'profile' or 'aadhaar'
    const ext = path.extname(file.originalname) || '.jpg';
    // Always overwrite with the same name so there's only one profile/aadhaar per resident
    cb(null, `${type}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, GIF, WebP) are allowed.'));
    }
  }
});

// ──────────────────────────────────────────────────
//  UPLOAD — POST /api/residents/:residentId/upload/:type
//  :type = 'profile' | 'aadhaar'
// ──────────────────────────────────────────────────
app.post('/api/residents/:residentId/upload/:type', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const { residentId, type } = req.params;
  const imageUrl = `http://localhost:${PORT}/uploads/residents/${residentId}/${req.file.filename}`;
  res.json({ success: true, imageUrl, filename: req.file.filename, residentId, type });
});

// ──────────────────────────────────────────────────
//  GET IMAGE — GET /api/residents/:residentId/image/:type
//  Returns the image URL (or 404 if not uploaded yet)
// ──────────────────────────────────────────────────
app.get('/api/residents/:residentId/image/:type', (req, res) => {
  const { residentId, type } = req.params;
  const dir = path.join(uploadsDir, 'residents', residentId);
  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'No images for this resident.' });

  // Find the file that starts with the type name
  const files = fs.readdirSync(dir).filter(f => f.startsWith(type));
  if (files.length === 0) return res.status(404).json({ error: `No ${type} image found.` });

  const imageUrl = `http://localhost:${PORT}/uploads/residents/${residentId}/${files[0]}`;
  res.json({ success: true, imageUrl, filename: files[0] });
});

// ──────────────────────────────────────────────────
//  GET ALL IMAGES — GET /api/residents/:residentId/images
//  Returns both profile and aadhaar URLs for a resident
// ──────────────────────────────────────────────────
app.get('/api/residents/:residentId/images', (req, res) => {
  const { residentId } = req.params;
  const dir = path.join(uploadsDir, 'residents', residentId);

  const result = { residentId, profile: null, aadhaar: null };

  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    const profileFile = files.find(f => f.startsWith('profile'));
    const aadhaarFile = files.find(f => f.startsWith('aadhaar'));

    if (profileFile) result.profile = `http://localhost:${PORT}/uploads/residents/${residentId}/${profileFile}`;
    if (aadhaarFile) result.aadhaar = `http://localhost:${PORT}/uploads/residents/${residentId}/${aadhaarFile}`;
  }

  res.json({ success: true, ...result });
});

// ──────────────────────────────────────────────────
//  DELETE IMAGE — DELETE /api/residents/:residentId/image/:type
// ──────────────────────────────────────────────────
app.delete('/api/residents/:residentId/image/:type', (req, res) => {
  const { residentId, type } = req.params;
  const dir = path.join(uploadsDir, 'residents', residentId);
  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Not found.' });

  const files = fs.readdirSync(dir).filter(f => f.startsWith(type));
  if (files.length === 0) return res.status(404).json({ error: `No ${type} image found.` });

  fs.unlinkSync(path.join(dir, files[0]));
  res.json({ success: true, deleted: files[0] });
});

// ──────────────────────────────────────────────────
//  DELETE ALL — DELETE /api/residents/:residentId/images
//  Removes all images when a resident is deleted
// ──────────────────────────────────────────────────
app.delete('/api/residents/:residentId/images', (req, res) => {
  const { residentId } = req.params;
  const dir = path.join(uploadsDir, 'residents', residentId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  res.json({ success: true, residentId });
});

// ──────────────────────────────────────────────────
//  DOCUMENTS — Google Drive-style file management
//  uploads/documents/{timestamp}_{filename}
// ──────────────────────────────────────────────────
const docsDir = path.join(uploadsDir, 'documents');
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

const docStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, docsDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = `${Date.now()}_${safeName}`;
    cb(null, uniqueName);
  }
});

const docUpload = multer({
  storage: docStorage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// Upload document
app.post('/api/documents', docUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const meta = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
    uploadedAt: new Date().toISOString(),
    uploadedBy: req.body.uploadedBy || 'admin',
    url: `http://localhost:${PORT}/uploads/documents/${req.file.filename}`
  };
  // Save metadata
  const metaFile = path.join(docsDir, 'metadata.json');
  let allMeta = [];
  if (fs.existsSync(metaFile)) {
    try { allMeta = JSON.parse(fs.readFileSync(metaFile, 'utf8')); } catch {}
  }
  allMeta.push(meta);
  fs.writeFileSync(metaFile, JSON.stringify(allMeta, null, 2));
  res.json({ success: true, document: meta });
});

// List all documents
app.get('/api/documents', (req, res) => {
  const metaFile = path.join(docsDir, 'metadata.json');
  let allMeta = [];
  if (fs.existsSync(metaFile)) {
    try { allMeta = JSON.parse(fs.readFileSync(metaFile, 'utf8')); } catch {}
  }
  res.json({ success: true, documents: allMeta });
});

// Delete document
app.delete('/api/documents/:id', (req, res) => {
  const metaFile = path.join(docsDir, 'metadata.json');
  let allMeta = [];
  if (fs.existsSync(metaFile)) {
    try { allMeta = JSON.parse(fs.readFileSync(metaFile, 'utf8')); } catch {}
  }
  const docIndex = allMeta.findIndex(d => d.id === req.params.id);
  if (docIndex === -1) return res.status(404).json({ error: 'Document not found.' });

  const doc = allMeta[docIndex];
  const filePath = path.join(docsDir, doc.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  allMeta.splice(docIndex, 1);
  fs.writeFileSync(metaFile, JSON.stringify(allMeta, null, 2));
  res.json({ success: true, deleted: doc.originalName });
});

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
  res.status(500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`\n  🖼️  HAVYN Image Server running at http://localhost:${PORT}`);
  console.log(`  📁 Uploads stored in: ${uploadsDir}`);
  console.log(`  📂 Structure: uploads/residents/{residentId}/profile.jpg|aadhaar.jpg\n`);
});
