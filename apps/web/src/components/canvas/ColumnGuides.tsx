/**
 * Column Guides Component
 * Renders visual guides for virtual columns on the canvas
 * Uses ReactFlow's coordinate system to ensure proper alignment
 */

import { memo } from 'react'

import { CANVAS_CONSTANTS } from '../../shared/constants'
import { getColumnBounds } from '../../shared/utils/columnLayout'

interface ColumnGuidesProps {
  viewport: {
    x: number
    y: number
    zoom: number
  }
}

export const ColumnGuides = memo(({ viewport }: ColumnGuidesProps) => {
  if (!CANVAS_CONSTANTS.ENABLE_COLUMN_CONSTRAINTS) {
    return null
  }

  // Calculate visible area in canvas coordinates
  const containerWidth = typeof window !== 'undefined' ? window.innerWidth : 1920
  const containerHeight = typeof window !== 'undefined' ? window.innerHeight - 64 : 1080

  // Calculate viewport bounds in canvas coordinates
  const viewportLeft = -viewport.x / viewport.zoom
  const viewportRight = viewportLeft + containerWidth / viewport.zoom
  const viewportTop = -viewport.y / viewport.zoom
  const viewportBottom = viewportTop + containerHeight / viewport.zoom

  const columnWidth = CANVAS_CONSTANTS.COLUMN_WIDTH
  const columnGap = CANVAS_CONSTANTS.COLUMN_GAP
  const columnGuideRightPadding = CANVAS_CONSTANTS.COLUMN_GUIDE_RIGHT_PADDING ?? 0
  const columnWithGap = columnWidth + columnGap

  // Calculate range of visible columns with extra padding
  const firstColumnIndex = Math.floor(viewportLeft / columnWithGap) - 1
  const lastColumnIndex = Math.ceil(viewportRight / columnWithGap) + 1

  const transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'visible'
      }}
    >
      <svg
        style={{
          width: '100%',
          height: '100%',
          overflow: 'visible',
          transform,
          transformOrigin: '0 0'
        }}
      >
        <g>
          {Array.from({ length: lastColumnIndex - firstColumnIndex + 1 }, (_, index) => {
            const columnIndex = firstColumnIndex + index
            const { left, right } = getColumnBounds(columnIndex)
            const visualRight = right + columnGuideRightPadding
            const visualWidth = columnWidth + columnGuideRightPadding

            return (
              <g key={`column-${columnIndex}`}>
                {/* Column background */}
                <rect
                  x={left}
                  y={viewportTop}
                  width={visualWidth}
                  height={viewportBottom - viewportTop}
                  fill="#f8fafc"
                  opacity={1}
                />

                {/* Left boundary line */}
                <line
                  x1={left}
                  y1={viewportTop}
                  x2={left}
                  y2={viewportBottom}
                  stroke="#94a3b8"
                  strokeWidth={1}
                  opacity={0.6}
                />

                {/* Right boundary line */}
                <line
                  x1={visualRight}
                  y1={viewportTop}
                  x2={visualRight}
                  y2={viewportBottom}
                  stroke="#94a3b8"
                  strokeWidth={1}
                  opacity={0.6}
                />
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
})

ColumnGuides.displayName = 'ColumnGuides'
