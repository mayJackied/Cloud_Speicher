import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('传输列表界面接入', () => {
  const transfersView = readFileSync(new URL('./Transfers.vue', import.meta.url), 'utf8')
  const driveView = readFileSync(new URL('./CloudDrive.vue', import.meta.url), 'utf8')
  const sidebar = readFileSync(
    new URL('../../components/drive/DriveSidebar.vue', import.meta.url),
    'utf8',
  )
  const driveFiles = readFileSync(
    new URL('../../composables/useDriveFiles.ts', import.meta.url),
    'utf8',
  )

  it('两侧共用 DriveSidebar，占用从共享树读取', () => {
    expect(driveView).toContain('DriveSidebar')
    expect(transfersView).toContain('DriveSidebar')
    expect(transfersView).toContain('active="transfers"')
    expect(transfersView).toContain("load({ quiet: true })")
    expect(sidebar).toContain('useDriveFiles')
    expect(sidebar).toContain('usedBytes')
    expect(sidebar).toContain("t('drive.shared')")
    expect(sidebar).toContain('to="/drive/transfers"')
    expect(sidebar).toContain("t('drive.trash')")
    expect(sidebar).toContain('drive-side__store')
    expect(driveFiles).toContain('resetDriveFilesState')
    expect(driveFiles).toContain('网盘树在页面间共享')

    const sharedAt = sidebar.indexOf("t('drive.shared')")
    const transfersAt = sidebar.indexOf('to="/drive/transfers"')
    const trashAt = sidebar.indexOf("t('drive.trash')")
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

  it('传输卡片展示申请与完成时间戳', () => {
    expect(transfersView).toContain("t('transfers.requestedAt')")
    expect(transfersView).toContain("t('transfers.finishedAt')")
    expect(transfersView).toContain('formatStampSecond(task.createdAt)')
    expect(transfersView).toContain('formatStampSecond(task.completedAt)')
  })

  it('可在精简与详细显示模式间切换', () => {
    expect(transfersView).toContain("prefs.setTransferView('compact')")
    expect(transfersView).toContain("prefs.setTransferView('detail')")
    expect(transfersView).toContain("t('transfers.viewCompact')")
    expect(transfersView).toContain("t('transfers.viewDetail')")
    expect(transfersView).toContain('transfer-compact')
  })

  it('共享频道已接生成和接收分享码', () => {
    expect(sidebar).toContain("emit('openShared')")
    expect(driveView).toContain('createShareKey')
    expect(driveView).toContain('acceptShareKey')
    expect(driveView).toContain('itemSourcePath')
    expect(driveView).toContain('openAcceptShare')
    expect(driveView).toContain("kind: 'accept-share'")
    expect(driveView).toContain("t('drive.acceptShareHint')")
  })
})
