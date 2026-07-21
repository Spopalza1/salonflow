import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Mic, Square, Paperclip } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function ChatInput({ onSend }) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const { toast } = useToast();

  const handleTextSend = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;
    const body = input.trim();
    setInput('');
    try {
      await onSend({ body });
    } catch {
      setInput(body);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select an image or video file.' });
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await onSend({
        body: isImage ? '📷 Photo' : '🎥 Video',
        media_url: file_url,
        media_type: isImage ? 'image' : 'video',
      });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to upload file.' });
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());

        setUploading(true);
        try {
          const file = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          await onSend({
            body: '🎤 Voice message',
            media_url: file_url,
            media_type: 'audio',
          });
        } catch {
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to upload voice message.' });
        } finally {
          setUploading(false);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not access microphone.' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="p-3 border-t">
      {uploading && (
        <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
          <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
          Uploading...
        </div>
      )}
      <form onSubmit={handleTextSend} className="flex gap-2 items-center">
        <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
        <Button type="button" size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={uploading || isRecording}>
          <Paperclip className="w-4 h-4" />
        </Button>
        {isRecording ? (
          <>
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 text-red-600">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm">Recording...</span>
            </div>
            <Button type="button" size="icon" variant="destructive" onClick={stopRecording}>
              <Square className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..." disabled={uploading} />
            <Button type="button" size="icon" variant="ghost" onClick={startRecording} disabled={uploading}>
              <Mic className="w-4 h-4" />
            </Button>
            <Button type="submit" size="icon" disabled={!input.trim() || uploading}>
              <Send className="w-4 h-4" />
            </Button>
          </>
        )}
      </form>
    </div>
  );
}