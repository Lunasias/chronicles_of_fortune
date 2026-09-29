export type HapticPattern = 'light' | 'medium' | 'heavy' | 'selection' | 'error' | 'success';

/**
 * Trigger touch vibration feedback on supported mobile devices.
 * Gracefully no-ops on desktop or unsupported browsers.
 */
export function triggerHaptic(pattern: HapticPattern = 'light'): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    switch (pattern) {
      case 'light':
      case 'selection':
        navigator.vibrate(14);
        break;
      case 'medium':
        navigator.vibrate(30);
        break;
      case 'heavy':
        navigator.vibrate([45, 25, 45]);
        break;
      case 'success':
        navigator.vibrate([20, 30, 60]);
        break;
      case 'error':
        navigator.vibrate([60, 40, 60]);
        break;
    }
  } catch {
    // Vibration ignored if device doesn't support or permission blocked
  }
}
