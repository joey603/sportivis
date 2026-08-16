import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * En production les fichiers de `api/` sont déployés en fonctions serverless
 * par Vercel. Le serveur de développement de Vite ne les connaît pas : ce
 * plugin les monte sur les mêmes URL pour que `npm run dev` se comporte comme
 * la prod, et expose les variables de `.env` au processus Node.
 */
function apiDevServer(): Plugin {
  return {
    name: 'sportivis-api-dev',
    apply: 'serve',
    config(_config, { mode }) {
      const env = loadEnv(mode, process.cwd(), '')
      for (const [key, value] of Object.entries(env)) {
        if (process.env[key] === undefined) process.env[key] = value
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? ''
        if (!url.startsWith('/api/')) {
          next()
          return
        }
        const route = url.split('?')[0].slice('/api/'.length)
        // Les modules préfixés d'un « _ » sont des utilitaires, pas des routes.
        if (!/^[a-z0-9-]+$/.test(route)) {
          next()
          return
        }

        void (async () => {
          try {
            const module = await server.ssrLoadModule(`/api/${route}.ts`)
            const handler = module.default as (
              request: typeof req,
              response: typeof res,
            ) => Promise<void>
            await handler(req, res)
          } catch (error) {
            server.config.logger.error(`[api] ${String(error)}`)
            if (!res.headersSent) {
              res.statusCode = 500
              res.setHeader('content-type', 'application/json')
            }
            res.end(JSON.stringify({ error: 'server_error' }))
          }
        })()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiDevServer()],
})
