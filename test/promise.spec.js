import 'babel-polyfill';

import {expect} from 'chai';
import {describe, it} from 'mocha';

import Promise from '../Promise/promise';

describe('test Promise', ()=>{
    it('测试Rejected状态', done=>{

        (new Promise((resolve, reject)=>{
            setTimeout(()=>reject(new Error()),2000);
        })).then(()=>{},(err)=>{
            expect(err).to.be.an('error');
            done();
        });

    });
});

