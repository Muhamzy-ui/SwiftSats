/**
 * Native Web Audio, Vibration & Push Notification Engine
 * Zero external audio assets required — 100% reliable on iOS (iPhone Safari/PWA) and Desktop.
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Two-tone notification chime for new order creation
   */
  public playNewOrder(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Note 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.18);

      // Note 2: 880 Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.22, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.35);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  /**
   * Cash-in ascending melodic arpeggio for Payment Received
   */
  public playPaymentReceived(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.08;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.25);
      });
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  /**
   * Triumph celebratory chime for Crypto Delivery
   */
  public playCryptoDelivered(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const chords = [
        { freq: 659.25, start: 0, dur: 0.2 },     // E5
        { freq: 880.00, start: 0.1, dur: 0.25 },   // A5
        { freq: 1174.66, start: 0.22, dur: 0.4 },  // D6
        { freq: 1318.51, start: 0.32, dur: 0.55 }, // E6
      ];
      chords.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + start);
        gain.gain.setValueAtTime(0.28, now + start);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur);
      });
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }
}

export const sound = new SoundSynthesizer();

/**
 * Trigger native haptic vibration if supported
 */
export const triggerHaptic = (pattern: number[] = [150, 80, 150]): void => {
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Haptics not allowed
    }
  }
};

/**
 * Request native browser/PWA push notification permission
 */
export const requestPushPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    if (Notification.permission === 'granted') {
      return true;
    }
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch {
    return false;
  }
};

/**
 * Show native OS notification (Lock screen on iPhone / Desktop banner)
 */
export const showSystemNotification = async (
  title: string,
  body: string,
  tag?: string,
  onClickUrl?: string
): Promise<void> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }
  if (Notification.permission !== 'granted') {
    return;
  }

  try {
    // 1. Mobile & PWA: Use Service Worker registration for persistent lockscreen banners
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, {
            body,
            icon: '/logo192.png',
            badge: '/apple-touch-icon.png',
            vibrate: [250, 100, 250, 100, 250],
            tag: tag || 'swiftsats-alert',
            renotify: true,
            data: { url: onClickUrl || '/admin/orders' },
          } as any);
          return;
        }
      } catch (swErr) {
        console.warn('SW showNotification warning:', swErr);
      }
    }

    // 2. Desktop Fallback: Standard Notification constructor
    const notif = new Notification(title, {
      body,
      icon: '/logo192.png',
      badge: '/apple-touch-icon.png',
      tag: tag || 'swiftsats-alert',
    });

    notif.onclick = () => {
      window.focus();
      if (onClickUrl) {
        window.location.href = onClickUrl;
      }
      notif.close();
    };
  } catch (err) {
    console.warn('Push notification dispatch error', err);
  }
};
