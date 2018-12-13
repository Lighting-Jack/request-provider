import { isType } from './utils'

/**
 * 援引自react，做了一些小改动
 * - 将perform拆成同步/异步两种
 *  - 同步形式要求wrapper和method都必须是同步的
 *  - 异步形式要求wrapper和method都必须是promise
 * - 改变wrapper的结构，将initial的任务和close的任务拆分为两部分
 */
// const OBSERVED_ERROR = {}
export type ctx = {
  arguments: any[]
  method: (a, b, c, d, e, f) => any
  ret: any
  scope: any
}
export type wrapper = (ctx: ctx) => any
export type wrappers = {
  initial: wrapper[]
  close: wrapper[]
}
/**
 * aop思想的一种实现，操作流如下
 *                    wrapper1      wrapper2       Core         wrapper1           wrapper2
 *                       |             |             |             |                  |
 * wrapperFunc --->     init1  --->  init2   --->  Func   --->   close1    --->     close2   --->   done!
 *                       |             |             |             |                  |
 *
 * `Transaction` creates a black box that is able to wrap any method such that
 * certain invariants are maintained before and after the method is invoked
 * (Even if an exception is thrown while invoking the wrapped method). Whoever
 * instantiates a transaction can provide enforcers of the invariants at
 * creation time. The `Transaction` class itself will supply one additional
 * automatic invariant for you - the invariant that any transaction instance
 * should not be run while it is already being run. You would typically create a
 * single instance of a `Transaction` for reuse multiple times, that potentially
 * is used to wrap several different methods. Wrappers are extremely simple -
 * they only require implementing two methods.
 *
 * <pre>
 *                       wrappers (injected at creation time)
 *                                      +        +
 *                                      |        |
 *                    +-----------------|--------|--------------+
 *                    |                 v        |              |
 *                    |      +---------------+   |              |
 *                    |   +--|    wrapper1   |---|----+         |
 *                    |   |  +---------------+   v    |         |
 *                    |   |          +-------------+  |         |
 *                    |   |     +----|   wrapper2  |--------+   |
 *                    |   |     |    +-------------+  |     |   |
 *                    |   |     |                     |     |   |
 *                    |   v     v                     v     v   | wrapper
 *                    | +---+ +---+   +---------+   +---+ +---+ | invariants
 * perform(anyMethod) | |   | |   |   |         |   |   | |   | | maintained
 * +----------------->|-|---|-|---|-->|anyMethod|---|---|-|---|-|-------->
 *                    | |   | |   |   |         |   |   | |   | |
 *                    | |   | |   |   |         |   |   | |   | |
 *                    | |   | |   |   |         |   |   | |   | |
 *                    | +---+ +---+   +---------+   +---+ +---+ |
 *                    |  initialize                    close    |
 *                    +-----------------------------------------+
 * </pre>
 *
 * Use cases:
 * - Preserving the input selection ranges before/after reconciliation.
 *   Restoring selection even in the event of an unexpected error.
 * - Deactivating events while rearranging the DOM, preventing blurs/focuses,
 *   while guaranteeing that afterwards, the event system is reactivated.
 * - Flushing a queue of collected DOM mutations to the main UI thread after a
 *   reconciliation takes place in a worker thread.
 * - Invoking any collected `componentDidUpdate` callbacks after rendering new
 *   content.
 * - (Future use case): Wrapping particular flushes of the `ReactWorker` queue
 *   to preserve the `scrollTop` (an automatic scroll aware DOM).
 * - (Future use case): Layout calculations before and after DOM updates.
 *
 * Transactional plugin API:
 * - A module that has an `initialize` method that returns any precomputation.
 * - and a `close` method that accepts the precomputation. `close` is invoked
 *   when the wrapped process is completed, or has failed.
 *
 * @param {Array<TransactionalWrapper>} transactionWrapper Wrapper modules
 * that implement `initialize` and `close`.
 * @return {Transaction} Single transaction for reuse in thread.
 *
 * @class Transaction
 */
export const TransactionImpl = function(transactionWrappers) {
  this.transactionWrappers = transactionWrappers
}

