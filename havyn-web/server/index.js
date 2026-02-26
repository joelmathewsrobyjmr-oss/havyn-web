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

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Serve uploaded images
app.use('/uploads', express.static(uploadsDir));

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDir = req.params.type || 'general';
    const dir = path.join(uploadsDir, subDir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only image files (JPG, PNG, GIF, WebP) are allowed.'));
  }
});

// Upload: POST /api/upload/:type
app.post('/api/upload/:type', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const imageUrl = `http://localhost:${PORT}/uploads/${req.params.type}/${req.file.filename}`;
  res.json({ success: true, imageUrl, filename: req.file.filename });
});

// Delete: DELETE /api/upload/:type/:filename
app.delete('/api/upload/:type/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.type, req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'File not found.' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
  res.status(500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`\n  🖼️  HAVYN Image Server running at http://localhost:${PORT}`);
  console.log(`  📁 Uploads stored in: ${uploadsDir}\n`);
});
