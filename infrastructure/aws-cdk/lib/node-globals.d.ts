// Node.js global declarations for CDK stacks
declare const process: {
  env: {
    [key: string]: string | undefined
  }
}

declare const __dirname: string

declare module 'path' {
  export function join(...paths: string[]): string
  export function resolve(...paths: string[]): string
  export function dirname(path: string): string
  export function basename(path: string, ext?: string): string
  export function extname(path: string): string
  export const sep: string
}

