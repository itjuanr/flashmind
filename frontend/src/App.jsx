import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider }  from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute      from './components/PrivateRoute';

import Home               from './pages/Home';
import Login              from './pages/Login';
import Register           from './pages/Register';
import Dashboard          from './pages/Dashboard';
import DeckPage           from './pages/DeckPage';
import StudyPage          from './pages/StudyPage';
import FavoritesPage      from './pages/FavoritesPage';
import StatsPage          from './pages/StatsPage';
import SharePage          from './pages/SharePage';
import ContactPage        from './pages/ContactPage';
import NotebookPage       from './pages/NotebookPage';
import SubjectPage        from './pages/SubjectPage';
import NotePage           from './pages/NotePage';
import VerifyEmailPage    from './pages/VerifyEmailPage';
import VerifyPendingPage  from './pages/VerifyPendingPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage  from './pages/ResetPasswordPage';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              {/* ── Públicas ── */}
              <Route path="/"                          element={<Home />} />
              <Route path="/login"                     element={<Login />} />
              <Route path="/register"                  element={<Register />} />
              <Route path="/forgot-password"           element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token"     element={<ResetPasswordPage />} />
              <Route path="/verify-email/:token"       element={<VerifyEmailPage />} />
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
              <Route path="/notebook"   element={<PrivateRoute><NotebookPage /></PrivateRoute>} />
              <Route path="/notebook/:subjectId"
                element={<PrivateRoute><SubjectPage /></PrivateRoute>} />
              <Route path="/notebook/:subjectId/:noteId"
                element={<PrivateRoute><NotePage /></PrivateRoute>} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}