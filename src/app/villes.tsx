import { StyleSheet, Text, View } from 'react-native';

export default function CitiesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Villes</Text>
      <Text style={styles.text}>Bientôt : tes villes favorites.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#3a7bd5',
  },
  title: { color: '#fff', fontSize: 28, fontWeight: '600' },
  text: { color: '#e6efff', fontSize: 17, marginTop: 8, textAlign: 'center' },
});
