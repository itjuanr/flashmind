import { Loader2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const sizes = {
  sm: 'px-3 py-2 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2.5 text-sm gap-2 rounded-xl',
  lg: 'px-6 py-3.5 text-sm gap-2 rounded-xl',
};

function variantCls(variant, isDark) {
  switch (variant) {
    case 'primary':
      return 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-[0_0_20px_rgba(37,99,235,0.18)] hover:shadow-[0_0_24px_rgba(37,99,235,0.28)]';
    case 'danger':
      return isDark
        ? 'bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 text-red-400'
        : 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600';
    case 'dangerSolid':
      return 'bg-red-500 hover:bg-red-400 active:bg-red-600 text-white';
    case 'ghost':
      return isDark
        ? 'text-slate-400 hover:text-white hover:bg-white/8'
        : 'text-slate-500 hover:text-slate-900 hover:bg-black/6';
    case 'secondary':
    default:
      return isDark
        ? 'bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300'
        : 'bg-black/3 hover:bg-black/6 border border-black/8 text-slate-600';
  }
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon: Icon,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...rest
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition-all
        disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none
        ${sizes[size]} ${variantCls(variant, isDark)} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : Icon ? <Icon size={15} /> : null}
      {children}
    </button>
  );
}
