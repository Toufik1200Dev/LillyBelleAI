import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Auth } from '@/pages/Auth';
import { Chat } from '@/pages/Chat';
import { NotFound } from '@/pages/NotFound';

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ChatProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat/:conversationId?"
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>

          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1f2937',
                color: '#f9fafb',
                border: '1px solid #374151',
                borderRadius: '12px',
                fontSize: '13px',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#1f2937' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#1f2937' } },
            }}
          />
        </ChatProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
