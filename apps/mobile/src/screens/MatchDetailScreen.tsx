import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, TextInput, Alert, ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRoute, useNavigation } from '@react-navigation/native'
import { matchesApi, analyticsApi, API_URL } from '@/lib/api'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  completed: { label: 'Ready',      bg: '#dcfce7', text: '#166534', border: '#bbf7d0', dot: '#16a34a' },
  analyzing: { label: 'Analyzing',  bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe', dot: '#3b82f6' },
  processing:{ label: 'Processing', bg: '#fef3c7', text: '#92400e', border: '#fde68a', dot: '#f59e0b' },
  uploading: { label: 'Uploading',  bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff', dot: '#a855f7' },
  failed:    { label: 'Failed',     bg: '#fee2e2', text: '#991b1b', border: '#fecaca', dot: '#ef4444' },
}

function getStatus(status: string) {
  return STATUS_CONFIG[(status || '').toLowerCase()] ?? {
    label: status || 'Unknown', bg: '#f1f5f9', text: '#475569', border: '#e2e8f0', dot: '#94a3b8',
  }
}

export default function MatchDetailScreen() {
  const route = useRoute()
  const navigation = useNavigation()
  const queryClient = useQueryClient()
  const { matchId } = route.params as { matchId: number }

  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    player1_name: '', player2_name: '', event: '',
    event_date: '', bracket: '', uploader_notes: '',
  })

  const { data: match, isLoading } = useQuery({
    queryKey: ['match', matchId],
    queryFn: () => matchesApi.get(matchId),
  })

  const { data: stats } = useQuery({
    queryKey: ['matchStats', matchId],
    queryFn: () => analyticsApi.getMatchStats(matchId),
    enabled: !!match,
    retry: false,
    throwOnError: false,
  } as any)

  const updateMatch = useMutation({
    mutationFn: (data: any) => matchesApi.update(matchId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['match', matchId] }); setIsEditing(false) },
    onError: (e: any) => Alert.alert('Error', e.response?.data?.detail || 'Failed to update match'),
  })

  useEffect(() => {
    if (match && !isEditing) {
      setEditData({
        player1_name: match.player1_name || '',
        player2_name: match.player2_name || '',
        event: match.event || '',
        event_date: match.event_date ? new Date(match.event_date).toISOString().split('T')[0] : '',
        bracket: match.bracket || '',
        uploader_notes: match.uploader_notes || '',
      })
    }
  }, [match, isEditing])

  const handleSave = () => {
    updateMatch.mutate({
      player1_name: editData.player1_name || null,
      player2_name: editData.player2_name || null,
      event: editData.event || null,
      event_date: editData.event_date ? new Date(editData.event_date).toISOString() : null,
      bracket: editData.bracket || null,
      uploader_notes: editData.uploader_notes || null,
    })
  }

  const openVideo = async (type: 'highlights' | 'full') => {
    const token = await AsyncStorage.getItem('auth_token')
    if (!token) return
    const url = type === 'highlights'
      ? `${API_URL}/videos/matches/${matchId}/highlights-video?token=${token}`
      : `${API_URL}/videos/matches/${matchId}/video?token=${token}`
    Linking.openURL(url)
  }

  if (isLoading || !match) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Loading match…</Text>
      </View>
    )
  }

  const s = getStatus(match.status)
  const processingPct =
    match.processing_progress > 0 && match.processing_progress < 1
      ? Math.round(match.processing_progress * 100)
      : null

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header gradient */}
      <LinearGradient colors={['#16a34a', '#10b981']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.matchTitle}>🎾 {match.title}</Text>

        {/* Badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.border }]}>
            <View style={[styles.badgeDot, { backgroundColor: s.dot }]} />
            <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
          </View>
          {match.match_type && (
            <View style={styles.badgeGlass}>
              <Text style={styles.badgeGlassText}>{match.match_type.toUpperCase()}</Text>
            </View>
          )}
          {match.court_surface && (
            <View style={styles.badgeGlass}>
              <Text style={styles.badgeGlassText}>{match.court_surface}</Text>
            </View>
          )}
        </View>

        {/* Processing bar */}
        {processingPct !== null && (
          <View style={styles.progressWrap}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Processing…</Text>
              <Text style={styles.progressPct}>{processingPct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${processingPct}%` as any }]} />
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Video buttons */}
      <View style={styles.videoRow}>
        <TouchableOpacity style={styles.videoBtnBlue} onPress={() => openVideo('highlights')} activeOpacity={0.85}>
          <LinearGradient colors={['#0ea5e9', '#0284c7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.videoBtnGradient}>
            <Ionicons name="film-outline" size={16} color="#fff" />
            <Text style={styles.videoBtnText}>Highlights</Text>
          </LinearGradient>
        </TouchableOpacity>
        {match.videos && match.videos.length > 0 && (
          <TouchableOpacity style={styles.videoBtnGreen} onPress={() => openVideo('full')} activeOpacity={0.85}>
            <LinearGradient colors={['#16a34a', '#15803d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.videoBtnGradient}>
              <Ionicons name="videocam-outline" size={16} color="#fff" />
              <Text style={styles.videoBtnText}>Full Match</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* Details section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Match Details</Text>
          {!isEditing ? (
            <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
              <Ionicons name="pencil-outline" size={14} color="#0369a1" />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={updateMatch.isPending}
              >
                <Text style={styles.saveBtnText}>{updateMatch.isPending ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Players card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Players</Text>
          {isEditing ? (
            <View style={styles.playersEdit}>
              <TextInput
                style={styles.editInput}
                value={editData.player1_name}
                onChangeText={v => setEditData(d => ({ ...d, player1_name: v }))}
                placeholder="Player 1"
                placeholderTextColor="#94a3b8"
              />
              <View style={styles.vsBar}><Text style={styles.vsText}>VS</Text></View>
              <TextInput
                style={styles.editInput}
                value={editData.player2_name}
                onChangeText={v => setEditData(d => ({ ...d, player2_name: v }))}
                placeholder="Player 2"
                placeholderTextColor="#94a3b8"
              />
            </View>
          ) : (
            <View style={styles.playersRow}>
              <View style={styles.playerPill}>
                <Ionicons name="person" size={14} color="#0369a1" />
                <Text style={styles.playerName}>{match.player1_name || 'Player 1'}</Text>
              </View>
              <View style={styles.vsCircle}><Text style={styles.vsCircleText}>VS</Text></View>
              <View style={styles.playerPill}>
                <Ionicons name="person" size={14} color="#166534" />
                <Text style={styles.playerName}>{match.player2_name || 'Player 2'}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Match Info</Text>
          {isEditing ? (
            <>
              {[
                { key: 'event', placeholder: 'Event / Tournament' },
                { key: 'event_date', placeholder: 'Event Date (YYYY-MM-DD)' },
                { key: 'bracket', placeholder: 'Bracket / Round' },
              ].map(f => (
                <TextInput
                  key={f.key}
                  style={styles.editInput}
                  value={(editData as any)[f.key]}
                  onChangeText={v => setEditData(d => ({ ...d, [f.key]: v }))}
                  placeholder={f.placeholder}
                  placeholderTextColor="#94a3b8"
                />
              ))}
              <TextInput
                style={[styles.editInput, styles.editInputMulti]}
                value={editData.uploader_notes}
                onChangeText={v => setEditData(d => ({ ...d, uploader_notes: v }))}
                placeholder="Notes"
                placeholderTextColor="#94a3b8"
                multiline
              />
            </>
          ) : (
            <View style={styles.infoGrid}>
              {match.event && <InfoRow icon="trophy-outline" label="Event" value={match.event} />}
              {match.bracket && <InfoRow icon="git-branch-outline" label="Bracket" value={match.bracket} />}
              {match.event_date && (
                <InfoRow icon="calendar-outline" label="Event Date"
                  value={new Date(match.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
              )}
              {match.duration_minutes && (
                <InfoRow icon="time-outline" label="Duration" value={`${Math.round(match.duration_minutes)} min`} />
              )}
              {match.created_at && (
                <InfoRow icon="cloud-upload-outline" label="Uploaded"
                  value={new Date(match.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
              )}
              {match.uploader_notes && (
                <InfoRow icon="document-text-outline" label="Notes" value={match.uploader_notes} />
              )}
            </View>
          )}
        </View>
      </View>

      {/* Analytics */}
      {stats ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analytics</Text>

          {/* Summary stats */}
          <View style={styles.statsRow}>
            {[
              { label: 'Rallies', value: stats.total_rallies },
              { label: 'Longest', value: stats.longest_rally },
              { label: 'Duration', value: stats.match_duration_minutes ? `${stats.match_duration_minutes.toFixed(1)}m` : '—' },
            ].map(st => (
              <LinearGradient key={st.label} colors={['#0ea5e9', '#0284c7']} style={styles.statCard}>
                <Text style={styles.statValue}>{st.value}</Text>
                <Text style={styles.statLabel}>{st.label}</Text>
              </LinearGradient>
            ))}
          </View>

          {/* Player stats */}
          {[stats.player1_stats, stats.player2_stats].map((p, idx) => (
            <View key={p.player_number} style={styles.playerStatCard}>
              <View style={styles.playerStatHeader}>
                <Text style={styles.playerStatName}>
                  {idx === 0 ? match.player1_name || 'Player 1' : match.player2_name || 'Player 2'}
                </Text>
                <Text style={styles.playerStatPoints}>{p.points_won}/{p.total_points} pts</Text>
              </View>
              <View style={styles.miniStatsRow}>
                {[
                  { label: 'Winners', val: p.winners },
                  { label: 'Errors', val: p.errors },
                  { label: 'Coverage', val: `${p.court_coverage?.toFixed(0) ?? 0}%` },
                ].map(m => (
                  <View key={m.label} style={styles.miniStat}>
                    <Text style={styles.miniStatVal}>{m.val}</Text>
                    <Text style={styles.miniStatLabel}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : match.status === 'completed' ? (
        <View style={styles.section}>
          <View style={styles.pendingCard}>
            <ActivityIndicator size="small" color="#f59e0b" />
            <Text style={styles.pendingText}>Analytics processing…</Text>
          </View>
        </View>
      ) : null}
    </ScrollView>
  )
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={14} color="#0369a1" />
      <Text style={styles.infoRowLabel}>{label}:</Text>
      <Text style={styles.infoRowValue} numberOfLines={2}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f9ff' },
  content: { paddingBottom: 40 },

  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f9ff', gap: 12 },
  loadingText: { fontSize: 15, color: '#0369a1' },

  header: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  matchTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 12 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeGlass: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  badgeGlassText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  progressWrap: { marginTop: 14 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },
  progressPct: { color: '#fff', fontWeight: '800', fontSize: 13 },
  progressTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4 },
  progressFill: { height: 8, backgroundColor: '#fff', borderRadius: 4 },

  videoRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  videoBtnBlue: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  videoBtnGreen: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  videoBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  videoBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#e0f2fe', borderWidth: 1, borderColor: '#bae6fd' },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#0369a1' },
  editActions: { flexDirection: 'row', gap: 8 },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9' },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: '#16a34a' },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#e0f2fe',
    shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
  },
  cardLabel: { fontSize: 12, fontWeight: '700', color: '#0369a1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },

  playersRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playerPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0f9ff', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#bae6fd' },
  playerName: { fontSize: 14, fontWeight: '700', color: '#0f172a', flex: 1 },
  vsCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#0ea5e9', justifyContent: 'center', alignItems: 'center' },
  vsCircleText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  playersEdit: { gap: 8 },
  vsBar: { alignItems: 'center', paddingVertical: 2 },
  vsText: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },

  infoGrid: { gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoRowLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', width: 72 },
  infoRowValue: { fontSize: 13, color: '#0f172a', fontWeight: '500', flex: 1 },

  editInput: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc', marginBottom: 10,
  },
  editInputMulti: { minHeight: 72, textAlignVertical: 'top' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  playerStatCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#e0f2fe',
    shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  playerStatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  playerStatName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  playerStatPoints: { fontSize: 13, fontWeight: '700', color: '#0369a1' },
  miniStatsRow: { flexDirection: 'row', gap: 8 },
  miniStat: { flex: 1, backgroundColor: '#f0f9ff', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#bae6fd' },
  miniStatVal: { fontSize: 18, fontWeight: '800', color: '#0284c7', marginBottom: 2 },
  miniStatLabel: { fontSize: 10, color: '#64748b', fontWeight: '600' },

  pendingCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fefce8', borderWidth: 1, borderColor: '#fde68a', borderRadius: 12, padding: 14 },
  pendingText: { fontSize: 14, fontWeight: '600', color: '#92400e' },
})
