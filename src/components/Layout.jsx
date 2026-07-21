import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scissors, LogOut, QrCode } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-20">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary" />
            <span className="font-heading font-semibold text-lg">Salonflow</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/guest" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <QrCode className="w-4 h-4 mr-2" />
                Guest Menu
              </Button>
            </a>
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{user?.full_name || user?.email}</div>
              <Badge variant="secondary" className="capitalize text-xs">{user?.role}</Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={() => logout()}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}