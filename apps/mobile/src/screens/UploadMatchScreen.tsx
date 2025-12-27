import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import * as DocumentPicker from 'expo-document-picker'
import { matchesApi } from '@/lib/api'

export default function UploadMatchScreen() {
  const navigation = useNavigation()
  const [matchTitle, setMatchTitle] = useState('')
  const [player1Name, setPlayer1Name] = useState('')
  const [player2Name, setPlayer2Name] = useState('')
  const [event, setEvent] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [bracket, setBracket] = useState('')
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null)

  const createMatch = useMutation({
    mutationFn: (data: any) => matchesApi.create(data),
    onSuccess: async (match) => {
      if (selectedFile) {
        uploadVideo.mutate({ matchId: match.id, uri: selectedFile.uri })
      } else {
        Alert.alert('Success', 'Match created successfully!')
        navigation.goBack()
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create match')
    },
  })

  const uploadVideo = useMutation({
    mutationFn: ({ matchId, uri }: { matchId: number; uri: string }) =>
      matchesApi.uploadVideo(matchId, uri),
    onSuccess: () => {
      Alert.alert('Success', 'Match uploaded successfully!')
      navigation.goBack()
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to upload video')
    },
  })

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      })

      if (!result.canceled && result.assets[0]) {
        setSelectedFile(result.assets[0])
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick video file')
    }
  }

  const handleSubmit = () => {
    if (!matchTitle.trim()) {
      Alert.alert('Error', 'Please enter a match title')
      return
    }

    if (!selectedFile) {
      Alert.alert('Error', 'Please select a video file')
      return
    }

    createMatch.mutate({
      title: matchTitle.trim(),
      player1_name: player1Name.trim() || undefined,
      player2_name: player2Name.trim() || undefined,
      match_type: 'singles',
      event: event.trim() || undefined,
      event_date: eventDate ? new Date(eventDate).toISOString() : undefined,
      bracket: bracket.trim() || undefined,
    })
  }

  const isLoading = createMatch.isPending || uploadVideo.isPending

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Upload Match Video</Text>

        <TextInput
          style={styles.input}
          placeholder="Match Title *"
          value={matchTitle}
          onChangeText={setMatchTitle}
          editable={!isLoading}
        />

        <TextInput
          style={styles.input}
          placeholder="Player 1 Name (optional)"
          value={player1Name}
          onChangeText={setPlayer1Name}
          editable={!isLoading}
        />

        <TextInput
          style={styles.input}
          placeholder="Player 2 Name (optional)"
          value={player2Name}
          onChangeText={setPlayer2Name}
          editable={!isLoading}
        />

        <TextInput
          style={styles.input}
          placeholder="Event (Tournament Name / Practice)"
          value={event}
          onChangeText={setEvent}
          editable={!isLoading}
        />

        <TextInput
          style={styles.input}
          placeholder="Event Date (YYYY-MM-DD)"
          value={eventDate}
          onChangeText={setEventDate}
          editable={!isLoading}
        />

        <TextInput
          style={styles.input}
          placeholder="Bracket (Round Robin, Quarter Final, etc.)"
          value={bracket}
          onChangeText={setBracket}
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[styles.fileButton, selectedFile && styles.fileButtonSelected]}
          onPress={pickVideo}
          disabled={isLoading}
        >
          <Text style={styles.fileButtonText}>
            {selectedFile ? `Selected: ${selectedFile.name}` : 'Choose Video File'}
          </Text>
        </TouchableOpacity>

        {selectedFile && (
          <Text style={styles.fileInfo}>
            File size: {(selectedFile.size! / (1024 * 1024)).toFixed(2)} MB
          </Text>
        )}

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Upload Match</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#0ea5e9',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  fileButton: {
    borderWidth: 2,
    borderColor: '#0ea5e9',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#f0f9ff',
  },
  fileButtonSelected: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
  },
  fileButtonText: {
    color: '#0ea5e9',
    fontSize: 16,
    fontWeight: '600',
  },
  fileInfo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#0ea5e9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

