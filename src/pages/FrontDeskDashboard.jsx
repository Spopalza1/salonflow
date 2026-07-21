import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/AuthContext';
import OrdersPanel from '@/components/OrdersPanel';
import MenuManager from '@/components/MenuManager';
import ChatPanel from '@/components/ChatPanel';
import ServicesPanel from '@/components/ServicesPanel';
import QRDisplay from '@/components/QRDisplay';
import StylistManager from '@/components/StylistManager';
import GuestMessagesPanel from '@/components/GuestMessagesPanel';
import DailyReport from '@/components/DailyReport';
import { ClipboardList, Coffee, MessageSquare, Scissors, QrCode, Users, Mail, BarChart3 } from 'lucide-react';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';

export default function FrontDeskDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location.search]);

  useMessageNotifications('admin', user);
  useAdminNotifications();

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="orders"><ClipboardList className="w-4 h-4 mr-2" />Orders</TabsTrigger>
          <TabsTrigger value="menu"><Coffee className="w-4 h-4 mr-2" />Menu</TabsTrigger>
          <TabsTrigger value="chat">
            <MessageSquare className="w-4 h-4 mr-2" />Chat
          </TabsTrigger>
          <TabsTrigger value="services"><Scissors className="w-4 h-4 mr-2" />Services</TabsTrigger>
          <TabsTrigger value="stylists"><Users className="w-4 h-4 mr-2" />Stylists</TabsTrigger>
          <TabsTrigger value="messages"><Mail className="w-4 h-4 mr-2" />Messages</TabsTrigger>
          <TabsTrigger value="qr"><QrCode className="w-4 h-4 mr-2" />QR Code</TabsTrigger>
          <TabsTrigger value="report"><BarChart3 className="w-4 h-4 mr-2" />Daily Report</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="mt-6"><OrdersPanel /></TabsContent>
        <TabsContent value="menu" className="mt-6"><MenuManager /></TabsContent>
        <TabsContent value="chat" className="mt-6"><ChatPanel mode="admin" user={user} /></TabsContent>
        <TabsContent value="services" className="mt-6"><ServicesPanel mode="admin" user={user} /></TabsContent>
        <TabsContent value="stylists" className="mt-6"><StylistManager /></TabsContent>
        <TabsContent value="messages" className="mt-6"><GuestMessagesPanel /></TabsContent>
        <TabsContent value="qr" className="mt-6"><QRDisplay /></TabsContent>
        <TabsContent value="report" className="mt-6"><DailyReport /></TabsContent>
      </Tabs>
    </div>
  );
}