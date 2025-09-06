import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useApp } from '../state/appState';

const History: React.FC<NativeStackScreenProps<RootStackParamList, 'History'>> = () => {
  const { history } = useApp();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Historikk</Text>
      <FlatList
        data={history}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{new Date(item.startAt).toLocaleDateString()} – {new Date(item.endAt).toLocaleDateString()}</Text>
            <Text>Innsats: {item.stakeAmountNok} kr</Text>
            <Text>Status: {item.status}</Text>
          </View>
        )}
        ListEmptyComponent={<Text>Ingen historikk ennå.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 12 },
  card: { padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 12 },
});

export default History;
