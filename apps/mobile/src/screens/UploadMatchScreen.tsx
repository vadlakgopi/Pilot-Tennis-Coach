import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, TextInput, ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useMutation } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import * as DocumentPicker from 'expo-document-picker'
import { matchesApi } from '@/lib/api'

type Stage = 'idle' | 'creating' | 'uploading' | 'completed' | 'error'

const FIELDS = [
  { label: 'Player 1 Name', key: 'player1_name', placeholder: 'e.g. John Smith' },
  { label: 'Player 2 Name', key: 'player2_name', placeholder: 'e.g. Jane Doe' },
  { label: 'Event / Tournament', key: 'event', placeholder: 'e.g. Club Championship' },
  { label: 'Event Date', key: 'event_date', placeholder: 'YYYY-MM-DD' },
  { label: 'Bracket / Round', key: 'bracket', placeholder: 'e.g. Quarter Final' },
  { label: 'Notes', key: 'uploader_notes', placeholder: 'Any additional notes…', multiline: true },
]

export default function UploadMatchScreen() {
  const navigation = useNavigation()
  const [titleVal, setTitleVal] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [failedId, setFailedId] = useState<number | null>(null)

  const setField = (key: string, val: string) => setFields(f => ({ ...f, [key]: val }))

  const uploadVideo = useMutation({
    mutationFn: ({ matchId, uri }: { matchId: number; uri: string }) =>
      matchesApi.uploadVideo(matchId, uri, p => setProgress(p)),
    onSuccess: () => { setStage('completed'); setProgress(100); setTimeout(() => navigation.goBack(), 1500) },
    onError: (e: any) => { setStage('error'); setErrorMsg(e.response?.data?.detail || 'Upload failed.') },
  })

  const createMatch = useMutation({
    mutationFn: (data: any) => matchesApi.create(data),
    onSuccess: (match) => {
      if (file) {
        setFailedId(match.id)
        setStage('uploading')
        setProgress(0)
        uploadVideo.mutate({ matchId: match.id, uri: file.uri })
      } else {
        setStage('completed')
        setTimeout(() => navigation.goBack(), 1200)
      }
    },
    onError: (e: any) => { setStage('error'); setErrorMsg(e.response?.data?.detail || 'Failed to create match.') },
  })

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'video/*', copyToCacheDirectory: true })
      if (!result.canceled && result.assets[0]) setFile(result.assets[0])
    } catch { Alert.alert('Error', 'Failed to pick video') }
  }

  const handleSubmit = () => {
    if (!titleVal.trim()) { Alert.alert('Required', 'Please enter a match title'); return }
    if (!file) { Alert.alert('Required', 'Please select a video file'); return }
    setErrorMsg(null)
    setStage('creating')
    createMatch.mutate({
      title: titleVal.trim(),
      player1_name: fields.player1_name?.trim() || undefined,
      player2_name: fields.player2_name?.trim() || undefined,
      match_type: 'singles',
      event: fields.event?.trim() || undefined,
      event_date: fields.event_date ? new Date(fields.event_date).toISOString() : undefined,
      bracket: fields.bracket?.trim() || undefined,
      uploader_notes: fields.uploader_notes?.trim() || undefined,
    })
  }

  const handleRetry = () => {
    setErrorMsg(null)
    if (failedId && file) { setStage('uploading'); setProgress(0); uploadVideo.mutate({ matchId: failedId, uri: file.uri }) }
    else handleSubmit()
  }

  const isLoading = stage === 'creating' || stage === 'uploading'
  const sizeMB = file?.size ? (file.size / 1024 / 1024).toFixed(1) : null

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0ea5e9', '#0284c7']} style={styles.header}>
        <Text style={styles.headerTitle}>Upload Match</Text>
        <Text style={styles.headerSub}>AI-powered analysis in minutes</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Error */}
        {errorMsg && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={20} color="#991b1b" />
            <Text style={styles.errorText}>{errorMsg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Progress */}
        {(stage === 'creating' || stage === 'uploading') && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <ActivityIndicator color="#0ea5e9" size="small" />
              <Text style={styles.progressLabel}>
                {stage === 'creating' ? 'Creating match…' : 'Uploading video…'}
              </Text>
              <Text style={styles.progressPct}>{progress}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={['#0ea5e9', '#0284c7']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${Math.max(progress, 4)}%` as any }]}
              />
            </View>
            {stage === 'uploading' && (
              <Text style={styles.progressHint}>Keep the app open until upload completes</Text>
            )}
          </View>
        )}

        {/* Success */}
        {stage === 'completed' && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle-outline" size={22} color="#166534" />
            <Text style={styles.successText}>Upload successful! Redirecting…</Text>
          </View>
        )}

        {/* Match details card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Match Details</Text>

          <Text style={styles.label}>Match Title <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Practice Match – Jan 15"
            placeholderTextColor="#94a3b8"
            value={titleVal}
            onChangeText={setTitleVal}
            editable={!isLoading}
          />

          {FIELDS.map(f => (
            <View key={f.key}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={[styles.input, f.multiline && styles.inputMulti]}
                placeholder={f.placeholder}
                placeholderTextColor="#94a3b8"
                value={fields[f.key] || ''}
                onChangeText={v => setField(f.key, v)}
                editable={!isLoading}
                multiline={f.multiline}
              />
            </View>
          ))}
        </View>

        {/* File picker card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Video File <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={[styles.filePicker, !!file && styles.filePickerSelected]}
            onPress={pickVideo}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={file ? ['#dcfce7', '#bbf7d0'] : ['#f0f9ff', '#e0f2fe']}
              style={styles.filePickerInner}
            >
              <Ionicons
                name={file ? 'checkmark-circle' : 'cloud-upload-outline'}
                size={36}
                color={file ? '#16a34a' : '#0ea5e9'}
              />
              <Text style={[styles.filePickerLabel, !!file && styles.filePickerLabelSelected]}>
                {file ? file.name : 'Tap to choose video'}
              </Text>
              {sizeMB && <Text style={styles.fileSize}>{sizeMB} MB</Text>}
              {!file && <Text style={styles.fileHint}>MP4, MOV, AVI supported</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (isLoading || stage === 'completed') && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isLoading || stage === 'completed'}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={stage === 'completed' ? ['#16a34a', '#15803d'] : ['#0ea5e9', '#0284c7']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : stage === 'completed'
              ? <><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={styles.submitText}>Upload Complete!</Text></>
              : <><Ionicons name="rocket-outline" size={20} color="#fff" /><Text style={styles.submitText}>Upload & Analyze</Text></>
            }
          </LinearGradient>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What happens next?</Text>
          {[
            ['🤖', 'AI detects shots, serves & rallies'],
            ['📊', 'Heatmaps & player comparison generated'],
            ['🎬', 'Highlights clip created automatically'],
            ['⏱️', 'Processing takes ~2–5 min after upload'],
          ].map(([icon, text]) => (
            <View key={text} style={styles.infoRow}>
              <Text style={styles.infoIcon}>{icon}</Text>
              <Text style={styles.infoText}>{text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f9ff' },
  header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  content: { padding: 16, paddingBottom: 40 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: 12, padding: 14, marginBottom: 12,
  },
  errorText: { flex: 1, fontSize: 13, color: '#991b1b', fontWeight: '500' },
  retryBtn: { backgroundColor: '#dc2626', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  retryBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  progressCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#bae6fd', marginBottom: 12,
    shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  progressHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  progressLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0369a1' },
  progressPct: { fontSize: 14, fontWeight: '800', color: '#0284c7' },
  progressTrack: { height: 8, backgroundColor: '#e0f2fe', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  progressHint: { fontSize: 11, color: '#0369a1', marginTop: 8 },

  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
    borderRadius: 12, padding: 14, marginBottom: 12,
  },
  successText: { fontSize: 14, fontWeight: '700', color: '#166534' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: '#e0f2fe',
    shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0369a1', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  required: { color: '#ef4444' },
  input: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 13, paddingVertical: 12,
    fontSize: 15, color: '#0f172a', backgroundColor: '#f8fafc', marginBottom: 14,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },

  filePicker: {
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 2, borderColor: '#bae6fd', borderStyle: 'dashed',
  },
  filePickerSelected: { borderColor: '#86efac', borderStyle: 'solid' },
  filePickerInner: { padding: 28, alignItems: 'center' },
  filePickerLabel: { fontSize: 15, fontWeight: '700', color: '#0369a1', marginTop: 10, textAlign: 'center' },
  filePickerLabelSelected: { color: '#15803d' },
  fileSize: { fontSize: 12, color: '#64748b', marginTop: 4 },
  fileHint: { fontSize: 12, color: '#94a3b8', marginTop: 4 },

  submitBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  submitBtnDisabled: { opacity: 0.65 },
  submitGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, paddingVertical: 16,
  },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  infoCard: {
    backgroundColor: '#fefce8', borderWidth: 1, borderColor: '#fde68a',
    borderRadius: 14, padding: 16,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#92400e', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  infoIcon: { fontSize: 16, width: 24 },
  infoText: { fontSize: 13, color: '#78350f', fontWeight: '500', flex: 1 },
})
