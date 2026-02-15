import { forwardRef, useImperativeHandle, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { uploadFile } from '../../services/api'
import { CloudArrowUpIcon } from '@heroicons/react/24/outline'
import { extractErrorMessage } from '../../utils/errorMessage'

interface FileUploadProps {
  onUpload: (urls: string[]) => void
}

export interface FileUploadHandle {
  open: () => void
}

const FileUpload = forwardRef<FileUploadHandle, FileUploadProps>(({ onUpload }, ref) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true),
  }))

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    onDrop: async (acceptedFiles) => {
      setIsUploading(true)
      const urls: string[] = []
      const failures: string[] = []

      for (const file of acceptedFiles) {
        try {
          const result = await uploadFile(file)
          urls.push(result.url)
        } catch (error) {
          console.error('Upload failed:', error)
          failures.push(`${file.name}: ${extractErrorMessage(error, '上传失败')}`)
        }
      }

      if (failures.length > 0) {
        alert(`部分文件上传失败：\n${failures.join('\n')}`)
      }

      onUpload(urls)
      setIsUploading(false)
      setIsOpen(false)
    },
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-sm">
      <div className="surface-card w-full max-w-md p-6">
        <div className="mb-4 text-lg font-medium text-stone-900">上传图片</div>

        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
            isDragActive ? 'border-teal-500 bg-teal-50/80' : 'border-stone-300 hover:border-teal-500'
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} disabled={isUploading} />

          <CloudArrowUpIcon className="mx-auto mb-4 h-12 w-12 text-stone-400" />

          {isUploading ? (
            <div className="text-stone-600">上传中...</div>
          ) : isDragActive ? (
            <div className="text-teal-700">释放文件以上传</div>
          ) : (
            <div>
              <div className="mb-2 text-stone-600">拖放文件或点击选择</div>
              <div className="text-sm text-stone-500">支持 JPG, PNG, GIF, WebP (最大 5MB)</div>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            disabled={isUploading}
            className="btn-secondary"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
})

FileUpload.displayName = 'FileUpload'

export default FileUpload
