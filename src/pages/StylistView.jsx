import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/AuthContext';
import MenuBrowser from '@/components/MenuBrowser';
import ChatPanel from '@/components/ChatPanel';
import ServicesPanel from '@/components/ServicesPanel';
import { Coffee, MessageSquare, Scissors } from 'lucide-react';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';

export default function StylistView() {
  const { user } = useAuth();
  useMessageNotifications('stylist', user);

  return (
    <div className="p-6">
      <Tabs defaultValue="coffee">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="coffee"><Coffee className="w-4 h-4 mr-2" />Order Coffee</TabsTrigger>
          <TabsTrigger value="chat"><MessageSquare className="w-4 h-4 mr-2" />Chat</TabsTrigger>
          <TabsTrigger value="services"><Scissors className="w-4 h-4 mr-2" />My Services</TabsTrigger>
        </TabsList>
        <TabsContent value="coffee" className="mt-6"><MenuBrowser mode="stylist" user={user} /></TabsContent>
        <TabsContent value="chat" className="mt-6"><ChatPanel mode="stylist" user={user} /></TabsContent>
        <TabsContent value="services" className="mt-6"><ServicesPanel mode="stylist" user={user} /></TabsContent>
      </Tabs>
    </div>
  );
}