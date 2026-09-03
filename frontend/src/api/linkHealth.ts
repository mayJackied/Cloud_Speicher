import { isAxiosError } from 'axios'
import { ref } from 'vue'
import { isProxyFailureBody } from '@/dev/contract'
import type { LinkReach } from '@/utils/apiLink'

export const linkReach = ref<LinkReach>('unknown')

export function resetLinkReach() {
  linkReach.value = 'unknown'
}

export function noteLinkSuccess(data: unknown) {
  linkReach.value = isProxyFailureBody(data) ? 'down' : 'up'
}

export function noteLinkFailure(error: unknown) {
  linkReach.value = isUnreachableError(error) ? 'down' : 'up'
}

/** 没收到后端 JSON/流，只是代理或网络挂了。业务错误码不算断线。 */
export function isUnreachableError(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return true
  }
  if (!error.response) {
    return true
  }
  const status = error.response.status
  if (status === 502 || status === 503 || status === 504) {
    return true
  }
  return isProxyFailureBody(error.response.data)
}
