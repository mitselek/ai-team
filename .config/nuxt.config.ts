// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt',
    'nuxt-icons'
  ],

  ssr: true,
  devtools: { enabled: true },

  app: {
    head: {
      title: 'AI Team - Agent Orchestration Platform',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Asynchronous AI agent orchestration platform' }
      ]
    }
  },

  runtimeConfig: {
    // Private keys (server-only)
    githubToken: '',
    openaiApiKey: '',
    anthropicApiKey: '',

    public: {
      // Public config (client-side accessible)
      appName: 'AI Team',
      maxAgentsPerOrg: 100,
      defaultTokenPool: 1000000
    }
  },

  typescript: {
    strict: true,
    typeCheck: true
  },

  eslint: {
    config: {
      autoInit: false,
      stylistic: true
    }
  },

  compatibilityDate: '2025-11-03'
})
