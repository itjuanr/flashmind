import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import GlobalSearch from './GlobalSearch';
import { Sparkles, LayoutDashboard, Star, LogOut, ChevronDown, Menu, X, Sun, Moon, BarChart2 } from 'lucide-react';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/favorites', label: 'Favoritos', icon: Star },
  { to: '/stats',     label: 'Stats',     icon: BarChart2 },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const isDark = theme === 'dark';

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav className={`mx-4 mt-4 glass rounded-2xl border px-6 py-3 flex items-center justify-between ${
        isDark ? 'border-white/8' : 'border-black/8'
      }`}>
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
            <Sparkles size={18} />
          </div>
          <span className={`font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
            Flash<span className="text-blue-400">Mind</span>
          </span>
        </Link>

        {/* Links — Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to} to={to}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-500/15 text-blue-400'
                    : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-white/5'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
                }`}
              >
                <Icon size={15} /> {label}
              </Link>
            );
          })}
        </div>

        {/* Lado direito */}
        <div className="flex items-center gap-2">
          {/* Busca global */}
          <GlobalSearch />

          {/* Toggle tema */}
          <button
            onClick={toggle}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
            className={`p-2 rounded-xl transition-all ${
              isDark
                ? 'text-slate-400 hover:text-yellow-300 hover:bg-yellow-400/10'
                : 'text-slate-500 hover:text-blue-600 hover:bg-blue-500/10'
            }`}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Avatar + Dropdown */}
          <div ref={dropdownRef} className="relative hidden md:block">
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {user?.name?.split(' ')[0]}
              </span>
              <ChevronDown size={14} className={`transition-transform text-slate-500 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className={`absolute right-0 top-full mt-2 w-48 glass rounded-xl border overflow-hidden shadow-xl ${
                isDark ? 'border-white/10' : 'border-black/8'
              }`}>
                <div className={`px-4 py-3 border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                  <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{user?.name}</p>
                  <p className="text-slate-500 text-xs truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={15} /> Sair
                </button>
              </div>
            )}
          </div>

          {/* Mobile: hamburger */}
          <button
            className={`md:hidden transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Menu mobile */}
      {mobileOpen && (
        <div className={`md:hidden mx-4 mt-1 glass rounded-2xl border p-4 flex flex-col gap-1 ${
          isDark ? 'border-white/8' : 'border-black/8'
        }`}>
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to} to={to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-colors ${
                isDark ? 'text-slate-300 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-black/5 hover:text-slate-900'
              }`}
            >
              <Icon size={16} /> {label}
            </Link>
          ))}
          <div className={`border-t mt-2 pt-2 ${isDark ? 'border-white/5' : 'border-black/5'}`}>
            <button
              onClick={toggle}
              className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-colors ${
                isDark ? 'text-yellow-300 hover:bg-yellow-400/10' : 'text-blue-500 hover:bg-blue-500/10'
              }`}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
              {isDark ? 'Modo claro' : 'Modo escuro'}
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={16} /> Sair da conta
            </button>
          </div>
        </div>
      )}
    </header>
  );
}