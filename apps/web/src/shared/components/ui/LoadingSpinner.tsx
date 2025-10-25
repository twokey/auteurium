/**
 * Loading Spinner component
 * Displays loading state with various sizes
 */

import { UI } from '../../constants'

export type SpinnerSize = 'small' | 'medium' | 'large' | 'xlarge'

interface LoadingSpinnerProps {
  size?: SpinnerSize
  text?: string
  fullScreen?: boolean
}

const getSizeClass = (size: SpinnerSize): string => {
  switch (size) {
    case 'small':
      return UI.LOADING_SPINNER_SIZE.SMALL
    case 'medium':
      return UI.LOADING_SPINNER_SIZE.MEDIUM
    case 'large':
      return UI.LOADING_SPINNER_SIZE.LARGE
    case 'xlarge':
      return UI.LOADING_SPINNER_SIZE.XLARGE
    default:
      return UI.LOADING_SPINNER_SIZE.MEDIUM
  }
}

export const LoadingSpinner = ({ 
  size = 'medium', 
  text,
  fullScreen = false 
}: LoadingSpinnerProps) => {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${getSizeClass(size)}`} />
      {text && (
        <p className="text-gray-600 text-sm">{text}</p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        {spinner}
      </div>
    )
  }

  return spinner
}



