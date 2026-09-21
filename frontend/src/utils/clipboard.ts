/** 优先使用 Clipboard API；HTTP/IP 环境下回退到 execCommand。 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 非安全上下文或权限拒绝时继续走兼容方案。
  }

  try {
    const input = document.createElement('textarea')
    input.value = text
    input.readOnly = true
    input.style.position = 'fixed'
    input.style.opacity = '0'
    input.style.pointerEvents = 'none'
    document.body.appendChild(input)
    input.select()
    input.setSelectionRange(0, text.length)
    const copied = document.execCommand('copy')
    input.remove()
    return copied
  } catch {
    return false
  }
}
