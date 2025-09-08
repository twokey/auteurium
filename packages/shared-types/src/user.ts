export interface User {
  id: string
  email: string
  name: string
  role: 'standard' | 'admin'
  createdAt: string
  updatedAt: string
}

export interface UserProfile {
  id: string
  email: string
  name: string
}

export interface CreateUserInput {
  email: string
  name: string
  password: string
}

export interface UpdateUserInput {
  name?: string
  email?: string
}