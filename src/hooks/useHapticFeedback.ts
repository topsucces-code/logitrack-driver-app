import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { logger } from '../utils/logger';

/**
 * Haptic feedback hook for providing tactile feedback on native platforms
 */
export function useHapticFeedback() {
  const isNative = Capacitor.isNativePlatform();

  /**
   * Light impact - for button taps, list item selections
   */
  async function lightImpact() {
    if (!isNative) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      logger.warn('Haptic light impact failed', { error });
    }
  }

  /**
   * Medium impact - for confirmations, toggles, switches
   */
  async function mediumImpact() {
    if (!isNative) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      logger.warn('Haptic medium impact failed', { error });
    }
  }

  /**
   * Heavy impact - for important actions, errors
   */
  async function heavyImpact() {
    if (!isNative) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      logger.warn('Haptic heavy impact failed', { error });
    }
  }

  /**
   * Success notification - for completed actions
   */
  async function successNotification() {
    if (!isNative) return;
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (error) {
      logger.warn('Haptic success notification failed', { error });
    }
  }

  /**
   * Warning notification - for warnings, attention needed
   */
  async function warningNotification() {
    if (!isNative) return;
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch (error) {
      logger.warn('Haptic warning notification failed', { error });
    }
  }

  /**
   * Error notification - for errors, failures
   */
  async function errorNotification() {
    if (!isNative) return;
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch (error) {
      logger.warn('Haptic error notification failed', { error });
    }
  }

  /**
   * Selection changed - for picker/selection changes
   */
  async function selectionChanged() {
    if (!isNative) return;
    try {
      await Haptics.selectionChanged();
    } catch (error) {
      logger.warn('Haptic selection changed failed', { error });
    }
  }

  /**
   * Vibrate - for custom vibration patterns
   */
  async function vibrate(duration = 100) {
    if (!isNative) return;
    try {
      await Haptics.vibrate({ duration });
    } catch (error) {
      logger.warn('Haptic vibrate failed', { error });
    }
  }

  return {
    lightImpact,
    mediumImpact,
    heavyImpact,
    successNotification,
    warningNotification,
    errorNotification,
    selectionChanged,
    vibrate,
    isNative,
  };
}

// Standalone functions for use outside of React components
export async function hapticLight() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Silently fail
  }
}

export async function hapticMedium() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    // Silently fail
  }
}

export async function hapticHeavy() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch {
    // Silently fail
  }
}

export async function hapticSuccess() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // Silently fail
  }
}

export async function hapticError() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.notification({ type: NotificationType.Error });
  } catch {
    // Silently fail
  }
}

export default useHapticFeedback;
