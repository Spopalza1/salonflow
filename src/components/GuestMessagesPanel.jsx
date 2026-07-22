import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';

export default function GuestMessagesPanel() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const { toast } = useToast();

  const loadMessages = useCallback(async () => {
    if (!user?.salon_id) return;
    const data = await base44.entities.GuestMessage.filter({ salon_id: user.salon_id }, 'created_date', 500);
    setMessages(data);
  }, [user?.salon_id]);

  useEffect(() => {
    if (!user?.salon_id) return;
    loadMessages().then(() => setLoading(false));
    const unsubscribe = base44.entities.GuestMessage.subscribe((event) => {
      if (!user?.salon_id || !event.data.salon_id || event.data.salon_id !== user.salon_id) return;
      if (event.type === 'create') {
        setMessages(prev => [...prev, event.data]);
      } else if (event.type === 'update') {
        setMessages(prev => prev.map(m => m.id === event.data.id ? event.data : m));
      } else if (event.type === 'delete') {
        setMessages(prev => prev.filter(m => m.id !== event.id));
      }
    });
    return unsubscribe;
  }, [loadMessages, user?.salon_id]);

  const conversations = useMemo(() => {
    const map = new Map();
    messages.forEach(msg => {
      const key = msg.guest_session || msg.guest_name;
      if (!map.has(key)) {
        map.set(key, {
          session: msg.guest_session,
          guest_name: msg.guest_name,
          messages: [],
          lastTime: msg.created_date,
          unread: 0,
        });
      }
      const conv = map.get(key);
      conv.messages.push(msg);
      if (new Date(msg.created_date) > new Date(conv.lastTime)) {
        conv.lastTime = msg.created_date;
      }
      if (msg.sender_type === 'guest' && !msg.read) {
        conv.unread++;
      }
    });
    const list = Array.from(map.values());
    list.forEach(c => c.messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
    return list.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
  }, [messages]);

  const activeConv = conversations.find(c => c.session === activeSession);

  useEffect(() => {
    if (!activeConv) return;
    activeConv.messages
      .filter(m => m.sender_type === 'guest' && !m.read)
      .forEach(m => {
        base44.entities.GuestMessage.update(m.id, { read: true }).catch(() => {});
      });
  }, [activeSession, activeConv?.messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConv?.messages.length, activeSession]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeConv) return;
    setSending(true);
    try {
      await base44.entities.GuestMessage.create({
        guest_name: activeConv.guest_name,
        message: input.trim(),
        sender_type: 'front_desk',
        guest_session: activeConv.session,
        salon_id: user.salon_id,
        read: true,
      });
      setInput('');
    } catch (err) {
      toast({ title: 'Failed to send', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No guest conversations yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-heading text-xl font-semibold">Guest Chat</h2>
      </div>
      <div className="md:grid md:grid-cols-[300px_1fr] md:gap-4">
        {/* Conversation list */}
        <div className={`${activeSession ? 'hidden md:block' : 'block'} space-y-2`}>
          {conversations.map(conv => (
            <button
              key={conv.session || conv.guest_name}
              onClick={() => setActiveSession(conv.session)}
              className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent ${
                activeSession === conv.session ? 'border-primary bg-accent' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{conv.guest_name}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {conv.messages[conv.messages.length - 1]?.message || 'No messages'}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {new Date(conv.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {conv.unread > 0 && <Badge variant="destructive" className="text-xs">{conv.unread}</Badge>}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Chat view */}
        <div className={`${activeSession ? 'block' : 'hidden md:block'}`}>
          {activeConv ? (
            <div className="flex flex-col h-[calc(100vh-220px)] md:h-[calc(100vh-180px)]">
              <div className="flex items-center gap-2 p-3 border-b">
                <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setActiveSession(null)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />Back
                </Button>
                <span className="font-heading font-semibold">{activeConv.guest_name}</span>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {activeConv.messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'front_desk' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      msg.sender_type === 'front_desk'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted rounded-bl-sm'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleReply} className="shrink-0 border-t p-3 flex gap-2">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type a reply..."
                  disabled={sending}
                />
                <Button type="submit" size="icon" disabled={sending || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Select a conversation to start chatting.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}