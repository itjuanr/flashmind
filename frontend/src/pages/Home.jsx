import { useNavigate } from 'react-router-dom';
import { ArrowRight, Repeat2, BarChart3, Layers, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Home() {
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen overflow-x-hidden transition-colors duration-300" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* Glows de fundo */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/8 blur-[140px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="flex justify-between items-center px-8 py-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-blue-400" />
          <span className={`font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
            Flash<span className="text-blue-400">Mind</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme}
            className={`p-2 rounded-xl transition-all ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/8' : 'text-slate-500 hover:text-slate-800 hover:bg-black/5'}`}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={() => navigate('/login')}
            className={`text-sm font-medium px-4 py-2 rounded-xl transition-all ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'}`}>
            Entrar
          </button>
          <button onClick={() => navigate('/register')}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.25)]">
            Criar conta grátis
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 pt-20 pb-32 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/8 border border-blue-500/15 text-blue-400 text-xs font-semibold px-4 py-2 rounded-full mb-10 tracking-wide uppercase">
          <Repeat2 size={12} /> Repetição espaçada
        </div>

        <h1 className={`text-6xl md:text-7xl font-bold mb-6 tracking-tight leading-[1.08] ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Memorize mais.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
            Esqueça menos.
          </span>
        </h1>

        <p className={`text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Crie seus flashcards, organize em decks e estude com um sistema de
          revisão que sabe exatamente quando você está prestes a esquecer algo.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => navigate('/register')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-2xl transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2 group text-base">
            Começar agora — é grátis
            <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button onClick={() => navigate('/login')}
            className={`font-semibold px-8 py-4 rounded-2xl transition-all text-base border ${isDark ? 'bg-white/5 hover:bg-white/8 border-white/10 text-slate-300' : 'bg-black/4 hover:bg-black/7 border-black/8 text-slate-600'}`}>
            Já tenho conta
          </button>
        </div>

        <p className={`mt-8 text-sm ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
          Sem cartão de crédito · Sem limite de cards · Cancele quando quiser
        </p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-8 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: Repeat2,   color: 'text-blue-400',    bg: 'bg-blue-500/8',    title: 'Repetição Espaçada', desc: 'O sistema agenda cada card no momento certo — você revisa só o que está esquecendo, sem perder tempo com o que já sabe.' },
            { icon: Layers,    color: 'text-indigo-400',  bg: 'bg-indigo-500/8',  title: 'Decks organizados',  desc: 'Separe seus flashcards por matéria, tema ou qualquer critério que fizer sentido pra você.' },
            { icon: BarChart3, color: 'text-emerald-400', bg: 'bg-emerald-500/8', title: 'Progresso real',      desc: 'Acompanhe quantos cards você domina, quais precisa revisar e evolua de forma consistente.' },
          ].map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title}
              className={`p-7 rounded-2xl border transition-all group ${isDark ? 'glass border-white/5 hover:border-white/10' : 'bg-white border-black/6 hover:border-black/12 shadow-sm hover:shadow-md'}`}>
              <div className={`inline-flex p-2.5 rounded-xl ${bg} ${color} mb-5 group-hover:scale-105 transition-transform`}>
                <Icon size={22} />
              </div>
              <h3 className={`font-semibold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}