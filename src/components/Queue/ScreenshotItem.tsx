// src/components/ScreenshotItem.tsx
import React from "react"
import { X } from "lucide-react"

interface Screenshot {
  path: string
  preview: string
}

interface ScreenshotItemProps {
  screenshot: Screenshot
  onDelete: (index: number) => void
  index: number
}

const ScreenshotItem: React.FC<ScreenshotItemProps> = ({
  screenshot,
  onDelete,
  index
}) => {
  const handleDelete = async () => {
    await onDelete(index)
  }

  return (
    <>
      <div className="border border-white relative group">
        <div className="w-full h-full relative">
          <img
            src={screenshot.preview}
            alt="Screenshot"
            className="w-full h-full object-cover transition-transform duration-300 cursor-pointer group-hover:scale-105 group-hover:brightness-75"
          />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDelete()
          }}
          className="absolute top-2 left-2 p-1 rounded-full bg-black bg-opacity-50 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-label="Delete screenshot"
        >
          <X size={16} />
        </button>
      </div>
    </>
  )
}

export default ScreenshotItem