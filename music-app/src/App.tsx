import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from '@/router';
import { useAudio } from '@/hooks/useAudio';
import { useAppStore } from '@/stores/useAppStore';
import LightingProvider from '@/components/Layout/LightingProvider';
import './styles/index.css';

function App() {
  useAudio();
  const { isDarkMode, enableGlassmorphism } = useAppStore();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (enableGlassmorphism) {
      document.documentElement.classList.add('glass-mode');
    } else {
      document.documentElement.classList.remove('glass-mode');
    }
  }, [enableGlassmorphism]);

  return (
    <BrowserRouter>
      <LightingProvider>
        <AppRouter />
      </LightingProvider>
    </BrowserRouter>
  );
}

export default App;
