/**
 * Virtual Column Layout Utilities
 *
 * Provides functions for constraining snippet positions to virtual columns on the canvas.
 * Columns are evenly spaced with gaps between them for connector visibility.
 */

import { CANVAS_CONSTANTS } from '../constants'

const COLUMN_FULL_WIDTH = CANVAS_CONSTANTS.COLUMN_WIDTH + CANVAS_CONSTANTS.COLUMN_GAP

/**
 * Calculate which column index an x position belongs to
 * @param x - The x coordinate
 * @returns The column index (0-based)
 */
export function getColumnIndex(x: number): number {
  // Handle negative coordinates (columns extend infinitely in both directions)
  if (x < 0) {
    return Math.floor((x - CANVAS_CONSTANTS.COLUMN_WIDTH / 2) / COLUMN_FULL_WIDTH)
  }

  return Math.floor((x + CANVAS_CONSTANTS.COLUMN_WIDTH / 2) / COLUMN_FULL_WIDTH)
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
