import aplus from 'promises-aplus-tests';
import {describe} from 'mocha';

import Promise from '../../src/promise';// 欲测试es6的promise，注释此句即可。

const adapter = {
    deferred() {
        const pending = {};
        pending.promise = new Promise((resolver, reject)=>{
            pending.resolve = resolver;
            pending.reject = reject;
        });
        return pending;
    },
    resolved : (...u)=>Promise.resolve(...u),
    rejected : (...u)=>Promise.reject(...u)
};

describe('Promises/A+ Tests', ()=>{
    aplus.mocha(adapter);
});