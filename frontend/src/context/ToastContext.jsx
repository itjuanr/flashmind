import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';
import { useTheme } from './ThemeContext';

const ToastContext = createContext(null);

const icons = {
  success: <CheckCircle2 size={17} className="text-emerald-400 flex-shrink-0" />,
  error:   <XCircle      size={17} className="text-red-400 flex-shrink-0" />,
  info:    <AlertCircle  size={17} className="text-blue-400 flex-shrink-0" />,
};

const styles = {
  dark: {
    success: 'border-emerald-500/25 bg-emerald-500/10',
    error:   'border-red-500/25 bg-red-500/10',
    info:    'border-blue-500/25 bg-blue-500/10',
  },
  light: {
    success: 'border-emerald-500/30 bg-emerald-50',
    error:   'border-red-500/30 bg-red-50',
    info:    'border-blue-500/30 bg-blue-50',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    // Contador em vez de Date.now(): dois toasts no mesmo milissegundo
    // gerariam a mesma key e o React descartaria um deles.
    const id = ++nextId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => remove(id), duration);
  }, [remove]);

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Banner de toasts — centralizado no topo, logo acima do conteúdo.
          pointer-events-none no container deixa clicar através da faixa vazia. */}
      <div className="fixed top-24 left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto w-full max-w-md flex items-center gap-3 px-4 py-3 rounded-xl border glass shadow-lg text-sm animate-slide-down ${
              styles[isDark ? 'dark' : 'light'][t.type]
            } ${isDark ? 'text-white' : 'text-slate-800'}`}
          >
            {icons[t.type]}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              aria-label="Fechar aviso"
              className={`flex-shrink-0 transition-colors ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
