import { useState, useRef } from 'react';
import { Star, Pencil, Trash2, Volume2, Copy } from 'lucide-react';
import { ZoomableImage } from './ImageZoom';

function AudioBtn({ src, side }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  if (!src) return null;

  const toggle = (e) => {
    e.stopPropagation();
    // Se já está tocando, para
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
      return;
    }
    // Cria nova instância só se não há uma rodando
    const a = new Audio(src);
    audioRef.current = a;
    a.onended = () => setPlaying(false);
    a.onerror = () => setPlaying(false);
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };
  const colors = side === 'front'
    ? 'text-slate-500 hover:text-white hover:bg-white/10'
    : 'text-blue-400/60 hover:text-blue-300 hover:bg-blue-500/10';
  return (
    <button onClick={toggle} title="Ouvir áudio"
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-medium transition-all flex-shrink-0 ${colors} ${playing ? 'animate-pulse' : ''}`}>
      <Volume2 size={11} /> {playing ? 'Tocando...' : 'Ouvir'}
    </button>
  );
}

export default function FlashCard({ card, onFavorite, onEdit, onDuplicate, onDelete }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="group relative h-52" style={{ perspective: '1000px' }}>

      {/* Botões de ação — aparecem no hover, topo direito */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onFavorite?.(card); }}
          className={`p-2 rounded-lg transition-all hover:bg-white/10 ${card.isFavorite ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'}`}>
          <Star size={14} fill={card.isFavorite ? 'currentColor' : 'none'} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onEdit?.(card); }}
          className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all">
          <Pencil size={14} />
        </button>
        {onDuplicate && (
          <button onClick={(e) => { e.stopPropagation(); onDuplicate?.(card); }}
            className="p-2 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Duplicar card">
            <Copy size={14} />
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onDelete?.(card); }}
          className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Wrapper que gira */}
      <div
        className="relative w-full h-full transition-transform duration-500 cursor-pointer"
        style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        onClick={() => setFlipped((v) => !v)}
      >
        {/* FRENTE */}
        <div className="absolute inset-0 glass rounded-2xl border border-white/5 p-5 flex flex-col justify-between overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}>
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Pergunta</span>
          <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-0 py-1">
            {card.frontImage && <ZoomableImage src={card.frontImage} alt="frente" className="max-h-20 max-w-full object-contain rounded-lg" />}
            {card.front && <p className="font-medium text-sm leading-relaxed line-clamp-3 text-center" style={{ color: 'var(--text)' }}>{card.front}</p>}
          </div>
          {/* Rodapé: hint + áudio lado a lado */}
          <div className="flex items-center justify-between flex-shrink-0">
            <p className="text-slate-600 text-xs">Clique para ver a resposta</p>
            <AudioBtn src={card.frontAudio} side="front" />
          </div>
        </div>

        {/* VERSO */}
        <div className="absolute inset-0 glass rounded-2xl border border-blue-500/20 p-5 flex flex-col justify-between overflow-hidden"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'rgba(79, 142, 247, 0.04)' }}>
          <span className="text-[10px] font-bold text-blue-500/60 uppercase tracking-widest">Resposta</span>
          <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-0 py-1">
            {card.backImage && <ZoomableImage src={card.backImage} alt="verso" className="max-h-20 max-w-full object-contain rounded-lg" />}
            {card.back && <p className="font-medium text-sm leading-relaxed line-clamp-3 text-center" style={{ color: 'var(--text)' }}>{card.back}</p>}
            {card.notes && (
              <p className="text-xs text-amber-400/70 italic text-center line-clamp-2 mt-1 px-1">📝 {card.notes}</p>
            )}
          </div>
          {/* Rodapé: hint + áudio lado a lado */}
          <div className="flex items-center justify-between flex-shrink-0">
            <p className="text-blue-500/40 text-xs">Clique para voltar</p>
            <AudioBtn src={card.backAudio} side="back" />
          </div>
        </div>
      </div>
    </div>
  );
}