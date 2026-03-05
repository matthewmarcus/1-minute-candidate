import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Colors } from '@/constants/Colors';

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.logo}>1 Minute Candidate</Text>
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

        <TouchableOpacity style={styles.searchButton} onPress={findCandidates}>
          <Text style={styles.searchButtonText}>Find My Candidates</Text>
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

      <TouchableOpacity style={styles.candidateLink} onPress={() => router.push('/(candidate)/login')}>
        <Text style={styles.candidateLinkText}>Are you a candidate? Get started →</Text>
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
  candidateLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  candidateLinkText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '500',
  },
});
