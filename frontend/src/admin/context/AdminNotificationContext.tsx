import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { adminApi } from '../../shared/api/admin';
import { AdminOrderSummary } from '../../shared/types';
import { sound, triggerHaptic, showSystemNotification, requestPushPermission } from '../../shared/utils/notifications';
import { formatNaira } from '../../shared/utils/formatters';

export interface AdminAlert {
  id: string;
  orderReference: string;
  type: 'NEW_ORDER' | 'PAYMENT_RECEIVED' | 'MANUAL_APPROVAL' | 'COMPLETED';
  title: string;
  message: string;
  amountNgn: string | number;
  coin: string;
  timestamp: number;
  read: boolean;
}

interface AdminNotificationContextType {
  alerts: AdminAlert[];
  unreadCount: number;
  activeToast: AdminAlert | null;
  dismissToast: () => void;
  markAllAsRead: () => void;
  enableBrowserNotifications: () => Promise<boolean>;
  notificationsEnabled: boolean;
}

const AdminNotificationContext = createContext<AdminNotificationContextType | undefined>(undefined);

export const AdminNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [activeToast, setActiveToast] = useState<AdminAlert | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  const knownOrdersMap = useRef<Map<string, string>>(new Map());
  const isFirstLoad = useRef<boolean>(true);

  const enableBrowserNotifications = async (): Promise<boolean> => {
    const granted = await requestPushPermission();
    setNotificationsEnabled(granted);
    return granted;
  };

  const addAlert = (alert: AdminAlert) => {
    setAlerts((prev) => [alert, ...prev.slice(0, 49)]); // keep last 50
    setActiveToast(alert);
    // Auto-dismiss floating toast after 7 seconds
    setTimeout(() => {
      setActiveToast((curr) => (curr?.id === alert.id ? null : curr));
    }, 7000);
  };

  useEffect(() => {
    let isMounted = true;

    const pollLiveOrders = async () => {
      try {
        const res = await adminApi.getOrders({ page: 1 });
        if (!res.success || !res.results || !isMounted) return;

        const currentOrders: AdminOrderSummary[] = res.results;

        // On first run, seed the cache so we don't spam historical alerts
        if (isFirstLoad.current) {
          currentOrders.forEach((o) => {
            knownOrdersMap.current.set(o.order_reference, o.status);
          });
          isFirstLoad.current = false;
          return;
        }

        // Compare incoming orders with cached statuses
        for (const o of currentOrders) {
          const prevStatus = knownOrdersMap.current.get(o.order_reference);

          // 1. BRAND NEW ORDER
          if (!prevStatus) {
            knownOrdersMap.current.set(o.order_reference, o.status);
            sound.playNewOrder();
            triggerHaptic([100, 50, 100]);

            const alertItem: AdminAlert = {
              id: `${o.order_reference}-NEW-${Date.now()}`,
              orderReference: o.order_reference,
              type: 'NEW_ORDER',
              title: '🛒 New Order Created',
              message: `${formatNaira(o.fiat_amount_ngn)} for ${o.crypto_amount} ${o.coin.split('_')[0]}`,
              amountNgn: o.fiat_amount_ngn,
              coin: o.coin,
              timestamp: Date.now(),
              read: false,
            };

            addAlert(alertItem);
            showSystemNotification(
              alertItem.title,
              `${o.order_reference}: ${alertItem.message}`,
              o.order_reference,
              `/admin/orders?search=${o.order_reference}`
            );
          }
          // 2. PAYMENT RECEIVED / VERIFYING
          else if (
            prevStatus !== o.status &&
            (o.status === 'VERIFYING' || o.status === 'PAYMENT_CONFIRMED')
          ) {
            knownOrdersMap.current.set(o.order_reference, o.status);
            sound.playPaymentReceived();
            triggerHaptic([200, 100, 200, 100, 300]);

            const alertItem: AdminAlert = {
              id: `${o.order_reference}-PAY-${Date.now()}`,
              orderReference: o.order_reference,
              type: 'PAYMENT_RECEIVED',
              title: '💰 Bank Transfer Received!',
              message: `Payment detected: ${formatNaira(o.fiat_amount_ngn)} for ${o.order_reference}`,
              amountNgn: o.fiat_amount_ngn,
              coin: o.coin,
              timestamp: Date.now(),
              read: false,
            };

            addAlert(alertItem);
            showSystemNotification(
              alertItem.title,
              alertItem.message,
              o.order_reference,
              `/admin/orders?search=${o.order_reference}`
            );
          }
          // 3. PAYOUT PROCESSING
          else if (
            prevStatus !== o.status &&
            o.status === 'PAYOUT_PROCESSING'
          ) {
            knownOrdersMap.current.set(o.order_reference, o.status);
            sound.playPaymentReceived();
            triggerHaptic([300, 100, 300]);

            const alertItem: AdminAlert = {
              id: `${o.order_reference}-PAYOUT-${Date.now()}`,
              orderReference: o.order_reference,
              type: 'MANUAL_APPROVAL',
              title: '⚡ Payout Processing',
              message: `Sending ${o.crypto_amount} ${o.coin.split('_')[0]} to user wallet`,
              amountNgn: o.fiat_amount_ngn,
              coin: o.coin,
              timestamp: Date.now(),
              read: false,
            };

            addAlert(alertItem);
            showSystemNotification(
              alertItem.title,
              alertItem.message,
              o.order_reference,
              `/admin/orders?search=${o.order_reference}`
            );
          }
          // 4. COMPLETED
          else if (prevStatus !== o.status && o.status === 'COMPLETED') {
            knownOrdersMap.current.set(o.order_reference, o.status);
            sound.playCryptoDelivered();

            const alertItem: AdminAlert = {
              id: `${o.order_reference}-DONE-${Date.now()}`,
              orderReference: o.order_reference,
              type: 'COMPLETED',
              title: '🎉 Order Completed',
              message: `Crypto dispatched for ${o.order_reference}`,
              amountNgn: o.fiat_amount_ngn,
              coin: o.coin,
              timestamp: Date.now(),
              read: false,
            };

            addAlert(alertItem);
          } else {
            knownOrdersMap.current.set(o.order_reference, o.status);
          }
        }
      } catch (e) {
        // Background polling catch
      }
    };

    // Run immediately and every 3.5 seconds
    pollLiveOrders();
    const interval = setInterval(pollLiveOrders, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const dismissToast = () => setActiveToast(null);

  const markAllAsRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <AdminNotificationContext.Provider
      value={{
        alerts,
        unreadCount,
        activeToast,
        dismissToast,
        markAllAsRead,
        enableBrowserNotifications,
        notificationsEnabled,
      }}
    >
      {children}
    </AdminNotificationContext.Provider>
  );
};

export const useAdminNotifications = (): AdminNotificationContextType => {
  const context = useContext(AdminNotificationContext);
  if (!context) {
    throw new Error('useAdminNotifications must be used within AdminNotificationProvider');
  }
  return context;
};
