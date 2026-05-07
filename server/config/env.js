const DEFAULT_PORT = 3333
const DEFAULT_TOKEN_DURATION_SECONDS = 60
const DEFAULT_FAL_REQUEST_TIMEOUT_MS = 15000
const MODEL_ID = 'decart/lucy2-vton/realtime'

function readPort(value) {
  const port = Number.parseInt(value ?? `${DEFAULT_PORT}`, 10)
  return Number.isFinite(port) ? port : DEFAULT_PORT
}

function readTokenDuration(value) {
  const duration = Number.parseInt(value ?? `${DEFAULT_TOKEN_DURATION_SECONDS}`, 10)
  return Number.isFinite(duration) && duration > 0 ? duration : DEFAULT_TOKEN_DURATION_SECONDS
}

function readRequestTimeout(value) {
  const timeout = Number.parseInt(value ?? `${DEFAULT_FAL_REQUEST_TIMEOUT_MS}`, 10)
  return Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_FAL_REQUEST_TIMEOUT_MS
}

const falKey = process.env.VITE_FAL_KEY || process.env.FAL_KEY || ''

if (!falKey) {
  throw new Error('Missing VITE_FAL_KEY or FAL_KEY in the server environment.')
}

export const env = {
  falKey,
  modelId: MODEL_ID,
  port: readPort(process.env.PORT),
  requestTimeoutMs: readRequestTimeout(process.env.FAL_REQUEST_TIMEOUT_MS),
  tokenDurationSeconds: readTokenDuration(process.env.FAL_REALTIME_TOKEN_DURATION),
}

export function isAllowedRealtimeApp(app) {
  return app === env.modelId || app === `${env.modelId}/realtime`
}
