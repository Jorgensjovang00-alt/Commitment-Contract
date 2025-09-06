import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { Camera, CameraType } from 'expo-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useApp } from '../state/appState';

const CheckIn: React.FC<NativeStackScreenProps<RootStackParamList, 'CheckIn'>> = ({ navigation }) => {
  const { addCheckIn } = useApp();
  const [requireSelfie, setRequireSelfie] = useState(() => Math.random() < 0.33);
  const [hasCamPerm, setHasCamPerm] = useState<boolean | null>(null);

  const add = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      await addCheckIn({ id: '', checkinTime: new Date().toISOString() } as any);
      navigation.goBack();
      return;
    }
    const start = await Location.getCurrentPositionAsync({});
    if (requireSelfie && hasCamPerm === null) {
      const { status: cam } = await Camera.requestCameraPermissionsAsync();
      setHasCamPerm(cam === 'granted');
    }
    const startPoint = { latitude: start.coords.latitude, longitude: start.coords.longitude };
    const withinRadius = async () => {
      const pos = await Location.getCurrentPositionAsync({});
      const dLat = (pos.coords.latitude - startPoint.latitude) * Math.PI / 180;
      const dLon = (pos.coords.longitude - startPoint.longitude) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(startPoint.latitude*Math.PI/180) * Math.cos(pos.coords.latitude*Math.PI/180) * Math.sin(dLon/2)**2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distanceMeters = 6371000 * c;
      return distanceMeters < 150; // 150m radius
    };
    const seconds = 60; // dev: 60s
    for (let i = 0; i < seconds; i++) {
      const ok = await withinRadius();
      if (!ok) break;
      await new Promise(r => setTimeout(r, 1000));
    }
    await addCheckIn({ id: '', checkinTime: new Date().toISOString() } as any);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Innsjekk (stub)</Text>
      <Text>Ber om lokasjon og venter 60s (dev) for nærvær.</Text>
      {requireSelfie && (
        <Text>Selfie kan bli påkrevd under denne innsjekken.</Text>
      )}
      <View style={{ height: 12 }} />
      <Button title="Start innsjekk (60s)" onPress={add} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8 },
  title: { fontSize: 22, fontWeight: '600' },
});

export default CheckIn;
