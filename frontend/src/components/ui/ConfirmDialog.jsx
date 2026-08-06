import { useEffect, useRef, useId } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Modal from './Modal';
import Button from './Button';

/**
 * Diálogo de confirmação. Substitui as 8 cópias quase idênticas espalhadas
 * pelas páginas — cada uma reescrevia os ternários de tema à mão, e foi assim
 * que apareceram os casos de texto branco invisível no tema claro.
 *
 * O foco inicial vai para Cancelar de propósito: em ação destrutiva, o botão
 * seguro é o padrão.
 */
export default function ConfirmDialog({
  emoji = '⚠️',
  title,
  children,
  cancelLabel = 'Cancelar',
  confirmLabel = 'Confirmar',
  loadingLabel,
  tone = 'danger',
  loading = false,
  onCancel,
  onConfirm,
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const cancelRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <Modal onClose={loading ? undefined : onCancel} size="sm" labelledBy={titleId} dismissable={!loading}>
      <div className="p-6 sm:p-8 text-center">
        <div className="text-4xl mb-4" aria-hidden="true">{emoji}</div>

        <h3 id={titleId} className={`font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {title}
        </h3>

        <p className="text-slate-500 text-sm mb-8 leading-relaxed">{children}</p>

        {/* Empilha no mobile: dois rótulos longos lado a lado ficavam
            espremidos em telas estreitas. Confirmar primeiro na coluna
            invertida mantém Cancelar mais perto do polegar. */}
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <Button ref={cancelRef} variant="secondary" size="lg" fullWidth
            onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone} size="lg" fullWidth
            onClick={onConfirm} loading={loading}>
            {loading && loadingLabel ? loadingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
