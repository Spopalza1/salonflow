import { Image } from '@/components/ui/image';
import VoiceMessagePlayer from '@/components/chat/VoiceMessagePlayer';

export default function MessageBubble({ msg, isOwn }) {
  const hasMedia = msg.media_url && msg.media_type;
  const isAudio = hasMedia && msg.media_type === 'audio';

  return (
    <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${isOwn ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
      {hasMedia && msg.media_type === 'image' && (
        <Image
          src={msg.media_url}
          className="rounded-lg mb-1 max-h-64"
          fittingType="fit"
        />
      )}
      {hasMedia && msg.media_type === 'video' && (
        <video src={msg.media_url} controls className="rounded-lg max-w-full max-h-64 mb-1" />
      )}
      {isAudio && (
        <VoiceMessagePlayer src={msg.media_url} isOwn={isOwn} />
      )}
      {msg.body && !isAudio && <p className="text-sm whitespace-pre-wrap">{msg.body}</p>}
      <p className="text-[10px] opacity-60 mt-1 text-right">{new Date(msg.created_date).toLocaleTimeString()}</p>
    </div>
  );
}