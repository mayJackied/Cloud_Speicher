export function updateSelection(
  selectedNames: readonly string[],
  name: string,
  additive: boolean,
): string[] {
  if (!additive) {
    return [name]
  }
  if (selectedNames.includes(name)) {
    return selectedNames.filter((selected) => selected !== name)
  }
  return [...selectedNames, name]
}

export function selectedCountMessage(
  succeeded: number,
  failedNames: readonly string[],
  action: string,
  locale = 'zh-CN',
): string {
  const shown = failedNames.slice(0, 3).join(locale === 'zh-CN' ? '、' : ', ')
  const more =
    failedNames.length > 3
      ? locale === 'zh-CN'
        ? ` 等 ${failedNames.length} 项`
        : ` (${failedNames.length} total)`
      : ''
  if (locale === 'en') {
    return failedNames.length === 0
      ? `${action}: ${succeeded} succeeded`
      : `${action}: ${succeeded} succeeded, failed: ${shown}${more}`
  }
  if (locale === 'de') {
    return failedNames.length === 0
      ? `${action}: ${succeeded} erfolgreich`
      : `${action}: ${succeeded} erfolgreich, fehlgeschlagen: ${shown}${more}`
  }
  if (failedNames.length === 0) {
    return `${action}成功：${succeeded} 项`
  }
  return `${action}完成：成功 ${succeeded} 项，失败 ${shown}${more}`
}
