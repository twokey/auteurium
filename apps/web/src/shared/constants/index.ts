/**
 * Application-wide constants
 * Centralized location for magic numbers and configuration values
 */

// Canvas Configuration
export const CANVAS_CONSTANTS = {
  WORD_LIMIT: 100,
  GENERATED_SNIPPET_VERTICAL_OFFSET: 500,
  GENERATED_SNIPPET_SPACING: 20, // Spacing between snippet bottom and new snippet top
  ESTIMATED_SNIPPET_HEIGHT: 280, // Estimated average snippet height
  SCENE_VERTICAL_SPACING: 50, // Vertical gap between stacked scene snippets
  DEFAULT_NODE_POSITION: { x: 150, y: 200 }, // x=150 is center of first column (0-300)
  MIN_NODE_WIDTH: 200,
  MAX_NODE_WIDTH: 300,
  RELATED_SNIPPET_HORIZONTAL_GAP: 60,
  VIEWPORT_PADDING: 0.2,
  // Virtual Column Layout
  COLUMN_WIDTH: 300, // Width of each virtual column (matches snippet width)
  COLUMN_GAP: 50, // Horizontal gap between columns for connector visibility
  COLUMN_GUIDE_RIGHT_PADDING: 4, // Extra visual width on the right edge for guide visibility
  ENABLE_COLUMN_CONSTRAINTS: true, // Feature flag to enable/disable column snapping
  ENABLE_BULK_POSITION_MUTATION: true, // Enable bulk position persistence when backend supports the mutation
} as const

// Form Validation
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PROJECT_NAME_LENGTH: 100,
  MAX_PROJECT_DESCRIPTION_LENGTH: 500,
  CONFIRMATION_CODE_LENGTH: 6,
} as const

// UI Configuration
export const UI = {
  TOAST_DURATION: 5000,
  DEBOUNCE_DELAY: 300,
  LOADING_SPINNER_SIZE: {
    SMALL: 'h-4 w-4',
    MEDIUM: 'h-8 w-8',
    LARGE: 'h-12 w-12',
    XLARGE: 'h-32 w-32',
  },
} as const

// GraphQL Configuration
export const GRAPHQL = {
  DEFAULT_POLL_INTERVAL: 30000, // 30 seconds
  CACHE_TTL: 60000, // 1 minute
  RETRY_ATTEMPTS: 3,
} as const

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_VIEW: 'authPageView',
  AUTH_EMAIL: 'authPageEmail',
  CANVAS_VIEWPORT: (projectId: string) => `canvas-viewport-${projectId}`,
} as const

// Image Generation
export const IMAGE_GENERATION = {
  MAX_MULTIMODAL_IMAGES: 3,
  DEFAULT_MODEL: 'imagen-4.0-fast-generate-001',
  MODELS: {
    IMAGEN_FAST: 'imagen-4.0-fast-generate-001',
    GEMINI_FLASH_IMAGE: 'gemini-2.5-flash-image',
  },
} as const

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC: 'An error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
} as const
