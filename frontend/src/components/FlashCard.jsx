import { useState, useRef } from 'react';
import { Star, Pencil, Trash2, Volume2, Copy, ClipboardCopy } from 'lucide-react';
import { ZoomableImage } from './ImageZoom';

// Paleta de cores para o card
const CARD_COLORS = [
  { label: 'Padrão',    value: null,      ring: 'ring-white/20',     dot: 'bg-slate-500' },
  { label: 'Azul',      value: '#3b82f6', ring: 'ring-blue-500/60',  dot: 'bg-blue-500'  },
  { label: 'Roxo',      value: '#8b5cf6', ring: 'ring-purple-500/60',dot: 'bg-purple-500'},
  { label: 'Verde',     value: '#10b981', ring: 'ring-emerald-500/60',dot: 'bg-emerald-500'},
  { label: 'Âmbar',     value: '#f59e0b', ring: 'ring-amber-500/60', dot: 'bg-amber-500' },
  { label: 'Rosa',      value: '#ec4899', ring: 'ring-pink-500/60',  dot: 'bg-pink-500'  },
  { label: 'Vermelho',  value: '#ef4444', ring: 'ring-red-500/60',   dot: 'bg-red-500'   },
];

// Nível → cor/label
const LEVEL_INFO = [
  { label: 'Novo',      dot: 'bg-slate-500',   text: 'text-slate-400'   },
  { label: 'Iniciando', dot: 'bg-red-500',      text: 'text-red-400'     },
  { label: 'Aprendendo',dot: 'bg-orange-500',   text: 'text-orange-400'  },
  { label: 'Praticando',dot: 'bg-amber-500',    text: 'text-amber-400'   },
  { label: 'Avançado',  dot: 'bg-emerald-500',  text: 'text-emerald-400' },
  { label: 'Dominado',  dot: 'bg-blue-500',     text: 'text-blue-400'    },
];

function AudioBtn({ src, side }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  if (!src) return null;
  const toggle = (e) => {
    e.stopPropagation();
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause(); audioRef.current.currentTime = 0; setPlaying(false); return;
    }
    const a = new Audio(src); audioRef.current = a;
    a.onended = () => setPlaying(false); a.onerror = () => setPlaying(false);
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

export default function FlashCard({ card, onFavorite, onEdit, onDuplicate, onDelete, onColorChange }) {
  const [flipped, setFlipped] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [copied, setCopied] = useState(false);

  const lvl = LEVEL_INFO[Math.min(card.level || 0, LEVEL_INFO.length - 1)];
  const showLevel = (card.level || 0) > 0;
  const accentColor = card.cardColor || null;
  const borderStyle = accentColor
    ? { borderColor: accentColor + '40', boxShadow: `0 0 0 1px ${accentColor}25` }
    : {};
  const frontAccent = accentColor
    ? { borderColor: accentColor + '40' }
    : {};

  const copyText = (e) => {
    e.stopPropagation();
    const text = flipped
      ? [card.back, card.notes].filter(Boolean).join('\n')
      : card.front;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="group relative h-52" style={{ perspective: '1000px' }}>
      {/* Indicador de cor — borda superior */}
      {accentColor && (
        <div className="absolute top-0 left-4 right-4 h-0.5 rounded-full z-10 transition-all"
          style={{ backgroundColor: accentColor }} />
      )}

      {/* Botões de ação */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Indicador de nível — não exibe quando é Novo */}
        {showLevel && (
          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wide ${lvl.text} opacity-60`}>
            <span className={`w-1.5 h-1.5 rounded-full ${lvl.dot}`} /> {lvl.label}
          </span>
        )}
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
            className="p-2 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Duplicar">
            <Copy size={14} />
          </button>
        )}
        <button onClick={copyText}
          className={`p-2 rounded-lg transition-all ${copied ? 'text-emerald-400' : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
          title="Copiar texto">
          <ClipboardCopy size={14} />
        </button>
        {/* Cor */}
        {onColorChange && (
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setShowColorPicker((v) => !v); }}
              className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all" title="Cor do card">
              <span className="w-3.5 h-3.5 rounded-full border border-white/30 block"
                style={{ backgroundColor: accentColor || 'transparent' }} />
            </button>
            {showColorPicker && (
              <div className="absolute right-0 top-full mt-1 glass border border-white/10 rounded-xl p-2 flex gap-1.5 z-30 shadow-xl"
                onClick={(e) => e.stopPropagation()}>
                {CARD_COLORS.map(({ value, dot, label }) => (
                  <button key={label} title={label}
                    onClick={(e) => { e.stopPropagation(); onColorChange(card, value); setShowColorPicker(false); }}
                    className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 ${dot} ${accentColor === value ? 'border-white' : 'border-transparent'}`} />
                ))}
              </div>
            )}
          </div>
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
          style={{ backfaceVisibility: 'hidden', ...frontAccent }}>
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Pergunta</span>
          <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-0 py-1">
            {card.frontImage && <ZoomableImage src={card.frontImage} alt="frente" className="max-h-20 max-w-full object-contain rounded-lg" />}
            {card.front && <p className="font-medium text-sm leading-relaxed line-clamp-3 text-center" style={{ color: 'var(--text)' }}>{card.front}</p>}
          </div>
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
            {card.notes && <p className="text-xs text-amber-400/70 italic text-center line-clamp-2 mt-1 px-1">📝 {card.notes}</p>}
          </div>
          <div className="flex items-center justify-between flex-shrink-0">
            <p className="text-blue-500/40 text-xs">Clique para voltar</p>
            <AudioBtn src={card.backAudio} side="back" />
          </div>
        </div>
      </div>
    </div>
  );
}