import { useState, useEffect, useRef } from 'react';
import { MUSIC_BASE_URL } from '../config';

interface MusicPlayerProps {
  src?: string;
  autoPlay?: boolean;
}

export function MusicPlayer({ src, autoPlay = false }: MusicPlayerProps) {
  const musicSrc = src || `${MUSIC_BASE_URL}/松本梨香 - めざせポケモンマスター.mp3`;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio(musicSrc);
    audioRef.current.loop = true;

    // Set up event listeners
    const audio = audioRef.current;

    const handleCanPlay = () => {
      setIsLoading(false);
      setHasError(false);
      if (autoPlay) {
        audio.play().catch(() => {
          // Auto-play was blocked, show controls instead
          setIsPlaying(false);
        });
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleError = (e: Event) => {
      console.error('Music playback error:', e);
      setIsLoading(false);
      setIsPlaying(false);
      setHasError(true);
    };

    audio.addEventListener('canplaythrough', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
    };
  }, [musicSrc, autoPlay]);

  const togglePlay = async () => {
    if (!audioRef.current || isLoading || hasError) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Playback failed:', error);
      setIsPlaying(false);
      setHasError(true);
    }
  };

  if (hasError) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <button
          className="w-12 h-12 rounded-full border-4 border-black bg-gray-400 cursor-not-allowed flex items-center justify-center"
          title="音乐加载失败"
        >
          <span className="text-xl">❌</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={togglePlay}
        disabled={isLoading}
        className={`
          w-12 h-12 rounded-full border-4 border-black 
          flex items-center justify-center
          transition-all duration-200
          ${isLoading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : isPlaying 
              ? 'bg-[#FFCB05] hover:bg-[#E6B800] animate-pulse' 
              : 'bg-[#3B4CCA] hover:bg-[#2A3BA8]'
          }
          shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
          active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]
          active:translate-x-[2px]
          active:translate-y-[2px]
        `}
        title={isPlaying ? '暂停音乐' : '播放音乐'}
      >
        {isLoading ? (
          <span className="text-lg animate-spin">⏳</span>
        ) : isPlaying ? (
          <span className="text-xl">⏸️</span>
        ) : (
          <span className="text-xl">▶️</span>
        )}
      </button>
    </div>
  );
}
