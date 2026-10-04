import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // In-memory message store matching FastAPI spec with level support
  let latestMessage = {
    message: "Class has started",
    level: "normal" as 'emergency' | 'normal' | 'casual',
    timestamp: new Date().toISOString()
  };

  app.use(express.json());

  // Enable CORS for all incoming requests (local LAN and cross-laptop access)
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Master Prompt API Endpoints
  // POST /admin-message
  app.post('/admin-message', (req, res) => {
    const { message, level } = req.body || {};
    if (typeof message === 'string') {
      latestMessage.message = message;
      if (level === 'emergency' || level === 'normal' || level === 'casual') {
        latestMessage.level = level;
      } else {
        const lower = message.toLowerCase();
        if (lower.includes('emergency') || lower.includes('danger') || lower.includes('evacuat') || lower.includes('urgent') || lower.includes('shelter')) {
          latestMessage.level = 'emergency';
        } else if (lower.includes('fest') || lower.includes('cafeteria') || lower.includes('lunch') || lower.includes('match') || lower.includes('casual') || lower.includes('club')) {
          latestMessage.level = 'casual';
        } else {
          latestMessage.level = 'normal';
        }
      }
      latestMessage.timestamp = new Date().toISOString();
    }
    return res.json({
      status: "success",
      from: "admin",
      message: latestMessage.message,
      level: latestMessage.level,
      timestamp: latestMessage.timestamp
    });
  });

  // GET /admin-message
  app.get('/admin-message', (req, res) => {
    return res.json({
      message: latestMessage.message,
      level: latestMessage.level || 'normal',
      timestamp: latestMessage.timestamp
    });
  });

  // GET /api or GET / (when requested via Accept: application/json)
  app.get('/api', (req, res) => {
    return res.json({
      status: "online",
      message: "Campus WiFi Watch Server is running"
    });
  });

  // Allow direct API status check at root with query or accept header
  app.get('/', (req, res, next) => {
    if (req.headers.accept === 'application/json' || req.query.format === 'json') {
      return res.json({
        status: "online",
        message: "Campus WiFi Watch Server is running"
      });
    }
    next();
  });

  // Serve the standalone dashboard HTML files directly
  app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));
  app.use('/CampusWiFiWatch/dashboard', express.static(path.join(__dirname, 'CampusWiFiWatch/dashboard')));

  // Vite development middleware or production static build
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Campus WiFi Watch Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
