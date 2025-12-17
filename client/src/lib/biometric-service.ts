import { Capacitor } from '@capacitor/core';
import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';
import { Preferences } from '@capacitor/preferences';

const SERVER_KEY = 'finatrades-biometric';
const BIOMETRIC_USER_KEY = 'biometric_user_email';

export interface BiometricStatus {
  isAvailable: boolean;
  biometryType: string;
  errorMessage?: string;
}

export interface BiometricCredentials {
  email: string;
  token: string;
}

export const BiometricService = {
  async checkAvailability(): Promise<BiometricStatus> {
    if (!Capacitor.isNativePlatform()) {
      return {
        isAvailable: false,
        biometryType: 'none',
        errorMessage: 'Biometric authentication is only available on mobile devices',
      };
    }

    try {
      const result = await NativeBiometric.isAvailable();
      
      let biometryTypeName = 'Unknown';
      switch (result.biometryType) {
        case BiometryType.FACE_ID:
          biometryTypeName = 'Face ID';
          break;
        case BiometryType.TOUCH_ID:
          biometryTypeName = 'Touch ID';
          break;
        case BiometryType.FINGERPRINT:
          biometryTypeName = 'Fingerprint';
          break;
        case BiometryType.FACE_AUTHENTICATION:
          biometryTypeName = 'Face Authentication';
          break;
        case BiometryType.IRIS_AUTHENTICATION:
          biometryTypeName = 'Iris';
          break;
        default:
          biometryTypeName = 'Biometric';
      }

      return {
        isAvailable: result.isAvailable,
        biometryType: biometryTypeName,
        errorMessage: result.errorCode ? `Error: ${result.errorCode}` : undefined,
      };
    } catch (error: any) {
      return {
        isAvailable: false,
        biometryType: 'none',
        errorMessage: error.message || 'Failed to check biometric availability',
      };
    }
  },

  async authenticate(reason?: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.warn('Biometric authentication is not available on web');
      return false;
    }

    try {
      await NativeBiometric.verifyIdentity({
        reason: reason || 'Authenticate to access Finatrades',
        title: 'Biometric Login',
        subtitle: 'Verify your identity',
        description: 'Use your fingerprint or face to sign in',
        useFallback: true,
        fallbackTitle: 'Use PIN',
      });
      return true;
    } catch (error: any) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  },

  async saveCredentials(email: string, token: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      await NativeBiometric.setCredentials({
        username: email,
        password: token,
        server: SERVER_KEY,
      });
      
      await Preferences.set({
        key: BIOMETRIC_USER_KEY,
        value: email,
      });
      
      return true;
    } catch (error: any) {
      console.error('Failed to save biometric credentials:', error);
      return false;
    }
  },

  async getCredentials(): Promise<BiometricCredentials | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    try {
      const result = await NativeBiometric.getCredentials({
        server: SERVER_KEY,
      });
      
      return {
        email: result.username,
        token: result.password,
      };
    } catch (error: any) {
      console.error('Failed to get biometric credentials:', error);
      return null;
    }
  },

  async deleteCredentials(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      await NativeBiometric.deleteCredentials({
        server: SERVER_KEY,
      });
      
      await Preferences.remove({
        key: BIOMETRIC_USER_KEY,
      });
      
      return true;
    } catch (error: any) {
      console.error('Failed to delete biometric credentials:', error);
      return false;
    }
  },

  async hasSavedCredentials(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const { value } = await Preferences.get({ key: BIOMETRIC_USER_KEY });
      return !!value;
    } catch {
      return false;
    }
  },

  async getSavedUserEmail(): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    try {
      const { value } = await Preferences.get({ key: BIOMETRIC_USER_KEY });
      return value;
    } catch {
      return null;
    }
  },

  isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  },

  getPlatform(): string {
    return Capacitor.getPlatform();
  },
};

export default BiometricService;
