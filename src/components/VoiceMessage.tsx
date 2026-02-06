import { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Send,
  X,
  Volume2,
  VolumeX,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import {
  startRecording,
  stopRecording,
  cancelRecording,
  isRecording,
  speak,
  stopSpeaking,
  isSpeaking,
  formatDuration,
  blobToBase64,
  PRESET_MESSAGES,
  isVoiceSupported,
} from '../services/voiceService';

interface VoiceMessageRecorderProps {
  onSend: (audioBlob: Blob, duration: number, audioBase64?: string) => void;
  onCancel?: () => void;
  maxDuration?: number; // En secondes
}

export function VoiceMessageRecorder({
  onSend,
  onCancel,
  maxDuration = 60,
}: VoiceMessageRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [playing, setPlaying] = useState(false);
  const [sending, setSending] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();

  const support = isVoiceSupported();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const handleStartRecording = async () => {
    const success = await startRecording();
    if (success) {
      setRecording(true);
      setDuration(0);
      setAudioBlob(null);
      setAudioUrl('');

      timerRef.current = setInterval(() => {
        setDuration(d => {
          if (d >= maxDuration) {
            handleStopRecording();
            return d;
          }
          return d + 1;
        });
      }, 1000);
    }
  };

  const handleStopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const result = await stopRecording();
      setRecording(false);
      setAudioBlob(result.blob);
      setAudioUrl(URL.createObjectURL(result.blob));
      setDuration(Math.round(result.duration));
    } catch (error) {
      console.error('Erreur arrêt enregistrement:', error);
      setRecording(false);
    }
  };

  const handleCancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    cancelRecording();
    setRecording(false);
    setAudioBlob(null);
    setAudioUrl('');
    setDuration(0);
    onCancel?.();
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const handleSend = async () => {
    if (!audioBlob) return;

    setSending(true);
    try {
      const base64 = await blobToBase64(audioBlob);
      onSend(audioBlob, duration, base64);

      // Reset
      setAudioBlob(null);
      setAudioUrl('');
      setDuration(0);
    } finally {
      setSending(false);
    }
  };

  if (!support.recording) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-center">
        <MicOff className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-600 dark:text-red-400 text-sm">
          L'enregistrement audio n'est pas supporté sur cet appareil
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg">
      {/* Recording State */}
      {recording && (
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
            <Mic className="w-10 h-10 text-red-500" />
          </div>

          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {formatDuration(duration)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Enregistrement en cours...
          </p>

          {/* Progress bar */}
          <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${(duration / maxDuration) * 100}%` }}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancelRecording}
              className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" />
              Annuler
            </button>
            <button
              onClick={handleStopRecording}
              className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl flex items-center justify-center gap-2"
            >
              <Square className="w-5 h-5" />
              Arrêter
            </button>
          </div>
        </div>
      )}

      {/* Preview State */}
      {audioBlob && !recording && (
        <div>
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />

          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={handlePlayPause}
              className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"
            >
              {playing ? (
                <Pause className="w-7 h-7 text-primary-600" />
              ) : (
                <Play className="w-7 h-7 text-primary-600 ml-1" />
              )}
            </button>

            <div className="flex-1">
              <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center px-3">
                {/* Waveform placeholder */}
                <div className="flex items-center gap-0.5 flex-1">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-primary-400 rounded-full"
                      style={{ height: `${Math.random() * 20 + 8}px` }}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatDuration(duration)}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancelRecording}
              className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" />
              Supprimer
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex-1 py-3 bg-primary-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Envoyer
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Initial State */}
      {!recording && !audioBlob && (
        <div className="text-center">
          <button
            onClick={handleStartRecording}
            className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
          >
            <Mic className="w-10 h-10 text-primary-600" />
          </button>
          <p className="text-gray-600 dark:text-gray-300 font-medium">
            Appuyez pour enregistrer
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Max {maxDuration} secondes
          </p>
        </div>
      )}
    </div>
  );
}

// Composant pour les messages prédéfinis
interface PresetMessagesProps {
  type: 'driver' | 'customer';
  onSelect: (message: string, key: string) => void;
}

export function PresetMessages({ type, onSelect }: PresetMessagesProps) {
  const messages = type === 'driver' ? PRESET_MESSAGES.driver : PRESET_MESSAGES.customer;
  const [speaking, setSpeaking] = useState<string | null>(null);

  const labels: Record<string, string> = {
    // Driver
    arriving: "🚗 J'arrive",
    atLocation: '📍 Je suis arrivé',
    waiting: '⏳ Je vous attends',
    cantFind: '❓ Adresse introuvable',
    noAnswer: '🔔 Pas de réponse',
    leftPackage: '📦 Colis déposé',
    callBack: '📞 Rappelez-moi',
    traffic: '🚦 Embouteillages',
    // Customer
    onMyWay: "🏃 J'arrive",
    notHome: '🏠 Pas à la maison',
    neighbor: '👋 Chez le voisin',
    callMe: '📱 Appelez-moi',
    relayPoint: '📍 Point relais',
    thanks: '🙏 Merci',
  };

  const handlePlay = (key: string, message: string) => {
    if (speaking === key) {
      stopSpeaking();
      setSpeaking(null);
    } else {
      setSpeaking(key);
      speak(message, {
        onEnd: () => setSpeaking(null),
      });
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {Object.entries(messages).map(([key, message]) => (
        <button
          key={key}
          onClick={() => onSelect(message, key)}
          className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative group"
        >
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {labels[key] || key}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {message}
          </p>

          {/* Play button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePlay(key, message);
            }}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {speaking === key ? (
              <VolumeX className="w-3 h-3 text-primary-600" />
            ) : (
              <Volume2 className="w-3 h-3 text-primary-600" />
            )}
          </button>
        </button>
      ))}
    </div>
  );
}

// Composant de lecture de message vocal
interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration: number;
  transcript?: string;
  isOwn?: boolean;
}

export function VoiceMessagePlayer({
  audioUrl,
  duration,
  transcript,
  isOwn = false,
}: VoiceMessagePlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  return (
    <div
      className={`p-3 rounded-2xl max-w-[80%] ${
        isOwn
          ? 'bg-primary-500 text-white ml-auto'
          : 'bg-gray-100 dark:bg-gray-800'
      }`}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        className="hidden"
      />

      <div className="flex items-center gap-3">
        <button
          onClick={handlePlayPause}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            isOwn
              ? 'bg-white/20'
              : 'bg-primary-100 dark:bg-primary-900/30'
          }`}
        >
          {playing ? (
            <Pause className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-primary-600'}`} />
          ) : (
            <Play className={`w-5 h-5 ml-0.5 ${isOwn ? 'text-white' : 'text-primary-600'}`} />
          )}
        </button>

        <div className="flex-1">
          {/* Progress bar */}
          <div className={`h-1 rounded-full overflow-hidden ${
            isOwn ? 'bg-white/30' : 'bg-gray-300 dark:bg-gray-600'
          }`}>
            <div
              className={`h-full transition-all ${isOwn ? 'bg-white' : 'bg-primary-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
            {formatDuration(duration)}
          </p>
        </div>
      </div>

      {transcript && (
        <p className={`text-xs mt-2 ${isOwn ? 'text-white/80' : 'text-gray-600 dark:text-gray-300'}`}>
          {transcript}
        </p>
      )}
    </div>
  );
}
