import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createClient } from 'redis';

// Note: For Vercel, you need to provide REDIS_URL in environment variables
const redisClient = process.env.REDIS_URL ? createClient({ url: process.env.REDIS_URL }) : createClient();
redisClient.on('error', err => console.log('Redis Client Error', err));
redisClient.connect().catch(console.error);

// Fallback memory storage if Redis isn't configured
const memoryStore = new Map<string, string>();

const app = express();
app.use(express.json());
const PORT = 3000;

export default app;

// Generate the shareable M3U8 link
app.post('/api/save', async (req, res) => {
  const { name, urls, duration, isLive } = req.body;
  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({ error: 'urls array is required' });
  }

  // Generate a clean ID from name or fallback to a random string
  let id = name ? name.replace(/[^a-zA-Z0-9_-]/g, '-') : crypto.randomBytes(4).toString('hex');
  
  const data = JSON.stringify({
    urls,
    duration: duration || 10,
    isLive: isLive || false,
    createdAt: new Date().toISOString()
  });

  try {
    if (process.env.REDIS_URL) {
      await redisClient.set(id, data);
    } else {
      memoryStore.set(id, data);
    }
    res.json({ id, url: `/api/p/${id}.m3u8` });
  } catch (err) {
    console.error('Error saving playlist:', err);
    res.status(500).json({ error: 'Failed to save playlist' });
  }
});

// Serve the actual M3U8 file
app.get('/api/p/:id.m3u8', async (req, res) => {
  const id = req.params.id;
  
  try {
    let rawData = null;
    if (process.env.REDIS_URL) {
      rawData = await redisClient.get(id);
    } else {
      rawData = memoryStore.get(id);
    }
    
    if (!rawData) {
      return res.status(404).send('Playlist not found');
    }

    const data = JSON.parse(rawData);
    let content = `#EXTM3U\n`;
    
    if (data.isLive) {
      // Standard IPTV format for continuous streams
      data.urls.forEach((url: string, index: number) => {
        content += `#EXTINF:-1,Live Stream ${index + 1}\n${url}\n`;
      });
    } else {
      // Standard HLS VOD Playlist (Chunked TS segments)
      const targetDuration = Math.ceil(Number(data.duration) || 10);
      content += `#EXT-X-VERSION:3\n`;
      content += `#EXT-X-TARGETDURATION:${targetDuration}\n`;
      content += `#EXT-X-MEDIA-SEQUENCE:0\n`;
      content += `#EXT-X-PLAYLIST-TYPE:VOD\n`;
  
      data.urls.forEach((url: string) => {
        const exactDuration = Number(data.duration).toFixed(3);
        content += `#EXTINF:${exactDuration},\n${url}\n`;
      });
      content += `#EXT-X-ENDLIST\n`;
    }

    // Provide proper content type so media players recognize it
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow cross-origin for web players
    res.send(content);
  } catch (err) {
    console.error('Error retrieving playlist:', err);
    res.status(500).send('Internal Server Error');
  }
});

async function startServer() {
  // If running in Vercel Serverless Functions, do not bind to port or use Vite middleware.
  if (process.env.VERCEL) {
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
