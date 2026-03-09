import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/Colors';
import { Header } from '@/components/Header';
import { CandidateNav } from '@/components/CandidateNav';
import type { Candidate } from '@/lib/types';

// ── Constants ──────────────────────────────────────────────────────────────────

const PARTIES = ['Democrat', 'Republican', 'Independent', 'Green', 'Libertarian', 'Other'];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <View style={[styles.toast, type === 'error' ? styles.toastError : styles.toastSuccess]}>
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

// ── Dropdown (web-friendly select) ────────────────────────────────────────────

function Dropdown({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (v: string) => void;
}) {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.selectWrapper}>
          <select
            value={value}
            // @ts-ignore – React Native Web accepts native select
            onChange={(e) => onChange((e as unknown as { target: { value: string } }).target.value)}
            style={webSelectStyle}
          >
            <option value="">{placeholder}</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </View>
      </View>
    );
  }

  // Native: show options inline (simple pill selector)
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.pill, value === opt && styles.pillSelected]}
            onPress={() => onChange(opt)}
          >
            <Text style={[styles.pillText, value === opt && styles.pillTextSelected]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// Inline style for web <select> (must be a plain object, not StyleSheet)
const webSelectStyle: CSSProperties = {
  width: '100%',
  backgroundColor: Colors.card,
  borderRadius: 8,
  padding: '13px 16px',
  fontSize: 16,
  color: Colors.text,
  border: `1px solid ${Colors.border}`,
  outline: 'none',
  cursor: 'pointer',
  appearance: 'auto',
};

// ── Photo Upload ───────────────────────────────────────────────────────────────

function PhotoUpload({
  photoUrl,
  candidateId,
  onUpload,
  onError,
}: {
  photoUrl: string | null;
  candidateId: string;
  onUpload: (url: string) => void;
  onError: (msg: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function uploadToSupabase(uri: string, mimeType: string) {
    setUploading(true);
    const ext = mimeType.split('/')[1] ?? uri.split('.').pop() ?? 'jpg';
    const path = `${candidateId}/profile.${ext}`;

    // Read file as base64 then convert to Uint8Array (legacy FileSystem API works in Expo Go)
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const { error } = await supabase.storage
      .from('candidate-photos')
      .upload(path, bytes, { upsert: true, contentType: mimeType });

    if (error) {
      setUploading(false);
      onError('Upload failed: ' + error.message);
      return;
    }

    const { data } = supabase.storage.from('candidate-photos').getPublicUrl(path);
    onUpload(data.publicUrl);
    setUploading(false);
  }

  async function pickNative() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      onError('Permission to access photos is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    await uploadToSupabase(asset.uri, asset.mimeType ?? 'image/jpeg');
  }

  async function pickWeb() {
    return new Promise<void>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) { resolve(); return; }

        setUploading(true);
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${candidateId}/profile.${ext}`;

        const { error } = await supabase.storage
          .from('candidate-photos')
          .upload(path, file, { upsert: true, contentType: file.type });

        if (error) {
          setUploading(false);
          onError('Upload failed: ' + error.message);
          resolve();
          return;
        }

        const { data } = supabase.storage.from('candidate-photos').getPublicUrl(path);
        onUpload(data.publicUrl);
        setUploading(false);
        resolve();
      };
      input.click();
    });
  }

  function handlePress() {
    if (Platform.OS === 'web') {
      pickWeb();
    } else {
      pickNative();
    }
  }

  return (
    <View style={styles.photoUploadContainer}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.photoPreview} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.photoPlaceholderIcon}>👤</Text>
        </View>
      )}
      <View style={styles.photoUploadRight}>
        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={handlePress}
          disabled={uploading}
        >
          <Text style={styles.uploadButtonText}>
            {uploading ? 'Uploading...' : photoUrl ? 'Change Photo' : 'Upload Photo'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.photoHint}>JPG or PNG, square crop recommended</Text>
      </View>
    </View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CandidateProfile() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Partial<Candidate>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Refs for keyboard-aware scrolling
  const scrollRef = useRef<ScrollView>(null);
  const cardY = useRef<Record<string, number>>({ about: 0, campaign: 0, online: 0 });
  const fieldY = useRef<Record<string, number>>({});

  function onCardLayout(card: string, e: LayoutChangeEvent) {
    cardY.current[card] = e.nativeEvent.layout.y;
  }
  function onFieldLayout(field: string, e: LayoutChangeEvent) {
    fieldY.current[field] = e.nativeEvent.layout.y;
  }
  function scrollToField(card: string, field: string) {
    const y = (cardY.current[card] ?? 0) + (fieldY.current[field] ?? 0);
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
  }

  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from('candidates')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }: { data: Partial<Candidate> | null; error: unknown }) => {
        if (!error && data) setProfile(data);
        setLoading(false);
      });
  }, [session]);

  function set(field: keyof Candidate, value: string) {
    setProfile((prev: Partial<Candidate>) => ({ ...prev, [field]: value }));
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function generateSlug(): Promise<string> {
    const name = profile.name ?? '';
    const parts = name.trim().toLowerCase().split(/\s+/);
    const base = parts.join('-').replace(/[^a-z0-9-]/g, '');

    // Check if base slug is available
    const { data: existing } = await supabase
      .from('candidates')
      .select('id')
      .eq('slug', base)
      .neq('id', session!.user.id)
      .maybeSingle();

    if (!existing) return base;

    // Try appending state code
    const stateCode = (profile.state ?? '').toLowerCase();
    const withState = stateCode ? `${base}-${stateCode}` : `${base}-1`;
    return withState;
  }

  async function saveProfile() {
    if (!session?.user) return;
    setSaving(true);

    // Auto-generate slug if not already set
    let slug = profile.slug ?? null;
    if (!slug && profile.name) {
      slug = await generateSlug();
    }

    const { error } = await supabase
      .from('candidates')
      .update({
        bio: profile.bio,
        photo_url: profile.photo_url,
        office_sought: profile.office_sought,
        party: profile.party,
        state: profile.state,
        city: profile.city,
        district: profile.district,
        website_url: profile.website_url,
        twitter_handle: profile.twitter_handle,
        facebook_url: profile.facebook_url,
        slug,
      })
      .eq('id', session.user.id);

    setSaving(false);

    if (error) {
      showToast('Save failed: ' + error.message, 'error');
    } else {
      if (slug && !profile.slug) setProfile((prev) => ({ ...prev, slug }));
      showToast('Profile saved!', 'success');
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.rootContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header />
      <CandidateNav activeTab="profile" />

      {toast && <Toast message={toast.message} type={toast.type} />}

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.innerContainer}>

        {/* ── Section 1: About You ─────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>About You</Text>
        <View style={styles.card} onLayout={(e) => onCardLayout('about', e)}>
          <View style={styles.fieldContainer} onLayout={(e) => onFieldLayout('bio', e)}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={profile.bio ?? ''}
              onChangeText={(v) => set('bio', v)}
              placeholder="Tell voters who you are in a few sentences"
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoCapitalize="sentences"
              autoCorrect={true}
              onFocus={() => scrollToField('about', 'bio')}
            />
          </View>

          <Text style={styles.label}>Candidate Photo</Text>
          <PhotoUpload
            photoUrl={profile.photo_url ?? null}
            candidateId={session?.user?.id ?? ''}
            onUpload={(url) => set('photo_url', url)}
            onError={(msg) => showToast(msg, 'error')}
          />
        </View>

        {/* ── Section 2: Your Campaign ──────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Your Campaign</Text>
        <View style={styles.card} onLayout={(e) => onCardLayout('campaign', e)}>
          <View style={styles.fieldContainer} onLayout={(e) => onFieldLayout('office', e)}>
            <Text style={styles.label}>Office Sought</Text>
            <TextInput
              style={styles.input}
              value={profile.office_sought ?? ''}
              onChangeText={(v) => set('office_sought', v)}
              placeholder="e.g. City Council District 3"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="words"
              autoCorrect={false}
              onFocus={() => scrollToField('campaign', 'office')}
            />
          </View>

          <View style={styles.fieldContainer} onLayout={(e) => onFieldLayout('city', e)}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={profile.city ?? ''}
              onChangeText={(v) => set('city', v)}
              placeholder="e.g. Denver"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="words"
              autoCorrect={false}
              onFocus={() => scrollToField('campaign', 'city')}
            />
          </View>

          <Dropdown
            label="Party Affiliation"
            value={profile.party ?? ''}
            options={PARTIES}
            placeholder="Select party"
            onChange={(v) => set('party', v)}
          />

          <Dropdown
            label="State"
            value={profile.state ?? ''}
            options={US_STATES}
            placeholder="Select state"
            onChange={(v) => set('state', v)}
          />

          <View style={styles.fieldContainer} onLayout={(e) => onFieldLayout('district', e)}>
            <Text style={styles.label}>District</Text>
            <TextInput
              style={styles.input}
              value={profile.district ?? ''}
              onChangeText={(v) => set('district', v)}
              placeholder="e.g. 12th Congressional District"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="words"
              autoCorrect={false}
              onFocus={() => scrollToField('campaign', 'district')}
            />
          </View>
        </View>

        {/* ── Section 3: Online Presence ────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Online Presence</Text>
        <View style={styles.card} onLayout={(e) => onCardLayout('online', e)}>
          <View style={styles.fieldContainer} onLayout={(e) => onFieldLayout('website', e)}>
            <Text style={styles.label}>Website</Text>
            <TextInput
              style={styles.input}
              value={profile.website_url ?? ''}
              onChangeText={(v) => set('website_url', v)}
              placeholder="https://yourcampaign.com"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              onFocus={() => scrollToField('online', 'website')}
            />
          </View>

          <View style={styles.fieldContainer} onLayout={(e) => onFieldLayout('twitter', e)}>
            <Text style={styles.label}>X Handle</Text>
            <View style={styles.inputWithPrefix}>
              <Text style={styles.inputPrefix}>@</Text>
              <TextInput
                style={[styles.input, styles.inputNoBorderLeft, { flex: 1, marginBottom: 0 }]}
                value={profile.twitter_handle ?? ''}
                onChangeText={(v) => set('twitter_handle', v.replace('@', ''))}
                placeholder="yourhandle"
                placeholderTextColor={Colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => scrollToField('online', 'twitter')}
              />
            </View>
          </View>

          <View style={[styles.fieldContainer, { marginBottom: 0 }]} onLayout={(e) => onFieldLayout('facebook', e)}>
            <Text style={styles.label}>Facebook Page URL</Text>
            <TextInput
              style={styles.input}
              value={profile.facebook_url ?? ''}
              onChangeText={(v) => set('facebook_url', v)}
              placeholder="https://facebook.com/yourpage"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              onFocus={() => scrollToField('online', 'facebook')}
            />
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveProfile}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Profile'}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },

  // Toast
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 72,
    left: 20,
    right: 20,
    borderRadius: 10,
    padding: 14,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  toastSuccess: {
    backgroundColor: '#065f46',
  },
  toastError: {
    backgroundColor: Colors.error,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  innerContainer: {
    width: '100%',
    maxWidth: 680,
    paddingHorizontal: 16,
  },

  // Sections
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 4,
  },

  // Card
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  // Fields
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 0,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },

  // Input with prefix (@)
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  inputPrefix: {
    paddingLeft: 14,
    paddingRight: 4,
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  inputNoBorderLeft: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
  },

  // Dropdown (web select wrapper)
  selectWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
  },

  // Pill selector (native)
  pillRow: {
    flexDirection: 'row',
  },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  pillTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },

  // Photo upload
  photoUploadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  photoPreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.border,
  },
  photoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderIcon: {
    fontSize: 30,
  },
  photoUploadRight: {
    flex: 1,
    gap: 6,
  },
  uploadButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  photoHint: {
    fontSize: 11,
    color: Colors.textSecondary,
  },

  // Save button
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  bottomSpacer: {
    height: 8,
  },
});
