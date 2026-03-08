import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Colors } from '@/constants/Colors';
import { Header } from '@/components/Header';
import type { Candidate } from '@/lib/types';

interface CivicCandidate {
  name: string;
  party?: string;
  candidateUrl?: string;
  candidateId?: string; // set for our own DB candidates; absent for Civic API candidates
}

interface Contest {
  type: string;
  office?: string;
  candidates?: CivicCandidate[];
  district?: { name: string };
  referendumTitle?: string;
  referendumSubtitle?: string;
}

interface CivicResponse {
  contests?: Contest[];
  election?: { name: string; electionDay: string };
  error?: { message: string };
}

// Extracts a 2-letter US state abbreviation from an address string.
// Matches patterns like "Springfield, IL 62701" or "IL, USA".
function extractState(address: string): string | null {
  const match = address.match(/\b([A-Z]{2})\s+\d{5}\b/) ?? address.match(/,\s*([A-Z]{2})\s*(?:,|$)/);
  return match ? match[1] : null;
}

// Silently auto-creates unclaimed candidate profiles for any Civic API candidates
// not already in our database. Runs in the background — errors don't affect the UI.
async function autoCreateCandidates(contests: Contest[], address: string): Promise<void> {
  try {
    const state = extractState(address);

    for (const contest of contests) {
      if (contest.type === 'Referendum' || !contest.candidates?.length) continue;
      const office = contest.office ?? '';

      for (const candidate of contest.candidates) {
        // Skip candidates we already know about (candidateId is set when loaded from our DB)
        if (candidate.candidateId) continue;

        try {
          // Check for an existing row using case-insensitive name match + state
          let query = supabaseAdmin
            .from('candidates')
            .select('id')
            .ilike('name', candidate.name);
          if (state) {
            query = query.eq('state', state);
          }
          const { data: existing } = await query.maybeSingle();
          if (existing) continue;

          // Insert the new unclaimed candidate — id and created_at are set by Postgres defaults
          await supabaseAdmin.from('candidates').insert({
            name: candidate.name,
            office_sought: office,
            party: candidate.party ?? null,
            state: state ?? null,
            claimed: false,
            website_url: candidate.candidateUrl ?? null,
          });
        } catch {
          // Silently ignore per-candidate errors so one failure doesn't stop the rest
        }
      }
    }
  } catch {
    // Silently ignore all errors — voter experience must not be affected
  }
}

function groupCandidatesIntoContests(candidates: Candidate[]): Contest[] {
  const byOffice = new Map<string, CivicCandidate[]>();
  for (const c of candidates) {
    const office = c.office_sought || 'Unknown Office';
    if (!byOffice.has(office)) byOffice.set(office, []);
    byOffice.get(office)!.push({ name: c.name, party: c.party ?? undefined, candidateId: c.id });
  }
  return Array.from(byOffice.entries()).map(([office, civicCandidates]) => ({
    type: 'General',
    office,
    candidates: civicCandidates,
  }));
}

export default function BallotScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  const [contests, setContests] = useState<Contest[]>([]);
  const [electionName, setElectionName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (!address) return;

    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_CIVIC_API_KEY;
    if (!apiKey) {
      setError('Google Civic API key is not configured.');
      setLoading(false);
      return;
    }

    const encodedAddress = encodeURIComponent(address);
    const url = `https://www.googleapis.com/civicinfo/v2/voterinfo?key=${apiKey}&address=${encodedAddress}&electionId=2000`;

    fetch(url)
      .then((res) => res.json())
      .then(async (data: CivicResponse) => {
        if (data.error) {
          // API-level error (bad key, invalid address, etc.) — fall through to demo
        } else if (data.contests && data.contests.length > 0) {
          setContests(data.contests);
          setElectionName(data.election?.name ?? '');
          // Fire-and-forget: auto-create unclaimed profiles for new candidates in the background
          autoCreateCandidates(data.contests, address ?? '');
          return;
        }
        // No live contests — load demo ballot from Supabase
        await loadDemoBallot();
      })
      .catch(async () => {
        // Network failure — still try to show demo data
        await loadDemoBallot();
      })
      .finally(() => setLoading(false));
  }, [address]);

  async function loadDemoBallot() {
    const { data, error: dbError } = await supabase
      .from('candidates')
      .select('id, name, office_sought, party')
      .eq('profile_approved', true);

    if (!dbError && data && data.length > 0) {
      setContests(groupCandidatesIntoContests(data as Candidate[]));
      setIsDemo(true);
    }
    // If Supabase also returns nothing, contests stays [] and empty state renders
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Looking up your ballot...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Couldn't load your ballot</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryText}>Try a different address</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header showBack onBack={() => router.replace('/(voter)')} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Ballot</Text>
        {electionName ? <Text style={styles.electionName}>{electionName}</Text> : null}
        <Text style={styles.headerAddress} numberOfLines={2}>{address}</Text>
      </View>

      {isDemo && (
        <View style={styles.demoBanner}>
          <Text style={styles.demoBannerText}>
            Demo mode — no live election data found for this address. Showing candidates from our platform so you can preview the voter experience.
          </Text>
        </View>
      )}

      {contests.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No contests found</Text>
          <Text style={styles.emptySubtitle}>
            No ballot contests were returned for this address. Try entering a more complete address or check back closer to the election.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryText}>Try a different address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={contests}
          keyExtractor={(_, index) => String(index)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <ContestCard contest={item} />}
        />
      )}
    </View>
  );
}

function ContestCard({ contest }: { contest: Contest }) {
  const title =
    contest.type === 'Referendum'
      ? contest.referendumTitle ?? 'Ballot Measure'
      : contest.office ?? contest.type;

  const districtLabel = contest.district?.name;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.officeName}>{title}</Text>
        {districtLabel ? <Text style={styles.districtLabel}>{districtLabel}</Text> : null}
      </View>

      {contest.type === 'Referendum' && contest.referendumSubtitle ? (
        <Text style={styles.referendumSubtitle}>{contest.referendumSubtitle}</Text>
      ) : null}

      {contest.candidates && contest.candidates.length > 0 ? (
        <View style={styles.candidateList}>
          {contest.candidates.map((c, i) => {
            const tappable = !!c.candidateId;
            const Row = tappable ? TouchableOpacity : View;
            return (
              <Row
                key={i}
                style={[styles.candidateRow, tappable && styles.candidateRowTappable]}
                {...(tappable
                  ? { onPress: () => router.push(`/(voter)/candidate/${c.candidateId}`) }
                  : {})}
              >
                <Text style={styles.candidateName}>{c.name}</Text>
                <View style={styles.candidateRowRight}>
                  {c.party ? <Text style={styles.candidateParty}>{c.party}</Text> : null}
                  {tappable && <Text style={styles.chevron}>›</Text>}
                </View>
              </Row>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.background,
    gap: 12,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  electionName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 2,
  },
  headerAddress: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  demoBanner: {
    backgroundColor: '#fff8e1',
    borderBottomWidth: 1,
    borderBottomColor: '#f9e0a0',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  demoBannerText: {
    fontSize: 13,
    color: '#92620a',
    lineHeight: 18,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: {
    marginBottom: 8,
  },
  officeName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  districtLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  referendumSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  candidateList: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    gap: 6,
  },
  candidateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  candidateRowTappable: {
    paddingVertical: 8,
    marginHorizontal: -4,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  candidateName: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
  },
  candidateRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  candidateParty: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  chevron: {
    fontSize: 20,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginLeft: 4,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  retryText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
