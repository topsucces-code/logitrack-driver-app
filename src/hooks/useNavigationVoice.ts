import { useCallback, useRef } from 'react';
import { speak, stopSpeaking } from '../services/voiceService';

/**
 * Hook de guidage vocal pour la navigation turn-by-turn.
 * Utilise Web Speech API via voiceService (fr-FR).
 */
export function useNavigationVoice(muted: boolean) {
  const lastAnnouncedStepRef = useRef<number>(-1);

  const safeSpeak = useCallback(
    (text: string) => {
      if (muted) return;
      speak(text, { rate: 1.1 });
    },
    [muted],
  );

  /** Annonce l'instruction du step quand on s'en approche */
  const announceStep = useCallback(
    (stepIndex: number, instruction: string) => {
      if (stepIndex === lastAnnouncedStepRef.current) return;
      lastAnnouncedStepRef.current = stepIndex;
      safeSpeak(instruction);
    },
    [safeSpeak],
  );

  /** Annonce l'arrivée à destination */
  const announceArrival = useCallback(() => {
    safeSpeak('Vous êtes arrivé à destination');
  }, [safeSpeak]);

  /** Annonce le recalcul d'itinéraire */
  const announceRerouting = useCallback(() => {
    safeSpeak('Recalcul de l\'itinéraire');
  }, [safeSpeak]);

  /** Reset le tracking de step (après recalcul) */
  const resetStepTracking = useCallback(() => {
    lastAnnouncedStepRef.current = -1;
  }, []);

  /** Coupe le son immédiatement */
  const silence = useCallback(() => {
    stopSpeaking();
  }, []);

  return {
    announceStep,
    announceArrival,
    announceRerouting,
    resetStepTracking,
    silence,
  };
}
