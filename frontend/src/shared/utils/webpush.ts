import { adminApi } from '../api/admin';

/**
 * Converts a base64 string to a Uint8Array for PushManager subscription
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if Web Push is supported on this device/browser
 */
export const isWebPushSupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
};

export interface DevicePushStatus {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  endpoint?: string;
}

/**
 * Inspect whether this device is currently subscribed
 */
export const checkDevicePushStatus = async (): Promise<DevicePushStatus> => {
  if (!isWebPushSupported()) {
    return {
      supported: false,
      permission: 'unsupported',
      isSubscribed: false,
    };
  }

  const permission = Notification.permission;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return {
      supported: true,
      permission,
      isSubscribed: !!sub,
      endpoint: sub ? sub.endpoint : undefined,
    };
  } catch (err) {
    console.warn('Error checking push status:', err);
    return {
      supported: true,
      permission,
      isSubscribed: false,
    };
  }
};

/**
 * Detect client device name for subscription labeling
 */
function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  if (/iphone/i.test(ua)) return 'Apple iPhone (Safari)';
  if (/ipad/i.test(ua)) return 'Apple iPad (Safari)';
  if (/android/i.test(ua)) return 'Android Device (Chrome)';
  if (/macintosh/i.test(ua)) return 'macOS (Desktop)';
  if (/windows/i.test(ua)) return 'Windows PC (Desktop)';
  return 'Web Browser Device';
}

/**
 * 1-Tap Subscribe this device to native background push notifications
 */
export const subscribeDeviceToPush = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  if (!isWebPushSupported()) {
    return {
      success: false,
      message: 'Push notifications are not supported by this browser. (On iPhone, make sure to Add to Home Screen first).',
    };
  }

  try {
    // 1. Request Notification Permission
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      return {
        success: false,
        message: 'Notification permission was denied. Please allow notifications in your browser/device settings.',
      };
    }

    // 2. Fetch VAPID Public Key from backend
    const vapidRes = await adminApi.getWebPushVapidKey();
    if (!vapidRes.success || !vapidRes.vapid_public_key) {
      return {
        success: false,
        message: 'Could not retrieve VAPID key from server.',
      };
    }

    // 3. Ensure Service Worker is ready
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    // 4. Subscribe with PushManager
    if (!sub) {
      const convertedKey = urlBase64ToUint8Array(vapidRes.vapid_public_key);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey as unknown as BufferSource,
      });
    }

    // 5. Extract keys and send to backend
    const rawSub = sub.toJSON();
    const p256dh = rawSub.keys?.p256dh;
    const auth = rawSub.keys?.auth;

    if (!p256dh || !auth) {
      return {
        success: false,
        message: 'Push subscription keys could not be extracted from browser.',
      };
    }

    const regResult = await adminApi.subscribeWebPush({
      endpoint: sub.endpoint,
      keys: { p256dh, auth },
      device_info: getDeviceInfo(),
    });

    return {
      success: true,
      message: regResult.message || 'Device registered for real-time notifications!',
    };
  } catch (err: any) {
    console.error('Failed to subscribe device to push:', err);
    return {
      success: false,
      message: err.message || 'Failed to activate device push notifications.',
    };
  }
};

/**
 * Unsubscribe this device from push notifications
 */
export const unsubscribeDeviceFromPush = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  if (!isWebPushSupported()) {
    return { success: true, message: 'Push not supported.' };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await adminApi.unsubscribeWebPush(endpoint);
    }
    return { success: true, message: 'Device unsubscribed from push notifications.' };
  } catch (err: any) {
    console.error('Failed to unsubscribe push:', err);
    return { success: false, message: err.message || 'Error unsubscribing.' };
  }
};
