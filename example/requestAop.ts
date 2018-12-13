/**
 * request-aop
 */
import { TransactionImpl, wrappers } from '../src/index'
import * as request from 'request-promise'

const wrappers = {
  initial: [
    async ctx => {
      const options = ctx.arguments[0]
      options.url = 'http://www.baidu.com'
      console.log('rp-start', ctx.arguments[0])
    }
  ],
  close: [async ctx => console.log('rp-end', ctx.ret)]
} as wrappers

const requestAop = new TransactionImpl(wrappers)
async function main() {
  await requestAop.performAsync(request, null, {
    url: '',
    method: 'get'
  })
}
main()
