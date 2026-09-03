export type ApiMode = 'offline' | 'online'
export type LinkReach = 'unknown' | 'up' | 'down'
export type LinkStatus = 'offline' | 'online' | 'unreachable' | 'checking'

/** 离线只看用户选的数据源；在线才用最近一次请求有没有打到后端。 */
export function linkStatusOf(mode: ApiMode, reach: LinkReach): LinkStatus {
  if (mode === 'offline') {
    return 'offline'
  }
  if (reach === 'up') {
    return 'online'
  }
  if (reach === 'down') {
    return 'unreachable'
  }
  return 'checking'
}
