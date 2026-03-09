import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/Header';
import { fonts } from '@/constants/fonts';

const NAVY = '#0F1F5C';
const GRAY = '#6B7280';
const BORDER = '#E5E7EB';

export default function FindScreen() {
  const [address, setAddress] = useState('');
  const [locating, setLocating] = useState(false);
  const addressInputRef = useRef<TextInput>(null);

  async function useMyLocation() {
    if (Platform.OS === 'web') {
      Alert.alert('Location', 'Please type your address below.');
      addressInputRef.current?.focus();
      return;
    }
    setLocating(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocating(false);
      Alert.alert('Permission Denied', 'Location permission is needed to find your ballot.');
      return;
    }
    const location = await Location.getCurrentPositionAsync({});
    const [place] = await Location.reverseGeocodeAsync(location.coords);
    if (place) {
      const formatted = [place.streetNumber, place.street, place.city, place.region, place.postalCode]
        .filter(Boolean)
        .join(' ');
      setAddress(formatted);
    }
    setLocating(false);
  }

  function findCandidates() {
    if (!address.trim()) {
      Alert.alert('Enter Address', 'Please enter your address to find candidates on your ballot.');
      return;
    }
    router.push({ pathname: '/(voter)/ballot', params: { address } });
  }

  return (
    <View style={styles.root}>
      <Header showBack onBack={() => router.replace('/(voter)')} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inner}>
            <Text style={styles.title}>Find Your Candidates</Text>
            <Text style={styles.subtitle}>
              Enter your address below and we'll show you every candidate running in your
              specific local, state, and federal elections — along with their 60-second video
              pitches. Free, nonpartisan, and no account needed.
            </Text>

            {/* Trust signals */}
            <View style={styles.trustRow}>
              {[
                'Every race on your specific ballot',
                '60-second videos from real candidates',
                'Free · Nonpartisan · No account needed',
              ].map((item) => (
                <View key={item} style={styles.trustItem}>
                  <Ionicons name="checkmark-circle" size={14} color={NAVY} />
                  <Text style={styles.trustText}>{item}</Text>
                </View>
              ))}
            </View>

            <TextInput
              ref={addressInputRef}
              style={styles.input}
              placeholder="123 Main St, City, State 12345"
              placeholderTextColor={GRAY}
              value={address}
              onChangeText={setAddress}
              returnKeyType="search"
              onSubmitEditing={findCandidates}
              autoCapitalize="words"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={styles.locationBtn}
              onPress={useMyLocation}
              disabled={locating}
            >
              <Ionicons name="location-outline" size={16} color={NAVY} />
              <Text style={styles.locationBtnText}>
                {locating ? 'Locating…' : 'Use My Location'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.testBtn}
              onPress={() => setAddress('900 N Oyster Bay Rd, Bethpage, NY 11714')}
            >
              <Text style={styles.testBtnText}>Use test address</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.findBtn}
              onPress={findCandidates}
              activeOpacity={0.85}
            >
              <Text style={styles.findBtnText}>Find My Ballot</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  inner: {
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: NAVY,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: GRAY,
    lineHeight: 22,
    marginBottom: 16,
  },
  trustRow: {
    gap: 8,
    marginBottom: 24,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1.5,
    borderColor: BORDER,
    marginBottom: 10,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 6,
  },
  locationBtnText: {
    color: NAVY,
    fontSize: 14,
    fontFamily: fonts.semiBold,
  },
  testBtn: {
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 14,
  },
  testBtnText: {
    color: GRAY,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  findBtn: {
    backgroundColor: NAVY,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  findBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.bold,
  },
});
