import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

describe('前端安全回归', () => {
  it('生产环境强制在线且不显示数据源切换入口', () => {
    expect(source('./composables/useApiMode.ts')).toContain('if (import.meta.env.PROD)')
    expect(source('./api/client.ts')).toContain('if (import.meta.env.PROD)')
    expect(source('./views/auth/Login.vue')).toContain('<ApiModeSwitch v-if="isDev"')
    expect(source('./views/auth/Register.vue')).toContain('<ApiModeSwitch v-if="isDev"')
    expect(source('./views/drive/Settings.vue')).toContain(
      'v-else-if="isDev && tab === \'connection\'"',
    )
  })

  it('管理页路由和侧栏入口都要求管理员', () => {
    const router = source('./router/index.ts')
    const sidebar = source('./components/drive/DriveSidebar.vue')

    expect(router.match(/requiresAdmin: true/g)).toHaveLength(2)
    expect(sidebar).toContain('v-if="auth.isAdmin"')
    expect(source('./views/admin/Invitations.vue')).not.toContain('auth.setAdmin(true)')
  })

  it('主上传入口在入队前校验文件名', () => {
    const drive = source('./views/drive/CloudDrive.vue')
    const queueUpload = drive.slice(
      drive.indexOf('async function queueUpload'),
      drive.indexOf('async function queueDownload'),
    )

    expect(queueUpload).toContain('decodeFileName(file.name)')
    expect(queueUpload).toContain('isLegalFileName(finalName)')
    expect(queueUpload.indexOf('isLegalFileName(finalName)')).toBeLessThan(
      queueUpload.indexOf('transfers.enqueueUpload'),
    )
  })

  it('开发代理不再扩大文件系统范围或硬编码公网地址', () => {
    const config = source('../vite.config.ts')
    expect(config).not.toContain("allow: ['..']")
    expect(config).not.toContain('8.130.215.175')
    expect(config).toContain('VITE_DEV_API_TARGET')
  })

  it('入口页声明内容安全策略', () => {
    const html = source('../index.html')
    expect(html).toContain('Content-Security-Policy')
    expect(html).toContain("object-src 'none'")
    expect(html).toContain("script-src 'self'")
  })
})
