import React, { useState, useMemo } from 'react';
import { FileVideo, Copy, Download, CheckCircle2, ListPlus, Link as LinkIcon, Loader2 } from 'lucide-react';

export default function App() {
  const [tsUrls, setTsUrls] = useState('');
  const [duration, setDuration] = useState('10.0');
  const [playlistName, setPlaylistName] = useState('');
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareableLink, setShareableLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const m3u8Content = useMemo(() => {
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
    content += `#EXT-X-PLAYLIST-TYPE:VOD\n`;

    urls.forEach((url) => {
      const exactDuration = Number(duration).toFixed(3);
      content += `#EXTINF:${exactDuration},\n${url}\n`;
    });

    content += `#EXT-X-ENDLIST\n`;
    return content;
  }, [tsUrls, duration]);

  const copyToClipboard = (text: string, setStatus: (val: boolean) => void) => {
    if (!text) return;

    if (!navigator.clipboard) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setStatus(true);
        setTimeout(() => setStatus(false), 2000);
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
        alert("Copying failed in this browser. Please select the text and copy manually.");
      }
      document.body.removeChild(textArea);
      return;
    }

    navigator.clipboard.writeText(text)
      .then(() => {
        setStatus(true);
        setTimeout(() => setStatus(false), 2000);
      })
      .catch(err => {
        console.error('Async: Could not copy text: ', err);
      });
  };

  const handleCopyRaw = () => copyToClipboard(m3u8Content, setCopied);
  const handleCopyLink = () => copyToClipboard(shareableLink, setLinkCopied);

  const handleDownload = () => {
    if (!m3u8Content) return;
    const blob = new Blob([m3u8Content], { type: 'application/vnd.apple.mpegurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${playlistName || 'playlist'}.m3u8`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateOnlineLink = async () => {
    if (!tsUrls.trim()) return;
    setIsLoading(true);
    setShareableLink('');
    const urls = tsUrls
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
      
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: playlistName.trim(), 
          urls, 
          duration: Number(duration) || 10 
        })
      });
      const data = await res.json();
      if (data.url) {
        // Create full absolute URL for sharing
        setShareableLink(window.location.origin + data.url);
      } else {
        throw new Error(data.error || 'Failed to generate link');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate shareable link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex items-center space-x-3 mb-8">
          <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-sm">
            <FileVideo className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">TS to M3U8 Generator</h1>
            <p className="text-slate-500 mt-1">Convert .ts URLs into playable .m3u8 playlists & shareable links.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Input Section */}
          <section className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
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
                className="w-full h-64 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none font-mono text-sm leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="playlistName" className="block text-sm font-medium text-slate-700 mb-2">
                  Custom Name (Optional)
                </label>
                <input
                  id="playlistName"
                  type="text"
                  placeholder="e.g. Bachelor-EP-105"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-slate-700 mb-2">
                  Segment Duration (sec)
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
              </div>
            </div>
            
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={generateOnlineLink}
                disabled={!m3u8Content || isLoading}
                className="w-full flex items-center justify-center px-4 py-3.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <LinkIcon className="w-5 h-5 mr-2" />
                )}
                Generate Shareable Link
              </button>
            </div>
            
            {shareableLink && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="overflow-hidden mr-4">
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">Your Link is Ready</p>
                  <a href={shareableLink} target="_blank" rel="noreferrer" className="text-emerald-700 font-mono text-sm truncate block hover:underline">
                    {shareableLink}
                  </a>
                </div>
                <button
                  onClick={handleCopyLink}
                  className="shrink-0 p-2.5 bg-white text-emerald-700 rounded-lg shadow-sm border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  title="Copy link"
                >
                  {linkCopied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            )}
          </section>

          {/* Output Section */}
          <section className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-slate-700">Raw .m3u8 Output</label>
            </div>
            
            <div className="relative flex-grow">
              <textarea
                readOnly
                value={m3u8Content}
                placeholder="#EXTM3U&#10;#EXT-X-VERSION:3&#10;..."
                className="w-full h-full min-h-[16rem] lg:min-h-0 px-4 py-3 bg-slate-900 text-slate-100 border border-slate-800 rounded-xl focus:ring-0 outline-none resize-none font-mono text-sm leading-relaxed"
              />
              
              {!m3u8Content && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-slate-500 text-sm">Output will appear here...</p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
              <button
                onClick={handleCopyRaw}
                disabled={!m3u8Content}
                className="w-full sm:flex-1 flex items-center justify-center px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {copied ? <CheckCircle2 className="w-5 h-5 mr-2" /> : <Copy className="w-5 h-5 mr-2" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              
              <button
                onClick={handleDownload}
                disabled={!m3u8Content}
                className="w-full sm:flex-1 flex items-center justify-center px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5 mr-2" />
                Download
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
