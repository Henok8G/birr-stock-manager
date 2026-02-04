import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function MainLayout() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check for saved preference or system preference
    const saved = localStorage.getItem('bevstock-theme');
    if (saved === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('bevstock-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('bevstock-theme', 'light');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode} />
      
      {/* Main content area */}
      <main className="lg:ml-64 min-h-screen">
        <div className="px-4 py-6 lg:px-8 lg:py-8 pt-16 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
