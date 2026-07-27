import { useState } from 'react';
import { Image } from '@/components/ui/image';
import { CheckCheck, Clock3, Play } from 'lucide-react';
import VoiceMessagePlayer from '@/components/chat/VoiceMessagePlayer';
import MediaViewer from '@/components/chat/MediaViewer';
import { cn } from '@/lib/utils';

const formatMessageTime = (dateStr) => dateStr ? new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

export default function MessageBubble({ msg, isOwn, canDownload, grouped = false }) {
  const [viewerMedia, setViewerMedia] = useState(null);
  const hasMedia = msg.media_url && msg.media_type;
  const isAudio = hasMedia && msg.media_type === 'audio';
  const openViewer = () => hasMedia && ['image','video'].includes(msg.media_type) && setViewerMedia({ url: msg.media_url, type: msg.media_type });
  return <>
    <div className={cn('sf-message-bubble', isOwn ? 'is-own' : 'is-incoming', grouped && 'is-grouped', msg._pending && 'is-pending')}>
      {hasMedia && msg.media_type === 'image' && <button onClick={openViewer} className="mb-1 block cursor-zoom-in"><Image src={msg.media_url} className="max-h-64 rounded-2xl" fittingType="fit" /></button>}
      {hasMedia && msg.media_type === 'video' && <button onClick={openViewer} className="group relative mb-1 block"><video src={`${msg.media_url}#t=0.1`} preload="metadata" className="max-h-64 max-w-full rounded-2xl pointer-events-none" /><span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/20"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 transition-transform group-hover:scale-110"><Play className="h-5 w-5 translate-x-0.5 text-white" /></span></span></button>}
      {isAudio && <VoiceMessagePlayer src={msg.media_url} isOwn={isOwn} waveformData={msg.waveform_data} duration={msg.audio_duration} />}
      {msg.body && !isAudio && <p className="select-text whitespace-pre-wrap text-sm leading-relaxed">{msg.body}</p>}
      <div className={cn('sf-message-meta', isOwn && 'is-own')}><span>{formatMessageTime(msg.created_date)}</span>{isOwn && (msg._pending ? <Clock3 className="h-3 w-3" /> : <CheckCheck className={cn('h-3.5 w-3.5', msg.read && 'text-sky-300')} />)}</div>
    </div>
    {viewerMedia && <MediaViewer media={viewerMedia} canDownload={canDownload} onClose={() => setViewerMedia(null)} />}
  </>;
}
