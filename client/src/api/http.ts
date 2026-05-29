import axios from 'axios'
import { getToken } from '../lib/authStorage'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export const http = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
