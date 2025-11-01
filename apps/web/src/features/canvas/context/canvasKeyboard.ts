import { useEffect, useMemo, useRef } from 'react'

type ShortcutMatcher = (event: KeyboardEvent) => boolean

export interface CanvasShortcutDefinition {
  key?: string
  keys?: string[]
  matcher?: ShortcutMatcher
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
  preventDefault?: boolean
  stopPropagation?: boolean
  allowWhileTyping?: boolean
}

interface RegisteredShortcut {
  definition: CanvasShortcutDefinition
  handlerRef: React.MutableRefObject<(event: KeyboardEvent) => void>
}

const shortcuts = new Set<RegisteredShortcut>()
let listenerCount = 0

const isTextInputLike = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true
  }

  if (target.isContentEditable) {
    return true
  }

  return false
}

const normaliseKey = (key: string | undefined): string | undefined =>
  typeof key === 'string' ? key.toLowerCase() : undefined

const matchesShortcut = (event: KeyboardEvent, definition: CanvasShortcutDefinition): boolean => {
  if (definition.ctrlKey === true && !event.ctrlKey) return false
  if (definition.altKey === true && !event.altKey) return false
  if (definition.shiftKey === true && !event.shiftKey) return false
  if (definition.metaKey === true && !event.metaKey) return false

  if (definition.matcher) {
    return definition.matcher(event)
  }

  const expectedKey = normaliseKey(definition.key)
  if (expectedKey) {
    return normaliseKey(event.key) === expectedKey
  }

  const expectedKeys = definition.keys?.map(normaliseKey).filter((key): key is string => Boolean(key))
  if (expectedKeys && expectedKeys.length > 0) {
    const pressedKey = normaliseKey(event.key)
    return pressedKey !== undefined && expectedKeys.includes(pressedKey)
  }

  return false
}

const handleKeyDown = (event: KeyboardEvent) => {
  shortcuts.forEach(({ definition, handlerRef }) => {
    if (!definition.allowWhileTyping && isTextInputLike(event.target)) {
      return
    }

    if (!matchesShortcut(event, definition)) {
      return
    }

    if (definition.preventDefault) {
      event.preventDefault()
    }

    if (definition.stopPropagation) {
      event.stopPropagation()
    }

    handlerRef.current(event)
  })
}

const ensureListener = () => {
  if (listenerCount === 0) {
    window.addEventListener('keydown', handleKeyDown)
  }
  listenerCount += 1
}

const teardownListener = () => {
  listenerCount = Math.max(0, listenerCount - 1)
  if (listenerCount === 0) {
    window.removeEventListener('keydown', handleKeyDown)
  }
}

export const useCanvasKeyboardShortcut = (
  definition: CanvasShortcutDefinition,
  handler: (event: KeyboardEvent) => void
) => {
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  const normalisedDefinition = useMemo<CanvasShortcutDefinition>(() => {
    if (definition.keys) {
      return {
        ...definition,
        keys: [...definition.keys]
      }
    }

    return { ...definition }
  }, [definition])

  useEffect(() => {
    const entry: RegisteredShortcut = {
      definition: normalisedDefinition,
      handlerRef
    }

    shortcuts.add(entry)
    ensureListener()

    return () => {
      shortcuts.delete(entry)
      teardownListener()
    }
  }, [normalisedDefinition])
}
