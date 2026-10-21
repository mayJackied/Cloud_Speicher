import { describe, expect, it } from 'vitest'
import { planFolderUpload } from './folderUpload'

function fileAt(rel: string): File {
  const name = rel.split('/').pop() ?? rel
  const file = new File(['x'], name)
  Object.defineProperty(file, 'webkitRelativePath', { value: rel })
  return file
}

describe('planFolderUpload', () => {
  it('keeps nested relative directories', () => {
    const plan = planFolderUpload([fileAt('docs/a/b.txt'), fileAt('docs/c.txt')])
    expect(plan.skipped).toBe(0)
    expect(plan.items.map((item) => item.dirSegments)).toEqual([['docs', 'a'], ['docs']])
  })

  it('keeps case and spaces in folder names', () => {
    const plan = planFolderUpload([fileAt('My Docs/Sub Dir/Read Me.TXT')])
    expect(plan.items[0]?.dirSegments).toEqual(['My Docs', 'Sub Dir'])
  })

  it('skips traversal and empty segments', () => {
    const plan = planFolderUpload([
      fileAt('docs/../x.txt'),
      fileAt('docs//x.txt'),
      fileAt('docs/ok.txt'),
    ])
    expect(plan.skipped).toBe(2)
    expect(plan.items).toHaveLength(1)
  })

  it('falls back to the bare name without a relative path', () => {
    const plan = planFolderUpload([new File(['x'], 'plain.txt')])
    expect(plan.items[0]?.dirSegments).toEqual([])
  })
})
