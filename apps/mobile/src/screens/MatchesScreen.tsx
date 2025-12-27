import { useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import { matchesApi } from '@/lib/api'

export default function MatchesScreen() {
  const navigation = useNavigation()
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<string>('desc')
  
  const { data: matches, isLoading } = useQuery({
    queryKey: ['matches', sortBy, sortOrder],
    queryFn: () => matchesApi.list(sortBy, sortOrder),
  })

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading matches...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎾 My Matches</Text>
        <Text style={styles.headerSubtitle}>
          {matches?.length || 0} {matches?.length === 1 ? 'match' : 'matches'}
        </Text>
      </View>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.matchCard}
            onPress={() =>
              navigation.navigate('MatchDetail' as never, { matchId: item.id } as never)
            }
          >
            <View style={styles.matchHeader}>
              <Text style={styles.matchTitle}>{item.title}</Text>
              <View style={[styles.statusBadge, item.status === 'completed' ? styles.statusCompleted : styles.statusProcessing]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.matchPlayers}>
              {item.player1_name || 'Player 1'} vs {item.player2_name || 'Player 2'}
            </Text>
            {item.event && (
              <Text style={styles.matchDate}>🏆 {item.event}</Text>
            )}
            {item.bracket && (
              <Text style={styles.matchDate}>📊 {item.bracket}</Text>
            )}
            {item.event_date && (
              <Text style={styles.matchDate}>
                📅 Event: {new Date(item.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            )}
            {item.created_at && (
              <Text style={styles.matchDate}>
                ⬆️ Uploaded: {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎾</Text>
            <Text style={styles.emptyText}>No matches yet</Text>
            <Text style={styles.emptySubtext}>Upload your first match to get started!</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4', // Green-50
  },
  header: {
    backgroundColor: '#16a34a', // Green-600
    padding: 16,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#dcfce7', // Green-100
  },
  matchCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#bbf7d0', // Green-200
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#15803d', // Green-700
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusCompleted: {
    backgroundColor: '#16a34a', // Green-600
  },
  statusProcessing: {
    backgroundColor: '#eab308', // Yellow-500
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  matchPlayers: {
    fontSize: 14,
    color: '#166534', // Green-800
    marginBottom: 4,
    fontWeight: '500',
  },
  matchDate: {
    fontSize: 12,
    color: '#6b7280', // Gray-500
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#15803d', // Green-700
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280', // Gray-500
    textAlign: 'center',
  },
})



