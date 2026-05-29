/**
 * Expo Push notification registration (#81).
 *
 * Called after auth-store has a user. Asks the OS for notification
 * permission, fetches the Expo push token, and registers it with
 * notify-service so server-side dispatches ("Joe claimed your $50")
 * find this device.
 *
 * Stub-safe: if expo-notifications isn't bridged (Expo Go web,
 * simulator without push), logs the skip and returns null. The send
 * flow still works — only the buzz on the sender's phone is lost.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from './api';

let _tokenRegistered: string | null = null;

export async function registerPushToken(
  userId: string
): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }
  try {
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

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
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
    // Best-effort — never crash the app on push registration failure.
    // eslint-disable-next-line no-console
    console.warn('[push] register failed (non-fatal):', err);
    return null;
  }
}

export function configurePushHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
