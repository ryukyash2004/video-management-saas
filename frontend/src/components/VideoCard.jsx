function VideoCard({ video, processing, onClick }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'FLAGGED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
    >
      {/* Video Thumbnail Placeholder */}
      <div className="w-full h-48 bg-gray-200 flex items-center justify-center relative">
        {video.processingStatus === 'PROCESSING' || processing ? (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="mb-2">Processing...</div>
              {processing && (
                <div className="w-48 bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${processing.progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        ) : video.processingStatus === 'FLAGGED' ? (
          <div className="text-red-600 text-4xl">⚠️</div>
        ) : (
          <div className="text-gray-400 text-4xl">▶️</div>
        )}
      </div>

      {/* Video Info */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 truncate">{video.title}</h3>
        <div className="flex items-center justify-between mb-2">
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
              video.processingStatus
            )}`}
          >
            {video.processingStatus}
          </span>
          {video.duration && (
            <span className="text-sm text-gray-500">
              {Math.floor(video.duration / 60)}:
              {String(Math.floor(video.duration % 60)).padStart(2, '0')}
            </span>
          )}
        </div>
        {processing && (
          <div className="mt-2">
            <div className="text-xs text-gray-600 mb-1">{processing.stage}</div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all"
                style={{ width: `${processing.progress}%` }}
              />
            </div>
          </div>
        )}
        {video.description && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
            {video.description}
          </p>
        )}
      </div>
    </div>
  )
}

export default VideoCard

