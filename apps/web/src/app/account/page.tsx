'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import AuthGuard from '@/components/auth/AuthGuard'

export default function AccountPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Fetch user profile
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => usersApi.getProfile(),
    retry: false,
    onSuccess: (data) => {
      setFormData({
        username: data.username || '',
        email: data.email || '',
      })
    },
  })

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: (data: { username?: string; email?: string }) =>
      usersApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      setSuccess('Profile updated successfully!')
      setError(null)
      setIsEditing(false)
      setTimeout(() => setSuccess(null), 3000)
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to update profile')
      setSuccess(null)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    updateProfile.mutate(formData)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setError(null)
    setSuccess(null)
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
      })
    }
  }

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="container mx-auto px-4 py-4 max-w-2xl h-[calc(100vh-8rem)] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <div className="text-center">Loading...</div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (!user) {
    return (
      <AuthGuard>
        <div className="container mx-auto px-4 py-4 max-w-2xl h-[calc(100vh-8rem)] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <div className="text-center text-red-600">Failed to load user profile</div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-4 max-w-2xl h-[calc(100vh-8rem)] flex flex-col overflow-hidden">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Account Details</h1>
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Edit Profile
              </Button>
            )}
          </div>

          {success && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              {success}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Username
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
              ) : (
                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {user.username}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
              ) : (
                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {user.email}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                User ID
              </label>
              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 text-sm">
                {user.id}
              </div>
            </div>

            {isEditing && (
              <div className="flex space-x-3 pt-4">
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  onClick={handleCancel}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </AuthGuard>
  )
}

