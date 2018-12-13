"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
exports.isType = type => {
    const typeMap = exports.typesMap;
    if (typeMap.indexOf(type) === -1)
        throw `type must in ${typeMap}`;
    return obj => toString.call(obj) == `[object ${type}]`;
};
