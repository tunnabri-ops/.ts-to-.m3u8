export default function handler(req: any, res: any) {
  // CORS Headers for Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const dataParam = req.query.data as string;
    if (!dataParam) return res.status(400).send('Missing data');

    // Decode URL-encoded base64 safely before parsing
    const decodedBase64 = decodeURIComponent(dataParam);
    const decoded = Buffer.from(decodedBase64, 'base64').toString('utf-8');
    const data = JSON.parse(decoded);

    const urls = data.u || [];
    const duration = data.d || 10;
    const isLive = data.l || false;

    let content = `#EXTM3U\n`;
    
    if (isLive) {
      urls.forEach((url: string, index: number) => {
        content += `#EXTINF:-1,Live Stream ${index + 1}\n${url}\n`;
      });
    } else {
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

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.status(200).send(content);
  } catch (err) {
    console.error('Error generating playlist:', err);
    res.status(500).send('Invalid data format');
  }
}
