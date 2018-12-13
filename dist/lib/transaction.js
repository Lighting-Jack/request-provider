"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
exports.TransactionImpl = function (transactionWrappers) {
    this.transactionWrappers = transactionWrappers;
};
exports.TransactionImpl.prototype = {
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
    getTransactionWrappers: null,
    isInTransaction: function () {
        return !!this._isInTransaction;
    },
    performSync: function (method, scope, a, b, c, d, e, f) {
        let errorThrown;
        let ret;
        let ctx = {
            method,
            scope,
            arguments: [a, b, c, d, e, f],
            ret: null
        };
        try {
            this._isInTransaction = true;
            errorThrown = true;
            this.initializeAll(0, ctx);
            ret = method.call(ctx.scope, ...ctx.arguments);
            ctx.ret = ret;
            errorThrown = false;
        }
        finally {
            try {
                if (errorThrown) {
                    try {
                        this.closeAll(0, ctx);
                    }
                    catch (err) { }
                }
                else {
                    this.closeAll(0, ctx);
                }
            }
            finally {
                this._isInTransaction = false;
            }
        }
        return ctx.ret;
    },
    performAsync: async function (method, scope, a, b, c, d, e, f) {
        let errorThrown;
        let ret;
        let ctx = {
            method,
            scope,
            arguments: [a, b, c, d, e, f],
            ret: null
        };
        try {
            this._isInTransaction = true;
            errorThrown = true;
            await this.initializeAll(0, ctx);
            ret = await method.call(ctx.scope, ...ctx.arguments);
            ctx.ret = ret;
            errorThrown = false;
        }
        finally {
            try {
                if (errorThrown) {
                    try {
                        await this.closeAll(0, ctx);
                    }
                    catch (err) { }
                }
                else {
                    await this.closeAll(0, ctx);
                }
            }
            finally {
                this._isInTransaction = false;
            }
        }
        return ctx.ret;
    },
    initializeAll: async function (startIndex, ctx) {
        const transactionWrappers = this.transactionWrappers;
        const isAsyncFunction = utils_1.isType('AsyncFunction');
        const isPromise = utils_1.isType('Promise');
        const isFunction = utils_1.isType('Function');
        for (let i = startIndex; i < transactionWrappers.initial.length; i++) {
            try {
                const wrapper = transactionWrappers.initial[i];
                if (isAsyncFunction(wrapper) || isPromise(wrapper)) {
                    await wrapper(ctx);
                }
                else if (isFunction(wrapper)) {
                    wrapper(ctx);
                }
                else {
                    throw 'wrapper必须为普通函数，异步函数，promise中的一种';
                }
            }
            catch (e) {
                try {
                    this.initializeAll(i + 1, ctx);
                }
                catch (err) { }
            }
        }
    },
    closeAll: async function (startIndex, ctx) {
        const transactionWrappers = this.transactionWrappers;
        const isAsyncFunction = utils_1.isType('AsyncFunction');
        const isPromise = utils_1.isType('Promise');
        const isFunction = utils_1.isType('Function');
        for (let i = startIndex; i < transactionWrappers.close.length; i++) {
            const wrapper = transactionWrappers.close[i];
            if (isAsyncFunction(wrapper) || isPromise(wrapper)) {
                await wrapper(ctx);
            }
            else if (isFunction(wrapper)) {
                wrapper(ctx);
            }
            else {
                throw 'wrapper必须为普通函数，异步函数，promise中的一种';
            }
            try {
            }
            catch (e) {
                try {
                    this.closeAll(i + 1, ctx);
                }
                catch (err) { }
            }
        }
    }
};
