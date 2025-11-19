import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeSettings() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      // Default to light theme
      setTheme('light');
      applyTheme('light');
    }
  }, []);

  const applyTheme = (newTheme: 'light' | 'dark') => {
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  return (
    <Card className="border border-border bg-card shadow-strong">
      <CardHeader>
        <CardTitle className="text-foreground">Aparência</CardTitle>
        <CardDescription className="text-muted-foreground">
          Escolhe o tema da aplicação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Label className="text-foreground font-medium">Tema</Label>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Light Theme Option */}
            <button
              onClick={() => handleThemeChange('light')}
              className={`relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all duration-300 ${
                theme === 'light'
                  ? 'border-primary bg-primary/10 shadow-lg'
                  : 'border-border bg-card hover:border-primary/50 hover:bg-muted'
              }`}
            >
              <div className={`rounded-full p-3 transition-colors ${
                theme === 'light' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                <Sun className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className={`font-semibold ${theme === 'light' ? 'text-primary' : 'text-foreground'}`}>
                  Claro
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Fundo branco, texto escuro
                </p>
              </div>
              {theme === 'light' && (
                <div className="absolute top-3 right-3">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                </div>
              )}
            </button>

            {/* Dark Theme Option */}
            <button
              onClick={() => handleThemeChange('dark')}
              className={`relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all duration-300 ${
                theme === 'dark'
                  ? 'border-primary bg-primary/10 shadow-lg'
                  : 'border-border bg-card hover:border-primary/50 hover:bg-muted'
              }`}
            >
              <div className={`rounded-full p-3 transition-colors ${
                theme === 'dark' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                <Moon className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className={`font-semibold ${theme === 'dark' ? 'text-primary' : 'text-foreground'}`}>
                  Escuro
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Fundo escuro, texto claro
                </p>
              </div>
              {theme === 'dark' && (
                <div className="absolute top-3 right-3">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                </div>
              )}
            </button>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Dica:</strong> O tema será guardado e aplicado automaticamente nas próximas visitas.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
