import React from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useApp } from '../state/appState';
import { useAuth } from '../state/auth';
import { createDispute } from '../state/disputes';

type Props = NativeStackScreenProps<RootStackParamList, 'ActiveContract'>;

const ActiveContract: React.FC<Props> = ({ navigation }) => {
  const { activeContract, endContract } = useApp();
  const { userId } = useAuth();

  if (!activeContract) {
    return (
      <View style={styles.container}>
        <Text>Ingen aktiv kontrakt</Text>
        <Button title="Opprett en" onPress={() => navigation.replace('CreateContract')} />
      </View>
    );
  }

  const weekly: any[] = [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aktiv kontrakt</Text>
      <Text>Tittel: {activeContract.title}</Text>
      {!!activeContract.description && <Text>Beskrivelse: {activeContract.description}</Text>}
      <Text>Verdi: {activeContract.valueNok} kr</Text>
      {!!activeContract.targetDate && <Text>Dato: {activeContract.targetDate}</Text>}

      <View style={{ height: 12 }} />
      <Button title="Sjekk inn" onPress={() => navigation.navigate('CheckIn')} />

      <View style={{ height: 16 }} />
      <Text style={styles.subtitle}>Fremdrift</Text>
      {weekly.length === 0 && <Text>(Ingen ukentlig fremdrift i denne modellen)</Text>}

      <View style={{ height: 16 }} />
      <Button title="Marker som gjennomført" onPress={() => endContract('completed')} />
      <View style={{ height: 8 }} />
      <Button title="Avslutt kontrakt" onPress={() => endContract('cancelled')} />
      <View style={{ height: 8 }} />
      <Button title="Rapporter problem" onPress={async () => {
        if (!userId || !activeContract) return;
        try {
          await createDispute(userId, { contractId: activeContract.id, reason: 'Urettferdig innsjekk', details: 'Opplevde feil under verifisering' });
          Alert.alert('Takk', 'Vi har mottatt klagen og vil pause oppgjør inntil den er vurdert.');
        } catch (e: any) {
          Alert.alert('Kunne ikke sende', e?.message ?? 'Ukjent feil');
        }
      }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8 },
  title: { fontSize: 22, fontWeight: '600' },
  subtitle: { fontSize: 18, fontWeight: '500' },
});

export default ActiveContract;
