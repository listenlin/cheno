import 'babel-polyfill';

import {expect} from 'chai';
import {describe, it} from 'mocha';

import Promise from '../Promise/promise';

describe('测试Promise.then方法', ()=>{

    it('监听fulfilled状态转移', done=>{

        (new Promise((resolve, reject)=>{
            setTimeout(()=>resolve('success'), 100);
        })).then((err)=>{
            expect(err).to.be.equal('success');
            done();
        });

    });

    it('监听rejected状态转移', done=>{

        (new Promise((resolve, reject)=>{
            setTimeout(()=>reject(new Error()), 100);
        })).then(undefined, err=>{
            expect(err).to.be.an('error');
            done();
        });

    });

    it('两个promise的resolve依赖传递关系', done=>{

        const p1 = new Promise((resolve, reject)=>{
            setTimeout(()=>resolve('p1'), 100);
        });
        const p2 = new Promise((resolve, reject)=>{
            resolve(p1);
        });
        p2.then(result=>{
            expect(result).to.be.equal('p1');
            done();
        });
        
    });

    it('Fulfilled返回值传递给下个then方法',done=>{
        const value = Math.random();
        const p = new Promise((resolve)=>{
            setTimeout(()=>resolve(value), 100);
        });
        p.then(result=>{
            return result;
        }).then(result=>{
            expect(result).to.be.equal(value);
            done();
        });

    });

    it('Fulfilled返回Promise传递给下个then方法',done=>{
        const p1 = new Promise((resolve)=>{
            setTimeout(()=>resolve('p1'), 100);
        });
        const p2 = new Promise((resolve)=>{
            setTimeout(()=>resolve('p2'), 200);
        });
        p1.then(result=>{
            return p2;
        }).then(result=>{
            expect(result).to.be.equal('p2');
            done();
        });

    });
});

