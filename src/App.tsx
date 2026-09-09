import React, { useState } from 'react';
import { FileVideo, Copy, Download, CheckCircle2, ListPlus } from 'lucide-react';

export default function App() {
  const [tsUrls, setTsUrls] = useState('');
  const [duration, setDuration] = useState('10.0');
  const [copied, setCopied] = useState(false);

  const generateM3u8 = () => {
    if (!tsUrls.trim()) return '';
    const urls = tsUrls
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    const targetDuration = Math.ceil(Number(duration) || 10);

    let content = `#EXTM3U\n`;
    content += `#EXT-X-VERSION:3\n`;
    content += `#EXT-X-TARGETDURATION:${targetDuration}\n`;
    content += `#EXT-X-MEDIA-SEQUENCE:0\n`;

    urls.forEach((url) => {
      content += `#EXTINF:${duration},\n${url}\n`;
    });

    content += `#EXT-X-ENDLIST`;
    return content;
  };

  const m3u8Content = generateM3u8();

  const handleCopy = () => {
    if (!m3u8Content) return;
    navigator.clipboard.writeText(m3u8Content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!m3u8Content) return;
    const blob = new Blob([m3u8Content], { type: 'application/x-mpegURL' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'playlist.m3u8';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex items-center space-x-3 mb-8">
          <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-sm">
            <FileVideo className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">TS to M3U8 Converter</h1>
            <p className="text-slate-500 mt-1">Convert .ts video URLs into a valid .m3u8 playlist format.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            <div>
              <label htmlFor="ts-urls" className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                <ListPlus className="w-4 h-4 mr-2" />
                Paste .ts URLs (One per line)
              </label>
              <textarea
                id="ts-urls"
                value={tsUrls}
                onChange={(e) => setTsUrls(e.target.value)}
                placeholder="https://example.com/video_segment_1.ts&#10;https://example.com/video_segment_2.ts"
                className="w-full h-64 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none font-mono text-sm"
              />
            </div>

            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-slate-700 mb-2">
                Segment Duration (seconds)
              </label>
              <input
                id="duration"
                type="number"
                step="0.1"
                min="0.1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
              <p className="text-xs text-slate-500 mt-2">
                Used for the #EXTINF tag. If you don't know the exact duration, a placeholder like 10.0 usually works for basic playback.
              </p>
            </div>
          </section>

          {/* Output Section */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">Generated .m3u8 Playlist</label>
            </div>
            
            <div className="relative flex-grow">
              <textarea
                readOnly
                value={m3u8Content}
                placeholder="#EXTM3U&#10;#EXT-X-VERSION:3&#10;..."
                className="w-full h-full min-h-[16rem] px-4 py-3 bg-slate-900 text-slate-100 border border-slate-800 rounded-xl focus:ring-0 outline-none resize-none font-mono text-sm leading-relaxed"
              />
              
              {!m3u8Content && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-slate-500 text-sm">Output will appear here...</p>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={handleCopy}
                disabled={!m3u8Content}
                className="flex-1 flex items-center justify-center px-4 py-2.5 bg-indigo-50 text-indigo-600 font-medium rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {copied ? <CheckCircle2 className="w-5 h-5 mr-2" /> : <Copy className="w-5 h-5 mr-2" />}
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              
              <button
                onClick={handleDownload}
                disabled={!m3u8Content}
                className="flex-1 flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5 mr-2" />
                Download .m3u8
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
