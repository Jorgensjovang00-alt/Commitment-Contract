import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, TextInput, Switch } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useApp } from '../state/appState';
import { useAuth } from '../state/auth';
import { createStubAuthorization, authorizePaymentViaEdge } from '../state/payments';
import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
import { supabase } from '../state/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateContract'>;

const CreateContract: React.FC<Props> = ({ navigation }) => {
  const { createContract } = useApp();
  const { userId } = useAuth();
  const [title, setTitle] = useState('Tren 3 ganger/uke');
  const [description, setDescription] = useState('');
  const [valueNok, setValueNok] = useState('50');
  const [targetDate, setTargetDate] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [method, setMethod] = useState<'card' | 'apple_pay' | 'vipps'>('card');

  const canCreate = !!title && Number(valueNok) > 0 && acceptTerms && acceptPrivacy && !!password && !!targetDate;

  const onCreate = async () => {
    if (!canCreate) return;
    const contract = await createContract({ title, description, valueNok: Number(valueNok), targetDate });
    // Authorize via Edge + PaymentSheet when innlogget
    if (userId) {
      try {
        // Re-authenticate with password as a signature step
        const { data: u } = await supabase.auth.getUser();
        const email = u.user?.email;
        if (!email) throw new Error('Mangler e‑post på bruker');
        const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
        if (authErr) throw new Error('Feil passord');
        const { client_secret } = await authorizePaymentViaEdge(contract.id, contract.valueNok, method);
        const init = await initPaymentSheet({ paymentIntentClientSecret: client_secret, merchantDisplayName: 'Commitment App' });
        if (init.error) throw new Error(init.error.message);
        const present = await presentPaymentSheet();
        if (present.error) throw new Error(present.error.message);
      } catch (e) {
        // Fallback stub for dev
        await createStubAuthorization(contract.id, contract.valueNok, method);
      }
    }
    navigation.replace('ActiveContract');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Opprett kontrakt</Text>
      <View style={styles.row}>
        <Text>Tittel</Text>
        <TextInput value={title} onChangeText={setTitle} style={styles.input} />
      </View>
      <View style={styles.row}>
        <Text>Beskrivelse (valgfritt)</Text>
        <TextInput value={description} onChangeText={setDescription} style={styles.input} />
      </View>
      <View style={styles.row}>
        <Text>Verdi (kr)</Text>
        <TextInput keyboardType="numeric" value={valueNok} onChangeText={setValueNok} style={styles.input} />
      </View>
      <View style={styles.row}>
        <Text>Dato (YYYY-MM-DD)</Text>
        <TextInput placeholder="2025-09-10" value={targetDate} onChangeText={setTargetDate} style={styles.input} />
      </View>
      <View style={styles.row}>
        <Text>Passord (signering)</Text>
        <TextInput secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
      </View>
      <View style={{ height: 12 }} />
      <View style={styles.row}>
        <Text>Betalingsmetode</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Button title={`Kort${method==='card'?' ✓':''}`} onPress={() => setMethod('card')} />
          <Button title={`Apple Pay${method==='apple_pay'?' ✓':''}`} onPress={() => setMethod('apple_pay')} />
          <Button title={`Vipps${method==='vipps'?' ✓':''}`} onPress={() => setMethod('vipps')} />
        </View>
      </View>
      <View style={styles.row}> 
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Switch value={acceptTerms} onValueChange={setAcceptTerms} />
          <Text>Jeg aksepterer vilkår</Text>
        </View>
        <Button title="Les" onPress={() => navigation.navigate('Admin')} />
      </View>
      <View style={styles.row}> 
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Switch value={acceptPrivacy} onValueChange={setAcceptPrivacy} />
          <Text>Jeg aksepterer personvern</Text>
        </View>
        <Button title="Les" onPress={() => navigation.navigate('Admin')} />
      </View>
      <View style={{ height: 12 }} />
      <Button title="Sett kontrakt og betal" onPress={onCreate} disabled={!canCreate} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '600' },
  row: { gap: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
});

export default CreateContract;
