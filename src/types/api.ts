export interface ApiResponse<T> {
  data?: T
  error?: string
  status: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
