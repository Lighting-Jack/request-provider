"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var utils_1 = require("./utils");
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
exports.TransactionImpl = function (transactionWrappers) {
    this.transactionWrappers = transactionWrappers;
};
exports.TransactionImpl.prototype = {
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
    reinitializeTransaction: function () {
        this.transactionWrappers = this.getTransactionWrappers();
        if (this.wrapperInitData) {
            this.wrapperInitData.length = 0;
        }
        else {
            this.wrapperInitData = [];
        }
        this._isInTransaction = false;
    },
    _isInTransaction: false,
    /**
     * @abstract
     * @return {Array<TransactionWrapper>} Array of transaction wrappers.
     */
    getTransactionWrappers: null,
    isInTransaction: function () {
        return !!this._isInTransaction;
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
    performSync: function (method, scope, a, b, c, d, e, f) {
        var errorThrown;
        var ret;
        var ctx = {
            method: method,
            scope: scope,
            arguments: [a, b, c, d, e, f],
            ret: null
        };
        try {
            this._isInTransaction = true;
            // Catching errors makes debugging more difficult, so we start with
            // errorThrown set to true before setting it to false after calling
            // close -- if it's still set to true in the finally block, it means
            // one of these calls threw.
            errorThrown = true;
            this.initializeAll(0, ctx);
            ret = method.call.apply(method, [ctx.scope].concat(ctx.arguments));
            ctx.ret = ret;
            errorThrown = false;
        }
        finally {
            try {
                if (errorThrown) {
                    // If `method` throws, prefer to show that stack trace over any thrown
                    // by invoking `closeAll`.
                    try {
                        this.closeAll(0, ctx);
                    }
                    catch (err) { }
                }
                else {
                    // Since `method` didn't throw, we don't want to silence the exception
                    // here.
                    this.closeAll(0, ctx);
                }
            }
            finally {
                this._isInTransaction = false;
            }
        }
        return ctx.ret;
    },
    performAsync: function (method, scope, a, b, c, d, e, f) {
        return __awaiter(this, void 0, void 0, function () {
            var errorThrown, ret, ctx, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        ctx = {
                            method: method,
                            scope: scope,
                            arguments: [a, b, c, d, e, f],
                            ret: null
                        };
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 4, 14]);
                        this._isInTransaction = true;
                        // Catching errors makes debugging more difficult, so we start with
                        // errorThrown set to true before setting it to false after calling
                        // close -- if it's still set to true in the finally block, it means
                        // one of these calls threw.
                        errorThrown = true;
                        return [4 /*yield*/, this.initializeAll(0, ctx)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, method.call.apply(method, [ctx.scope].concat(ctx.arguments))];
                    case 3:
                        ret = _a.sent();
                        ctx.ret = ret;
                        errorThrown = false;
                        return [3 /*break*/, 14];
                    case 4:
                        _a.trys.push([4, , 12, 13]);
                        if (!errorThrown) return [3 /*break*/, 9];
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, this.closeAll(0, ctx)];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        err_1 = _a.sent();
                        return [3 /*break*/, 8];
                    case 8: return [3 /*break*/, 11];
                    case 9: 
                    // Since `method` didn't throw, we don't want to silence the exception
                    // here.
                    return [4 /*yield*/, this.closeAll(0, ctx)];
                    case 10:
                        // Since `method` didn't throw, we don't want to silence the exception
                        // here.
                        _a.sent();
                        _a.label = 11;
                    case 11: return [3 /*break*/, 13];
                    case 12:
                        this._isInTransaction = false;
                        return [7 /*endfinally*/];
                    case 13: return [7 /*endfinally*/];
                    case 14: return [2 /*return*/, ctx.ret];
                }
            });
        });
    },
    initializeAll: function (startIndex, ctx) {
        return __awaiter(this, void 0, void 0, function () {
            var transactionWrappers, isAsyncFunction, isPromise, isFunction, i, wrapper, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        transactionWrappers = this.transactionWrappers;
                        isAsyncFunction = utils_1.isType('AsyncFunction');
                        isPromise = utils_1.isType('Promise');
                        isFunction = utils_1.isType('Function');
                        i = startIndex;
                        _a.label = 1;
                    case 1:
                        if (!(i < transactionWrappers.initial.length)) return [3 /*break*/, 8];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 6, , 7]);
                        wrapper = transactionWrappers.initial[i];
                        if (!(isAsyncFunction(wrapper) || isPromise(wrapper))) return [3 /*break*/, 4];
                        return [4 /*yield*/, wrapper(ctx)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        if (isFunction(wrapper)) {
                            wrapper(ctx);
                        }
                        else {
                            throw 'wrapper必须为普通函数，异步函数，promise中的一种';
                        }
                        _a.label = 5;
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        e_1 = _a.sent();
                        // 一旦抛出异常，循环会终止，类似于break；循环终止后，会从下一个wrapper开始进行初始化，依次进行
                        // The initializer for wrapper i threw an error; initialize the
                        // remaining wrappers but silence any exceptions from them to ensure
                        // that the first error is the one to bubble up.
                        try {
                            this.initializeAll(i + 1, ctx);
                        }
                        catch (err) { }
                        return [3 /*break*/, 7];
                    case 7:
                        i++;
                        return [3 /*break*/, 1];
                    case 8: return [2 /*return*/];
                }
            });
        });
    },
    /**
     * Invokes each of `this.transactionWrappers.close[i]` functions, passing into
     * them the respective return values of `this.transactionWrappers.init[i]`
     * (`close`rs that correspond to initializers that failed will not be
     * invoked).
     */
    closeAll: function (startIndex, ctx) {
        return __awaiter(this, void 0, void 0, function () {
            var transactionWrappers, isAsyncFunction, isPromise, isFunction, i, wrapper;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        transactionWrappers = this.transactionWrappers;
                        isAsyncFunction = utils_1.isType('AsyncFunction');
                        isPromise = utils_1.isType('Promise');
                        isFunction = utils_1.isType('Function');
                        i = startIndex;
                        _a.label = 1;
                    case 1:
                        if (!(i < transactionWrappers.close.length)) return [3 /*break*/, 6];
                        wrapper = transactionWrappers.close[i];
                        if (!(isAsyncFunction(wrapper) || isPromise(wrapper))) return [3 /*break*/, 3];
                        return [4 /*yield*/, wrapper(ctx)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        if (isFunction(wrapper)) {
                            wrapper(ctx);
                        }
                        else {
                            throw 'wrapper必须为普通函数，异步函数，promise中的一种';
                        }
                        _a.label = 4;
                    case 4:
                        try {
                        }
                        catch (e) {
                            // 一旦抛出异常，循环会终止，类似于break；循环终止后，会从下一个wrapper开始进行初始化，依次进行
                            // The initializer for wrapper i threw an error; initialize the
                            // remaining wrappers but silence any exceptions from them to ensure
                            // that the first error is the one to bubble up.
                            try {
                                this.closeAll(i + 1, ctx);
                            }
                            catch (err) { }
                        }
                        _a.label = 5;
                    case 5:
                        i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/];
                }
            });
        });
    }
};
