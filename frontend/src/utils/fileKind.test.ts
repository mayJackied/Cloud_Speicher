import { describe, expect, it } from 'vitest'
import { kindOf, needsPosterFrame } from './fileKind'

describe('needsPosterFrame', () => {
  it('GIF 和视频需要海报帧', () => {
    expect(needsPosterFrame({ isFile: true, fileName: 'a.gif' })).toBe(true)
    expect(needsPosterFrame({ isFile: true, fileName: 'clip.mp4' })).toBe(true)
    expect(needsPosterFrame({ isFile: true, fileName: 'clip.webm' })).toBe(true)
  })

  it('静图和文件夹不抽帧', () => {
    expect(needsPosterFrame({ isFile: true, fileName: 'a.jpg' })).toBe(false)
    expect(needsPosterFrame({ isFile: true, fileName: 'a.png' })).toBe(false)
    expect(needsPosterFrame({ isFile: false, fileName: 'pics' })).toBe(false)
  })

  it('kindOf 把 GIF 归为 image', () => {
    expect(kindOf({ isFile: true, fileName: 'a.gif' })).toBe('image')
  })
})
