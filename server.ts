import express from 'express';
import path from 'path';

const app = express();
app.use(express.json());
const PORT = 3000;

export default app;

// Serve the actual M3U8 file statelessly from base64 data
app.get(['/api/generate.m3u8', '/generate.m3u8'], (req, res) => {
  try {
    const dataParam = req.query.data as string;
    if (!dataParam) return res.status(400).send('Missing data');

    // Decode base64
    const decoded = Buffer.from(dataParam, 'base64').toString('utf-8');
    const data = JSON.parse(decoded);

    const urls = data.u || [];
    const duration = data.d || 10;
    const isLive = data.l || false;

    let content = `#EXTM3U\n`;
    
    if (isLive) {
      // Standard IPTV format for continuous streams
      urls.forEach((url: string, index: number) => {
        content += `#EXTINF:-1,Live Stream ${index + 1}\n${url}\n`;
      });
    } else {
      // Standard HLS VOD Playlist (Chunked TS segments)
      const targetDuration = Math.ceil(Number(duration) || 10);
      content += `#EXT-X-VERSION:3\n`;
      content += `#EXT-X-TARGETDURATION:${targetDuration}\n`;
      content += `#EXT-X-MEDIA-SEQUENCE:0\n`;
      content += `#EXT-X-PLAYLIST-TYPE:VOD\n`;
  
      urls.forEach((url: string) => {
        const exactDuration = Number(duration).toFixed(3);
        content += `#EXTINF:${exactDuration},\n${url}\n`;
      });
      content += `#EXT-X-ENDLIST\n`;
    }

    // Provide proper content type so media players recognize it
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow cross-origin for web players
    res.send(content);
  } catch (err) {
    console.error('Error generating playlist:', err);
    res.status(500).send('Invalid data format');
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
