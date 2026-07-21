import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import MenuBrowser from '@/components/MenuBrowser';
import ChatPanel from '@/components/ChatPanel';
import ServicesPanel from '@/components/ServicesPanel';
import { Coffee, MessageSquare, Scissors, BellRing, User, Settings } from 'lucide-react';
import ServiceUpdateForm from '@/components/ServiceUpdateForm';
import StylistProfileDialog from '@/components/StylistProfileDialog';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

export default function StylistView() {
  const { user } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  useMessageNotifications('stylist', user);
  const unreadCount = useUnreadMessages('stylist', user);

  const displayName = user?.display_name || user?.full_name || user?.email || 'Stylist';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-heading text-xl font-semibold">{displayName}</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => setProfileOpen(true)}>
          <Settings className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </div>
      <Tabs defaultValue="coffee">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="coffee"><Coffee className="w-4 h-4 mr-2" />Order</TabsTrigger>
          <TabsTrigger value="chat" className="relative">
            <MessageSquare className="w-4 h-4 mr-2" />Chat
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-background" />
            )}
          </TabsTrigger>
          <TabsTrigger value="services"><Scissors className="w-4 h-4 mr-2" />My Services</TabsTrigger>
          <TabsTrigger value="service-update"><BellRing className="w-4 h-4 mr-2" />Service Update</TabsTrigger>
        </TabsList>
        <TabsContent value="coffee" className="mt-6"><MenuBrowser mode="stylist" user={user} /></TabsContent>
        <TabsContent value="chat" className="mt-6"><ChatPanel mode="stylist" user={user} /></TabsContent>
        <TabsContent value="services" className="mt-6"><ServicesPanel mode="stylist" user={user} /></TabsContent>
        <TabsContent value="service-update" className="mt-6"><ServiceUpdateForm user={user} /></TabsContent>
      </Tabs>
      <StylistProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}