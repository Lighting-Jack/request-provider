"use strict";
exports.__esModule = true;
exports.typesMap = [
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
];
/**
 * 偏函数实现格式校验
 * @param {*} type
 */
exports.isType = function (type) {
    var typeMap = exports.typesMap;
    if (typeMap.indexOf(type) === -1)
        throw "type must in " + typeMap;
    return function (obj) { return toString.call(obj) == "[object " + type + "]"; };
};
