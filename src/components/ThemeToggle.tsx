import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { hapticLight } from '../hooks/useHapticFeedback';

interface ThemeToggleProps {
  variant?: 'button' | 'switch' | 'selector';
  showLabel?: boolean;
}

export function ThemeToggle({ variant = 'switch', showLabel = true }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  const handleToggle = () => {
    hapticLight();
    toggleTheme();
  };

  const handleSelect = (newTheme: 'light' | 'dark' | 'system') => {
    hapticLight();
    setTheme(newTheme);
  };

  // Simple toggle button
  if (variant === 'button') {
    return (
      <button
        onClick={handleToggle}
        className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label={resolvedTheme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="w-5 h-5 text-yellow-500" />
        ) : (
          <Moon className="w-5 h-5 text-gray-600" />
        )}
      </button>
    );
  }

  // Toggle switch
  if (variant === 'switch') {
    return (
      <div className="flex items-center justify-between">
        {showLabel && (
          <div className="flex items-center gap-3">
            {resolvedTheme === 'dark' ? (
              <Moon className="w-5 h-5 text-primary-500" />
            ) : (
              <Sun className="w-5 h-5 text-yellow-500" />
            )}
            <span className="text-gray-900 dark:text-white">
              Mode {resolvedTheme === 'dark' ? 'sombre' : 'clair'}
            </span>
          </div>
        )}
        <button
          onClick={handleToggle}
          className={`relative w-14 h-8 rounded-full transition-colors ${
            resolvedTheme === 'dark'
              ? 'bg-primary-500'
              : 'bg-gray-300'
          }`}
          role="switch"
          aria-checked={resolvedTheme === 'dark'}
        >
          <span
            className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
              resolvedTheme === 'dark' ? 'translate-x-6' : ''
            }`}
          >
            {resolvedTheme === 'dark' ? (
              <Moon className="w-4 h-4 text-primary-500 m-1" />
            ) : (
              <Sun className="w-4 h-4 text-yellow-500 m-1" />
            )}
          </span>
        </button>
      </div>
    );
  }

  // Full selector with system option
  return (
    <div className="space-y-2">
      {showLabel && (
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Apparence
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => handleSelect('light')}
          className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
            theme === 'light'
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <Sun className={`w-6 h-6 ${
            theme === 'light' ? 'text-primary-500' : 'text-gray-400'
          }`} />
          <span className={`text-sm ${
            theme === 'light'
              ? 'text-primary-600 dark:text-primary-400 font-medium'
              : 'text-gray-600 dark:text-gray-400'
          }`}>
            Clair
          </span>
        </button>

        <button
          onClick={() => handleSelect('dark')}
          className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
            theme === 'dark'
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <Moon className={`w-6 h-6 ${
            theme === 'dark' ? 'text-primary-500' : 'text-gray-400'
          }`} />
          <span className={`text-sm ${
            theme === 'dark'
              ? 'text-primary-600 dark:text-primary-400 font-medium'
              : 'text-gray-600 dark:text-gray-400'
          }`}>
            Sombre
          </span>
        </button>

        <button
          onClick={() => handleSelect('system')}
          className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
            theme === 'system'
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <Monitor className={`w-6 h-6 ${
            theme === 'system' ? 'text-primary-500' : 'text-gray-400'
          }`} />
          <span className={`text-sm ${
            theme === 'system'
              ? 'text-primary-600 dark:text-primary-400 font-medium'
              : 'text-gray-600 dark:text-gray-400'
          }`}>
            Système
          </span>
        </button>
      </div>
    </div>
  );
}

export default ThemeToggle;
