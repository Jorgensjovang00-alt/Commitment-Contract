import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { AppProvider } from './src/state/appState';
import { AuthProvider } from './src/state/auth';
import * as Notifications from 'expo-notifications';
import { StripeProvider } from '@stripe/stripe-react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function App() {
  return (
    <SafeAreaProvider>
      <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''} merchantIdentifier={process.env.EXPO_PUBLIC_APPLE_MERCHANT_ID || undefined}>
        <AuthProvider>
          <AppProvider>
            <RootNavigator />
            <StatusBar style="auto" />
          </AppProvider>
        </AuthProvider>
      </StripeProvider>
    </SafeAreaProvider>
  );
}
