import { Image } from '@/components/ui/image';

export default function MessageBubble({ msg, isOwn }) {
  const hasMedia = msg.media_url && msg.media_type;

  return (
    <div className={`max-w-[75%] rounded-lg px-3 py-2 ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
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
      {hasMedia && msg.media_type === 'audio' && (
        <audio src={msg.media_url} controls className="w-full mb-1" />
      )}
      {msg.body && <p className="text-sm whitespace-pre-wrap">{msg.body}</p>}
      <p className="text-xs opacity-70 mt-1">{new Date(msg.created_date).toLocaleTimeString()}</p>
    </div>
  );
}