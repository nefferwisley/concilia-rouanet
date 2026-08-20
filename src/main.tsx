import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthGate } from './components/AuthGate.tsx';
import { SessionProvider } from './hooks/SessionProvider.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </SessionProvider>
  </StrictMode>,
);
