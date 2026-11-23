import axios, { AxiosError } from 'axios'
import type { ApiError } from './types-local'

const TOKEN_KEY = 'helpdesk.token'

// The JWT lives in localStorage so a refresh keeps you signed in. That trades some XSS exposure for
// simplicity; if you need stricter handling, move the token to an httpOnly cookie issued by the API.
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api`,
})

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError<ApiError>) => {
    const isAuthCall = error.config?.url?.startsWith('/auth/login') || error.config?.url?.startsWith('/auth/register')
    if (error.response?.status === 401 && !isAuthCall && tokenStore.get()) {
      tokenStore.clear()
      window.dispatchEvent(new Event('auth:expired'))
    }
    return Promise.reject(error)
  },
)

/** Turns any thrown value into a sentence that is safe to show to the user. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError<ApiError>(err)) {
    const data = err.response?.data
    if (data?.fieldErrors) {
      const first = Object.entries(data.fieldErrors)[0]
      if (first) return `${first[0]}: ${first[1]}`
    }
    if (data?.message) return data.message
    if (!err.response) return 'Cannot reach the server. Check your connection and try again.'
  }
  return fallback
}
