import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scissors, ClipboardList } from 'lucide-react';
import NotificationsDropdown from '@/components/NotificationsDropdown';
import AdminProfileDialog from '@/components/AdminProfileDialog';
import CustomizationDialog from '@/components/CustomizationDialog';
import AdminMenu from '@/components/AdminMenu';
import StylistMenu from '@/components/StylistMenu';
import { SalonCustomizationProvider, useSalonCustomization } from '@/lib/salonCustomizationContext';
import { Image as UIImage } from '@/components/ui/image';

function LayoutContent() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { settings } = useSalonCustomization();
  const [profileOpen, setProfileOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);

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
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{user?.display_name || user?.full_name || user?.email}</div>
              <Badge variant="secondary" className="capitalize text-xs">{user?.role}</Badge>
            </div>
            <NotificationsDropdown />
            {user?.role === 'admin' ? (
              <AdminMenu
                user={user}
                onProfile={() => setProfileOpen(true)}
                onCustomize={() => setCustomizeOpen(true)}
                onLogout={() => logout()}
              />
            ) : (
              <StylistMenu user={user} onLogout={() => logout()} />
            )}
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <AdminProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <CustomizationDialog open={customizeOpen} onOpenChange={setCustomizeOpen} />
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