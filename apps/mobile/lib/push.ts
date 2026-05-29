/**
 * Expo Push notification registration (#81).
 *
 * The expo-notifications + expo-device modules are loaded DYNAMICALLY
 * inside the functions instead of at module top — the same pattern as
 * receive.tsx's LazyQRCode for react-native-qrcode-svg. Top-level imports
 * of these modules pull native-module init into the JS bridge bring-up
 * path, which on the CI simulator delays Maestro's "Create account
 * is visible" assertion past the 60s timeout.
 *
 * Stub-safe: a missing/failing native module returns null instead of
 * crashing the layout. The send/receive flow still works; only the buzz
 * on the sender's phone is lost.
 */
import { Platform } from 'react-native';

import { api } from './api';

let _tokenRegistered: string | null = null;
let _handlerConfigured = false;

export async function registerPushToken(
  userId: string
): Promise<string | null> {
  try {
    // Dynamic require — keeps expo-notifications + expo-device off the
    // launch critical path. See header comment.
    const Device = require('expo-device') as typeof import('expo-device');
    const Notifications =
      require('expo-notifications') as typeof import('expo-notifications');
    if (!Device.isDevice) {
      return null;
    }
    const isGranted = (resp: unknown) => {
      const r = resp as { granted?: boolean; status?: string };
      return r.granted === true || r.status === 'granted';
    };
    const existing = await Notifications.getPermissionsAsync();
    let granted = isGranted(existing);
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = isGranted(req);
    }
    if (!granted) {
      return null;
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });
    }
    const Constants =
      require('expo-constants') as typeof import('expo-constants');
    const projectId =
      Constants.default?.expoConfig?.extra?.eas?.projectId ??
      Constants.default?.easConfig?.projectId;
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResp.data;
    if (!token) return null;
    if (token === _tokenRegistered) return token;

    await api.registerPushToken({
      userId,
      expoPushToken: token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
    _tokenRegistered = token;
    return token;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[push] register failed (non-fatal):', err);
    return null;
  }
}

export function configurePushHandler(): void {
  if (_handlerConfigured) return;
  try {
    const Notifications =
      require('expo-notifications') as typeof import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    _handlerConfigured = true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[push] handler configure failed (non-fatal):', err);
  }
}
