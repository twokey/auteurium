/**
 * Keyboard shortcut hooks
 * Provides easy keyboard event handling
 */

import { useEffect, useCallback } from 'react'

export interface KeyPressOptions {
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
  preventDefault?: boolean
}

export function useKeyPress(
  targetKey: string,
  callback: () => void,
  options: KeyPressOptions = {}
): void {
  const {
    ctrlKey = false,
    altKey = false,
    shiftKey = false,
    metaKey = false,
    preventDefault = true
  } = options

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      const keyMatches = event.key === targetKey
      const ctrlMatches = !ctrlKey || event.ctrlKey
      const altMatches = !altKey || event.altKey
      const shiftMatches = !shiftKey || event.shiftKey
      const metaMatches = !metaKey || event.metaKey

      if (keyMatches && ctrlMatches && altMatches && shiftMatches && metaMatches) {
        if (preventDefault) {
          event.preventDefault()
        }
        callback()
      }
    },
    [targetKey, callback, ctrlKey, altKey, shiftKey, metaKey, preventDefault]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [handleKeyPress])
}

/**
 * Hook for common keyboard shortcuts
 */
export function useCommonKeyboardShortcuts(handlers: {
  onSave?: () => void
  onEscape?: () => void
  onDelete?: () => void
  onUndo?: () => void
  onRedo?: () => void
}): void {
  // Ctrl/Cmd + S for Save
  useKeyPress('s', () => handlers.onSave?.(), { 
    ctrlKey: true, 
    metaKey: true,
    preventDefault: true 
  })

  // Escape key
  useKeyPress('Escape', () => handlers.onEscape?.(), { 
    preventDefault: false 
  })

  // Delete/Backspace
  useKeyPress('Delete', () => handlers.onDelete?.(), { 
    preventDefault: false 
  })

  // Ctrl/Cmd + Z for Undo
  useKeyPress('z', () => handlers.onUndo?.(), { 
    ctrlKey: true, 
    metaKey: true,
    preventDefault: true 
  })

  // Ctrl/Cmd + Shift + Z for Redo
  useKeyPress('z', () => handlers.onRedo?.(), { 
    ctrlKey: true, 
    metaKey: true,
    shiftKey: true,
    preventDefault: true 
  })
}



