// Service de messages vocaux - LogiTrack Africa
// Utilise Web Speech API pour la reconnaissance et synthèse vocale

export interface VoiceMessage {
  id: string;
  audioBlob?: Blob;
  audioUrl?: string;
  transcript?: string;
  duration: number; // En secondes
  createdAt: Date;
  senderId: string;
  senderType: 'driver' | 'customer';
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// Vérification du support
export function isVoiceSupported(): {
  recognition: boolean;
  synthesis: boolean;
  recording: boolean;
} {
  return {
    recognition: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
    synthesis: 'speechSynthesis' in window,
    recording: 'MediaRecorder' in window,
  };
}

// ============================================
// ENREGISTREMENT AUDIO
// ============================================

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let recordingStartTime: number = 0;

/**
 * Démarre l'enregistrement audio
 */
export async function startRecording(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    audioChunks = [];
    recordingStartTime = Date.now();

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.start(100); // Capture toutes les 100ms
    return true;
  } catch (error) {
    console.error('Erreur démarrage enregistrement:', error);
    return false;
  }
}

/**
 * Arrête l'enregistrement et retourne le blob audio
 */
export function stopRecording(): Promise<{ blob: Blob; duration: number }> {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder) {
      reject(new Error('Aucun enregistrement en cours'));
      return;
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      const duration = (Date.now() - recordingStartTime) / 1000;

      // Arrêter le stream
      mediaRecorder?.stream.getTracks().forEach(track => track.stop());
      mediaRecorder = null;
      audioChunks = [];

      resolve({ blob, duration });
    };

    mediaRecorder.stop();
  });
}

/**
 * Annule l'enregistrement en cours
 */
export function cancelRecording(): void {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    mediaRecorder.stop();
    mediaRecorder = null;
    audioChunks = [];
  }
}

/**
 * Vérifie si un enregistrement est en cours
 */
export function isRecording(): boolean {
  return mediaRecorder !== null && mediaRecorder.state === 'recording';
}

// ============================================
// RECONNAISSANCE VOCALE (Speech-to-Text)
// ============================================

let recognition: any = null;
let onResultCallback: ((transcript: string, isFinal: boolean) => void) | null = null;
let onErrorCallback: ((error: string) => void) | null = null;

/**
 * Démarre la reconnaissance vocale
 */
export function startSpeechRecognition(
  onResult: (transcript: string, isFinal: boolean) => void,
  onError?: (error: string) => void,
  language = 'fr-FR'
): boolean {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    onError?.('Reconnaissance vocale non supportée');
    return false;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = language;

  onResultCallback = onResult;
  onErrorCallback = onError || null;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const results = event.results;
    const lastResult = results[results.length - 1];
    const transcript = lastResult[0].transcript;
    const isFinal = lastResult.isFinal;

    onResultCallback?.(transcript, isFinal);
  };

  recognition.onerror = (event: any) => {
    const errorMessages: Record<string, string> = {
      'no-speech': 'Aucune voix détectée',
      'audio-capture': 'Microphone non disponible',
      'not-allowed': 'Permission microphone refusée',
      'network': 'Erreur réseau',
    };

    const message = errorMessages[event.error] || `Erreur: ${event.error}`;
    onErrorCallback?.(message);
  };

  recognition.onend = () => {
    // Redémarrer automatiquement si non arrêté manuellement
    if (recognition && onResultCallback) {
      try {
        recognition.start();
      } catch (e) {
        // Ignorer si déjà en cours
      }
    }
  };

  try {
    recognition.start();
    return true;
  } catch (error) {
    console.error('Erreur démarrage reconnaissance:', error);
    return false;
  }
}

/**
 * Arrête la reconnaissance vocale
 */
export function stopSpeechRecognition(): void {
  if (recognition) {
    onResultCallback = null;
    onErrorCallback = null;
    recognition.stop();
    recognition = null;
  }
}

// ============================================
// SYNTHÈSE VOCALE (Text-to-Speech)
// ============================================

let currentUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Lit un texte à voix haute
 */
export function speak(
  text: string,
  options?: {
    lang?: string;
    rate?: number; // 0.1 - 10 (défaut: 1)
    pitch?: number; // 0 - 2 (défaut: 1)
    volume?: number; // 0 - 1 (défaut: 1)
    onEnd?: () => void;
    onError?: (error: string) => void;
  }
): void {
  if (!('speechSynthesis' in window)) {
    options?.onError?.('Synthèse vocale non supportée');
    return;
  }

  // Arrêter toute lecture en cours
  stopSpeaking();

  currentUtterance = new SpeechSynthesisUtterance(text);
  currentUtterance.lang = options?.lang || 'fr-FR';
  currentUtterance.rate = options?.rate || 1;
  currentUtterance.pitch = options?.pitch || 1;
  currentUtterance.volume = options?.volume || 1;

  // Essayer de trouver une voix française
  const voices = speechSynthesis.getVoices();
  const frenchVoice = voices.find(v => v.lang.startsWith('fr'));
  if (frenchVoice) {
    currentUtterance.voice = frenchVoice;
  }

  currentUtterance.onend = () => {
    currentUtterance = null;
    options?.onEnd?.();
  };

  currentUtterance.onerror = (event) => {
    currentUtterance = null;
    options?.onError?.(event.error);
  };

  speechSynthesis.speak(currentUtterance);
}

/**
 * Arrête la lecture en cours
 */
export function stopSpeaking(): void {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }
  currentUtterance = null;
}

/**
 * Vérifie si une lecture est en cours
 */
export function isSpeaking(): boolean {
  return speechSynthesis.speaking;
}

/**
 * Obtient les voix disponibles
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  return speechSynthesis.getVoices();
}

// ============================================
// MESSAGES VOCAUX PRÉDÉFINIS
// ============================================

export const PRESET_MESSAGES = {
  driver: {
    arriving: "Je suis en route, j'arrive dans quelques minutes.",
    atLocation: "Je suis arrivé à votre adresse.",
    waiting: "Je vous attends devant l'entrée.",
    cantFind: "Je ne trouve pas l'adresse, pouvez-vous me guider ?",
    noAnswer: "Personne ne répond, êtes-vous disponible ?",
    leftPackage: "J'ai déposé votre colis. Bonne journée !",
    callBack: "Merci de me rappeler s'il vous plaît.",
    traffic: "Il y a des embouteillages, je serai en retard d'environ 15 minutes.",
  },
  customer: {
    onMyWay: "J'arrive dans 5 minutes.",
    notHome: "Je ne suis pas à la maison, pouvez-vous revenir plus tard ?",
    neighbor: "Laissez le colis chez mon voisin.",
    callMe: "Appelez-moi à votre arrivée.",
    relayPoint: "Déposez-le au point relais le plus proche.",
    thanks: "Merci pour la livraison !",
  },
};

/**
 * Joue un message prédéfini
 */
export function playPresetMessage(
  category: 'driver' | 'customer',
  messageKey: string,
  onEnd?: () => void
): void {
  const messages = category === 'driver' ? PRESET_MESSAGES.driver : PRESET_MESSAGES.customer;
  const text = (messages as any)[messageKey];

  if (text) {
    speak(text, { onEnd });
  }
}

// ============================================
// CONVERSION AUDIO
// ============================================

/**
 * Convertit un blob audio en base64
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convertit base64 en blob audio
 */
export function base64ToBlob(base64: string): Blob {
  const parts = base64.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'audio/webm';
  const bstr = atob(parts[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }

  return new Blob([u8arr], { type: mime });
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * Formate la durée en mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Demande la permission microphone
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Permission microphone refusée:', error);
    return false;
  }
}
