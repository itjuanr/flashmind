import { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
};

/**
 * Casca de modal com o comportamento que os modais soltos do app não tinham:
 * fecha no Esc, fecha ao clicar no backdrop, trava o scroll do fundo e
 * devolve o foco ao elemento que abriu.
 */
export default function Modal({
  onClose,
  size = 'sm',
  children,
  labelledBy,
  className = '',
  dismissable = true,
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const panelRef = useRef(null);
  const openerRef = useRef(null);

  useEffect(() => {
    openerRef.current = document.activeElement;

    const onKey = (e) => {
      if (e.key === 'Escape' && dismissable) onClose?.();
    };
    document.addEventListener('keydown', onKey);

    // Trava o scroll do fundo sem deslocar o layout quando há scrollbar.
    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      openerRef.current?.focus?.();
    };
  }, [onClose, dismissable]);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-backdrop-in"
      onMouseDown={(e) => {
        if (dismissable && !panelRef.current?.contains(e.target)) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`w-full ${sizes[size]} rounded-2xl border animate-panel-in ${
          isDark
            ? 'bg-[#0F0F18] border-white/10 shadow-2xl shadow-black/50'
            : 'bg-white border-black/8 shadow-2xl shadow-black/10'
        } ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
