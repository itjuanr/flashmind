import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

// ─── Componente de Select com Busca ────────────────────────────────────────────
export default function SearchableSelect({ options, value, onChange, placeholder, icon: Icon, isDark }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  const inputCls = `w-full border px-4 py-3 rounded-xl outline-none transition-all text-sm text-left flex justify-between items-center ${
    isDark
      ? 'bg-white/4 border-white/8 focus:border-blue-500/50'
      : 'bg-black/3 border-black/8 focus:border-blue-500/50'
  } ${Icon ? 'pl-9' : ''}`;

  return (
    <div className="relative" ref={selectRef}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className={inputCls}>
        {Icon && <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />}
        <span className={selectedOption && selectedOption.value ? (isDark ? 'text-white' : 'text-slate-800') : 'text-slate-500'}>
          {selectedOption ? `${selectedOption.icon} ${selectedOption.label}` : placeholder}
        </span>
        <ChevronDown size={14} className={`text-slate-500 pointer-events-none transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute top-full mt-2 w-full rounded-2xl border shadow-2xl z-20 overflow-hidden ${isDark ? 'bg-[#0F0F18] border-white/10' : 'bg-white border-black/8'}`}>
          <div className="p-2">
            <input
              type="text"
              placeholder="Buscar matéria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className={`w-full border px-3 py-2 rounded-lg outline-none text-xs transition-all ${
                isDark
                  ? 'bg-white/4 border-white/8 focus:border-blue-500/50 text-white placeholder-slate-500'
                  : 'bg-black/3 border-black/8 focus:border-blue-500/50 text-slate-800 placeholder-slate-400'
              }`}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0
              ? filteredOptions.map(opt => (
                  <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${ value === opt.value ? 'bg-blue-500/10 text-blue-400' : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-black/4' }`}>
                    <span className="text-base">{opt.icon}</span> <span>{opt.label}</span>
                  </button>
                ))
              : <p className="text-center text-xs text-slate-500 py-3">Nenhuma matéria encontrada</p>}
          </div>
        </div>
      )}
    </div>
  );
}