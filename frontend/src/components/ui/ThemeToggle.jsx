// frontend/src/components/ui/ThemeToggle.jsx
import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from './button';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative w-10 h-10 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
      title={theme === 'light' ? 'Mode sombre' : 'Mode clair'}
    >
      {/* Animation de transition */}
      <Sun 
        className={`absolute w-5 h-5 text-amber-500 transition-all duration-300 ${
          theme === 'light' 
            ? 'rotate-0 scale-100 opacity-100' 
            : 'rotate-90 scale-0 opacity-0'
        }`} 
      />
      <Moon 
        className={`absolute w-5 h-5 text-blue-500 transition-all duration-300 ${
          theme === 'dark' 
            ? 'rotate-0 scale-100 opacity-100' 
            : '-rotate-90 scale-0 opacity-0'
        }`} 
      />
    </Button>
  );
}