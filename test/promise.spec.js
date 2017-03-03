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

    it('使用resolve传递回一个promise', done=>{

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

    it('fulfilled状态回调函数返回值传递给下个同类状态回调函数', done=>{
        const value = Math.random();
        const p = new Promise((resolve)=>{
            setTimeout(()=>resolve(value), 100);
        });
        p.then(result=>result).then(result=>{
            expect(result).to.be.equal(value);
            done();
        });
    });

    it('fulfilled状态回调函数返回promise对象传递给下个同类状态回调函数', done=>{
        const p1 = new Promise(resolve=>{
            setTimeout(()=>resolve('p1'), 100);
        });
        p1.then(()=>{
            return new Promise(resolve=>{
                setTimeout(()=>resolve('p2'), 200);
            });
        }).then(result=>{
            expect(result).to.be.equal('p2');
            done();
        });

    });
});

describe('异常处理', ()=>{

    it('实例化Promise时抛出异常，自动转移状态至rejected', done=>{

        const p = new Promise(()=>{
            throw new Error(123);
        });
        p.catch(err=>{
            expect(err).to.a('error');
            done();
        });

    });
});