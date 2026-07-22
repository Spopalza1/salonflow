import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function GuestChat({ guestInfo, salonId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const { toast } = useToast();

  const loadMessages = useCallback(async () => {
    try {
      const response = await base44.functions.invoke('getGuestMessages', {
        salon_id: salonId,
        guest_session: guestInfo.session,
      });
      setMessages(response.data.messages || []);
    } catch (e) {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [salonId, guestInfo?.session]);

  useEffect(() => {
    loadMessages();
    const unsubscribe = base44.entities.GuestMessage.subscribe((event) => {
      if (event.data.guest_session !== guestInfo.session || event.data.salon_id !== salonId) return;
      if (event.type === 'create') {
        setMessages(prev => [...prev, event.data]);
      } else if (event.type === 'update') {
        setMessages(prev => prev.map(m => m.id === event.data.id ? event.data : m));
      } else if (event.type === 'delete') {
        setMessages(prev => prev.filter(m => m.id !== event.id));
      }
    });
    return unsubscribe;
  }, [loadMessages, guestInfo?.session, salonId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    try {
      await base44.entities.GuestMessage.create({
        guest_name: guestInfo.name,
        message: input.trim(),
        sender_type: 'guest',
        guest_session: guestInfo.session,
        salon_id: salonId,
      });
      setInput('');
    } catch (err) {
      toast({ title: 'Failed to send', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            <p className="text-sm">No messages yet. Say hi to the front desk!</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender_type === 'front_desk' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                msg.sender_type === 'front_desk'
                  ? 'bg-muted rounded-bl-sm'
                  : 'bg-primary text-primary-foreground rounded-br-sm'
              }`}>
                <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSend} className="shrink-0 border-t p-3 flex gap-2 bg-background safe-area-bottom">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={sending || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}