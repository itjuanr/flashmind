import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import Navbar from '../components/Navbar';
import {
  Mail, MessageSquare, Lightbulb, AlertCircle, Handshake,
  Send, ChevronLeft, Heart, ExternalLink, Loader2, Check,
} from 'lucide-react';

const SUBJECT_OPTIONS = [
  { value: 'parceria',  label: 'Parceria',    icon: Handshake,      color: 'text-blue-400',    bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
  { value: 'duvida',    label: 'Dúvida',      icon: MessageSquare,  color: 'text-purple-400',  bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { value: 'sugestao',  label: 'Sugestão',    icon: Lightbulb,      color: 'text-amber-400',   bg: 'bg-amber-500/10',  border: 'border-amber-500/20'  },
  { value: 'problema',  label: 'Problema',    icon: AlertCircle,    color: 'text-red-400',     bg: 'bg-red-500/10',    border: 'border-red-500/20'    },
  { value: 'outro',     label: 'Outro',       icon: Mail,           color: 'text-slate-400',   bg: 'bg-white/5',       border: 'border-white/10'      },
];

// Envia via FormSubmit (sem backend necessário)
const FORMSUBMIT_EMAIL = 'juanrodriguesdto@gmail.com';

export default function ContactPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [subject, setSubject] = useState('');
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  // PIX QR Code — substitua pela URL da sua imagem
  const PIX_QR_URL = 'https://i.imgur.com/tr2uf0h.jpeg';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject) { setError('Selecione o assunto.'); return; }
    if (!name.trim() || !email.trim() || !message.trim()) { setError('Preencha todos os campos.'); return; }
    setError('');
    setSending(true);
    try {
      const form = new FormData();
      form.append('_subject', `[FlashMind] ${SUBJECT_OPTIONS.find(o => o.value === subject)?.label} — ${name}`);
      form.append('name', name);
      form.append('email', email);
      form.append('assunto', subject);
      form.append('message', message);
      form.append('_captcha', 'false');
      form.append('_template', 'table');

      const res = await fetch(`https://formsubmit.co/${FORMSUBMIT_EMAIL}`, {
        method: 'POST',
        body: form,
      });
      if (res.ok) { setSent(true); }
      else { setError('Erro ao enviar. Tente novamente.'); }
    } catch { setError('Erro ao enviar. Verifique sua conexão.'); }
    finally { setSending(false); }
  };

  const inputClass = `w-full px-4 py-3 rounded-xl outline-none text-sm transition-all border ${
    isDark
      ? 'bg-white/4 border-white/8 focus:border-blue-500/50 text-white placeholder-slate-600'
      : 'bg-black/3 border-black/8 focus:border-blue-500/40 text-slate-800 placeholder-slate-400'
  }`;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Blobs decorativos */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[300px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />

      <Navbar />

      <main className="max-w-5xl mx-auto px-4 pt-28 pb-16 relative z-10">

        {/* Header */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-8 transition-colors">
          <ChevronLeft size={16} /> Voltar
        </button>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-5">
            <Mail size={12} /> Contato & Suporte
          </div>
          <h1 className={`text-4xl font-bold tracking-tight mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Fale comigo 👋
          </h1>
          <p className="text-slate-500 text-base max-w-md mx-auto leading-relaxed">
            Seja para tirar uma dúvida, reportar um problema ou simplesmente dizer oi — adoraria ouvir você.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">

          {/* ── Formulário (3 colunas) ── */}
          <div className="lg:col-span-3">
            {sent ? (
              <div className={`rounded-3xl border p-12 text-center ${isDark ? 'bg-[#0F0F18] border-white/8' : 'bg-white border-black/8 shadow-sm'}`}>
                <div className="inline-flex p-5 rounded-2xl bg-emerald-500/10 mb-6">
                  <Check size={36} className="text-emerald-400" />
                </div>
                <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Mensagem enviada!</h2>
                <p className="text-slate-500 mb-6 text-sm">Obrigado pelo contato. Responderei em breve.</p>
                <button onClick={() => { setSent(false); setName(''); setEmail(''); setMessage(''); setSubject(''); }}
                  className="text-blue-400 hover:underline text-sm">Enviar outra mensagem</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}
                className={`rounded-3xl border p-7 ${isDark ? 'bg-[#0F0F18] border-white/8' : 'bg-white border-black/8 shadow-sm'}`}>

                {/* Assunto */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Assunto *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SUBJECT_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const selected = subject === opt.value;
                      return (
                        <button key={opt.value} type="button" onClick={() => setSubject(opt.value)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                            selected
                              ? `${opt.bg} ${opt.border} ${opt.color}`
                              : isDark ? 'border-white/8 text-slate-500 hover:border-white/15 hover:text-slate-300' : 'border-black/8 text-slate-500 hover:border-black/15'
                          }`}>
                          <Icon size={14} className={selected ? opt.color : ''} />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nome + Email */}
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nome *</label>
                    <input value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">E-mail *</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com" className={inputClass} />
                  </div>
                </div>

                {/* Mensagem */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Mensagem *</label>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                    rows={5} placeholder="Descreva sua mensagem com o máximo de detalhes possível..."
                    className={`${inputClass} resize-none`} />
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">
                    <AlertCircle size={15} /> {error}
                  </div>
                )}

                <button type="submit" disabled={sending}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all text-sm shadow-[0_0_20px_rgba(37,99,235,0.25)]">
                  {sending
                    ? <><Loader2 size={16} className="animate-spin" /> Enviando...</>
                    : <><Send size={15} /> Enviar mensagem</>
                  }
                </button>

                <p className="text-center text-slate-600 text-xs mt-4">
                  Respondo em até 48h por e-mail.
                </p>
              </form>
            )}
          </div>

          {/* ── Sidebar direita (2 colunas) ── */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Card: Sobre o projeto */}
            <div className={`rounded-3xl border p-6 ${isDark ? 'bg-[#0F0F18] border-white/8' : 'bg-white border-black/8 shadow-sm'}`}>
              <div className="text-3xl mb-4">⚡</div>
              <h3 className={`font-bold text-base mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                Sobre o FlashMind
              </h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                O FlashMind é um projeto desenvolvido inteiramente por{' '}
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-700'}`}>Juan Rodrigues</span>,
                um único desenvolvedor apaixonado por educação e tecnologia.
              </p>
              <p className={`text-sm leading-relaxed mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                O objetivo é ajudar estudantes de todas as áreas a fixar conteúdo com mais eficiência usando
                a técnica de repetição espaçada — de forma gratuita, bonita e sem distrações.
              </p>
              <div className={`flex items-center gap-2 mt-4 pt-4 border-t text-sm ${isDark ? 'border-white/8 text-slate-500' : 'border-black/6 text-slate-400'}`}>
                <Heart size={13} className="text-red-400 flex-shrink-0" />
                Feito com dedicação para a comunidade
              </div>
            </div>

            {/* Card: Apoie o projeto */}
            <div className={`rounded-3xl border p-6 ${isDark ? 'bg-[#0F0F18] border-white/8' : 'bg-white border-black/8 shadow-sm'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Heart size={18} className="text-red-400" />
                <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  Gostou do projeto?
                </h3>
              </div>
              <p className={`text-sm mt-2 mb-4 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Me ajude a manter e melhorar o FlashMind. Qualquer valor faz a diferença e incentiva o desenvolvimento de novas funcionalidades!
              </p>

              {/* QR Code PIX */}
              <div className={`rounded-2xl overflow-hidden border mb-4 ${isDark ? 'border-white/8 bg-white/4' : 'border-black/8 bg-black/2'}`}>
                <div className={`px-4 py-2 border-b text-xs font-bold text-center ${isDark ? 'border-white/8 text-slate-500' : 'border-black/6 text-slate-400'}`}>
                  PIX — QR Code
                </div>
                <div className="flex items-center justify-center p-4">
                  <img
                    src={PIX_QR_URL}
                    alt="QR Code PIX"
                    className="w-40 h-40 object-contain rounded-xl"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="w-40 h-40 rounded-xl bg-white/5 border border-white/10 hidden items-center justify-center text-center p-4">
                    <p className="text-slate-500 text-xs">Adicione a URL do QR Code no ContactPage.jsx</p>
                  </div>
                </div>
              </div>

              <p className={`text-xs text-center ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                Obrigado pelo apoio! 💙
              </p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}