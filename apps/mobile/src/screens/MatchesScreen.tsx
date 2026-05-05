import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { matchesApi } from '@/lib/api'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  completed: { label: 'Ready',      bg: '#dcfce7', text: '#166534', border: '#bbf7d0', dot: '#16a34a' },
  analyzing: { label: 'Analyzing',  bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe', dot: '#3b82f6' },
  processing:{ label: 'Processing', bg: '#fef3c7', text: '#92400e', border: '#fde68a', dot: '#f59e0b' },
  uploading: { label: 'Uploading',  bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff', dot: '#a855f7' },
  failed:    { label: 'Failed',     bg: '#fee2e2', text: '#991b1b', border: '#fecaca', dot: '#ef4444' },
}

function getStatus(status: string) {
  return STATUS_CONFIG[(status || '').toLowerCase()] ?? {
    label: status || 'Unknown',
    bg: '#f1f5f9', text: '#475569', border: '#e2e8f0', dot: '#94a3b8',
  }
}

export default function MatchesScreen() {
  const navigation = useNavigation()
  const [sortBy, setSortBy] = useState<'created_at' | 'event_date'>('created_at')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  const { data: matches, isLoading, error, refetch } = useQuery({
    queryKey: ['matches', sortBy, sortOrder],
    queryFn: () => matchesApi.list(sortBy, sortOrder),
    retry: 1,
    retryDelay: 1000,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  const renderHeader = () => (
    <LinearGradient colors={['#0ea5e9', '#0284c7']} style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.headerTitle}>My Matches</Text>
          <Text style={styles.headerCount}>
            {matches?.length ?? 0} {matches?.length === 1 ? 'match' : 'matches'}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => refetch()}>
          <Ionicons name="refresh-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Sort bar */}
      <View style={styles.sortBar}>
        <TouchableOpacity
          style={[styles.sortChip, sortBy === 'created_at' && styles.sortChipActive]}
          onPress={() => setSortBy('created_at')}
        >
          <Ionicons
            name="cloud-upload-outline"
            size={12}
            color={sortBy === 'created_at' ? '#0284c7' : 'rgba(255,255,255,0.85)'}
          />
          <Text style={[styles.sortChipText, sortBy === 'created_at' && styles.sortChipTextActive]}>
            Upload Date
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortChip, sortBy === 'event_date' && styles.sortChipActive]}
          onPress={() => setSortBy('event_date')}
        >
          <Ionicons
            name="calendar-outline"
            size={12}
            color={sortBy === 'event_date' ? '#0284c7' : 'rgba(255,255,255,0.85)'}
          />
          <Text style={[styles.sortChipText, sortBy === 'event_date' && styles.sortChipTextActive]}>
            Event Date
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.orderBtn}
          onPress={() => setSortOrder(o => (o === 'desc' ? 'asc' : 'desc'))}
        >
          <Ionicons
            name={sortOrder === 'desc' ? 'arrow-down-outline' : 'arrow-up-outline'}
            size={13}
            color="#fff"
          />
          <Text style={styles.orderBtnText}>{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )

  if (isLoading) {
    return (
      <View style={styles.flex}>
        {renderHeader()}
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.loadingText}>Loading matches…</Text>
        </View>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.flex}>
        {renderHeader()}
        <View style={styles.center}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Couldn't load matches</Text>
          <Text style={styles.errorSub}>Check your connection and try again.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={matches}
        keyExtractor={item => item.id.toString()}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const s = getStatus(item.status)
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.navigate('MatchDetail' as never, { matchId: item.id } as never)
              }
              activeOpacity={0.88}
            >
              {/* Title row */}
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.border }]}>
                  <View style={[styles.badgeDot, { backgroundColor: s.dot }]} />
                  <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
                </View>
              </View>

              {/* Players */}
              <View style={styles.playersRow}>
                <Ionicons name="person-outline" size={13} color="#64748b" />
                <Text style={styles.players}>
                  {item.player1_name || 'Player 1'} vs {item.player2_name || 'Player 2'}
                </Text>
              </View>

              {/* Meta */}
              <View style={styles.metaRow}>
                {item.event && (
                  <View style={styles.metaChip}>
                    <Ionicons name="trophy-outline" size={11} color="#0369a1" />
                    <Text style={styles.metaChipText}>{item.event}</Text>
                  </View>
                )}
                {item.bracket && (
                  <View style={styles.metaChip}>
                    <Ionicons name="git-branch-outline" size={11} color="#0369a1" />
                    <Text style={styles.metaChipText}>{item.bracket}</Text>
                  </View>
                )}
                {item.court_surface && (
                  <View style={styles.metaChip}>
                    <Ionicons name="tennisball-outline" size={11} color="#0369a1" />
                    <Text style={styles.metaChipText}>{item.court_surface}</Text>
                  </View>
                )}
              </View>

              {/* Dates */}
              <View style={styles.datesRow}>
                {item.event_date && (
                  <Text style={styles.dateText}>
                    📅 {new Date(item.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                )}
                {item.created_at && (
                  <Text style={styles.dateText}>
                    ⬆️ {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                )}
              </View>

              {/* Progress bar for processing */}
              {item.status === 'processing' && item.processing_progress != null && (
                <View style={styles.progressWrap}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${item.processing_progress}%` as any }]} />
                  </View>
                  <Text style={styles.progressText}>{item.processing_progress}%</Text>
                </View>
              )}

              <View style={styles.cardArrow}>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎾</Text>
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptySub}>Upload your first match to get started!</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f0f9ff' },

  header: { paddingTop: 56, paddingBottom: 18, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
  headerCount: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  sortBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sortChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)',
  },
  sortChipActive: { backgroundColor: '#fff' },
  sortChipText: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  sortChipTextActive: { color: '#0284c7' },
  orderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginLeft: 'auto',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)',
  },
  orderBtnText: { fontSize: 12, color: '#fff', fontWeight: '600' },

  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 15, color: '#0369a1' },
  errorEmoji: { fontSize: 44, marginBottom: 12 },
  errorTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  errorSub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#0ea5e9', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0f2fe',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', flex: 1 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  playersRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  players: { fontSize: 14, color: '#334155', fontWeight: '600' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f0f9ff', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1, borderColor: '#bae6fd',
  },
  metaChipText: { fontSize: 11, color: '#0369a1', fontWeight: '600' },
  datesRow: { flexDirection: 'row', gap: 14 },
  dateText: { fontSize: 11, color: '#94a3b8' },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  progressTrack: { flex: 1, height: 6, backgroundColor: '#fde68a', borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: '#f59e0b', borderRadius: 3 },
  progressText: { fontSize: 11, color: '#92400e', fontWeight: '700', width: 32, textAlign: 'right' },
  cardArrow: { position: 'absolute', right: 14, top: '50%' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center' },
})
