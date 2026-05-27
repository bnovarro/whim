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

/**
 * Schedule a local reminder 30 minutes before a whim's start time.
 * timeStart should be a string like "7:00 PM".
 */
export async function scheduleWhimReminder(whimId: string, activityType: string, timeStart: string): Promise<void> {
  try {
    const now = new Date();
    const [timePart, meridiem] = timeStart.split(' ');
    const [hoursRaw, minutes] = timePart.split(':').map(Number);
    let hours = hoursRaw;
    if (meridiem?.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (meridiem?.toUpperCase() === 'AM' && hours === 12) hours = 0;

    const target = new Date(now);
    target.setHours(hours, minutes ?? 0, 0, 0);
    // If time already passed today, skip
    if (target.getTime() - 30 * 60 * 1000 <= now.getTime()) return;

    const secondsUntil = Math.floor((target.getTime() - 30 * 60 * 1000 - now.getTime()) / 1000);
    if (secondsUntil <= 0) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Whim starting soon',
        body: `Your ${activityType} Whim kicks off in 30 minutes. Time to get ready!`,
        data: { whimId, actionType: 'open_whim' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntil,
      },
    });
  } catch { /* non-fatal */ }
}

/**
 * Schedule a morning nudge at 9am when friends are free.
 * Safe to call every app open — dedupes by cancelling and rescheduling.
 */
export async function scheduleMorningNudge(freeFriendCount: number): Promise<void> {
  if (freeFriendCount === 0) return;
  try {
    const now = new Date();
    const target = new Date(now);
    target.setHours(9, 0, 0, 0);
    if (target <= now) return; // already past 9am today

    const secondsUntil = Math.floor((target.getTime() - now.getTime()) / 1000);
    if (secondsUntil <= 0) return;

    const friendWord = freeFriendCount === 1 ? 'friend is' : 'friends are';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '👀 Your people are free',
        body: `${freeFriendCount} ${friendWord} free today — make it happen.`,
        data: { actionType: 'create_whim' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntil,
      },
    });
  } catch { /* non-fatal */ }
}

/**
 * Send a push notification to another user via Expo's push API.
 * Requires their stored Expo push token.
 */
export async function sendPushToUser(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  if (!expoPushToken?.startsWith('ExponentPushToken')) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: expoPushToken, title, body, data, sound: 'default' }),
    });
  } catch { /* non-fatal — don't block the user flow */ }
}
