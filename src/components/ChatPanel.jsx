import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, MessageSquare, User } from 'lucide-react';

export default function ChatPanel({ mode, user }) {
  const [messages, setMessages] = useState([]);
  const [stylists, setStylists] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (mode !== 'admin') return;
    const loadStylists = async () => {
      const data = await base44.entities.User.filter({ role: 'stylist' });
      setStylists(data);
      if (data.length > 0) setSelectedPartnerId(data[0].id);
    };
    loadStylists();
  }, [mode]);

  useEffect(() => {
    const load = async () => {
      let data;
      if (mode === 'stylist') {
        data = await base44.entities.Message.filter({ thread_partner_id: user.id }, 'created_date');
      } else {
        data = await base44.entities.Message.list('created_date', 500);
      }
      setMessages(data);
      setLoading(false);
    };
    load();

    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create') {
        setMessages(prev => [...prev, event.data]);
      } else if (event.type === 'update') {
        setMessages(prev => prev.map(m => m.id === event.data.id ? event.data : m));
      } else if (event.type === 'delete') {
        setMessages(prev => prev.filter(m => m.id !== event.id));
      }
    });
    return unsubscribe;
  }, [mode, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedPartnerId]);

  const conversationMessages = mode === 'stylist'
    ? messages
    : messages.filter(m => m.thread_partner_id === selectedPartnerId);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;
    const body = input.trim();
    setInput('');
    try {
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
        sender_role: user.role,
        thread_partner_id: partnerId,
        thread_partner_name: partnerName,
        body,
      });
    } catch (err) {
      setInput(body);
    }
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
                    <div className={`max-w-[75%] rounded-lg px-3 py-2 ${msg.sender_id === user.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                      <p className="text-xs opacity-70 mt-1">{new Date(msg.created_date).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..." />
            <Button type="submit" size="icon"><Send className="w-4 h-4" /></Button>
          </form>
        </Card>
      </div>
    );
  }

  const stylistsWithMessages = new Set(messages.filter(m => m.thread_partner_id).map(m => m.thread_partner_id));

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
        <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-4 h-[calc(100vh-240px)]">
          <Card className="overflow-hidden">
            <div className="overflow-y-auto h-full p-2 space-y-1">
              {stylists.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedPartnerId(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${selectedPartnerId === s.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  <span className="text-sm font-medium truncate">{s.full_name || s.email}</span>
                  {stylistsWithMessages.has(s.id) && selectedPartnerId !== s.id && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </Card>
          <Card className="flex flex-col overflow-hidden">
            {selectedPartnerId ? (
              <>
                <div className="flex-1 overflow-y-auto p-4">
                  {conversationMessages.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {conversationMessages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] rounded-lg px-3 py-2 ${msg.sender_role === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                            <p className="text-xs opacity-70 mt-1">{new Date(msg.created_date).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
                <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
                  <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..." />
                  <Button type="submit" size="icon"><Send className="w-4 h-4" /></Button>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center text-muted-foreground">Select a stylist to chat</div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}