export const typesMap = [
  'Number',
  'String',
  'Function',
  'Null',
  'Undefined',
  'Array',
  'Object',
  'Symbol',
  'AsyncFunction',
  'Promise'
]
/**
 * 偏函数实现格式校验
 * @param {*} type
 */
export const isType: (type: string) => (obj) => boolean = type => {
  const typeMap = typesMap
  if (typeMap.indexOf(type) === -1) throw `type must in ${typeMap}`
  return obj => toString.call(obj) == `[object ${type}]`
}
