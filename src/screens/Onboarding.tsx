import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useApp } from '../state/appState';
import { requestNotificationPermissions } from '../utils/notifications';
import * as Location from 'expo-location';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const Onboarding: React.FC<Props> = ({ navigation }) => {
  const { initialized, activeContract } = useApp();

  React.useEffect(() => {
    if (!initialized) return;
    if (activeContract) {
      navigation.replace('ActiveContract');
    }
  }, [initialized, activeContract]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Velkommen!</Text>
      <Text>Lag en kontrakt og forplikt deg til trening.</Text>
      <View style={{ height: 16 }} />
      <Button title="Gi tillatelser (varsler & lokasjon)" onPress={async () => {
        await requestNotificationPermissions();
        await Location.requestForegroundPermissionsAsync();
      }} />
      <View style={{ height: 8 }} />
      <Button title="Start ny kontrakt" onPress={() => navigation.navigate('CreateContract')} />
      <View style={{ height: 8 }} />
      <Button title="Se historikk" onPress={() => navigation.navigate('History')} />
      <View style={{ height: 8 }} />
      <Button title="Admin" onPress={() => navigation.navigate('Admin')} />
      <View style={{ height: 8 }} />
      <Button title="Lommebok" onPress={() => navigation.navigate('Wallet')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
});

export default Onboarding;
