import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

type User = { id: string } | null;

class PushNotificationManager {
  private user: User = null;
  private isLoggingOut = false;
  private isRegistered = false;
  private currentToken: string | null = null;
  private listeners: Set<() => void> = new Set();

  setUser(user: User) {
    this.user = user;
    if (user) {
      this.isLoggingOut = false;
    }
    this.notifyListeners();
  }

  getUser() {
    return this.user;
  }

  isUserLoggingOut() {
    return this.isLoggingOut;
  }

  getIsRegistered() {
    return this.isRegistered;
  }

  setIsRegistered(value: boolean) {
    this.isRegistered = value;
    this.notifyListeners();
  }

  setCurrentToken(token: string | null) {
    this.currentToken = token;
  }

  getCurrentToken() {
    return this.currentToken;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  async prepareForLogout(): Promise<void> {
    this.isLoggingOut = true;
    
    if (Capacitor.isNativePlatform()) {
      try {
        await PushNotifications.removeAllListeners();
      } catch (error) {
        console.error('Failed to remove push notification listeners:', error);
      }
    }
    
    this.currentToken = null;
    this.isRegistered = false;
    this.notifyListeners();
  }

  async unregisterAllTokens(): Promise<void> {
    try {
      await fetch('/api/push/unregister-all', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify({})
      });
    } catch (error) {
      console.error('Failed to unregister push tokens on server:', error);
    }
  }

  async performLogoutCleanup(): Promise<void> {
    await this.prepareForLogout();
    await this.unregisterAllTokens();
  }

  canRegister(): boolean {
    return !this.isLoggingOut && this.user !== null;
  }
}

export const pushNotificationManager = new PushNotificationManager();
