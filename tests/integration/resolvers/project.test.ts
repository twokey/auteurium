// Integration tests for project GraphQL resolvers
describe('Project Resolvers', () => {
  describe('projects query', () => {
    it.todo('should return only user owned projects')
    it.todo('should require authentication')
    it.todo('should return projects ordered by lastModified')
  })

  describe('createProject mutation', () => {
    it.todo('should create project with valid input')
    it.todo('should validate required fields')
    it.todo('should set createdAt and updatedAt timestamps')
  })

  describe('deleteProject mutation', () => {
    it.todo('should delete project and all contained snippets')
    it.todo('should only allow owner to delete project')
    it.todo('should delete all connections in the project')
  })
})
