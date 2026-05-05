import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { matchesApi } from '@/lib/api'

const ACTION_CARDS = [
  {
    screen: 'UploadMatch',
    icon: 'cloud-upload-outline' as const,
    label: 'Upload Match',
    desc: 'Upload a video for AI analysis',
    colors: ['#0ea5e9', '#0284c7'] as [string, string],
  },
  {
    screen: 'Matches',
    icon: 'stats-chart-outline' as const,
    label: 'My Matches',
    desc: 'View results & analytics',
    colors: ['#16a34a', '#15803d'] as [string, string],
  },
  {
    screen: 'Record',
    icon: 'videocam-outline' as const,
    label: 'Record Match',
    desc: 'Record directly from camera',
    colors: ['#7c3aed', '#6d28d9'] as [string, string],
  },
]

const FEATURE_PILLS = [
  { icon: '🎾', label: 'AI Analysis', value: 'Real-time' },
  { icon: '📊', label: 'Shot Tracking', value: 'Automated' },
  { icon: '🏆', label: 'Match Insights', value: 'Instant' },
]

export default function HomeScreen() {
  const navigation = useNavigation()
  const { user, logout } = useAuth()

  const { data: matches } = useQuery({
    queryKey: ['matches'],
    queryFn: () => matchesApi.list(),
    staleTime: 60000,
  })

  const totalUploaded = matches?.length ?? 0
  const totalAnalyzed = matches?.filter((m: any) => m.status === 'completed').length ?? 0
  const memberSince = (user as any)?.created_at
    ? new Date((user as any).created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—'

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Compact header */}
      <LinearGradient colors={['#16a34a', '#10b981']} style={styles.header}>
        {/* Top row: greeting + logout */}
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.username}>{user?.username || 'Player'} 👋</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Member stats strip */}
        <View style={styles.memberStrip}>
          <View style={styles.memberStat}>
            <Text style={styles.memberStatValue}>{memberSince}</Text>
            <Text style={styles.memberStatLabel}>Member Since</Text>
          </View>
          <View style={styles.memberDivider} />
          <View style={styles.memberStat}>
            <Text style={styles.memberStatValue}>{totalUploaded}</Text>
            <Text style={styles.memberStatLabel}>Uploaded</Text>
          </View>
          <View style={styles.memberDivider} />
          <View style={styles.memberStat}>
            <Text style={styles.memberStatValue}>{totalAnalyzed}</Text>
            <Text style={styles.memberStatLabel}>Analyzed</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Action cards */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          {ACTION_CARDS.map(card => (
            <TouchableOpacity
              key={card.screen}
              style={styles.actionCard}
              onPress={() => navigation.navigate(card.screen as never)}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={card.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionCardGradient}
              >
                <View style={styles.actionIconWrap}>
                  <Ionicons name={card.icon} size={26} color="#fff" />
                </View>
                <Text style={styles.actionCardLabel}>{card.label}</Text>
                <Text style={styles.actionCardDesc}>{card.desc}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* How it works */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="information-circle-outline" size={18} color="#0369a1" />
            <Text style={styles.infoCardTitle}>How It Works</Text>
          </View>
          {[
            ['📤', 'Upload your match video'],
            ['🤖', 'AI detects shots, serves & rallies'],
            ['📊', 'Get detailed analytics & heatmaps'],
            ['🎬', 'Watch auto-generated highlights'],
          ].map(([icon, text]) => (
            <View key={text} style={styles.infoRow}>
              <Text style={styles.infoRowIcon}>{icon}</Text>
              <Text style={styles.infoRowText}>{text}</Text>
            </View>
          ))}
        </View>

        {/* Feature pills — bottom */}
        <Text style={styles.sectionTitle}>Platform Features</Text>
        <View style={styles.featureRow}>
          {FEATURE_PILLS.map(f => (
            <View key={f.label} style={styles.featurePill}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureValue}>{f.value}</Text>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f9ff' },

  header: { paddingTop: 12, paddingBottom: 12, paddingHorizontal: 20 },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  greeting: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  username: { fontSize: 19, fontWeight: '800', color: '#fff', marginTop: 1 },
  logoutBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },

  memberStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  memberStat: { flex: 1, alignItems: 'center' },
  memberStatValue: { fontSize: 16, fontWeight: '800', color: '#fff' },
  memberStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontWeight: '500' },
  memberDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 12 },

  actionGrid: { gap: 10, marginBottom: 20 },
  actionCard: {
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 5,
  },
  actionCardGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  actionIconWrap: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  actionCardLabel: { fontSize: 16, fontWeight: '800', color: '#fff' },
  actionCardDesc: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginTop: 2 },

  infoCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#bae6fd',
    shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  infoCardTitle: { fontSize: 14, fontWeight: '700', color: '#0369a1' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  infoRowIcon: { fontSize: 16, width: 24 },
  infoRowText: { fontSize: 13, color: '#334155', fontWeight: '500', flex: 1 },

  featureRow: { flexDirection: 'row', gap: 10 },
  featurePill: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#e0f2fe',
    shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  featureIcon: { fontSize: 20, marginBottom: 4 },
  featureValue: { fontSize: 11, fontWeight: '800', color: '#0369a1', textAlign: 'center' },
  featureLabel: { fontSize: 10, color: '#64748b', marginTop: 2, textAlign: 'center' },
})
