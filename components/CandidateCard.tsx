import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import type { Candidate } from '@/lib/types';

interface CandidateCardProps {
  candidate: Candidate;
}

export function CandidateCard({ candidate }: CandidateCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/(voter)/candidate/[id]', params: { id: candidate.id } })}
    >
      <View style={styles.info}>
        <Text style={styles.name}>{candidate.name}</Text>
        <Text style={styles.office}>{candidate.office_sought}</Text>
        <View style={styles.meta}>
          {candidate.party && (
            <Text style={styles.metaText}>{candidate.party}</Text>
          )}
          {candidate.party && candidate.state && (
            <Text style={styles.separator}>·</Text>
          )}
          {candidate.state && (
            <Text style={styles.metaText}>{candidate.state}</Text>
          )}
        </View>
      </View>
      <View style={styles.arrow}>
        <Text style={styles.arrowText}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  office: {
    fontSize: 14,
    color: Colors.primary,
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  separator: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  arrow: {
    paddingLeft: 8,
  },
  arrowText: {
    fontSize: 24,
    color: Colors.textSecondary,
  },
});
