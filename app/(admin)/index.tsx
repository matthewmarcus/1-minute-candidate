import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Colors } from '@/constants/Colors';
import type { Video } from '@/lib/types';

type VideoWithCandidate = Video & {
  candidates: { name: string; office_sought: string } | null;
};

export default function AdminDashboard() {
  const [pendingVideos, setPendingVideos] = useState<VideoWithCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabaseAdmin
      .from('videos')
      .select('*, candidates(name, office_sought)')
      .in('status', ['submitted', 'under_review'])
      .order('submitted_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setPendingVideos(data as VideoWithCandidate[]);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Review Queue</Text>
        <Text style={styles.count}>{pendingVideos.length} pending</Text>
      </View>

      {pendingVideos.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtitle}>No videos pending review.</Text>
        </View>
      ) : (
        <FlatList
          data={pendingVideos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.videoItem}
              onPress={() => router.push({ pathname: '/(admin)/review/[id]', params: { id: item.id } })}
            >
              <View>
                <Text style={styles.candidateName}>{item.candidates?.name ?? 'Unknown'}</Text>
                <Text style={styles.officeText}>{item.candidates?.office_sought ?? ''}</Text>
                <Text style={styles.submittedText}>
                  Submitted: {new Date(item.submitted_at ?? '').toLocaleDateString()}
                </Text>
              </View>
              <View style={[styles.statusBadge, item.status === 'under_review' && styles.statusReview]}>
                <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
        />
      )}
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
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  count: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  videoItem: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  candidateName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  officeText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  submittedText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statusBadge: {
    backgroundColor: Colors.primary + '20',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusReview: {
    backgroundColor: Colors.warning + '20',
  },
  statusText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
