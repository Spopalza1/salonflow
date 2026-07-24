import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageSquare, User, Search, Trash2, ArrowLeft, Scissors, MessagesSquare, MoreVertical } from 'lucide-react';
import { Image as UIImage } from '@/components/ui/image';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble from '@/components/chat/MessageBubble';
import ConversationItem from '@/components/chat/ConversationItem';
import ChatInput from '@/components/chat/ChatInput';
import ChatEmptyState from '@/components/chat/ChatEmptyState';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';

// Module-level cache so hidden conversations persist across tab remounts
let hiddenConversationsCache = null;

export default function ChatPanel({ mode, user }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [stylists, setStylists] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const mobileChatActive = searchParams.get('chat') === 'open';
  const openChat = () => setSearchParams(prev => { const next = new URLSearchParams(prev); next.set('chat', 'open'); return next; });
  const closeChat = () => setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('chat'); return next; }, { replace: true });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingRemoveId, setPendingRemoveId] = useState(null);
  const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState(false);

  // hiddenConversations: { [partnerId]: ISO timestamp when hidden }
  // A conversation auto-restores when a message newer than the hide timestamp arrives.
  const [hiddenConversations, setHiddenConversations] = useState(() => {
    const stored = hiddenConversationsCache || user?.hidden_conversations || user?.data?.hidden_conversations;
    if (Array.isArray(stored)) {
      // Migrate from old array format: set hide time to now so only future messages restore
      const obj = {};
      const now = new Date().toISOString();
      stored.forEach(id => { obj[id] = now; });
      return obj;
    }
    return stored || {};
  });
  const hiddenConversationsRef = useRef(hiddenConversations);
  useEffect(() => {
    hiddenConversationsRef.current = hiddenConversations;
    hiddenConversationsCache = hiddenConversations;
  }, [hiddenConversations]);

  const messagesEndRef = useRef(null);

  const persistHidden = async (newHidden) => {
    try {
      await base44.auth.updateMe({ hidden_conversations: newHidden });
    } catch (err) {
      console.error('Failed to persist hidden conversations:', err);
    }
  };

  const unhideConversation = useCallback((partnerId) => {
    setHiddenConversations(prev => {
      if (!prev[partnerId]) return prev;
      const next = { ...prev };
      delete next[partnerId];
      persistHidden(next);
      return next;
    });
  }, []);

  const loadStylists = useCallback(async () => {
    if (mode !== 'admin' || !user?.salon_id) return;
    try {
      const res = await base44.functions.invoke('getSalonStylists', {});
      setStylists(res.data?.stylists || []);
    } catch (err) {
      console.error('Failed to load stylists for chat:', err);
    }
  }, [mode, user?.salon_id]);

  useEffect(() => {
    loadStylists();
  }, [loadStylists]);

  useEffect(() => {
    if (mode !== 'admin' || !user?.salon_id) return;
    const unsubscribe = base44.entities.User.subscribe((event) => {
      if (event.type === 'update' || event.type === 'create' || event.type === 'delete') {
        loadStylists();
      }
    });
    return unsubscribe;
  }, [mode, user?.salon_id, loadStylists]);

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

        // Auto-restore hidden conversations that have messages newer than the hide timestamp
        const currentHidden = hiddenConversationsRef.current;
        const hiddenIds = Object.keys(currentHidden);
        if (hiddenIds.length > 0) {
          const toUnhide = [];
          hiddenIds.forEach(pid => {
            const hideTime = new Date(currentHidden[pid]).getTime();
            const hasNewer = data.some(m =>
              m.thread_partner_id === pid && new Date(m.created_date).getTime() > hideTime
            );
            if (hasNewer) toUnhide.push(pid);
          });
          if (toUnhide.length > 0) {
            const nextHidden = { ...currentHidden };
            toUnhide.forEach(pid => delete nextHidden[pid]);
            setHiddenConversations(nextHidden);
            persistHidden(nextHidden);
          }
        }
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

        // Auto-restore hidden conversation when a new message arrives
        const partnerId = event.data.thread_partner_id;
        if (partnerId && hiddenConversationsRef.current[partnerId]) {
          const hideTime = new Date(hiddenConversationsRef.current[partnerId]).getTime();
          const msgTime = new Date(event.data.created_date).getTime();
          if (msgTime > hideTime) {
            unhideConversation(partnerId);
          }
        }

        setMessages((prev) => {
          if (prev.some((m) => m.id === event.data.id)) return prev;
          const withoutPending = prev.filter(m => !(
            m._pending &&
            m.body === event.data.body &&
            m.sender_id === event.data.sender_id &&
            m.thread_partner_id === event.data.thread_partner_id
          ));
          return [...withoutPending, event.data];
        });
      } else if (event.type === 'update') {
        setMessages((prev) => prev.map((m) => m.id === event.data.id ? event.data : m));
      } else if (event.type === 'delete') {
        setMessages((prev) => prev.filter((m) => m.id !== event.id));
      }
    });
    return unsubscribe;
  }, [mode, user?.id, user?.salon_id, unhideConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedPartnerId]);

  const conversationMessages = selectedPartnerId
    ? (mode === 'stylist' ? messages : messages.filter((m) => m.thread_partner_id === selectedPartnerId))
    : [];

  const unreadIncomingKey = conversationMessages
    .filter((m) => !m.read && m.sender_id !== user.id)
    .map((m) => m.id)
    .join(',');

  useEffect(() => {
    if (loading || !unreadIncomingKey) return;
    unreadIncomingKey.split(',').filter(Boolean).forEach((id) => {
      base44.entities.Message.update(id, { read: true });
    });
  }, [unreadIncomingKey, loading, mode, user?.id]);

  const handleSend = async (messageData) => {
    const { body, media_url, media_type } = messageData;
    if (!body && !media_url) return;
    let partnerId, partnerName;
    if (mode === 'stylist') {
      partnerId = user.id;
      partnerName = user.display_name || user.full_name || user.email;
    } else {
      const partner = stylists.find((s) => s.id === selectedPartnerId);
      partnerId = selectedPartnerId;
      partnerName = partner?.display_name || partner?.full_name || partner?.email || 'Stylist';
    }
    const senderName = user.display_name || user.full_name || user.email;
    const senderRole = mode === 'admin' ? 'admin' : 'stylist';

    // Restore conversation if it was hidden (sender is starting a new chat)
    if (hiddenConversationsRef.current[partnerId]) {
      unhideConversation(partnerId);
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tempMessage = {
      id: tempId,
      _pending: true,
      sender_id: user.id,
      sender_name: senderName,
      sender_role: senderRole,
      thread_partner_id: partnerId,
      thread_partner_name: partnerName,
      body: body || '',
      media_url,
      media_type,
      salon_id: user.salon_id,
      created_date: new Date().toISOString(),
      read: false,
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const created = await base44.entities.Message.create({
        sender_id: user.id,
        sender_name: senderName,
        sender_role: senderRole,
        thread_partner_id: partnerId,
        thread_partner_name: partnerName,
        body: body || '',
        media_url,
        media_type,
        salon_id: user.salon_id
      });
      setMessages(prev => prev.map(m => m.id === tempId ? created : m));
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      console.error('Failed to send message:', err);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await base44.entities.Message.delete(messageId);
    } catch (err) {
    }
  };

  // Per-user soft delete (hides conversation from current user's list only)
  const handleRemoveConversation = async (partnerId) => {
    if (!partnerId) return;
    setPendingRemoveId(null);
    const prevHidden = { ...hiddenConversations };
    const newHidden = { ...prevHidden, [partnerId]: new Date().toISOString() };
    setHiddenConversations(newHidden);

    if (selectedPartnerId === partnerId) {
      setSelectedPartnerId(null);
      closeChat();
    }

    const undo = () => {
      setHiddenConversations(prevHidden);
      persistHidden(prevHidden);
    };

    toast({
      title: 'Conversation removed',
      description: 'It will return if a new message is received.',
      duration: 6000,
      action: <ToastAction altText="Undo" onClick={undo}>Undo</ToastAction>,
    });

    try {
      await base44.auth.updateMe({ hidden_conversations: newHidden });
    } catch {
      setHiddenConversations(prevHidden);
    }
  };

  // Permanent delete (admin only — deletes all messages for everyone)
  const handlePermanentDelete = async () => {
    const partnerId = selectedPartnerId;
    setShowPermanentDeleteConfirm(false);
    setMessages((prev) => prev.filter((m) => m.thread_partner_id !== partnerId));
    setSelectedPartnerId(null);
    closeChat();
    try {
      await base44.entities.Message.deleteMany({ thread_partner_id: partnerId });
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  // ─── Stylist mode ───
  if (mode === 'stylist') {
    const isHidden = !!hiddenConversations[user.id];
    const showChat = selectedPartnerId && !isHidden;

    return (
      <div className="flex flex-col flex-1 min-h-0">
        <Card className="glass-card flex-1 min-h-0 flex flex-col overflow-hidden rounded-3xl">
          <AnimatePresence mode="wait">
            {showChat ? (
              <motion.div
                key="chat"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex-1 min-h-0 flex flex-col"
              >
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border/20">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Scissors className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-heading font-semibold text-sm block">Front Desk</span>
                    <p className="text-xs text-muted-foreground">Salon Administration</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0 min-h-[44px] min-w-[44px] touch-target">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setPendingRemoveId(user.id)} className="text-destructive focus:text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove Conversation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex-1 overflow-y-auto chat-scroll scroll-smooth p-4">
                  {conversationMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center px-6">
                      <MessagesSquare className="w-12 h-12 mb-3 opacity-30" />
                      <p className="text-sm font-medium">No messages yet</p>
                      <p className="text-xs mt-1">Say hi to the front desk!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {conversationMessages.map((msg) => (
                        <div key={msg.id} className={`msg-enter flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'} ${msg._pending ? 'opacity-60' : ''}`}>
                          <MessageBubble msg={msg} isOwn={msg.sender_id === user.id} canDownload={mode === 'admin'} />
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
                <ChatInput onSend={handleSend} />
              </motion.div>
            ) : (
              <ChatEmptyState
                key="empty"
                icon={Scissors}
                title="Front Desk Chat"
                subtitle="Tap below to start messaging with the front desk."
                actionLabel="Open Chat"
                onAction={() => {
                  if (isHidden) {
                    unhideConversation(user.id);
                  }
                  setSelectedPartnerId(user.id);
                }}
              />
            )}
          </AnimatePresence>
        </Card>

        <AlertDialog open={!!pendingRemoveId} onOpenChange={(open) => !open && setPendingRemoveId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this conversation from your chat list?</AlertDialogTitle>
              <AlertDialogDescription>
                It will automatically return if a new message is received.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleRemoveConversation(pendingRemoveId)}>
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ─── Admin mode ───
  const lastMessageByStylist = {};
  const unreadCountByStylist = {};
  messages.forEach(m => {
    if (!m.thread_partner_id) return;
    const pid = m.thread_partner_id;
    if (!lastMessageByStylist[pid] || new Date(m.created_date) > new Date(lastMessageByStylist[pid].created_date)) {
      lastMessageByStylist[pid] = m;
    }
    if (!m.read && m.sender_role !== 'admin') {
      unreadCountByStylist[pid] = (unreadCountByStylist[pid] || 0) + 1;
    }
  });

  const filteredStylists = stylists.filter((s) => {
    // Without a search query, hide removed conversations
    if (!searchQuery.trim()) {
      if (hiddenConversations[s.id]) return false;
      return true;
    }
    // When searching, show all matching stylists (including removed ones)
    const q = searchQuery.toLowerCase();
    return (s.full_name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
  });

  const selectedStylist = stylists.find((s) => s.id === selectedPartnerId);
  const selectedStylistName = selectedStylist?.display_name || selectedStylist?.full_name || selectedStylist?.email || 'Stylist';

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        <h2 className="font-heading text-xl font-semibold">Stylist Chat</h2>
      </div>
      {stylists.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-center px-6">
          <User className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">No stylists yet</p>
          <p className="text-xs mt-1">Invite stylists from your dashboard to start chatting.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 grid-rows-1 md:grid-cols-[280px_1fr] gap-4 flex-1 min-h-0">
          {/* Conversation list */}
          <Card className={`glass-card overflow-hidden flex-col min-h-0 rounded-3xl ${mobileChatActive ? 'hidden' : 'flex'} md:flex`}>
            <div className="p-3 border-b border-border/20">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search stylists..." className="h-9 pl-8 text-sm rounded-xl bg-muted/30 border-border/20" />
              </div>
            </div>
            <div className="overflow-y-auto chat-scroll flex-1 p-2 space-y-0.5">
              {filteredStylists.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No stylists found</p>
              ) : null}
              {filteredStylists.map((s) => (
                <ConversationItem
                  key={s.id}
                  stylist={s}
                  isSelected={selectedPartnerId === s.id}
                  unreadCount={unreadCountByStylist[s.id] || 0}
                  lastMessage={lastMessageByStylist[s.id]?.body}
                  lastMessageTime={lastMessageByStylist[s.id]?.created_date}
                  onSelect={() => {
                    // Restore conversation if it was hidden
                    if (hiddenConversations[s.id]) {
                      unhideConversation(s.id);
                    }
                    setSelectedPartnerId(s.id);
                    openChat();
                  }}
                  onRemove={() => setPendingRemoveId(s.id)}
                />
              ))}
            </div>
          </Card>

          {/* Chat panel */}
          <Card className={`glass-card flex-col overflow-hidden min-h-0 rounded-3xl ${mobileChatActive ? 'flex' : 'hidden'} md:flex`}>
            <AnimatePresence mode="wait">
              {selectedPartnerId ? (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="flex-1 min-h-0 flex flex-col"
                >
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border/20">
                    <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 shrink-0 min-h-[44px] min-w-[44px] touch-target" onClick={() => closeChat()}>
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                      {selectedStylist?.profile_picture_url ? (
                        <UIImage src={selectedStylist.profile_picture_url} fittingType="fill" className="w-10 h-10" />
                      ) : (
                        <User className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold truncate block">{selectedStylistName}</span>
                      <span className="text-xs text-muted-foreground capitalize">{selectedStylist?.role || 'stylist'}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0 min-h-[44px] min-w-[44px] touch-target">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPendingRemoveId(selectedPartnerId)} className="text-destructive focus:text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove Conversation
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setShowPermanentDeleteConfirm(true)} className="text-destructive focus:text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Permanently Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex-1 overflow-y-auto chat-scroll scroll-smooth p-4">
                    {conversationMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center px-6">
                        <MessagesSquare className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm font-medium">No messages yet</p>
                        <p className="text-xs mt-1">Start the conversation!</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {conversationMessages.map((msg) => (
                          <div key={msg.id} className={`msg-enter group flex items-end gap-1.5 ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'} ${msg._pending ? 'opacity-60' : ''}`}>
                            <MessageBubble msg={msg} isOwn={msg.sender_role === 'admin'} canDownload={mode === 'admin'} />
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="md:opacity-0 md:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg touch-target"
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
                </motion.div>
              ) : (
                <ChatEmptyState
                  key="empty"
                  title="Select a conversation"
                  subtitle="Choose a stylist, guest, or admin conversation from the left to begin messaging."
                />
              )}
            </AnimatePresence>
          </Card>
        </div>
      )}

      {/* Remove confirmation (soft delete) */}
      <AlertDialog open={!!pendingRemoveId && !showPermanentDeleteConfirm} onOpenChange={(open) => !open && setPendingRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this conversation from your chat list?</AlertDialogTitle>
            <AlertDialogDescription>
              It will automatically return if a new message is received.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleRemoveConversation(pendingRemoveId)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent delete confirmation (admin only) */}
      <AlertDialog open={showPermanentDeleteConfirm} onOpenChange={setShowPermanentDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this conversation and its messages?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All messages will be deleted for everyone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePermanentDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}