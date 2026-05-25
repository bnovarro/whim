import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { WeatherAlert } from '../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (__DEV__ && Platform.OS === 'web') return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('whim-alerts', {
      name: 'Whim Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

export async function scheduleWeatherAlert(alert: WeatherAlert): Promise<void> {
  const alertDate = new Date(alert.date);
  alertDate.setHours(8, 0, 0, 0); // 8am the day of

  if (alertDate <= new Date()) return;

  const secondsUntil = Math.floor((alertDate.getTime() - Date.now()) / 1000);
  if (secondsUntil <= 0) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: alert.title,
      body: alert.message,
      data: { alertId: alert.id, actionType: alert.actionType || '' },
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsUntil },
  });
}

export async function sendLocalNotification(title: string, body: string, data?: Record<string, string>): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true },
    trigger: null,
  });
}

export async function cancelAllScheduled(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
