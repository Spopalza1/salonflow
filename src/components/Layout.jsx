import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scissors, LogOut, QrCode, ClipboardList, User } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationsDropdown from '@/components/NotificationsDropdown';
import { SalonCustomizationProvider, useSalonCustomization } from '@/lib/salonCustomizationContext';
import { Image as UIImage } from '@/components/ui/image';

function LayoutContent() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { settings } = useSalonCustomization();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-20 safe-area-top">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            {settings?.salon_logo_url ? (
              <UIImage src={settings.salon_logo_url} alt="logo" className="h-8 w-auto" fittingType="fit" />
            ) : (
              <Scissors className="w-5 h-5 text-primary" />
            )}
            <span className="font-heading font-semibold text-lg">{settings?.salon_display_name || 'Salonflow'}</span>
            {user?.role === 'admin' && (
              <Link to="/front-desk" className="ml-2">
                <Button variant={location.pathname === '/front-desk' ? 'default' : 'ghost'} size="sm">
                  <ClipboardList className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Front Desk</span>
                </Button>
              </Link>
            )}
            <Link to="/stylist" className="ml-1">
              <Button variant={location.pathname === '/stylist' ? 'default' : 'ghost'} size="sm">
                <User className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Stylist</span>
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <a href="/guest" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <QrCode className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Guest Menu</span>
              </Button>
            </a>
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{user?.display_name || user?.full_name || user?.email}</div>
              <Badge variant="secondary" className="capitalize text-xs">{user?.role}</Badge>
            </div>
            <NotificationsDropdown />
            <ThemeToggle />
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

export default function Layout() {
  return (
    <SalonCustomizationProvider>
      <LayoutContent />
    </SalonCustomizationProvider>
  );
}