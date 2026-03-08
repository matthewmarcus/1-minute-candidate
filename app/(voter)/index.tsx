import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Colors } from '@/constants/Colors';
import { Header } from '@/components/Header';

export default function VoterHome() {
  const [address, setAddress] = useState('');
  const [locating, setLocating] = useState(false);

  async function useMyLocation() {
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
    <View style={styles.outerContainer}>
      <Header />
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.tagline}>Know who's on your ballot. In 60 seconds.</Text>
      </View>

      <View style={styles.searchCard}>
        <Text style={styles.searchTitle}>Find Your Candidates</Text>
        <Text style={styles.searchSubtitle}>
          Enter your address to see every candidate running in your specific elections.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Your full address"
          placeholderTextColor={Colors.textSecondary}
          value={address}
          onChangeText={setAddress}
          returnKeyType="search"
          onSubmitEditing={findCandidates}
        />

        <TouchableOpacity style={styles.locationButton} onPress={useMyLocation} disabled={locating}>
          <Text style={styles.locationButtonText}>
            {locating ? 'Locating...' : 'Use My Location'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.testAddressButton}
          onPress={() => setAddress('900 N Oyster Bay Rd, Bethpage, NY 11714')}
        >
          <Text style={styles.testAddressText}>Use test address</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.searchButton} onPress={findCandidates}>
          <Text style={styles.searchButtonText}>Find My Ballot</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.features}>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>🗳️</Text>
          <Text style={styles.featureText}>Every race on your specific ballot</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>🎥</Text>
          <Text style={styles.featureText}>60-second videos from candidates</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>🔒</Text>
          <Text style={styles.featureText}>Free, nonpartisan, no account needed</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Candidate dual CTA */}
      <View style={styles.candidateCard}>
        <View style={styles.candidateCardAccent} />
        <View style={styles.candidateCardBody}>
          <Text style={styles.candidateCardHeading}>Are you a candidate?</Text>
          <Text style={styles.candidateCardBody2}>
            Record your 60-second pitch and connect with voters in your district.
          </Text>
          <TouchableOpacity
            style={styles.candidateCTAButton}
            onPress={() => router.push('/(candidate)/login')}
          >
            <Text style={styles.candidateCTAButtonText}>Get Started as a Candidate</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  hero: {
    paddingTop: 40,
    paddingBottom: 32,
    alignItems: 'center',
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  searchCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  searchTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  searchSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  locationButton: {
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  locationButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  searchButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  features: {
    gap: 12,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureText: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  testAddressButton: {
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 12,
  },
  testAddressText: {
    color: Colors.textSecondary,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 24,
  },
  candidateCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  candidateCardAccent: {
    width: 5,
    backgroundColor: '#0F1F5C',
  },
  candidateCardBody: {
    flex: 1,
    padding: 20,
  },
  candidateCardHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F1F5C',
    marginBottom: 6,
  },
  candidateCardBody2: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  candidateCTAButton: {
    backgroundColor: '#E8192F',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
  },
  candidateCTAButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
