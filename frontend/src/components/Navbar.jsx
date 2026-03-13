import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import GlobalSearch from './GlobalSearch';
import { Sparkles, LayoutDashboard, Star, LogOut, ChevronDown, Menu, X, Sun, Moon, BarChart2, Bell, Mail } from 'lucide-react';
import api from '../services/api';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/favorites', label: 'Favoritos', icon: Star },
  { to: '/stats',     label: 'Stats',     icon: BarChart2 },
  { to: '/contact',   label: 'Contato',   icon: Mail },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [dueTotal, setDueTotal]         = useState(0);
  const dropdownRef = useRef(null);
  const isDark = theme === 'dark';

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fecha menu mobile ao navegar
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Badge de cards vencidos
  useEffect(() => {
    const fetch = () => api.get('/study/stats').then((r) => setDueTotal(r.data.dueTotal || 0)).catch(() => {});
    fetch();
    const id = setInterval(fetch, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };
  const initials = user?.name ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : '?';

  // Cores sólidas para navbar (sem glass)
  const navBg    = isDark ? 'bg-[#0F0F18]' : 'bg-white';
  const navBorder= isDark ? 'border-white/10' : 'border-black/10';
  const dropBg   = isDark ? 'bg-[#0F0F18]' : 'bg-white';
  const mobileBg = isDark ? 'bg-[#0F0F18]' : 'bg-white';

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* ── Navbar principal ── */}
      <nav className={`mx-4 mt-4 ${navBg} rounded-2xl border ${navBorder} px-5 py-3 flex items-center justify-between shadow-lg`}>

        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 group flex-shrink-0">
          <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400 group-hover:bg-blue-500/25 transition-colors">
            <Sparkles size={18} />
          </div>
          <span className={`font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
            Flash<span className="text-blue-400">Mind</span>
          </span>
        </Link>

        {/* Links Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + '/');
            return (
              <Link key={to} to={to}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-500/15 text-blue-400'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-white/8' : 'text-slate-500 hover:text-slate-900 hover:bg-black/6'
                }`}>
                <Icon size={15} /> {label}
              </Link>
            );
          })}
        </div>

        {/* Direita */}
        <div className="flex items-center gap-1.5">
          {/* Busca */}
          <GlobalSearch />

          {/* Badge vencidos */}
          {dueTotal > 0 && (
            <Link to="/dashboard" title={`${dueTotal} card${dueTotal > 1 ? 's' : ''} para revisar`}
              className="relative p-2 rounded-xl text-amber-400 hover:bg-amber-500/10 transition-all">
              <Bell size={17} />
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                {dueTotal > 99 ? '99+' : dueTotal}
              </span>
            </Link>
          )}

          {/* Toggle tema */}
          <button onClick={toggle} title={isDark ? 'Modo claro' : 'Modo escuro'}
            className={`p-2 rounded-xl transition-all ${isDark ? 'text-slate-400 hover:text-yellow-300 hover:bg-yellow-400/10' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-500/10'}`}>
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Avatar + Dropdown (desktop) */}
          <div ref={dropdownRef} className="relative hidden md:block">
            <button onClick={() => setDropdownOpen((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/8' : 'hover:bg-black/6'}`}>
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {initials}
              </div>
              <span className={`text-sm font-medium max-w-[80px] truncate ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {user?.name?.split(' ')[0]}
              </span>
              <ChevronDown size={14} className={`transition-transform text-slate-500 flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className={`absolute right-0 top-full mt-2 w-52 ${dropBg} rounded-2xl border shadow-2xl overflow-hidden z-50 ${isDark ? 'border-white/10' : 'border-black/8'}`}>
                <div className={`px-4 py-3 border-b ${isDark ? 'border-white/8' : 'border-black/6'}`}>
                  <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{user?.name}</p>
                  <p className="text-slate-500 text-xs truncate">{user?.email}</p>
                </div>
                <Link to="/contact" onClick={() => setDropdownOpen(false)}
                  className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors ${isDark ? 'text-slate-300 hover:bg-white/8' : 'text-slate-600 hover:bg-black/5'}`}>
                  <Mail size={15} className="text-slate-500" /> Contato / Suporte
                </Link>
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/5">
                  <LogOut size={15} /> Sair
                </button>
              </div>
            )}
          </div>

          {/* Hamburger mobile */}
          <button
            className={`md:hidden p-2 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/8' : 'text-slate-500 hover:text-slate-900 hover:bg-black/6'}`}
            onClick={() => setMobileOpen((v) => !v)}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* ── Menu mobile ── */}
      {mobileOpen && (
        <div className={`md:hidden mx-4 mt-1 ${mobileBg} rounded-2xl border ${navBorder} p-3 flex flex-col gap-1 shadow-2xl`}>
          {/* Info usuário */}
          <div className={`flex items-center gap-3 px-3 py-3 mb-1 rounded-xl ${isDark ? 'bg-white/4' : 'bg-black/3'}`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{user?.name}</p>
              <p className="text-slate-500 text-xs truncate">{user?.email}</p>
            </div>
          </div>

          {navLinks.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-500/15 text-blue-400'
                    : isDark ? 'text-slate-300 hover:bg-white/8 hover:text-white' : 'text-slate-600 hover:bg-black/5 hover:text-slate-900'
                }`}>
                <Icon size={16} /> {label}
              </Link>
            );
          })}

          <div className={`border-t mt-1 pt-1 ${isDark ? 'border-white/8' : 'border-black/6'}`}>
            <Link to="/contact" onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm transition-colors ${isDark ? 'text-slate-300 hover:bg-white/8' : 'text-slate-600 hover:bg-black/5'}`}>
              <Mail size={16} className="text-slate-500" /> Contato / Suporte
            </Link>
            <button onClick={toggle}
              className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm transition-colors ${isDark ? 'text-yellow-300 hover:bg-yellow-400/10' : 'text-blue-500 hover:bg-blue-500/10'}`}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
              {isDark ? 'Modo claro' : 'Modo escuro'}
            </button>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors">
              <LogOut size={16} /> Sair da conta
            </button>
          </div>
        </div>
      )}
    </header>
  );
}