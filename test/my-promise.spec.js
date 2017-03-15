/* globals setTimeout:false, clearTimeout:false */
export default function test(Promise, describe, it, expect) {
    describe('测试Promise.then方法', () => {

        it('监听fulfilled状态转移', done => {

            (new Promise((resolve) => {
                setTimeout(() => resolve('success'), 100);
            })).then((err) => {
                expect(err).to.be.equal('success');
                done();
            });

        });

        it('监听rejected状态转移', done => {

            (new Promise((resolve, reject) => {
                setTimeout(() => reject(new Error()), 100);
            })).then(undefined, err => {
                expect(err).to.be.an('error');
                done();
            });

        });

        it('使用resolve传递回一个promise', done => {

            const p1 = new Promise((resolve) => {
                setTimeout(() => resolve('p1'), 100);
            });
            const p2 = new Promise((resolve) => {
                resolve(p1);
            });
            p2.then(result => {
                expect(result).to.be.equal('p1');
                done();
            });

        });

        it('fulfilled状态回调函数返回值，传递给下个同类状态回调函数', done => {
            const value = Math.random();
            const p = new Promise((resolve) => {
                setTimeout(() => resolve(value), 100);
            });
            p.then(result => result).then(result => {
                expect(result).to.be.equal(value);
                done();
            });
        });

        it('fulfilled状态回调函数返回promise对象，传递给下个同类状态回调函数', done => {
            const p1 = new Promise(resolve => {
                setTimeout(() => resolve('p1'), 100);
            });
            p1.then(() => {
                return new Promise(resolve => {
                    setTimeout(() => resolve('p2'), 200);
                });
            }).then(result => {
                expect(result).to.be.equal('p2');
                done();
            });
        });

        it('fulfilled状态回调函数抛异常，传递给下个promise的rejected回调函数', done => {
            const p1 = new Promise(resolve => {
                setTimeout(() => resolve('p1'), 100);
            });
            p1.then(r => {
                throw new Error(r);
            }).then(null, err => {
                expect(err.message).to.be.equal('p1');
                done();
            });
        });

        it('thenable的then方法调用时抛出异常', done => {
            Promise.resolve().then(() => {
                return {
                    then: function() {
                        throw new Error;
                    }
                };
            }).then(null, (e) => {
                expect(e).to.be.an('error');
                done();
            });
        });

        it('在thenable中尝试两次resolve', done => {
            Promise.resolve().then(() => {
                return {
                    then: function(resolvePromise) {
                        resolvePromise(Promise.resolve(123));
                        resolvePromise(456);
                    }
                };
            }).then((e) => {
                expect(e).to.be.equal(123);
                done();
            });
        });

        it('异步回调thenable的resolvePromise', done => {
            Promise.resolve().then(() => {
                return {
                    then: function(resolvePromise) {
                        setTimeout(() => resolvePromise(456), 0);
                    }
                };
            }).then((e) => {
                expect(e).to.be.equal(456);
                done();
            });
        });

        it('异步回调thenable的resolvePromise被调用两次，任何状态下只有第一次起作用。', done => {
            Promise.resolve().then(() => {
                return {
                    then(resolvePromise) {
                        resolvePromise({
                            then: function(onFulfilled) {
                                setTimeout(function() {
                                    onFulfilled(123);
                                }, 0);
                            }
                        });
                        resolvePromise(Promise.resolve(456));
                    }
                };
            }).then((e) => {
                expect(e).to.be.equal(123);
                done();
            });
        });

        it('异步回调thenable的resolvePromise被调用两次,第一次调用抛出异常，第二次调用也应无效。', done => {
            Promise.resolve().then(() => {
                return {
                    then(resolvePromise) {
                        resolvePromise({
                            then: function(onFulfilled) {
                                setTimeout(function() {
                                    onFulfilled(123);
                                }, 0);
                            }
                        });
                        throw new Error;
                    }
                };
            }).then((e) => {
                expect(e).to.be.equal(123);
                done();
            });
        });


        it('fulfilled状态回调函数抛异常，传递给直到后续某个promise注册的rejected回调函数为止', done => {
            const p1 = new Promise(resolve => {
                setTimeout(() => resolve('p1'), 100);
            });
            p1.then(r => {
                    throw new Error(r);
                }).then(null, null)
                .catch(err => {
                    expect(err.message).to.be.equal('p1');
                    done();
                });
        });

        it('在一个已是fufilled状态的promise上使用then，注册的回调会立即拥有此状态执行', done => {
            const promise = Promise.resolve();
            let firstOnFulfilledFinished = false;
            promise.then(function() {
                promise.then(function() {
                    expect(firstOnFulfilledFinished).to.be.equal(true);
                    done();
                });
                firstOnFulfilledFinished = true;
            });
        });

        it('在一个已是rejected状态的promise上使用then，注册的回调会立即拥有此状态执行', done => {
            const promise = Promise.reject();
            let firstOnRejectedFinished = false;
            promise.then(null, function() {
                promise.then(null, function() {
                    expect(firstOnRejectedFinished).to.be.equal(true);
                    done();
                });
                firstOnRejectedFinished = true;
            });
        });

        const delayCountCall = (fn, count) => {
            let i = 1;
            return (...p) => {
                return count === i ? fn(...p) : i++;
            };
        };

        it('同一个fulfilled状态的promise建立多个分支各自独立传递自己的状态', d => {
            const done = delayCountCall(d, 3);
            const promise = Promise.resolve(521);

            promise.then((r) => {
                return r;
            }).then((r) => {
                expect(r).to.be.equal(521);
                done();
            });

            promise.then(() => {
                throw new Error(123);
            }).catch((r) => {
                expect(r).to.be.an('error');
                done();
            });

            promise.then((r) => {
                return r;
            }).then((r) => {
                expect(r).to.be.equal(521);
                done();
            });
        });

        it('同一个rejected状态的promise建立多个分支各自独立传递自己的状态', d => {
            const done = delayCountCall(d, 3);
            const promise = Promise.reject(new Error('failed'));

            promise.then(null, () => {
                return 503;
            }).then((r) => {
                expect(r).to.be.equal(503);
                done();
            });

            promise.then(null, () => {
                throw new Error();
            }).catch((r) => {
                expect(r).to.be.an('error');
                done();
            });

            promise.then(null, (r) => {
                return r;
            }).then((r) => {
                expect(r.message).to.be.equal('failed');
                done();
            });
        });
    });

    describe('异常处理', () => {

        it('实例化Promise时抛出异常，自动转移状态至rejected', done => {
            const p = new Promise(() => {
                throw new Error();
            });
            p.catch(err => {
                expect(err).to.a('error');
                done();
            });
        });

        it('转移至rejected状态时，后续promise只调用一次reject回调', done => {
            const p = new Promise(() => {
                throw new Error();
            });
            let timer;
            p.catch(err => {
                timer = setTimeout(() => {
                    expect(err).to.a('error');
                    done();
                }, 100);
            }).catch(() => {
                clearTimeout(timer);
                expect(1, '只是触发失败，错误信息无用。').to.equal(0);
                done();
            });
        });

        it('转移至rejected状态时，后续promise会调用reject回调，而后续resolve也会调用', done => {
            const p = new Promise(() => {
                throw new Error();
            });
            let e;
            p.catch(err => e = err).then(result => {
                expect(e).to.a('error');
                expect(result).to.a('error');
                done();
            });
        });

        it('抛出null', done => {
            Promise.resolve({}).then(() => {
                throw null;
            }).then(null, (e) => {
                expect(e).to.be.null;
                done();
            });
        });

        it('resolve传入参数和onFulfilled返回值是一个thenable', done => {
            Promise.resolve().then(() => {
                return {
                    then: (resolve) => {
                        resolve({
                            then: (r) => r(1234)
                        });
                    }
                };
            }).then((e) => {
                expect(e).to.equal(1234);
                done();
            });
        });

        it('onFulfilled返回一个thenable, resolve传入fulfilled的promise', done => {
            Promise.resolve().then(() => {
                return {
                    then(resolve) {
                        resolve(Promise.resolve('sdf'));
                    }
                };
            }).then((e) => {
                expect(e).to.equal('sdf');
                done();
            });
        });

        it('promise已是fulfill状态，reject无效', done => {
            const p = new Promise((resolve) => {
                resolve(123);
                throw new Error();
            });
            p.then(r => {
                expect(r).to.equal(123);
                done();
            }, (err) => {
                expect(err).to.a('object'); // 只为触发错误。
                done();
            });
        });

        it('promise已是reject状态，resolve无效', done => {
            const p = new Promise((resolve, reject) => {
                reject(new Error);
                resolve(123);
            });
            p.then(r => {
                expect(r).to.equal(456); // 只为触发错误
                done();
            }, (err) => {
                expect(err).to.a('error');
                done();
            });
        });

    });

    describe('测试Promise.all', () => {
        it('都是fulfilled状态', done => {
            const p = [];
            for (let i of new Array(5)) {
                p.push(Promise.resolve(4));
            }
            Promise.all(p).then(r => {
                expect(r).to.be.an('array');
                done();
            });
        });

        it('有一个rejected状态', done => {
            const p = [];
            for (let i of new Array(5)) {
                p.push(Promise.resolve(4));
            }
            p[2] = Promise.reject(new Error);
            Promise.all(p).catch(r => {
                expect(r).to.be.an('error');
                done();
            });
        });
    });

    describe('测试Promise.race', () => {
        it('全部触发fulfiled', done => {
            const p = [];
            for (let i = 0; i < 6; i++) {
                const j = i;
                p.push(new Promise(r => setTimeout(() => r(j), Math.random() * 1000)));
            }
            Promise.race(p).then(r => {
                expect(r).to.be.an('number');
                done();
            });
        });

        it('随机触发一个rejected', done => {
            const p = [];
            for (let i = 0; i < 6; i++) {
                const j = i;
                p.push(new Promise(r => setTimeout(() => r(j), Math.random() * 1000)));
            }
            p[parseInt(Math.random() * 6)] = Promise.reject(new Error);
            Promise.race(p).catch(r => {
                expect(r).to.be.an('error');
                done();
            });
        });

    });

}