import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotifications } from './src/services/notificationService';
import { useAuthStore } from './src/store/authStore';
import { useCalendarStore } from './src/store/calendarStore';

export default function App() {
  useEffect(() => {
    registerForPushNotifications().then(token => {
      if (token) useAuthStore.getState().updatePushToken(token);
    });
    // Restore Google Calendar token if previously linked
    useCalendarStore.getState().loadStoredToken();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
