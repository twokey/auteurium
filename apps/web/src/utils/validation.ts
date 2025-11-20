/**
 * Validation utilities
 * Common validation functions for forms and user input
 */

import { VALIDATION } from '../constants'

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const isValidPassword = (password: string): boolean => {
  return password.length >= VALIDATION.MIN_PASSWORD_LENGTH
}

export const isValidProjectName = (name: string): boolean => {
  const trimmed = name.trim()
  return trimmed.length > 0 && trimmed.length <= VALIDATION.MAX_PROJECT_NAME_LENGTH
}

export const isValidProjectDescription = (description: string): boolean => {
  return description.length <= VALIDATION.MAX_PROJECT_DESCRIPTION_LENGTH
}

export const passwordsMatch = (password: string, confirmPassword: string): boolean => {
  return password === confirmPassword
}

export interface ValidationError {
  field: string
  message: string
}

export const validateLoginForm = (
  email: string,
  password: string
): ValidationError[] => {
  const errors: ValidationError[] = []

  if (!email) {
    errors.push({ field: 'email', message: 'Email is required' })
  } else if (!isValidEmail(email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' })
  }

  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' })
  }

  return errors
}

export const validateRegistrationForm = (
  email: string,
  password: string,
  confirmPassword: string,
  name: string
): ValidationError[] => {
  const errors: ValidationError[] = []

  if (!name.trim()) {
    errors.push({ field: 'name', message: 'Full name is required' })
  }

  if (!email.trim()) {
    errors.push({ field: 'email', message: 'Email is required' })
  } else if (!isValidEmail(email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' })
  }

  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' })
  } else if (!isValidPassword(password)) {
    errors.push({ 
      field: 'password', 
      message: `Password must be at least ${VALIDATION.MIN_PASSWORD_LENGTH} characters long` 
    })
  }

  if (!confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Please confirm your password' })
  } else if (!passwordsMatch(password, confirmPassword)) {
    errors.push({ field: 'confirmPassword', message: 'Passwords do not match' })
  }

  return errors
}

export const validateProjectForm = (
  name: string,
  description: string
): ValidationError[] => {
  const errors: ValidationError[] = []

  if (!isValidProjectName(name)) {
    if (name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Project name is required' })
    } else {
      errors.push({ 
        field: 'name', 
        message: `Project name must be ${VALIDATION.MAX_PROJECT_NAME_LENGTH} characters or less` 
      })
    }
  }

  if (!isValidProjectDescription(description)) {
    errors.push({ 
      field: 'description', 
      message: `Description must be ${VALIDATION.MAX_PROJECT_DESCRIPTION_LENGTH} characters or less` 
    })
  }

  return errors
}



