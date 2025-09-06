import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '../state/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;
const SignIn: React.FC<Props> = ({ navigation }) => {
  const { signInWithPassword, signUpWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const doSignIn = async () => {
    setLoading(true);
    const res = await signInWithPassword(email.trim(), password);
    setLoading(false);
    if (res.error) Alert.alert('Innlogging feilet', res.error);
    else navigation.replace('Onboarding');
  };

  const doSignUp = async () => {
    setLoading(true);
    const res = await signUpWithPassword(email.trim(), password);
    setLoading(false);
    if (res.error) Alert.alert('Registrering feilet', res.error);
    else Alert.alert('Sjekk e‑post', 'Bekreft konto og logg inn.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Logg inn / Registrer</Text>
      <TextInput placeholder="E‑post" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput placeholder="Passord" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
      <Button title={loading ? 'Laster...' : 'Logg inn'} onPress={doSignIn} disabled={loading || !email || !password} />
      <View style={{ height: 8 }} />
      <Button title="Opprett konto" onPress={doSignUp} disabled={loading || !email || !password} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
});

export default SignIn;
