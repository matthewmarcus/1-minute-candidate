import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';

export default function CandidateRegister() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    officeSOught: '',
    party: '',
    state: '',
    district: '',
    bio: '',
  });
  const [loading, setLoading] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleRegister() {
    if (!form.name || !form.email || !form.password || !form.officeSOught) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (authError) {
      setLoading(false);
      Alert.alert('Registration Failed', authError.message);
      return;
    }

    if (authData.user) {
      const { error: profileError } = await supabase.from('candidates').insert({
        id: authData.user.id,
        name: form.name,
        email: form.email,
        office_sought: form.officeSOught,
        party: form.party || null,
        state: form.state || null,
        district: form.district || null,
        bio: form.bio || null,
      });

      if (profileError) {
        setLoading(false);
        Alert.alert('Error', 'Account created but profile setup failed. Please contact support.');
        return;
      }
    }

    setLoading(false);
    Alert.alert(
      'Account Created',
      'Please check your email to confirm your account, then log in.',
      [{ text: 'OK', onPress: () => router.replace('/(candidate)/login') }]
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Register as a candidate</Text>

        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Your full name"
          placeholderTextColor={Colors.textSecondary}
          value={form.name}
          onChangeText={(v) => updateField('name', v)}
        />

        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor={Colors.textSecondary}
          value={form.email}
          onChangeText={(v) => updateField('email', v)}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password *</Text>
        <TextInput
          style={styles.input}
          placeholder="Minimum 8 characters"
          placeholderTextColor={Colors.textSecondary}
          value={form.password}
          onChangeText={(v) => updateField('password', v)}
          secureTextEntry
        />

        <Text style={styles.label}>Office Sought *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. City Council District 3"
          placeholderTextColor={Colors.textSecondary}
          value={form.officeSOught}
          onChangeText={(v) => updateField('officeSOught', v)}
        />

        <Text style={styles.label}>Party Affiliation</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Democrat, Republican, Independent"
          placeholderTextColor={Colors.textSecondary}
          value={form.party}
          onChangeText={(v) => updateField('party', v)}
        />

        <Text style={styles.label}>State</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. CA"
          placeholderTextColor={Colors.textSecondary}
          value={form.state}
          onChangeText={(v) => updateField('state', v)}
          autoCapitalize="characters"
          maxLength={2}
        />

        <Text style={styles.label}>District</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 12th Congressional District"
          placeholderTextColor={Colors.textSecondary}
          value={form.district}
          onChangeText={(v) => updateField('district', v)}
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Brief biography (optional)"
          placeholderTextColor={Colors.textSecondary}
          value={form.bio}
          onChangeText={(v) => updateField('bio', v)}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Creating Account...' : 'Create Account'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => router.back()}>
          <Text style={styles.linkText}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
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
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: Colors.primary,
    fontSize: 15,
  },
});
