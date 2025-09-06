import * as Notifications from 'expo-notifications';

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReminderLocal(hour: number, minute: number) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Treningspåminnelse',
      body: 'Tid for å holde kontrakten din i dag 💪',
    },
    trigger: { hour, minute, repeats: true },
  });
}

export async function scheduleSettlementNotification(dateIso: string) {
  const fireDate = new Date(dateIso);
  if (Number.isNaN(fireDate.getTime())) return;
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Kontrakt avsluttes', body: 'Utfordringen din avsluttes nå.' },
    trigger: fireDate,
  });
}

export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
