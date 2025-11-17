import { useState } from 'react';

export const useNotifications = () => {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' ? Notification.permission : 'default'
  );

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notification');
      return false;
    }

    if (notificationPermission === 'granted') {
      return true;
    }

    if (notificationPermission === 'denied') {
      console.log('Notifications have been denied by the user');
      return false;
    }

    // If we get here, permission is 'default' or not set
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    if (notificationPermission !== 'granted') return;
    
    // Check if the document is currently visible
    if (document.visibilityState === 'visible') {
      // Don't show notification if the tab is active
      return;
    }

    const notification = new Notification(title, {
      icon: '/favicon.ico', // You might want to set a proper icon
      ...options
    });

    return notification;
  };

  return {
    notificationPermission,
    requestNotificationPermission,
    showNotification,
  };
};
