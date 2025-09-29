import { test, expect } from '@playwright/test'

test.describe('Project Canvas View', () => {
  test('opens canvas with snippets and connections after selecting a project', async ({ page }) => {
    const mockProject = {
      id: 'proj-123',
      name: 'Story Beats',
      description: 'Example project for canvas rendering',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      lastModified: '2024-01-03T00:00:00.000Z'
    }

    const mockSnippets = [
      {
        id: 'snippet-1',
        projectId: mockProject.id,
        textField1: 'Act I',
        textField2: 'Setup and exposition',
        position: { x: 120, y: 180 },
        tags: ['setup', 'character'],
        categories: ['structure'],
        version: 1,
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-01T11:00:00.000Z',
        connections: [
          {
            id: 'connection-1',
            sourceSnippetId: 'snippet-1',
            targetSnippetId: 'snippet-2',
            label: 'leads to',
            createdAt: '2024-01-01T11:05:00.000Z',
            updatedAt: '2024-01-01T11:05:00.000Z'
          }
        ]
      },
      {
        id: 'snippet-2',
        projectId: mockProject.id,
        textField1: 'Act II',
        textField2: 'Rising action',
        position: { x: 420, y: 320 },
        tags: ['conflict'],
        categories: ['structure'],
        version: 1,
        createdAt: '2024-01-01T12:00:00.000Z',
        updatedAt: '2024-01-01T12:30:00.000Z',
        connections: []
      }
    ]

    await page.route('**/graphql', async (route) => {
      const request = route.request()
      const body = request.postDataJSON()
      const operationName = body?.operationName

      if (operationName === 'GetProjects') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              projects: [mockProject]
            }
          })
        })
        return
      }

      if (operationName === 'GetProjectWithSnippets') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              project: {
                ...mockProject,
                snippets: mockSnippets
              }
            }
          })
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} })
      })
    })

    await page.goto('/')

    const projectCard = page.locator('[data-testid="project-card"]', { hasText: mockProject.name })
    await expect(projectCard).toBeVisible()

    await projectCard.click()

    await expect(page).toHaveURL(`/project/${mockProject.id}`)

    const snippetNodes = page.locator('[data-testid="snippet-node"]')
    await expect(snippetNodes).toHaveCount(mockSnippets.length)
    await expect(snippetNodes.first()).toContainText('Act I')

    const infoPanel = page.locator('[data-testid="info-panel"]')
    await expect(infoPanel).toContainText(`${mockSnippets.length} snippets`)
    await expect(infoPanel).toContainText('1 connections')
  })
})
