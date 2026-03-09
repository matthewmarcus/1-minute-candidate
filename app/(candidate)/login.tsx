import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { fonts } from '@/constants/fonts';
import { Header } from '@/components/Header';
import { PageContainer } from '@/components/PageContainer';

const NAVY = '#0F1F5C';
const RED = '#E8192F';

export default function CandidateLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert('Login Failed', error.message);
    } else {
      router.replace('/(candidate)');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header showBack onBack={() => router.replace('/(voter)')} />
      <PageContainer style={{ paddingHorizontal: 0 }}>
        {/* ── Value proposition ── */}
        <View style={styles.valueProp}>
          <Text style={styles.eyebrow}>FOR POLITICAL CANDIDATES</Text>
          <Text style={styles.valueHeading}>Your voters want to hear from you.</Text>

          <View style={styles.bulletList}>
            {[
              'Record a 60-second video pitch from your smartphone',
              'Get discovered by voters searching your specific ballot',
              'Nonpartisan platform — every candidate welcome',
            ].map((bullet) => (
              <View key={bullet} style={styles.bulletItem}>
                <Ionicons name="checkmark-circle" size={18} color={NAVY} />
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Login form ── */}
        <View style={styles.inner}>
          <Text style={styles.title}>Candidate Login</Text>
          <Text style={styles.subtitle}>1 Minute Candidate</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>

          <Link href="/(candidate)/forgot-password" asChild>
            <TouchableOpacity style={styles.forgotButton}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/(candidate)/register" asChild>
            <TouchableOpacity style={styles.linkButton}>
              <Text style={styles.linkText}>Don't have an account? Register</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </PageContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // ── Value proposition ────────────────────────────
  valueProp: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: RED,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  valueHeading: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: NAVY,
    marginBottom: 20,
    lineHeight: 30,
  },
  bulletList: {
    gap: 12,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    flex: 1,
  },

  // ── Divider ───────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 0,
  },

  // ── Login form ────────────────────────────────────
  inner: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 40,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 12,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  forgotText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: Colors.primary,
    fontSize: 15,
  },
});
