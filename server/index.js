import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { env } from './config/env.js'
import falRouter from './routes/fal.js'

const currentFile = fileURLToPath(import.meta.url)
const currentDir = path.dirname(currentFile)
const rootDir = path.resolve(currentDir, '..')
const distDir = path.join(rootDir, 'dist')
const indexFile = path.join(distDir, 'index.html')

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.use('/api/fal', falRouter)

  if (fs.existsSync(indexFile)) {
    app.use(express.static(distDir))
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(indexFile)
    })
  }

  return app
}

export const app = createApp()

export const server = app.listen(env.port, () => {
  console.log(`Express server listening on http://localhost:${env.port}`)
})

export default server
