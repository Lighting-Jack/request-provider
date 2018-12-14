const { TransactionImpl } = require('../dist/index')

const SYMBOL_START = Symbol('start')
const SYMBOL_END = Symbol('end')

const testModelSync = new TransactionImpl({
  initial: [ctx => (ctx.ret = SYMBOL_START)],
  close: [ctx => (ctx.ret = SYMBOL_END)]
})
const testModelAsync = new TransactionImpl({
  initial: [async ctx => (ctx.ret = SYMBOL_START)],
  close: [async ctx => (ctx.ret = SYMBOL_END)]
})

const delayConsole = async a => {
  return await new Promise(resolve => {
    setTimeout(() => {
      console.log(a)
      resolve(a)
    }, 1000)
  })
}

describe('Transaction Test', () => {
  test('PerformSync', () => {
    const ret = testModelSync.performSync(console.log, null, 'done')
    expect(ret).toBe(SYMBOL_END)
  })
  test('PerformAsync', async () => {
    const ret = await testModelAsync.performAsync(delayConsole, null, 'done')
    expect(ret).toBe(SYMBOL_END)
  })
})
