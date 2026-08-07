import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider }  from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute      from './components/PrivateRoute';
import PublicRoute       from './components/PublicRoute';

// Home fica no bundle inicial: é a porta de entrada e mostrar spinner nela
// pioraria a primeira impressão. O resto carrega sob demanda.
import Home from './pages/Home';

const Login              = lazy(() => import('./pages/Login'));
const Register           = lazy(() => import('./pages/Register'));
const Dashboard          = lazy(() => import('./pages/Dashboard'));
const DeckPage           = lazy(() => import('./pages/DeckPage'));
const StudyPage          = lazy(() => import('./pages/StudyPage'));
const FavoritesPage      = lazy(() => import('./pages/FavoritesPage'));
const StatsPage          = lazy(() => import('./pages/StatsPage'));
const SharePage          = lazy(() => import('./pages/SharePage'));
const SharedSubjectPage  = lazy(() => import('./pages/SharedSubjectPage'));
const ContactPage        = lazy(() => import('./pages/ContactPage'));
const NotebookPage       = lazy(() => import('./pages/NotebookPage'));
const SubjectPage        = lazy(() => import('./pages/SubjectPage'));
const NotePage           = lazy(() => import('./pages/NotePage'));
const VerifyEmailPage    = lazy(() => import('./pages/VerifyEmailPage'));
const VerifyPendingPage  = lazy(() => import('./pages/VerifyPendingPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage  = lazy(() => import('./pages/ResetPasswordPage'));
const ProfilePage        = lazy(() => import('./pages/ProfilePage'));
const AdminPage          = lazy(() => import('./pages/AdminPage'));
const RankingPage        = lazy(() => import('./pages/RankingPage'));
const TrashPage          = lazy(() => import('./pages/TrashPage'));
const ConfirmEmailChangePage = lazy(() => import('./pages/ConfirmEmailChangePage'));
const CancelEmailChangePage  = lazy(() => import('./pages/CancelEmailChangePage'));

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
      <Loader2 size={28} className="animate-spin text-slate-600" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                {/* ── Públicas ── */}
                <Route path="/"                          element={<PublicRoute><Home /></PublicRoute>} />
                <Route path="/login"                     element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/register"                  element={<PublicRoute><Register /></PublicRoute>} />
                <Route path="/forgot-password"           element={<ForgotPasswordPage />} />
                <Route path="/reset-password/:token"     element={<ResetPasswordPage />} />
                <Route path="/verify-email/:token"       element={<VerifyEmailPage />} />
                {/* Pública: o link chega por e-mail e pode ser aberto em outro
                    navegador, sem sessão ativa. */}
                <Route path="/confirm-email-change/:token" element={<ConfirmEmailChangePage />} />
                {/* Veto sem login: quem cancela pode estar sem acesso à conta. */}
                <Route path="/cancelar-troca-email/:token" element={<CancelEmailChangePage />} />
                {/* Estática antes da dinâmica: /share/subject/:token não pode
                    ser lido como um token de deck chamado "subject". */}
                <Route path="/share/subject/:token"      element={<SharedSubjectPage />} />
                <Route path="/share/:token"              element={<SharePage />} />
                <Route path="/contact"                   element={<ContactPage />} />

                {/* ── Verificação pendente (logado mas não verificado) ── */}
                <Route path="/verify-pending"
                  element={
                    <PrivateRoute requireVerified={false}>
                      <VerifyPendingPage />
                    </PrivateRoute>
                  }
                />

                {/* ── Privadas (requer login + e-mail verificado) ── */}
                <Route path="/dashboard"  element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/deck/:deckId" element={<PrivateRoute><DeckPage /></PrivateRoute>} />
                <Route path="/study/:deckId" element={<PrivateRoute><StudyPage /></PrivateRoute>} />
                <Route path="/study/custom"  element={<PrivateRoute><StudyPage /></PrivateRoute>} />
                <Route path="/favorites"  element={<PrivateRoute><FavoritesPage /></PrivateRoute>} />
                <Route path="/stats"      element={<PrivateRoute><StatsPage /></PrivateRoute>} />
                <Route path="/ranking"    element={<PrivateRoute><RankingPage /></PrivateRoute>} />
                <Route path="/trash"      element={<PrivateRoute><TrashPage /></PrivateRoute>} />
                <Route path="/profile"    element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                {/* Rota comum de propósito: o bundle é público e esconder o
                    caminho não protege. Quem não é admin recebe 404 da API e
                    não vê dado nenhum — a barreira está no servidor. */}
                <Route path="/admin"      element={<PrivateRoute><AdminPage /></PrivateRoute>} />
                <Route path="/notebook"   element={<PrivateRoute><NotebookPage /></PrivateRoute>} />
                <Route path="/notebook/:subjectId"
                  element={<PrivateRoute><SubjectPage /></PrivateRoute>} />
                <Route path="/notebook/:subjectId/:noteId"
                  element={<PrivateRoute><NotePage /></PrivateRoute>} />
              </Routes>
            </Suspense>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
