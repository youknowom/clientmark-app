import axios from 'axios'
import Cookies from 'js-cookie'

// Base URL (supports production environment variable on Vercel)
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

// Create Axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 100000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
})

//====REQUEST INTERCEPTOR ====//
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    //For file uploads
    if (config.isFileUpload) {
      config.headers['Content-Type'] = 'multipart/form-data'
    }

    //For downloads
    if (config.isDownload) {
      config.responseType = 'blob'
    }

    return config
  },
  (error) => Promise.reject(error),
)

//==== RESPONSE INTERCEPTOR ====//
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let customError = {
      status: null,
      message: 'Something went wrong. Please try again.',
      data: null,
    }

    if (error.response) {
      customError.status = error.response.status
      customError.data = error.response.data

      switch (error.response.status) {
        case 400:
          customError.message = error.response.data.message || 'Bad Request'
          break
        case 401:
          customError.message = 'Unauthorized. Please log in again.'
          break
        case 403:
          customError.message = "Forbidden: You don't have permission."
          break
        case 404:
          customError.message = 'Resource not found.'
          break
        case 500:
          customError.message = 'Internal server error. Please try later.'
          break
        default:
          customError.message = error.response.data.message || customError.message
      }
    } else if (error.request) {
      customError.message = 'Network error. Server not reachable.'
    } else {
      customError.message = error.message
    }

    return Promise.reject(customError)
  },
)

export default apiClient
