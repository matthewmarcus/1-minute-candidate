import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { Header } from '@/components/Header';

type RaceLevel = 'local' | 'state' | 'national';

interface OfficeOption {
  label: string;
  level: RaceLevel;
}

const OFFICE_GROUPS: { title: string; level: RaceLevel; offices: string[] }[] = [
  {
    title: 'LOCAL OFFICES',
    level: 'local',
    offices: [
      'City Council',
      'Mayor',
      'School Board Member',
      'County Commissioner',
      'Judge',
      'City Clerk',
      'Alderman',
      'District Attorney',
      'Sheriff',
    ],
  },
  {
    title: 'STATE OFFICES',
    level: 'state',
    offices: [
      'State Representative',
      'State Senator',
      'Governor',
      'Lieutenant Governor',
      'State Attorney General',
      'Secretary of State',
      'State Treasurer',
    ],
  },
  {
    title: 'NATIONAL OFFICES',
    level: 'national',
    offices: ['US Representative', 'US Senator', 'President', 'Vice President'],
  },
];

function getLevelForOffice(label: string): RaceLevel {
  for (const group of OFFICE_GROUPS) {
    if (group.offices.includes(label)) return group.level;
  }
  return 'local';
}

export default function CandidateRegister() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    officeSought: '',
    raceLevel: 'local' as RaceLevel,
    party: '',
    state: '',
    district: '',
    bio: '',
  });
  const [loading, setLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function selectOffice(label: string) {
    const level = getLevelForOffice(label);
    setForm((prev) => ({ ...prev, officeSought: label, raceLevel: level }));
    setPickerVisible(false);
  }

  async function generateSlug(name: string): Promise<string> {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { data: existing } = await supabase.from('candidates').select('slug').eq('slug', base).maybeSingle();
    if (!existing) return base;
    for (let i = 2; i <= 99; i++) {
      const candidate = `${base}-${i}`;
      const { data: taken } = await supabase.from('candidates').select('slug').eq('slug', candidate).maybeSingle();
      if (!taken) return candidate;
    }
    return `${base}-${Date.now()}`;
  }

  async function handleRegister() {
    if (!form.name || !form.email || !form.password || !form.officeSought) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);

    const slug = await generateSlug(form.name);

    // Form data is passed via options.data and stored in raw_user_meta_data.
    // A SECURITY DEFINER trigger (handle_new_candidate_user) reads this metadata
    // and inserts the candidates row atomically — bypassing RLS even when email
    // confirmation is required and there is no active session yet.
    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
          office_sought: form.officeSought,
          race_level: form.raceLevel,
          party: form.party,
          state: form.state,
          district: form.district,
          bio: form.bio,
          slug,
        },
      },
    });

    if (authError) {
      setLoading(false);
      Alert.alert('Registration Failed', authError.message);
      return;
    }

    // Fire-and-forget: send welcome email to new candidate
    try {
      supabase.functions.invoke('welcome-email', {
        body: {
          candidate_email: form.email,
          candidate_name: form.name,
          office_sought: form.officeSought,
          race_level: form.raceLevel,
        },
      });
    } catch (_) {}

    setLoading(false);
    Alert.alert(
      'Account Created',
      'Please check your email to confirm your account, then log in.',
      [{ text: 'OK', onPress: () => router.replace('/(candidate)/login') }]
    );
  }

  // Web: render a native <select> element
  function renderOfficePicker() {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.webSelectWrapper}>
          {/* @ts-ignore */}
          <select
            value={form.officeSought}
            onChange={(e: any) => selectOffice(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px',
              fontSize: 16,
              color: form.officeSought ? Colors.text : Colors.textSecondary,
              backgroundColor: Colors.card,
              border: 'none',
              borderRadius: 8,
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
            } as any}
          >
            {/* @ts-ignore */}
            <option value="" disabled>
              Select an office...
            </option>
            {OFFICE_GROUPS.map((group) => (
              // @ts-ignore
              <optgroup key={group.title} label={group.title}>
                {group.offices.map((office) => (
                  // @ts-ignore
                  <option key={office} value={office}>
                    {office}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {/* Chevron indicator */}
          <View style={styles.webSelectChevron} pointerEvents="none">
            <Text style={styles.webSelectChevronText}>▾</Text>
          </View>
        </View>
      );
    }

    // Native: TouchableOpacity that opens Modal
    return (
      <>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setPickerVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.pickerButtonText, !form.officeSought && styles.pickerPlaceholder]}>
            {form.officeSought || 'Select an office...'}
          </Text>
          <Text style={styles.pickerChevron}>▾</Text>
        </TouchableOpacity>

        <Modal
          visible={pickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPickerVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Your Office</Text>
                <TouchableOpacity onPress={() => setPickerVisible(false)}>
                  <Text style={styles.modalClose}>Done</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                {OFFICE_GROUPS.map((group) => (
                  <View key={group.title}>
                    <Text style={styles.groupTitle}>{group.title}</Text>
                    {group.offices.map((office) => {
                      const selected = form.officeSought === office;
                      return (
                        <TouchableOpacity
                          key={office}
                          style={[styles.officeRow, selected && styles.officeRowSelected]}
                          onPress={() => selectOffice(office)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.officeLabel, selected && styles.officeLabelSelected]}>
                            {office}
                          </Text>
                          {selected && <Text style={styles.officeCheck}>✓</Text>}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
                <View style={{ height: 32 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header />
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

        <Text style={styles.label}>What office are you running for? *</Text>
        {renderOfficePicker()}

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

  // Native picker button
  pickerButton: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  pickerPlaceholder: {
    color: Colors.textSecondary,
  },
  pickerChevron: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginLeft: 8,
  },

  // Web select wrapper
  webSelectWrapper: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  webSelectChevron: {
    position: 'absolute',
    right: 14,
    pointerEvents: 'none',
  } as any,
  webSelectChevronText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },

  // Native modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalScroll: {
    paddingHorizontal: 4,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  officeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  officeRowSelected: {
    backgroundColor: '#EEF2FF',
  },
  officeLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  officeLabelSelected: {
    fontWeight: '600',
    color: Colors.primary,
  },
  officeCheck: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '700',
  },
});
