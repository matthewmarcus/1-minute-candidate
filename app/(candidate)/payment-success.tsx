import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Header } from '@/components/Header';
import { fonts } from '@/constants/fonts';

export default function PaymentSuccessScreen() {
  return (
    <View style={styles.root}>
      <Header variant="candidate" />
      <View style={styles.content}>
        <Ionicons name="checkmark-circle" size={64} color="#16A34A" style={styles.icon} />

        <Text style={styles.title}>Payment Successful!</Text>

        <Text style={styles.body}>
          Your purchase has been confirmed. If you purchased profile setup, your profile will be
          unlocked within a few seconds.
        </Text>

        <TouchableOpacity
          style={[styles.button, styles.buttonNavy]}
          onPress={() => router.replace('/(candidate)')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Go to Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonOutline]}
          onPress={() => router.replace('/(candidate)/subscribe')}
          activeOpacity={0.8}
        >
          <Text style={styles.outlineButtonText}>View Purchases</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: fonts.bold,
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
    maxWidth: 320,
  },
  button: {
    width: '100%',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonNavy: {
    backgroundColor: Colors.primary,
  },
  buttonOutline: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  outlineButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
