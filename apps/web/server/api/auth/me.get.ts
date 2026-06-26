import { defineEventHandler } from 'h3'
import { requireSessionUser } from '../../utils/session'

export default defineEventHandler((event) => {
  return {
    user: requireSessionUser(event)
  }
})
