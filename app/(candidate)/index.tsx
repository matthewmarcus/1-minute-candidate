import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/Colors';

export default function CandidateDashboard() {
  const { session, signOut } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Candidate Dashboard</Text>
      <Text style={styles.subtitle}>Welcome back!</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Video</Text>
        <Text style={styles.cardBody}>
          Record your 60-second candidate video to reach voters on your ballot.
        </Text>
        <Link href="/(candidate)/record" asChild>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Record Video</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Profile</Text>
        <Text style={styles.cardBody}>
          Manage your candidate profile, office information, and bio.
        </Text>
        <Link href="/(candidate)/profile" asChild>
          <TouchableOpacity style={styles.buttonOutline}>
            <Text style={styles.buttonTextSecondary}>Edit Profile</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Subscription</Text>
        <Text style={styles.cardBody}>
          Manage your candidate subscription to keep your profile active.
        </Text>
        <Link href="/(candidate)/subscribe" asChild>
          <TouchableOpacity style={styles.buttonOutline}>
            <Text style={styles.buttonTextSecondary}>Manage Subscription</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  buttonTextSecondary: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  signOutButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  signOutText: {
    color: Colors.error,
    fontSize: 15,
  },
});
