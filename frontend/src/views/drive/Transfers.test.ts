import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('传输列表界面接入', () => {
  const transfersView = readFileSync(new URL('./Transfers.vue', import.meta.url), 'utf8')
  const driveView = readFileSync(new URL('./CloudDrive.vue', import.meta.url), 'utf8')

  it('侧栏入口位于共享和回收站之间', () => {
    const sharedAt = driveView.indexOf("t('drive.shared')")
    const transfersAt = driveView.indexOf('to="/drive/transfers"')
    const trashAt = driveView.indexOf("t('drive.trash')")

    expect(sharedAt).toBeGreaterThan(-1)
    expect(transfersAt).toBeGreaterThan(sharedAt)
    expect(trashAt).toBeGreaterThan(transfersAt)
  })

  it('提供筛选、状态信息和完整任务操作', () => {
    expect(transfersView).toContain('v-for="option in filters"')
    expect(transfersView).toContain('task.speedBps')
    expect(transfersView).toContain('task.remainingSeconds')
    expect(transfersView).toContain('transfers.pause(task.id)')
    expect(transfersView).toContain('transfers.resume(task.id)')
    expect(transfersView).toContain('transfers.cancel(task.id)')
    expect(transfersView).toContain('chooseSource(task.id)')
    expect(transfersView).toContain('chooseDestination(task.id, task.fileName)')
  })
})
