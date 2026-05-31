import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MailWarning, X, Loader2, Check } from 'lucide-react';
import api from '../services/api';

export default function VerifyBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending]     = useState(false);
  const [sent, setSent]           = useState(false);

  if (!user || user.isVerified || dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    try { await api.post('/auth/resend-verification'); setSent(true); }
    catch {}
    finally { setSending(false); }
  };

  return (
    <div className="fixed top-[72px] left-4 right-4 z-40 mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-amber-500/25 bg-amber-500/8 backdrop-blur-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <MailWarning size={15} className="flex-shrink-0 text-amber-400" />
          <p className="text-sm text-amber-300 truncate">
            Confirme seu e-mail para garantir acesso contínuo à sua conta.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!sent ? (
            <button onClick={handleResend} disabled={sending}
              className="text-xs font-medium text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-400/50 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
              {sending ? <Loader2 size={12} className="animate-spin" /> : 'Reenviar e-mail'}
            </button>
          ) : (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <Check size={12} /> Enviado!
            </span>
          )}
          <button onClick={() => setDismissed(true)} className="text-amber-500/60 hover:text-amber-400 transition-colors">
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}