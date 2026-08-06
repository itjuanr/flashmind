import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import Navbar from '../components/Navbar';
import Button from '../components/ui/Button';
import { User, Mail, Lock, Camera, Trash2, Check, ShieldCheck, Clock } from 'lucide-react';
import api from '../services/api';

function Section({ icon: Icon, title, description, children, isDark }) {
  return (
    <section className={`rounded-2xl border p-5 sm:p-6 ${isDark ? 'bg-white/2 border-white/8' : 'bg-white border-black/8 shadow-sm'}`}>
      <div className="flex items-start gap-3 mb-5">
        <div className={`p-2 rounded-lg flex-shrink-0 ${isDark ? 'bg-white/5' : 'bg-black/4'}`}>
          <Icon size={16} className="text-blue-400" />
        </div>
        <div className="min-w-0">
          <h2 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</h2>
          {description && <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const toast   = useToast();
  const { theme } = useTheme();
  const isDark  = theme === 'dark';
  const fileRef = useRef(null);

  const [name, setName]         = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading]   = useState(false);

  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [savingPwd, setSavingPwd] = useState(false);

  const [emailForm, setEmailForm] = useState({ newEmail: '', password: '' });
  const [savingEmail, setSavingEmail] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(user?.pendingEmail || null);

  const inputCls = `w-full border px-4 py-3 rounded-lg outline-none transition-all text-sm ${
    isDark
      ? 'bg-white/4 border-white/8 focus:border-blue-500/50 text-white placeholder-slate-600'
      : 'bg-black/3 border-black/8 focus:border-blue-500/50 text-slate-800 placeholder-slate-400'
  }`;
  const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2';

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  // ── Foto ──
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('Imagem muito grande. Use uma de até 2MB.', 'error'); return; }

    const reader = new FileReader();
    reader.onload = async () => {
      setUploading(true);
      try {
        const res = await api.patch('/auth/me', { avatar: reader.result });
        updateUser({ avatar: res.data.avatar });
        toast('Foto atualizada!', 'success');
      } catch (err) {
        toast(err.response?.data?.message || 'Erro ao enviar foto.', 'error');
      } finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = async () => {
    setUploading(true);
    try {
      await api.patch('/auth/me', { avatar: null });
      updateUser({ avatar: null });
      toast('Foto removida.', 'info');
    } catch { toast('Erro ao remover foto.', 'error'); }
    finally { setUploading(false); }
  };

  // ── Nome ──
  const saveName = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast('O nome não pode ficar vazio.', 'error'); return; }
    setSavingName(true);
    try {
      const res = await api.patch('/auth/me', { name: name.trim() });
      updateUser({ name: res.data.name });
      toast('Nome atualizado!', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Erro ao salvar nome.', 'error');
    } finally { setSavingName(false); }
  };

  // ── Senha ──
  const savePassword = async (e) => {
    e.preventDefault();
    if (pwd.next !== pwd.confirm) { toast('A confirmação não confere com a nova senha.', 'error'); return; }
    setSavingPwd(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword: pwd.current, newPassword: pwd.next,
      });
      toast(res.data.message, 'success');
      setPwd({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast(err.response?.data?.message || 'Erro ao alterar senha.', 'error');
    } finally { setSavingPwd(false); }
  };

  // ── E-mail ──
  const requestEmailChange = async (e) => {
    e.preventDefault();
    setSavingEmail(true);
    try {
      const res = await api.post('/auth/change-email', emailForm);
      toast(res.data.message, 'success');
      setPendingEmail(res.data.pendingEmail);
      setEmailForm({ newEmail: '', password: '' });
    } catch (err) {
      toast(err.response?.data?.message || 'Erro ao solicitar troca.', 'error');
    } finally { setSavingEmail(false); }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 pt-28 pb-16 relative z-10">
        <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-8 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Meu perfil
        </h1>

        <div className="space-y-5">
          {/* Foto e nome */}
          <Section icon={User} title="Foto e nome" description="Como você aparece no FlashMind." isDark={isDark}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-5">
              <div className="relative flex-shrink-0 self-start">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Foto de perfil"
                    className="w-20 h-20 rounded-2xl object-cover border border-white/10" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold">
                    {initials}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="md" icon={Camera} loading={uploading}
                  onClick={() => fileRef.current?.click()}>
                  {user?.avatar ? 'Trocar foto' : 'Enviar foto'}
                </Button>
                {user?.avatar && (
                  <Button variant="danger" size="md" icon={Trash2} disabled={uploading} onClick={removeAvatar}>
                    Remover
                  </Button>
                )}
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp"
                  className="hidden" onChange={handleFile} />
              </div>
            </div>

            <form onSubmit={saveName} className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1 min-w-0">
                <label className={labelCls} htmlFor="perfil-nome">Nome</label>
                <input id="perfil-nome" type="text" className={inputCls} value={name}
                  onChange={(e) => setName(e.target.value)} maxLength={100} />
              </div>
              <Button type="submit" variant="primary" size="lg" loading={savingName}
                disabled={name.trim() === (user?.name || '')}>
                Salvar
              </Button>
            </form>
          </Section>

          {/* E-mail */}
          <Section icon={Mail} title="E-mail"
            description="A troca só vale depois que você confirmar pelo link enviado ao novo endereço."
            isDark={isDark}>

            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border mb-4 ${isDark ? 'bg-white/4 border-white/8' : 'bg-black/3 border-black/8'}`}>
              <ShieldCheck size={15} className={user?.isVerified ? 'text-emerald-400 flex-shrink-0' : 'text-slate-500 flex-shrink-0'} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{user?.email}</p>
                <p className="text-xs text-slate-500">{user?.isVerified ? 'Verificado' : 'Não verificado'}</p>
              </div>
            </div>

            {pendingEmail && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-500/25 bg-amber-500/10 mb-4">
                <Clock size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-400/90 leading-relaxed">
                  Aguardando confirmação de <strong className="font-semibold">{pendingEmail}</strong>.
                  O link expira em 1 hora — até lá, seu acesso continua pelo e-mail atual.
                </p>
              </div>
            )}

            <form onSubmit={requestEmailChange} className="space-y-4">
              <div>
                <label className={labelCls} htmlFor="perfil-novo-email">Novo e-mail</label>
                <input id="perfil-novo-email" type="email" required className={inputCls}
                  placeholder="novo@email.com" value={emailForm.newEmail}
                  onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })} />
              </div>
              <div>
                <label className={labelCls} htmlFor="perfil-senha-email">Confirme com sua senha</label>
                <input id="perfil-senha-email" type="password" required className={inputCls}
                  placeholder="Sua senha atual" autoComplete="current-password"
                  value={emailForm.password}
                  onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })} />
              </div>
              <Button type="submit" variant="primary" size="lg" loading={savingEmail} className="w-full sm:w-auto">
                Enviar confirmação
              </Button>
            </form>
          </Section>

          {/* Senha */}
          <Section icon={Lock} title="Senha"
            description="Mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo."
            isDark={isDark}>
            <form onSubmit={savePassword} className="space-y-4">
              <div>
                <label className={labelCls} htmlFor="perfil-senha-atual">Senha atual</label>
                <input id="perfil-senha-atual" type="password" required className={inputCls}
                  autoComplete="current-password" value={pwd.current}
                  onChange={(e) => setPwd({ ...pwd, current: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} htmlFor="perfil-senha-nova">Nova senha</label>
                  <input id="perfil-senha-nova" type="password" required className={inputCls}
                    autoComplete="new-password" value={pwd.next}
                    onChange={(e) => setPwd({ ...pwd, next: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="perfil-senha-conf">Confirmar</label>
                  <input id="perfil-senha-conf" type="password" required
                    autoComplete="new-password"
                    className={`${inputCls} ${pwd.confirm && pwd.confirm !== pwd.next ? 'border-red-500/50' : ''}`}
                    value={pwd.confirm}
                    onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
                  {pwd.confirm && pwd.confirm !== pwd.next && (
                    <p className="text-red-400 text-xs mt-1.5">As senhas não conferem.</p>
                  )}
                </div>
              </div>
              <Button type="submit" variant="primary" size="lg" loading={savingPwd} icon={Check}
                className="w-full sm:w-auto">
                Alterar senha
              </Button>
            </form>
          </Section>
        </div>
      </main>
    </div>
  );
}
