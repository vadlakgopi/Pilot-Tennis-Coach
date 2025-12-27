import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRoute, useNavigation } from '@react-navigation/native'
import { matchesApi, analyticsApi } from '@/lib/api'

export default function MatchDetailScreen() {
  const route = useRoute()
  const navigation = useNavigation()
  const { matchId } = route.params as { matchId: number }

  const { data: match, isLoading } = useQuery({
    queryKey: ['match', matchId],
    queryFn: () => matchesApi.get(matchId),
  })

  const { data: stats } = useQuery({
    queryKey: ['matchStats', matchId],
    queryFn: () => analyticsApi.getMatchStats(matchId),
    enabled: !!match && match.status === 'completed',
    retry: false,
    throwOnError: false,
  })

  if (isLoading || !match) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return '#16a34a' // Green-600
      case 'processing':
      case 'analyzing':
        return '#eab308' // Yellow-500
      case 'failed':
        return '#ef4444' // Red-500
      default:
        return '#3b82f6' // Blue-500
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header - Green Theme */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🎾 {match.title}</Text>
        <View style={styles.badgeContainer}>
          <View style={[styles.badge, { backgroundColor: getStatusColor(match.status) }]}>
            <Text style={styles.badgeText}>{match.status}</Text>
          </View>
          {match.match_type && (
            <View style={[styles.badge, styles.badgeSecondary]}>
              <Text style={styles.badgeTextSecondary}>{match.match_type.toUpperCase()}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Match Info - Compact */}
      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>👥 Players</Text>
          <Text style={styles.infoValue}>{match.player1_name || 'Player 1'}</Text>
          <Text style={styles.infoVS}>VS</Text>
          <Text style={styles.infoValue}>{match.player2_name || 'Player 2'}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>📋 Details</Text>
          {match.event && (
            <Text style={styles.infoText}>🏆 Event: {match.event}</Text>
          )}
          {match.bracket && (
            <Text style={styles.infoText}>📊 Bracket: {match.bracket}</Text>
          )}
          {match.event_date && (
            <Text style={styles.infoText}>
              📅 Event Date: {new Date(match.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          )}
          {match.match_date && (
            <Text style={styles.infoText}>
              📅 Match Date: {new Date(match.match_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          )}
          {match.court_surface && (
            <Text style={styles.infoText}>Court: {match.court_surface}</Text>
          )}
          {match.uploader_notes && (
            <Text style={styles.infoText}>📝 Notes: {match.uploader_notes}</Text>
          )}
          {match.created_at && (
            <Text style={styles.infoText}>
              ⬆️ Uploaded: {new Date(match.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          )}
        </View>
      </View>

      {/* Analytics - Compact */}
      {stats ? (
        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>📊 Analytics</Text>
          
          {/* Summary Stats */}
          <View style={styles.summaryRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Rallies</Text>
              <Text style={styles.statValue}>{stats.total_rallies}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Longest</Text>
              <Text style={styles.statValue}>{stats.longest_rally}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>
                {stats.match_duration_minutes ? stats.match_duration_minutes.toFixed(1) : '—'}m
              </Text>
            </View>
          </View>

          {/* Player Stats - No Title */}
          <View style={styles.playerStatsContainer}>
            {[stats.player1_stats, stats.player2_stats].map((p, idx) => (
              <View key={p.player_number} style={[styles.playerCard, styles.playerCardAnalytics]}>
                <Text style={styles.playerName}>
                  {idx === 0 ? match.player1_name || 'Player 1' : match.player2_name || 'Player 2'}
                </Text>
                <Text style={styles.playerPoints}>{p.points_won}/{p.total_points} Points</Text>
                <View style={styles.playerStatsRow}>
                  <View style={styles.playerStat}>
                    <Text style={styles.playerStatLabel}>W</Text>
                    <Text style={styles.playerStatValue}>{p.winners}</Text>
                  </View>
                  <View style={styles.playerStat}>
                    <Text style={styles.playerStatLabel}>E</Text>
                    <Text style={styles.playerStatValue}>{p.errors}</Text>
                  </View>
                  <View style={styles.playerStat}>
                    <Text style={styles.playerStatLabel}>Cov</Text>
                    <Text style={styles.playerStatValue}>{p.court_coverage?.toFixed(0) || '0'}%</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : match.status === 'completed' ? (
        <View style={styles.noStatsContainer}>
          <Text style={styles.noStatsText}>📊 Analytics processing...</Text>
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4', // Green-50
  },
  contentContainer: {
    paddingBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#15803d',
    textAlign: 'center',
    marginTop: 40,
  },
  header: {
    backgroundColor: '#16a34a', // Green-600
    padding: 16,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    marginBottom: 12,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  badgeTextSecondary: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#bbf7d0', // Green-200
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#15803d', // Green-700
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534', // Green-800
    marginBottom: 4,
  },
  infoVS: {
    fontSize: 10,
    color: '#6b7280', // Gray-500
    textAlign: 'center',
    marginVertical: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#166534', // Green-800
    marginBottom: 4,
  },
  analyticsSection: {
    padding: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#15803d', // Green-700
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#16a34a', // Green-600
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#dcfce7', // Green-100
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  playerStatsContainer: {
    gap: 12,
  },
  playerCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#bbf7d0', // Green-200
  },
  playerCardAnalytics: {
    backgroundColor: '#eff6ff', // Blue-50
    borderColor: '#bfdbfe', // Blue-200
  },
  playerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#15803d', // Green-700
    marginBottom: 4,
  },
  playerPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#166534', // Green-800
    marginBottom: 8,
  },
  playerStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  playerStat: {
    flex: 1,
    backgroundColor: '#f0fdf4', // Green-50
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  playerStatLabel: {
    fontSize: 10,
    color: '#6b7280', // Gray-500
    marginBottom: 4,
  },
  playerStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#166534', // Green-800
  },
  noStatsContainer: {
    backgroundColor: '#fef3c7', // Yellow-100
    padding: 16,
    borderRadius: 12,
    margin: 12,
    borderWidth: 2,
    borderColor: '#fde047', // Yellow-300
  },
  noStatsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e', // Yellow-900
    textAlign: 'center',
  },
})



