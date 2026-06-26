import { defineEventHandler, setResponseStatus } from 'h3'
import { clearSessionUser } from '../../utils/session'

export default defineEventHandler((event) => {
  clearSessionUser(event)
  setResponseStatus(event, 204)
})
