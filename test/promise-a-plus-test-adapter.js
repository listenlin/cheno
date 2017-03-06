import aplus from "promises-aplus-tests";
import {describe} from 'mocha';

import Promise from '../Promise/promise';

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