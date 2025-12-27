import { useState, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native'
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera'
import { useMutation } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import { matchesApi } from '@/lib/api'
import * as FileSystem from 'expo-file-system'

export default function RecordScreen() {
  const navigation = useNavigation()
  
  // Camera doesn't work on web - return early before hooks
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 18, textAlign: 'center', marginBottom: 10, padding: 20 }}>
          📹 Camera recording is not available on web.
        </Text>
        <Text style={{ color: '#fff', fontSize: 18, textAlign: 'center', padding: 20 }}>
          Please use the mobile app to record matches.
        </Text>
      </View>
    )
  }
  
  const [facing, setFacing] = useState<CameraType>('back')
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions()
  const [isRecording, setIsRecording] = useState(false)
  const cameraRef = useRef<CameraView>(null)
  const [recordingUri, setRecordingUri] = useState<string | null>(null)

  const createMatch = useMutation({
    mutationFn: (data: any) => matchesApi.create(data),
    onSuccess: async (match) => {
      if (recordingUri) {
        await uploadVideo.mutateAsync({ matchId: match.id, uri: recordingUri })
      }
    },
  })

  const uploadVideo = useMutation({
    mutationFn: ({ matchId, uri }: { matchId: number; uri: string }) =>
      matchesApi.uploadVideo(matchId, uri),
    onSuccess: () => {
      Alert.alert('Success', 'Match uploaded successfully!')
      navigation.goBack()
    },
  })

  // Request permissions
  const requestPermissions = async () => {
    if (!cameraPermission?.granted) {
      await requestCameraPermission()
    }
    if (!microphonePermission?.granted) {
      await requestMicrophonePermission()
    }
  }

  if (!cameraPermission || !microphonePermission) {
    return <View style={styles.container} />
  }

  if (!cameraPermission.granted || !microphonePermission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.message}>
            {!cameraPermission.granted && 'We need your permission to use the camera'}
            {!cameraPermission.granted && !microphonePermission.granted && '\n'}
            {!microphonePermission.granted && 'We need your permission to record audio'}
          </Text>
          <TouchableOpacity style={styles.button} onPress={requestPermissions}>
            <Text style={styles.buttonText}>Grant Permissions</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const startRecording = async () => {
    if (cameraRef.current) {
      setIsRecording(true)
      try {
        const video = await cameraRef.current.recordAsync({
          maxDuration: 3600, // 1 hour max
        })
        setRecordingUri(video.uri)
        setIsRecording(false)
      } catch (error) {
        console.error('Recording error:', error)
        setIsRecording(false)
      }
    }
  }

  const stopRecording = () => {
    if (cameraRef.current) {
      cameraRef.current.stopRecording()
      setIsRecording(false)
    }
  }

  const handleSave = () => {
    if (!recordingUri) {
      Alert.alert('Error', 'No recording found')
      return
    }

    Alert.prompt(
      'Match Title',
      'Enter a title for this match',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Save',
          onPress: (title) => {
            if (title) {
              createMatch.mutate({
                title,
                match_type: 'singles',
              })
            }
          },
        },
      ],
      'plain-text'
    )
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        {/* Controls with absolute positioning */}
        <View style={styles.controlsOverlay}>
          <TouchableOpacity
            style={styles.recordButton}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <View
              style={[
                styles.recordButtonInner,
                isRecording && styles.recordButtonActive,
              ]}
            />
          </TouchableOpacity>

          {recordingUri && !isRecording && (
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Match</Text>
            </TouchableOpacity>
          )}
        </View>
      </CameraView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  controlsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
    backgroundColor: 'transparent',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff0000',
  },
  recordButtonActive: {
    borderRadius: 8,
  },
  saveButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0ea5e9',
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  button: {
    backgroundColor: '#0ea5e9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  webMessage: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
    padding: 20,
  },
})



