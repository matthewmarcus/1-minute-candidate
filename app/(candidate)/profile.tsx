import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/Colors';
import type { Candidate } from '@/lib/types';

export default function CandidateProfile() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Partial<Candidate>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.user) return;

    supabase
      .from('candidates')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setProfile(data);
        setLoading(false);
      });
  }, [session]);

  function updateField(field: string, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  async function saveProfile() {
    if (!session?.user) return;
    setSaving(true);

    const { error } = await supabase
      .from('candidates')
      .update({
        name: profile.name,
        office_sought: profile.office_sought,
        party: profile.party,
        state: profile.state,
        district: profile.district,
        bio: profile.bio,
      })
      .eq('id', session.user.id);

    setSaving(false);

    if (error) {
      Alert.alert('Save Failed', error.message);
    } else {
      Alert.alert('Saved', 'Your profile has been updated.');
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Profile</Text>

      <Text style={styles.label}>Full Name</Text>
      <TextInput
        style={styles.input}
        value={profile.name ?? ''}
        onChangeText={(v) => updateField('name', v)}
        placeholder="Your full name"
        placeholderTextColor={Colors.textSecondary}
      />

      <Text style={styles.label}>Office Sought</Text>
      <TextInput
        style={styles.input}
        value={profile.office_sought ?? ''}
        onChangeText={(v) => updateField('office_sought', v)}
        placeholder="e.g. City Council District 3"
        placeholderTextColor={Colors.textSecondary}
      />

      <Text style={styles.label}>Party Affiliation</Text>
      <TextInput
        style={styles.input}
        value={profile.party ?? ''}
        onChangeText={(v) => updateField('party', v)}
        placeholder="e.g. Democrat, Republican, Independent"
        placeholderTextColor={Colors.textSecondary}
      />

      <Text style={styles.label}>State</Text>
      <TextInput
        style={styles.input}
        value={profile.state ?? ''}
        onChangeText={(v) => updateField('state', v)}
        placeholder="e.g. CA"
        placeholderTextColor={Colors.textSecondary}
        autoCapitalize="characters"
        maxLength={2}
      />

      <Text style={styles.label}>District</Text>
      <TextInput
        style={styles.input}
        value={profile.district ?? ''}
        onChangeText={(v) => updateField('district', v)}
        placeholder="e.g. 12th Congressional District"
        placeholderTextColor={Colors.textSecondary}
      />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={profile.bio ?? ''}
        onChangeText={(v) => updateField('bio', v)}
        placeholder="Brief biography"
        placeholderTextColor={Colors.textSecondary}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={saveProfile}
        disabled={saving}
      >
        <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Profile'}</Text>
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
    padding: 24,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 24,
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
});
