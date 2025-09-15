import fs from 'fs'
import path from 'path'

interface TestCredential {
  email: string
  password: string
  name: string
  status: 'registered' | 'confirmed' | 'failed'
  createdAt: string
  confirmedAt?: string
  notes?: string
}

interface CredentialStore {
  credentials: TestCredential[]
  lastUpdated: string
}

const CREDENTIALS_FILE = path.join(process.cwd(), 'e2e', 'data', 'test-credentials.json')

export class CredentialManager {
  private static ensureDataDirectory() {
    const dataDir = path.dirname(CREDENTIALS_FILE)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
  }

  private static loadStore(): CredentialStore {
    this.ensureDataDirectory()

    if (!fs.existsSync(CREDENTIALS_FILE)) {
      return {
        credentials: [],
        lastUpdated: new Date().toISOString()
      }
    }

    try {
      const data = fs.readFileSync(CREDENTIALS_FILE, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      console.warn('Failed to load credentials file, starting fresh:', error)
      return {
        credentials: [],
        lastUpdated: new Date().toISOString()
      }
    }
  }

  private static saveStore(store: CredentialStore) {
    this.ensureDataDirectory()
    store.lastUpdated = new Date().toISOString()
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(store, null, 2))
  }

  static saveCredential(credential: Omit<TestCredential, 'createdAt'>): void {
    const store = this.loadStore()

    const fullCredential: TestCredential = {
      ...credential,
      createdAt: new Date().toISOString()
    }

    // Remove any existing credential with the same email
    store.credentials = store.credentials.filter(c => c.email !== credential.email)

    // Add the new credential
    store.credentials.push(fullCredential)

    this.saveStore(store)
    console.log(`💾 Saved credential for ${credential.email} with status: ${credential.status}`)
  }

  static updateCredentialStatus(email: string, status: TestCredential['status'], notes?: string): void {
    const store = this.loadStore()
    const credential = store.credentials.find(c => c.email === email)

    if (credential) {
      credential.status = status
      if (notes) {
        credential.notes = notes
      }
      if (status === 'confirmed') {
        credential.confirmedAt = new Date().toISOString()
      }

      this.saveStore(store)
      console.log(`📝 Updated credential ${email} status to: ${status}`)
    } else {
      console.warn(`⚠️ Credential not found for email: ${email}`)
    }
  }

  static getConfirmedCredentials(): TestCredential[] {
    const store = this.loadStore()
    return store.credentials.filter(c => c.status === 'confirmed')
  }

  static getRegisteredCredentials(): TestCredential[] {
    const store = this.loadStore()
    return store.credentials.filter(c => c.status === 'registered')
  }

  static getAllCredentials(): TestCredential[] {
    const store = this.loadStore()
    return store.credentials
  }

  static getCredentialByEmail(email: string): TestCredential | undefined {
    const store = this.loadStore()
    return store.credentials.find(c => c.email === email)
  }

  static clearAllCredentials(): void {
    const store: CredentialStore = {
      credentials: [],
      lastUpdated: new Date().toISOString()
    }
    this.saveStore(store)
    console.log('🗑️ Cleared all test credentials')
  }

  static printCredentialSummary(): void {
    const store = this.loadStore()
    console.log('\n📊 Test Credential Summary:')
    console.log(`Total credentials: ${store.credentials.length}`)
    console.log(`Confirmed: ${store.credentials.filter(c => c.status === 'confirmed').length}`)
    console.log(`Registered (pending): ${store.credentials.filter(c => c.status === 'registered').length}`)
    console.log(`Failed: ${store.credentials.filter(c => c.status === 'failed').length}`)

    if (store.credentials.length > 0) {
      console.log('\nCredentials:')
      store.credentials.forEach(c => {
        console.log(`  ${c.email} - ${c.status} (created: ${new Date(c.createdAt).toLocaleString()})`)
      })
    }
    console.log('')
  }
}