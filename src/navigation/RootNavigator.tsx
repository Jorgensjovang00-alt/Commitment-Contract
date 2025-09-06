import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Onboarding from '../screens/Onboarding';
import CreateContract from '../screens/CreateContract';
import ActiveContract from '../screens/ActiveContract';
import CheckIn from '../screens/CheckIn';
import History from '../screens/History';
import SignIn from '../screens/SignIn';
import { useAuth } from '../state/auth';
import { View, Text } from 'react-native';
import Admin from '../screens/Admin';
import Wallet from '../screens/Wallet';

export type RootStackParamList = {
  SignIn: undefined;
  Onboarding: undefined;
  CreateContract: undefined;
  ActiveContract: undefined;
  CheckIn: undefined;
  History: undefined;
  Admin: undefined;
  Wallet: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const { isLoading, userId } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Laster…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!userId ? (
          <Stack.Screen name="SignIn" component={SignIn} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Onboarding" component={Onboarding} options={{ headerShown: false }} />
            <Stack.Screen name="CreateContract" component={CreateContract} options={{ title: 'Ny kontrakt' }} />
            <Stack.Screen name="ActiveContract" component={ActiveContract} options={{ title: 'Kontrakt' }} />
            <Stack.Screen name="CheckIn" component={CheckIn} options={{ title: 'Innsjekk' }} />
            <Stack.Screen name="History" component={History} options={{ title: 'Historikk' }} />
            <Stack.Screen name="Admin" component={Admin} options={{ title: 'Admin' }} />
            <Stack.Screen name="Wallet" component={Wallet} options={{ title: 'Lommebok' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
