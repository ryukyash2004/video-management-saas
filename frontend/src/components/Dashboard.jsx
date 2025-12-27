import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import api from '../utils/api'
import { getToken, getUser } from '../utils/auth'
import UploadModal from './UploadModal'
import VideoCard from './VideoCard'

function Dashboard({ onLogout }) {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [processingVideos, setProcessingVideos] = useState({})
  const [socket, setSocket] = useState(null)
  const user = getUser()
  const navigate = useNavigate()

  const canUpload = user?.role === 'ADMIN' || user?.role === 'EDITOR'

  useEffect(() => {
    fetchVideos()
    connectSocket()
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [])

  const connectSocket = () => {
    const token = getToken()
    if (!token) return

    const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000', {
      auth: { token },
    })

    newSocket.on('connect', () => {
      console.log('Socket connected')
    })

    newSocket.on('connected', (data) => {
      console.log('Connected to tenant room:', data.room)
    })

    newSocket.on('video_processing_progress', (data) => {
      setProcessingVideos((prev) => ({
        ...prev,
        [data.videoId]: {
          progress: data.progress,
          stage: data.stage,
          message: data.message,
        },
      }))
    })

    newSocket.on('video_processing_complete', (data) => {
      setProcessingVideos((prev) => {
        const updated = { ...prev }
        delete updated[data.videoId]
        return updated
      })
      // Refresh videos list
      fetchVideos()
    })

    newSocket.on('video_processing_error', (data) => {
      console.error('Processing error:', data)
      setProcessingVideos((prev) => {
        const updated = { ...prev }
        delete updated[data.videoId]
        return updated
      })
      fetchVideos()
    })

    setSocket(newSocket)
  }

  const fetchVideos = async () => {
    try {
      setLoading(true)
      const response = await api.get('/videos?limit=50')
      if (response.data.success) {
        setVideos(response.data.data.videos)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch videos')
    } finally {
      setLoading(false)
    }
  }

  const handleVideoUploaded = () => {
    setShowUploadModal(false)
    fetchVideos()
  }

  const handleVideoClick = (videoId) => {
    navigate(`/video/${videoId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading videos...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Video Management</h1>
            <p className="text-sm text-gray-500">
              {user?.firstName} {user?.lastName} ({user?.role})
            </p>
          </div>
          <div className="flex gap-4">
            {canUpload && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Upload Video
              </button>
            )}
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {videos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No videos found</p>
            {canUpload && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Upload your first video
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((video) => (
              <VideoCard
                key={video._id}
                video={video}
                processing={processingVideos[video._id]}
                onClick={() => handleVideoClick(video._id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUploaded={handleVideoUploaded}
        />
      )}
    </div>
  )
}

export default Dashboard

