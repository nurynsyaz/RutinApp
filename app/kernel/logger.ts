// BRD s.13 Observability: a Logger port, so code never calls console directly.
export interface Logger {
  debug(message: string, data?: unknown): void
  info(message: string, data?: unknown): void
  warn(message: string, data?: unknown): void
  error(message: string, data?: unknown): void
}

export const consoleLogger: Logger = {
  debug: (message, data) => console.debug(`[rutin] ${message}`, data ?? ''),
  info: (message, data) => console.info(`[rutin] ${message}`, data ?? ''),
  warn: (message, data) => console.warn(`[rutin] ${message}`, data ?? ''),
  error: (message, data) => console.error(`[rutin] ${message}`, data ?? ''),
}

export const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}
