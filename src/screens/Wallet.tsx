import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Button, TextInput, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { supabase } from '../state/supabase';
import { useAuth } from '../state/auth';

interface LedgerRow {
  id: string;
  amount_ore: number;
  reason: string;
  created_at: string;
}

const Wallet: React.FC<NativeStackScreenProps<RootStackParamList, 'Admin'>> = () => {
  const { userId } = useAuth();
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [amount, setAmount] = useState('0');

  const load = async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('wallet_ledger')
      .select('id, amount_ore, reason, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return;
    setRows(data as any);
  };

  useEffect(() => { load(); }, [userId]);

  const balanceOre = rows.reduce((acc, r) => acc + r.amount_ore, 0);
  const balance = (balanceOre / 100).toFixed(2);

  const requestPayout = async () => {
    if (!userId) return;
    const cents = Math.round(Number(amount) * 100);
    if (!cents || cents <= 0 || cents > balanceOre) {
      Alert.alert('Ugyldig', 'Beløp er ugyldig eller større enn saldo');
      return;
    }
    const { error } = await supabase.from('payout_requests').insert({ user_id: userId, amount_ore: cents });
    if (error) Alert.alert('Feil', error.message);
    else Alert.alert('Sendt', 'Utbetalingsforespørsel sendt');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lommebok</Text>
      <Text>Saldo: {balance} kr</Text>
      <View style={{ height: 12 }} />
      <Text>Be om utbetaling</Text>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput keyboardType="decimal-pad" value={amount} onChangeText={setAmount} style={styles.input} />
        <Button title="Be om" onPress={requestPayout} />
      </View>
      <View style={{ height: 12 }} />
      <Text>Transaksjoner</Text>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{(item.amount_ore/100).toFixed(2)} kr — {item.reason}</Text>
            <Text>{new Date(item.created_at).toLocaleString()}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: '600' },
  card: { padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, minWidth: 120 },
});

export default Wallet;
