/**
 * Utilitaire de rate limiting côté client
 * Empêche les appels trop fréquents à des fonctions critiques
 */
export function createRateLimiter(intervalMs: number) {
  let lastCall = 0;

  return {
    canProceed(): boolean {
      const now = Date.now();
      if (now - lastCall < intervalMs) {
        return false;
      }
      lastCall = now;
      return true;
    },
    reset(): void {
      lastCall = 0;
    },
    getRemainingMs(): number {
      const elapsed = Date.now() - lastCall;
      return Math.max(0, intervalMs - elapsed);
    },
  };
}
