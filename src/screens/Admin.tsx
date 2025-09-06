import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '../state/auth';
import { loadActiveContract, loadHistory, loadPaymentsForUser, type DbPaymentRow } from '../state/db';
import type { Contract } from '../types/contract';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

const Admin: React.FC<Props> = () => {
  const { userId } = useAuth();
  const [active, setActive] = useState<Contract | undefined>();
  const [history, setHistory] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<DbPaymentRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = async () => {
    if (!userId) return;
    const [a, h, p] = await Promise.all([
      loadActiveContract(userId),
      loadHistory(userId),
      loadPaymentsForUser(userId),
    ]);
    setActive(a);
    setHistory(h);
    setPayments(p);
  };

  useEffect(() => { loadAll(); }, [userId]);

  return (
    <FlatList
      style={styles.container}
      data={[{ key: 'active' }, { key: 'history' }, { key: 'payments' }]}
      keyExtractor={(i) => i.key}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadAll(); setRefreshing(false); }} />}
      renderItem={({ item }) => {
        if (item.key === 'active') {
          return (
            <View style={styles.section}>
              <Text style={styles.title}>Aktiv kontrakt</Text>
              {!active ? <Text>Ingen</Text> : (
                <View style={styles.card}>
                  <Text>ID: {active.id}</Text>
                  <Text>Status: {active.status}</Text>
                  <Text>Periode: {new Date(active.startAt).toLocaleDateString()} – {new Date(active.endAt).toLocaleDateString()}</Text>
                  <Text>Innsats: {active.stakeAmountNok} kr</Text>
                </View>
              )}
            </View>
          );
        }
        if (item.key === 'history') {
          return (
            <View style={styles.section}>
              <Text style={styles.title}>Historikk</Text>
              {history.length === 0 ? <Text>Tomt</Text> : history.map(h => (
                <View style={styles.card} key={h.id}>
                  <Text>ID: {h.id}</Text>
                  <Text>Status: {h.status}</Text>
                  <Text>Innsats: {h.stakeAmountNok} kr</Text>
                </View>
              ))}
            </View>
          );
        }
        return (
          <View style={styles.section}>
            <Text style={styles.title}>Betalinger</Text>
            {payments.length === 0 ? <Text>Ingen</Text> : payments.map(p => (
              <View style={styles.card} key={p.id}>
                <Text>Contract: {p.contract_id}</Text>
                <Text>Intent: {p.stripe_payment_intent_id ?? 'stub'}</Text>
                <Text>Status: {p.status}</Text>
                <Text>Metode: {p.method ?? 'ukjent'}</Text>
                <Text>Opprettet: {new Date(p.created_at).toLocaleString()}</Text>
              </View>
            ))}
          </View>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { padding: 16 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  card: { padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 8 },
});

export default Admin;


