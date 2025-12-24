import { useEffect, useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from './use-toast';

export function usePushNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const checkSupport = async () => {
      if (Capacitor.isNativePlatform()) {
        setIsSupported(true);
      }
    };
    checkSupport();
  }, []);

  const registerForPushNotifications = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || !user) {
      return false;
    }

    try {
      let permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      
      if (permStatus.receive !== 'granted') {
        toast({
          title: "Notifications Disabled",
          description: "Please enable push notifications in your device settings.",
          variant: "destructive"
        });
        return false;
      }

      await PushNotifications.register();

      await PushNotifications.addListener('registration', async (token) => {
        try {
          const platform = Capacitor.getPlatform() as 'ios' | 'android';
          await apiRequest('POST', '/api/push/register', {
            token: token.value,
            platform,
            deviceName: `${platform} device`
          });
          setIsRegistered(true);
        } catch (error) {
          console.error('Failed to register push token:', error);
        }
      });

      await PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
      });

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        toast({
          title: notification.title || 'Notification',
          description: notification.body || ''
        });
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const data = action.notification.data;
        if (data?.link) {
          window.location.href = data.link;
        }
      });

      return true;
    } catch (error) {
      console.error('Push notification setup error:', error);
      return false;
    }
  }, [user, toast]);

  const unregisterFromPushNotifications = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await PushNotifications.removeAllListeners();
      setIsRegistered(false);
    } catch (error) {
      console.error('Failed to unregister push notifications:', error);
    }
  }, []);

  useEffect(() => {
    if (user && isSupported && !isRegistered) {
      registerForPushNotifications();
    }
    
    return () => {
      if (isRegistered) {
        unregisterFromPushNotifications();
      }
    };
  }, [user, isSupported, isRegistered, registerForPushNotifications, unregisterFromPushNotifications]);

  return {
    isSupported,
    isRegistered,
    registerForPushNotifications,
    unregisterFromPushNotifications
  };
}
