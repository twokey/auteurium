/**
 * Virtual Column Layout Utilities
 *
 * Provides functions for constraining snippet positions to virtual columns on the canvas.
 * Columns are evenly spaced with gaps between them for connector visibility.
 */

import { CANVAS_CONSTANTS } from '../constants'
import type { Snippet } from '../types'
import type { ReactFlowInstance } from 'reactflow'

const COLUMN_FULL_WIDTH = CANVAS_CONSTANTS.COLUMN_WIDTH + CANVAS_CONSTANTS.COLUMN_GAP

/**
 * Calculate which column index an x position belongs to
 * @param x - The x coordinate
 * @returns The column index (0-based)
 */
export function getColumnIndex(x: number): number {
  // Use Math.round for symmetric column snapping around the center of each column
  // Column 0 center is at 450 (half width)
  // Formula: round((x - halfWidth) / fullWidth)
  return Math.round((x - CANVAS_CONSTANTS.COLUMN_WIDTH / 2) / COLUMN_FULL_WIDTH)
}

/**
 * Get the left x coordinate of a specific column
 * @param columnIndex - The column index (0-based, can be negative)
 * @returns The x coordinate at the start (left edge) of the column
 */
export function getColumnLeftX(columnIndex: number): number {
  return columnIndex * COLUMN_FULL_WIDTH
}

/**
 * Snap an x coordinate to the nearest column start (left edge)
 * @param x - The x coordinate to snap
 * @returns The snapped x coordinate at the column start
 */
export function snapToColumn(x: number): number {
  if (!CANVAS_CONSTANTS.ENABLE_COLUMN_CONSTRAINTS) {
    return x
  }

  const columnIndex = getColumnIndex(x)
  return getColumnBounds(columnIndex).left
}

/**
 * Get the left and right boundaries of a column
 * @param columnIndex - The column index
 * @returns Object with left and right x coordinates
 */
export function getColumnBounds(columnIndex: number): { left: number; right: number } {
  return {
    left: getColumnLeftX(columnIndex),
    right: getColumnLeftX(columnIndex) + CANVAS_CONSTANTS.COLUMN_WIDTH
  }
}

/**
 * Get the x coordinate for a column relative to another column
 * Useful for placing related snippets in adjacent columns
 * @param currentColumnIndex - The reference column index
 * @param offset - How many columns to offset (positive = right, negative = left)
 * @returns The left x coordinate of the target column
 */
export function getRelativeColumnX(currentColumnIndex: number, offset: number): number {
  return getColumnBounds(currentColumnIndex + offset).left
}

/**
 * Snap a position object to column constraints
 * @param position - Position with x and y coordinates
 * @returns New position with x snapped to column, y unchanged
 */
export function snapPositionToColumn(position: { x: number; y: number }): { x: number; y: number } {
  return {
    x: snapToColumn(position.x),
    y: position.y
  }
}

/**
 * Calculate the position for a new snippet, stacking it below existing snippets in the target column.
 * @param targetColumnX - The x coordinate of the target column
 * @param snippets - List of all existing snippets
 * @param reactFlowInstance - Optional ReactFlow instance to get accurate node heights
 * @param defaultY - Optional default Y position if the column is empty
 * @returns The calculated position { x, y }
 */
export function calculateStackedPosition(
  targetColumnX: number,
  snippets: Snippet[],
  reactFlowInstance?: ReactFlowInstance | null,
  defaultY: number = CANVAS_CONSTANTS.DEFAULT_NODE_POSITION.y
): { x: number; y: number } {
  // Find snippets in the target column
  const columnSnippets = snippets.filter(s =>
    Math.abs((s.position?.x ?? 0) - targetColumnX) < 10 // Allow small float diffs
  )

  let targetY = defaultY

  if (columnSnippets.length > 0) {
    // Find the lowest point
    const lowestSnippet = columnSnippets.reduce((prev, current) => {
      const prevY = prev.position?.y ?? 0
      const currentY = current.position?.y ?? 0
      return prevY > currentY ? prev : current
    })

    // Get height from ReactFlow if available, otherwise use estimate
    let height: number = CANVAS_CONSTANTS.ESTIMATED_SNIPPET_HEIGHT
    if (reactFlowInstance) {
      const node = reactFlowInstance.getNode(lowestSnippet.id)
      if (node && node.height) {
        height = node.height
      }
    }

    targetY = (lowestSnippet.position?.y ?? 0) + height + 5 // 5px gap
  }

  return {
    x: targetColumnX,
    y: targetY
  }
}
