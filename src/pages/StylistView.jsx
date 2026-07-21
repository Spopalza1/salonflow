import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/AuthContext';
import MenuBrowser from '@/components/MenuBrowser';
import ChatPanel from '@/components/ChatPanel';
import ServicesPanel from '@/components/ServicesPanel';
import { Coffee, MessageSquare, Scissors, BellRing, User } from 'lucide-react';
import ServiceUpdateForm from '@/components/ServiceUpdateForm';
import StylistProfile from '@/components/StylistProfile';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

export default function StylistView() {
  const { user } = useAuth();
  useMessageNotifications('stylist', user);
  const unreadCount = useUnreadMessages('stylist', user);

  return (
    <div className="p-6">
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
          <TabsTrigger value="profile"><User className="w-4 h-4 mr-2" />Profile</TabsTrigger>
        </TabsList>
        <TabsContent value="coffee" className="mt-6"><MenuBrowser mode="stylist" user={user} /></TabsContent>
        <TabsContent value="chat" className="mt-6"><ChatPanel mode="stylist" user={user} /></TabsContent>
        <TabsContent value="services" className="mt-6"><ServicesPanel mode="stylist" user={user} /></TabsContent>
        <TabsContent value="service-update" className="mt-6"><ServiceUpdateForm user={user} /></TabsContent>
        <TabsContent value="profile" className="mt-6"><StylistProfile /></TabsContent>
      </Tabs>
    </div>
  );
}