import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageSquare, User, Search, Trash2, ArrowLeft } from 'lucide-react';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatInput from '@/components/chat/ChatInput';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

export default function ChatPanel({ mode, user }) {
  const [messages, setMessages] = useState([]);
  const [stylists, setStylists] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [mobileChatActive, setMobileChatActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDeleteConvConfirm, setShowDeleteConvConfirm] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (mode !== 'admin' || !user?.salon_id) return;
    const loadStylists = async () => {
      try {
        const all = await base44.entities.User.filter({ salon_id: user.salon_id });
        const nonAdmins = all.filter(u => u.role !== 'admin');
        setStylists(nonAdmins);
        if (nonAdmins.length > 0) setSelectedPartnerId(nonAdmins[0].id);
      } catch (err) {
        console.error('Failed to load stylists for chat:', err);
      }
    };
    loadStylists();
  }, [mode, user?.salon_id]);

  useEffect(() => {
    if (!user?.id) return;
    if (mode === 'admin' && !user?.salon_id) return;
    const load = async () => {
      try {
        let data;
        if (mode === 'stylist') {
          data = await base44.entities.Message.filter({ thread_partner_id: user.id }, 'created_date');
        } else {
          data = await base44.entities.Message.filter({ salon_id: user.salon_id }, 'created_date', 500);
        }
        setMessages(data);
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoading(false);
      }
    };
    load();

    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create') {
        if (!user?.salon_id || event.data.salon_id !== user.salon_id) return;
        setMessages(prev => {
          if (prev.some(m => m.id === event.data.id)) return prev;
          return [...prev, event.data];
        });
      } else if (event.type === 'update') {
        setMessages(prev => prev.map(m => m.id === event.data.id ? event.data : m));
      } else if (event.type === 'delete') {
        setMessages(prev => prev.filter(m => m.id !== event.id));
      }
    });
    return unsubscribe;
  }, [mode, user?.id, user?.salon_id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedPartnerId]);

  const conversationMessages = mode === 'stylist'
    ? messages
    : messages.filter(m => m.thread_partner_id === selectedPartnerId);

  const unreadIncomingKey = conversationMessages
    .filter(m => !m.read && m.sender_id !== user.id)
    .map(m => m.id)
    .join(',');

  // Mark incoming messages as read when the conversation is viewed
  useEffect(() => {
    if (loading || !unreadIncomingKey) return;
    unreadIncomingKey.split(',').filter(Boolean).forEach(id => {
      base44.entities.Message.update(id, { read: true });
    });
  }, [unreadIncomingKey, loading, mode, user?.id]);

  const handleSend = async (messageData) => {
    const { body, media_url, media_type } = messageData;
    if (!body && !media_url) return;
    let partnerId, partnerName;
    if (mode === 'stylist') {
      partnerId = user.id;
      partnerName = user.full_name || user.email;
    } else {
      const partner = stylists.find(s => s.id === selectedPartnerId);
      partnerId = selectedPartnerId;
      partnerName = partner?.full_name || partner?.email || 'Stylist';
    }
    await base44.entities.Message.create({
      sender_id: user.id,
      sender_name: user.full_name || user.email,
      sender_role: mode === 'admin' ? 'admin' : 'stylist',
      thread_partner_id: partnerId,
      thread_partner_name: partnerName,
      body: body || '',
      media_url,
      media_type,
      salon_id: user.salon_id,
    });
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await base44.entities.Message.delete(messageId);
    } catch (err) {
      // Message may have already been deleted via real-time sync — ignore
    }
  };

  const handleDeleteConversation = async () => {
    await base44.entities.Message.deleteMany({ thread_partner_id: selectedPartnerId });
    setShowDeleteConvConfirm(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  if (mode === 'stylist') {
    return (
      <div className="flex flex-col h-[calc(100vh-220px)]">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-5 h-5" />
          <h2 className="font-heading text-xl font-semibold">Front Desk Chat</h2>
        </div>
        <Card className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            {conversationMessages.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No messages yet. Say hi to the front desk!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {conversationMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                    <MessageBubble msg={msg} isOwn={msg.sender_id === user.id} canDownload={mode === 'admin'} />
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          <ChatInput onSend={handleSend} />
        </Card>
      </div>
    );
  }

  const stylistsWithMessages = new Set(messages.filter(m => m.thread_partner_id).map(m => m.thread_partner_id));
  const unreadByStylist = new Set(messages.filter(m => !m.read && m.sender_role !== 'admin' && m.thread_partner_id).map(m => m.thread_partner_id));
  const filteredStylists = stylists.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (s.full_name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        <h2 className="font-heading text-xl font-semibold">Stylist Chat</h2>
      </div>
      {stylists.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No stylists registered yet. Invite stylists from your dashboard.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-4 h-[calc(100vh-200px)] md:h-[calc(100vh-240px)]">
          <Card className={`overflow-hidden flex-col ${mobileChatActive ? 'hidden' : 'flex'} md:flex`}>
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search stylists..." className="h-8 pl-7 text-sm" />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {filteredStylists.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No stylists found</p>
              ) : null}
              {filteredStylists.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedPartnerId(s.id); setMobileChatActive(true); }}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${selectedPartnerId === s.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  <span className="text-sm font-medium truncate">{s.full_name || s.email}</span>
                  {unreadByStylist.has(s.id) && selectedPartnerId !== s.id && (
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </Card>
          <Card className={`flex-col overflow-hidden ${mobileChatActive ? 'flex' : 'hidden'} md:flex`}>
            {selectedPartnerId ? (
              <>
                <div className="flex items-center gap-2 px-4 py-2 border-b">
                  <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 shrink-0" onClick={() => setMobileChatActive(false)}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium truncate flex-1">
                    {stylists.find(s => s.id === selectedPartnerId)?.full_name || stylists.find(s => s.id === selectedPartnerId)?.email || 'Stylist'}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setShowDeleteConvConfirm(true)} className="text-destructive hover:text-destructive h-8">
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete Chat
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {conversationMessages.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {conversationMessages.map(msg => (
                        <div key={msg.id} className={`group flex items-center gap-1.5 ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                          <MessageBubble msg={msg} isOwn={msg.sender_role === 'admin'} canDownload={mode === 'admin'} />
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
                <ChatInput onSend={handleSend} />
              </>
            ) : (
              <div className="flex items-center justify-center text-muted-foreground">Select a stylist to chat</div>
            )}
          </Card>
        </div>
      )}
      <AlertDialog open={showDeleteConvConfirm} onOpenChange={setShowDeleteConvConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entire conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all messages in this chat. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConversation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}