import { describe, expect, it } from 'vitest'
import { selectedCountMessage, updateSelection } from './selection'

describe('多选状态', () => {
  it('普通点击重置为单选', () => {
    expect(updateSelection(['a.txt', 'b.txt'], 'c.txt', false)).toEqual(['c.txt'])
  })

  it('Ctrl/Cmd 点击切换成员且不改变其他项', () => {
    expect(updateSelection(['a.txt'], 'b.txt', true)).toEqual(['a.txt', 'b.txt'])
    expect(updateSelection(['a.txt', 'b.txt'], 'a.txt', true)).toEqual(['b.txt'])
  })

  it('批量结果包含成功数和失败文件名', () => {
    expect(selectedCountMessage(2, ['bad.txt'], '移动')).toBe(
      '移动完成：成功 2 项，失败 bad.txt',
    )
  })
})
