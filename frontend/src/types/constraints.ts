export const NAME_MIN = 3
export const NAME_MAX = 20
export const NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 64
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,64}$/

export const NAME_RULE_TEXT = '3–20 位，字母开头，只能含字母、数字、下划线'
export const PASSWORD_RULE_TEXT = '8–64 位，须同时包含字母和数字，且只能字母和数字'
