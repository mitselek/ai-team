// Module augmentation so Nuxt config recognizes `tailwindcss` block when using @nuxtjs/tailwindcss
// Keeps strict TypeScript from flagging the property.
declare module 'nuxt/schema' {
  interface NuxtConfig {
    tailwindcss?: {
      cssPath?: string
      configPath?: string
      viewer?: boolean
      exposeConfig?: boolean
    }
  }
  interface NuxtOptions {
    tailwindcss?: {
      cssPath?: string
      configPath?: string
      viewer?: boolean
      exposeConfig?: boolean
    }
  }
}

export {}