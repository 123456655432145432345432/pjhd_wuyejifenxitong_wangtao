import type { PageResult, Pagination } from '../api/types'

/** 兼容本仓 `{ list, pagination }` 与交付文档 Spring 风格 `{ content, total, page, pageSize }` */
export function normalizePageResult<T>(raw: unknown, fallbackPage = 1, fallbackPageSize = 20): PageResult<T> {
  const emptyPagination = (page: number, pageSize: number, total = 0): Pagination => ({
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize) || 1)
  })

  if (!raw || typeof raw !== 'object') {
    return { list: [], pagination: emptyPagination(fallbackPage, fallbackPageSize) }
  }

  const data = raw as Record<string, unknown>

  if (Array.isArray(data.list)) {
    const pagination = (data.pagination || {}) as Partial<Pagination>
    const page = Number(pagination.page ?? data.page ?? fallbackPage) || fallbackPage
    const pageSize = Number(pagination.pageSize ?? data.pageSize ?? fallbackPageSize) || fallbackPageSize
    const total = Number(pagination.total ?? data.total ?? data.list.length) || 0
    const totalPages =
      Number(pagination.totalPages) || Math.max(1, Math.ceil(total / pageSize) || 1)
    return {
      list: data.list as T[],
      pagination: { page, pageSize, total, totalPages }
    }
  }

  if (Array.isArray(data.content)) {
    const page = Number(data.page ?? data.number ?? fallbackPage) || fallbackPage
    const pageSize = Number(data.pageSize ?? data.size ?? fallbackPageSize) || fallbackPageSize
    const total = Number(data.total ?? data.totalElements ?? data.content.length) || 0
    const totalPages =
      Number(data.totalPages) || Math.max(1, Math.ceil(total / pageSize) || 1)
    return {
      list: data.content as T[],
      pagination: { page, pageSize, total, totalPages }
    }
  }

  if (Array.isArray(raw)) {
    return {
      list: raw as T[],
      pagination: emptyPagination(1, raw.length || fallbackPageSize, raw.length)
    }
  }

  return { list: [], pagination: emptyPagination(fallbackPage, fallbackPageSize) }
}
