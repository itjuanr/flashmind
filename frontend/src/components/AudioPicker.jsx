import { useState, useRef } from 'react';
import { Mic, MicOff, Play, Pause, Trash2, Upload } from 'lucide-react';

export default function AudioPicker({ value, onChange, label }) {
  const [recording, setRecording] = useState(false);
  const [playing,   setPlaying]   = useState(false);
  const mediaRef  = useRef(null);
  const audioRef  = useRef(null);
  const chunksRef = useRef([]);
  const fileRef   = useRef();

  // ── Gravação ─────────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Tenta webm, senão usa o padrão do browser
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => onChange(reader.result); // Base64 completo
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      alert('Permita acesso ao microfone para gravar áudio.');
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { alert('Áudio muito grande. Máx 8MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };

  // ── Playback ──────────────────────────────────────────────────────────────
  const togglePlay = (e) => {
    e.stopPropagation();
    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
      return;
    }
    const a = new Audio(value);
    a.onended = () => setPlaying(false);
    a.onerror = () => setPlaying(false);
    audioRef.current = a;
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  const clear = (e) => {
    e?.stopPropagation();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlaying(false);
    onChange(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-2">{label}</label>

      {value ? (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <button type="button" onClick={togglePlay}
            className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 transition-all flex-shrink-0">
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <span className={`text-xs flex-1 ${playing ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`}>
            {playing ? 'Reproduzindo...' : '🎵 Áudio gravado'}
          </span>
          <button type="button" onClick={clear}
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0">
            <Trash2 size={13} />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button type="button"
            onClick={recording ? stopRecording : startRecording}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all flex-1 justify-center ${
              recording
                ? 'bg-red-500/15 border-red-500/30 text-red-400 animate-pulse'
                : 'border-white/8 text-slate-500 hover:border-white/15 hover:text-white'
            }`}>
            {recording ? <><MicOff size={13} /> Parar gravação</> : <><Mic size={13} /> Gravar</>}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/8 text-slate-500 hover:border-white/15 hover:text-white text-xs font-medium transition-all">
            <Upload size={13} /> Upload
          </button>
          <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={handleFile} />
        </div>
      )}
    </div>
  );
}