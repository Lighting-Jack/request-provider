export declare type ctx = {
    arguments: any[];
    method: (a: any, b: any, c: any, d: any, e: any, f: any) => any;
    ret: any;
    scope: any;
};
export declare type wrapper = (ctx: ctx) => any;
export declare type wrappers = {
    initial: wrapper[];
    close: wrapper[];
};
export declare const TransactionImpl: (transactionWrappers: any) => void;
export declare type Transaction = typeof TransactionImpl;