TransactionImpl.prototype = {
  /**
   * Sets up this instance so that it is prepared for collecting metrics. Does
   * so such that this setup method may be used on an instance that is already
   * initialized, in a way that does not consume additional memory upon reuse.
   * That can be useful if you decide to make your subclass of this mixin a
   * "PooledClass".
   *
   * transaction 相当于是aop思想的一个实现
   * pooledClass 相当于是一个类的缓冲池，避免重复实例化，消耗内存
   */
  reinitializeTransaction: function(): void {
    this.transactionWrappers = this.getTransactionWrappers() as wrappers
    if (this.wrapperInitData) {
      this.wrapperInitData.length = 0
    } else {
      this.wrapperInitData = []
    }
    this._isInTransaction = false
  },

  _isInTransaction: false,

  /**
   * @abstract
   * @return {Array<TransactionWrapper>} Array of transaction wrappers.
   */
  getTransactionWrappers: null,

  isInTransaction: function(): boolean {
    return !!this._isInTransaction
  },

  /**
   * Executes the function within a safety window. Use this for the top level
   * methods that result in large amounts of computation/mutations that would
   * need to be safety checked. The optional arguments helps prevent the need
   * to bind in many cases.
   *
   * @param {function} method Member of scope to call.
   * @param {Object} scope Scope to invoke from.
   * @param {Object?=} a Argument to pass to the method.
   * @param {Object?=} b Argument to pass to the method.
   * @param {Object?=} c Argument to pass to the method.
   * @param {Object?=} d Argument to pass to the method.
   * @param {Object?=} e Argument to pass to the method.
   * @param {Object?=} f Argument to pass to the method.
   *
   * @return {*} Return value from `method`.
   */
  performSync: function<A, B, C, D, E, F, G>(
    method: (a: A, b: B, c: C, d: D, e: E, f: F) => G,
    scope: any,
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    f: F
  ): G {
    let errorThrown
    let ret
    let ctx = {
      method,
      scope,
      arguments: [a, b, c, d, e, f],
      ret: null
    } as ctx
    try {
      this._isInTransaction = true
      // Catching errors makes debugging more difficult, so we start with
      // errorThrown set to true before setting it to false after calling
      // close -- if it's still set to true in the finally block, it means
      // one of these calls threw.
      errorThrown = true
      this.initializeAll(0, ctx)
      ret = method.call(ctx.scope, ...ctx.arguments)
      ctx.ret = ret
      errorThrown = false
    } finally {
      try {
        if (errorThrown) {
          // If `method` throws, prefer to show that stack trace over any thrown
          // by invoking `closeAll`.
          try {
            this.closeAll(0, ctx)
          } catch (err) {}
        } else {
          // Since `method` didn't throw, we don't want to silence the exception
          // here.
          this.closeAll(0, ctx)
        }
      } finally {
        this._isInTransaction = false
      }
    }
    return ctx.ret
  },
  performAsync: async function<A, B, C, D, E, F, G>(
    method: (a: A, b: B, c: C, d: D, e: E, f: F) => G,
    scope: any,
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    f: F
  ): Promise<G> {
    let errorThrown
    let ret
    let ctx = {
      method,
      scope,
      arguments: [a, b, c, d, e, f],
      ret: null
    } as ctx
    try {
      this._isInTransaction = true
      // Catching errors makes debugging more difficult, so we start with
      // errorThrown set to true before setting it to false after calling
      // close -- if it's still set to true in the finally block, it means
      // one of these calls threw.
      errorThrown = true
      await this.initializeAll(0, ctx)
      ret = await method.call(ctx.scope, ...ctx.arguments)
      ctx.ret = ret
      errorThrown = false
    } finally {
      try {
        if (errorThrown) {
          // If `method` throws, prefer to show that stack trace over any thrown
          // by invoking `closeAll`.
          try {
            await this.closeAll(0, ctx)
          } catch (err) {}
        } else {
          // Since `method` didn't throw, we don't want to silence the exception
          // here.
          await this.closeAll(0, ctx)
        }
      } finally {
        this._isInTransaction = false
      }
    }
    return ctx.ret
  },

  initializeAll: async function(startIndex: number, ctx): Promise<void> {
    const transactionWrappers = this.transactionWrappers as wrappers
    const isAsyncFunction = isType('AsyncFunction')
    const isPromise = isType('Promise')
    const isFunction = isType('Function')
    for (let i = startIndex; i < transactionWrappers.initial.length; i++) {
      try {
        const wrapper: wrapper = transactionWrappers.initial[i]
        if (isAsyncFunction(wrapper) || isPromise(wrapper)) {
          await wrapper(ctx)
        } else if (isFunction(wrapper)) {
          wrapper(ctx)
        } else {
          throw 'wrapper必须为普通函数，异步函数，promise中的一种'
        }
      } catch (e) {
        // 一旦抛出异常，循环会终止，类似于break；循环终止后，会从下一个wrapper开始进行初始化，依次进行
        // The initializer for wrapper i threw an error; initialize the
        // remaining wrappers but silence any exceptions from them to ensure
        // that the first error is the one to bubble up.
        try {
          this.initializeAll(i + 1, ctx)
        } catch (err) {}
      }
    }
  },

  /**
   * Invokes each of `this.transactionWrappers.close[i]` functions, passing into
   * them the respective return values of `this.transactionWrappers.init[i]`
   * (`close`rs that correspond to initializers that failed will not be
   * invoked).
   */
  closeAll: async function(startIndex: number, ctx): Promise<void> {
    const transactionWrappers = this.transactionWrappers as wrappers

    const isAsyncFunction = isType('AsyncFunction')
    const isPromise = isType('Promise')
    const isFunction = isType('Function')
    for (let i = startIndex; i < transactionWrappers.close.length; i++) {
      const wrapper: wrapper = transactionWrappers.close[i]
      if (isAsyncFunction(wrapper) || isPromise(wrapper)) {
        await wrapper(ctx)
      } else if (isFunction(wrapper)) {
        wrapper(ctx)
      } else {
        throw 'wrapper必须为普通函数，异步函数，promise中的一种'
      }
      try {
      } catch (e) {
        // 一旦抛出异常，循环会终止，类似于break；循环终止后，会从下一个wrapper开始进行初始化，依次进行
        // The initializer for wrapper i threw an error; initialize the
        // remaining wrappers but silence any exceptions from them to ensure
        // that the first error is the one to bubble up.
        try {
          this.closeAll(i + 1, ctx)
        } catch (err) {}
      }
    }
  }
}

export type Transaction = typeof TransactionImpl
