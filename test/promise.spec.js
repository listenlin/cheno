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

    it('fulfilled状态回调函数返回值，传递给下个同类状态回调函数', done=>{
        const value = Math.random();
        const p = new Promise((resolve)=>{
            setTimeout(()=>resolve(value), 100);
        });
        p.then(result=>result).then(result=>{
            expect(result).to.be.equal(value);
            done();
        });
    });

    it('fulfilled状态回调函数返回promise对象，传递给下个同类状态回调函数', done=>{
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

    it('fulfilled状态回调函数抛异常，传递给下个promise的rejected回调函数', done=>{
        const p1 = new Promise(resolve=>{
            setTimeout(()=>resolve('p1'), 100);
        });
        p1.then(r=>{
            throw new Error(r);
        }).then(null, err=>{
            expect(err.message).to.be.equal('p1');
            done();
        });
    });

    it('fulfilled状态回调函数抛异常，传递给直到后续某个promise注册的rejected回调函数为止', done=>{
        const p1 = new Promise(resolve=>{
            setTimeout(()=>resolve('p1'), 100);
        });
        p1.then(r=>{
            throw new Error(r);
        }).then(null, null)
        .catch(err=>{
            expect(err.message).to.be.equal('p1');
            done();
        });
    });
});

describe('异常处理', ()=>{

    it('实例化Promise时抛出异常，自动转移状态至rejected', done=>{
        const p = new Promise(()=>{
            throw new Error();
        });
        p.catch(err=>{
            expect(err).to.a('error');
            done();
        });
    });

    it('转移至rejected状态时，后续promise只调用一次reject回调', done=>{
        const p = new Promise(()=>{
            throw new Error();
        });
        let timer;
        p.catch(err=>{
            timer = setTimeout(()=>{
                expect(err).to.a('error');
                done();
            }, 100);
        }).catch((err)=>{
            clearTimeout(timer);
            expect(1, '只是触发失败，错误信息无用。').to.equal(0);
            done();
        });
    });

    it('转移至rejected状态时，后续promise会调用reject回调，而后续resolve也会调用', done=>{
        const p = new Promise(()=>{
            throw new Error();
        });
        let e;
        p.catch(err=>e=err).then(result=>{
            expect(e).to.a('error');
            expect(result).to.be.undefined;
            done();
        });
    });

    it('promise已是fulfill状态，reject无效', done=>{
        const p = new Promise((resolve, reject)=>{
            resolve(123);
            throw new Error();
        });
        p.then(r=>{
            expect(r).to.equal(123);
            done();
        },(err)=>{
            expect(err).to.a('object');// 只为触发错误。
            done();
        });
    });

    it('promise已是reject状态，resolve无效', done=>{
        const p = new Promise((resolve, reject)=>{
            reject(new Error);
            resolve(123);
        });
        p.then(r=>{
            expect(r).to.equal(456);// 只为触发错误
            done();
        },(err)=>{
            expect(err).to.a('error');
            done();
        });
    });

});