/** 空目录：蓝晒垫圈 / 六角螺母。只用等宽字体一定有的字符。 */
export const ASCII_NUT = [
  '            .  .  .',
  '         .           .',
  '      .     =======     .',
  '    .     //       \\\\     .',
  '   .     ||    o    ||     .',
  '    .     \\\\       //     .',
  '      .     =======     .',
  '         .           .',
  '            .  .  .',
].join('\n')

/** 搜索无结果：无信号波形。 */
export const ASCII_WAVE = [
  '  .                                         .',
  '     \\         /\\            /\\         /',
  '      \\       /  \\    /\\    /  \\       /',
  '       \\  /\\ /    \\  /  \\  /    \\ /\\  /',
  '        \\/  v      \\/    \\/      v  \\/',
  '  . - - - - - - - - - - - - - - - - - - .',
].join('\n')

export type VoidKind = 'empty' | 'search'

export function asciiOf(kind: VoidKind): string {
  return kind === 'search' ? ASCII_WAVE : ASCII_NUT
}
