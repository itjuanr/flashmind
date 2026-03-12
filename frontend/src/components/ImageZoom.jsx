import { useEffect, useState } from 'react';
import { X, ZoomIn } from 'lucide-react';

export function ImageZoom({ src, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/92 z-[200] flex items-center justify-center p-6 cursor-zoom-out"
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all">
        <X size={20} />
      </button>
      <img src={src} alt="zoom" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

export function ZoomableImage({ src, alt, className }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="relative group/zoom cursor-zoom-in inline-block" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        <img src={src} alt={alt} className={className} />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/zoom:opacity-100 transition-opacity bg-black/20 rounded-xl">
          <ZoomIn size={18} className="text-white drop-shadow" />
        </div>
      </div>
      {open && <ImageZoom src={src} onClose={() => setOpen(false)} />}
    </>
  );
}