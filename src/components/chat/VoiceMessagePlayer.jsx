import { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause, AlertCircle } from 'lucide-react';
import { activateAudio, releaseAudio } from '@/lib/audioPlaybackManager';

const SPEEDS = [1, 1.5, 2];

export default function VoiceMessagePlayer({ src, isOwn, waveformData, duration: suppliedDuration }) {
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);
  const dragging = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(suppliedDuration || 0);
  const [speed, setSpeed] = useState(1);
  const [failed, setFailed] = useState(false);

  const bars = useMemo(() => {
    if (Array.isArray(waveformData) && waveformData.length) return waveformData.slice(0, 42);
    return Array.from({ length: 42 }, (_, i) => 0.22 + Math.abs(Math.sin(i * 0.73)) * 0.68);
  }, [waveformData]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const loaded = () => { if (Number.isFinite(audio.duration)) setDuration(audio.duration); setFailed(false); };
    const time = () => { if (!dragging.current) setCurrentTime(audio.currentTime); };
    const ended = () => { setIsPlaying(false); setCurrentTime(0); releaseAudio(audio); };
    const play = () => { activateAudio(audio); setIsPlaying(true); };
    const pause = () => { setIsPlaying(false); releaseAudio(audio); };
    const error = () => setFailed(true);
    audio.addEventListener('loadedmetadata', loaded);
    audio.addEventListener('timeupdate', time);
    audio.addEventListener('ended', ended);
    audio.addEventListener('play', play);
    audio.addEventListener('pause', pause);
    audio.addEventListener('error', error);
    return () => {
      audio.pause(); releaseAudio(audio);
      audio.removeEventListener('loadedmetadata', loaded); audio.removeEventListener('timeupdate', time);
      audio.removeEventListener('ended', ended); audio.removeEventListener('play', play);
      audio.removeEventListener('pause', pause); audio.removeEventListener('error', error);
    };
  }, [src]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || failed) return;
    if (audio.paused) { activateAudio(audio); await audio.play().catch(() => setFailed(true)); }
    else audio.pause();
  };
  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next); if (audioRef.current) audioRef.current.playbackRate = next;
  };
  const format = (value) => `${Math.floor((value || 0) / 60)}:${Math.floor((value || 0) % 60).toString().padStart(2, '0')}`;
  const seek = (clientX) => {
    const bar = progressBarRef.current; const audio = audioRef.current;
    if (!bar || !audio || !duration) return;
    const rect = bar.getBoundingClientRect(); const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration; setCurrentTime(audio.currentTime);
  };
  const progress = duration ? currentTime / duration : 0;

  return (
    <div className="sf-voice-bubble min-w-[220px] max-w-[310px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button onClick={togglePlay} aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'} className={isOwn ? 'sf-voice-play is-own' : 'sf-voice-play'}>
        {failed ? <AlertCircle className="h-4 w-4" /> : isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
      </button>
      <div className="min-w-0 flex-1">
        <div ref={progressBarRef} role="slider" aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(currentTime)} tabIndex={0}
          onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); seek(e.clientX); }}
          onPointerMove={(e) => dragging.current && seek(e.clientX)}
          onPointerUp={(e) => { dragging.current = false; e.currentTarget.releasePointerCapture(e.pointerId); }}
          onKeyDown={(e) => { const audio = audioRef.current; if (!audio) return; if (e.key === 'ArrowRight') audio.currentTime = Math.min(duration, audio.currentTime + 5); if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5); }}
          className="sf-waveform"
        >
          {bars.map((height, index) => <span key={index} className={index / bars.length <= progress ? 'is-played' : ''} style={{ height: `${Math.max(18, height * 100)}%` }} />)}
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] opacity-75"><span>{failed ? 'Audio unavailable' : `${format(currentTime)} / ${format(duration)}`}</span><button onClick={cycleSpeed} className="rounded-full px-1.5 py-0.5 font-semibold hover:bg-white/10">{speed}×</button></div>
      </div>
    </div>
  );
}
