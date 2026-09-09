import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
try {
  initializeApp({
    projectId: 'ai-studio-tstom3u8converte-6f749cff-df19-41d3-9c06-2f03bdfee7d6'
  });
} catch (error) {
  console.error('Firebase initialization error', error);
}

const db = getFirestore();

const app = express();
app.use(express.json());
const PORT = 3000;

// Generate the shareable M3U8 link
app.post('/api/save', async (req, res) => {
  const { name, urls, duration } = req.body;
  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({ error: 'urls array is required' });
  }

  // Generate a clean ID from name or fallback to a random string
  let id = name ? name.replace(/[^a-zA-Z0-9_-]/g, '-') : crypto.randomBytes(4).toString('hex');
  
  try {
    // Handle simple collisions
    const docRef = db.collection('playlists').doc(id);
    const docSnap = await docRef.get();
    
    if (docSnap.exists && !name) {
        id = crypto.randomBytes(5).toString('hex');
    }

    await db.collection('playlists').doc(id).set({ 
      urls, 
      duration: duration || 10,
      createdAt: new Date().toISOString()
    });
    
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
    const docSnap = await db.collection('playlists').doc(id).get();
    
    if (!docSnap.exists) {
      return res.status(404).send('Playlist not found');
    }

    const data = docSnap.data() as { urls: string[], duration: number };
    const targetDuration = Math.ceil(Number(data.duration) || 10);
    
    let content = `#EXTM3U\n`;
    content += `#EXT-X-VERSION:3\n`;
    content += `#EXT-X-TARGETDURATION:${targetDuration}\n`;
    content += `#EXT-X-MEDIA-SEQUENCE:0\n`;
    content += `#EXT-X-PLAYLIST-TYPE:VOD\n`;

    data.urls.forEach((url: string) => {
      // Use exact duration if possible, some players are strict. Let's make sure it's a float.
      const exactDuration = Number(data.duration).toFixed(3);
      content += `#EXTINF:${exactDuration},\n${url}\n`;
    });
    content += `#EXT-X-ENDLIST\n`;

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
  if (process.env.NODE_ENV !== 'production') {
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
