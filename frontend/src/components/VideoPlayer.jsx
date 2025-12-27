import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'

function VideoPlayer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [streamUrl, setStreamUrl] = useState('')

  useEffect(() => {
    fetchVideoInfo()
  }, [id])

  const fetchVideoInfo = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/videos/${id}/stream-info`)
      if (response.data.success) {
        const videoData = response.data.data.video
        setVideo(videoData)

        // Only set stream URL if video is COMPLETED and not FLAGGED
        if (
          videoData.processingStatus === 'COMPLETED' &&
          videoData.processingStatus !== 'FLAGGED'
        ) {
          const token = localStorage.getItem('video_management_token')
          const baseUrl = import.meta.env.VITE_API_URL || ''
          setStreamUrl(`${baseUrl}/videos/stream/${id}?token=${token}`)
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to load video'
      )
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading video...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">{error}</div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const isFlagged = video.processingStatus === 'FLAGGED'
  const isProcessing = video.processingStatus === 'PROCESSING' || video.processingStatus === 'PENDING'
  const canPlay = video.processingStatus === 'COMPLETED' && !isFlagged

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/')}
              className="text-gray-300 hover:text-white mr-4"
            >
              ← Back
            </button>
            <h1 className="text-xl font-bold">{video.title}</h1>
          </div>
        </div>
      </header>

      {/* Video Player */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-black rounded-lg overflow-hidden relative" style={{ aspectRatio: '16/9' }}>
          {canPlay && streamUrl ? (
            <video
              ref={videoRef}
              controls
              className="w-full h-full"
              crossOrigin="anonymous"
            >
              <source src={streamUrl} type={video.mimeType || 'video/mp4'} />
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              {isFlagged ? (
                <div className="text-center text-white p-8 bg-red-900 bg-opacity-50 rounded-lg max-w-md">
                  <div className="text-6xl mb-4">⚠️</div>
                  <h2 className="text-2xl font-bold mb-2">Video Flagged</h2>
                  <p className="text-gray-300 mb-4">
                    This video has been flagged and cannot be played.
                  </p>
                  {video.processingError && (
                    <p className="text-sm text-gray-400 mb-4">
                      Reason: {video.processingError}
                    </p>
                  )}
                  <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Back to Dashboard
                  </button>
                </div>
              ) : isProcessing ? (
                <div className="text-center text-white">
                  <div className="text-4xl mb-4">⏳</div>
                  <h2 className="text-xl font-bold mb-2">Processing Video</h2>
                  <p className="text-gray-400">
                    Please wait while we process your video...
                  </p>
                </div>
              ) : (
                <div className="text-center text-white">
                  <div className="text-4xl mb-4">❌</div>
                  <h2 className="text-xl font-bold mb-2">Video Not Available</h2>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="mt-6 bg-white rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Video Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-semibold">{video.processingStatus}</p>
            </div>
            {video.duration && (
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-semibold">
                  {Math.floor(video.duration / 60)}:
                  {String(Math.floor(video.duration % 60)).padStart(2, '0')}
                </p>
              </div>
            )}
            {video.metadata?.width && video.metadata?.height && (
              <div>
                <p className="text-sm text-gray-500">Resolution</p>
                <p className="font-semibold">
                  {video.metadata.width} × {video.metadata.height}
                </p>
              </div>
            )}
            {video.views !== undefined && (
              <div>
                <p className="text-sm text-gray-500">Views</p>
                <p className="font-semibold">{video.views}</p>
              </div>
            )}
          </div>
          {video.description && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-1">Description</p>
              <p>{video.description}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default VideoPlayer

