/* globals process:false, setTimeout:false, setImmediate:false, window:false, document:false */
/**
 * 按照ES6的Promise或符合Promise/A+规范的对象，实现一致的功能。
 * @copyright Copyright(c) 2017 listenlin.
 * @author listenlin <listenlin521@foxmail.com>
 */

const PromiseValue = Symbol('PromiseValue');
const PromiseState = Symbol('PromiseState');

const onFulfillMap = new Map(); // 储存某个promise的fulfilled状态监听函数。
const onRejectMap = new Map(); // 储存某个promise的rejected状态监听函数。

// 以当前promise对象为key, 下一个链式promise对象(then调用时返回)为value。
const nextPromiseMap = new Map();

/**
 * 判断一个值是否是thenable对象。
 * 
 * @param {any} result - 需判断的值
 * @returns {Function|Boolean} 如果是一个thenable，返回then函数，否则返回false。
 */
const isThenable = (result)=>{
    if (typeof result === 'object' || typeof result === 'function') {
        const then = result.then; // 注意：如果then是个属性，只允许调用一次。
        if (typeof then === 'function') {
            return then.bind(result);
        }
    }
    return false;
};

/**
 * 执行promise状态的监听器
 * 
 * @param {Promise} promise - 需要执行回调的promise对象。
 * @param {any} result - 结果值或异常原因值
 * @param {Boolean} status - 执行reject为true, resolve为false.
 * @returns
 */
const executeCallback = (promise, result, status)=>{
    const onCallbackMap = status ? onFulfillMap : onRejectMap;
    const callbacks = onCallbackMap.get(promise);
    const nextPromises = nextPromiseMap.get(promise);
    // 提前将已执行过的回调函数都丢弃掉，重置为空队列。以免回调中注册的被丢弃掉。
    onCallbackMap.set(promise, []);
    nextPromiseMap.set(promise, []);

    callbacks.forEach((callback, index)=>{
        let callbackResult = result;
        let isFulfill = status;
        if (typeof callback === 'function') {
            try{
                callbackResult = callback.call(undefined, result); 
                isFulfill = true; // 只要没有异常，后续都去执行resolve.
            } catch (e) {
                callbackResult = e;
                isFulfill = false;
            }
        }
        const nextPromise = nextPromises[index];
        // 更改下个promise的状态。
        if (nextPromise instanceof Promise) {
            (isFulfill ? resolve : reject).call(nextPromise, callbackResult);
        }
    });
};

/**
 * 获取一个可兼容浏览器和node环境的延迟至栈尾执行的函数。
 * 如果不支持，将在下个事件循环执行。
 * 
 * @param {Function} fn - 需要延迟的函数
 * @param {...any} [args] - 需要依次传入延迟函数的参数 
 */
const delayFunc = (()=>{
    if (typeof process !== 'undefined' && process.nextTick) {
        return process.nextTick;
    }
    if (typeof window !== 'undefined') {
        // Firefox和Chrome早期版本中带有前缀
        const MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
        // 使用MutationObserver来实现nextTick。
        if(typeof MutationObserver !== 'undefined') {
            let counter = 1, callbacks = [];
            const observer = new MutationObserver(()=>{
                const copys = callbacks.splice(0);
                copys.forEach(([fn, ...params])=>{
                    if (typeof fn === 'function') {
                        fn.apply(undefined, params);
                    }
                });
            });
            const textNode = document.createTextNode(counter);
            observer.observe(textNode, {characterData: true});
            return (...p)=>{
                callbacks.push(p);
                counter = (counter + 1) % 2;
                textNode.data = counter;
            };
        }
    }
    //上面两种都会在当前执行栈末尾回调。下面两个会在下个事件循环才执行，属于Plan B。
    if (typeof setImmediate === 'function') {
        return setImmediate;
    }
    return (fn, ...p)=>setTimeout(fn, 0, ...p);
})();

/**
 * 根据传来的promise对象当前状态，异步执行其状态的回调函数。
 * 
 * @param {Promise} promise - 需要去更改状态的primise对象
 */
const delayToNextTick = promise=>{
    delayFunc(
        executeCallback,
        promise,
        promise[PromiseValue], 
        promise[PromiseState] === 'fulfilled'
    );
};

/**
 * 高阶函数，让传入的resolve和reject函数同时只能被执行一次。
 * 
 * @param {Function} resolve - 需要只执行一次的函数
 * @param {Function} reject - 需要只执行一次的函数
 * @param {any} [context=undefined] - 执行函数时，其this变量指向谁。
 * @returns {Array} 返回数组，索引0和1是封装的函数，索引2是一个执行状态对象，可获取是否被执行的信息。
 */
const executeOnce = (resolve, reject, context = undefined)=>{
    let status = {executed : false};
    return [
        (...p)=>{
            if (!status.executed) {
                status.executed = true;
                return resolve.call(context, ...p);
            }
        },
        (...p)=>{
            if (!status.executed) {
                status.executed = true;
                return reject.call(context, ...p);
            }
        },
        status
    ];
};

/**
 * 解析promise流程
 * [[Resolve]](promise, x)
 * https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure 官方提供流程算法
 * 
 * @param {Promise} promise - 需要解析的promise对象
 * @param {any} x - 用户传来的值，通过resolve或resolvePromise参数、onFulfilled返回值传入。
 */
const resolutionProcedure = (promise, x)=>{
    if (promise instanceof Promise && promise === x) {
        return reject.call(promise, new TypeError());
    }
    if (x instanceof Promise) {
        if (x[PromiseState] === 'pending') {
            x.then(...executeOnce(resolve, reject, promise));
        } else {
            promise[PromiseValue] = x[PromiseValue];
            promise[PromiseState] = x[PromiseState];
            delayToNextTick(promise);
        }
        return;
    }
    if (x && (typeof x === 'object' || typeof x === 'function')) {
        let then;
        try{
            then = x.then;
        } catch(e) {
            return reject.call(promise, e);
        }
        if (typeof then === 'function') {
            const [resolvePromise, rejectPromise, status] = executeOnce(resolve, reject, promise);
            try {
                then.call(x, resolvePromise, rejectPromise);
            } catch(e) {
                // 保证抛异常之前执行了某个方法，异常就会无效。
                if (!status.executed) {
                    reject.call(promise, e);
                }
            }
            return;
        }
    }
    promise[PromiseState] = 'fulfilled';
    promise[PromiseValue] = x;
    delayToNextTick(promise);
};

/**
 * 将状态转移至fulfilled。
 * 因为需要动态更改其this，所以function申明，而不是箭头函数。
 * 
 * @param {any} result - 传回的promise结果值
 * @returns 
 */
const resolve = function(result) {
    if (this[PromiseState] !== 'pending') return;
    resolutionProcedure(this, result);
};

/**
 * 将状态转移至rejected。
 * 因为需要动态更改其this，所以function申明，而不是箭头函数。
 * 
 * @param {Error} error - 错误原因对象
 * @returns 
 */
const reject = function(error) {
    if (this[PromiseState] !== 'pending') return;

    this[PromiseState] = 'rejected';
    this[PromiseValue] = error;

    delayToNextTick(this);
};

/**
 * 按照ES6规范实现。
 * 
 * @class Promise
 */
class Promise
{
    /**
     * Creates an instance of Promise.
     * @param {Function} fn
     * 
     * @memberOf Promise
     */
    constructor(fn)
    {
        this[PromiseState] = 'pending';//fulfilled, rejected
        this[PromiseValue] = undefined;

        onFulfillMap.set(this, []);
        onRejectMap.set(this, []);
        nextPromiseMap.set(this, []);
        
        if (typeof fn === 'function') {
            const [resolvePromise, rejectPromise, status] = executeOnce(resolve, reject, this);
            try{
                fn(resolvePromise, rejectPromise);
            } catch(e) {
                // 保证抛异常之前执行了某个方法，异常就会无效。
                if (!status.executed) {
                    reject.call(this, e);
                }
            }
        }
    }

    /**
     * 注册回调方法
     * 
     * @param {Function} onFulfilled 
     * @param {Function} onRejected 
     * @returns {Promise}
     * 
     * @memberOf Promise
     */
    then(onFulfilled, onRejected)
    {
        onFulfillMap.get(this).push(onFulfilled);
        onRejectMap.get(this).push(onRejected);
        if (this[PromiseState] !== 'pending') delayToNextTick(this);

        const nextPromise = new Promise();
        nextPromiseMap.get(this).push(nextPromise);

        return nextPromise;
    }

    /**
     * 注册异常回调
     * 
     * @param {Function} onRejected 
     * @returns {Promise}
     * 
     * @memberOf Promise
     */
    catch(onRejected)
    {
        return this.then(null, onRejected);
    }

    get[Symbol.toStringTag]() {
        return 'Promise';
    }

}

Promise.resolve = (result)=>{
    if (result instanceof Promise) {
        return result;
    }
    let promise;
    try{
        const then = isThenable(result);
        if (then) {
            promise = new Promise(then);
        } else {
            promise = new Promise(resolve => resolve(result));
        }
    } catch(e) {
        if (promise) {
            reject.call(promise, e);
        } else {
            promise = Promise.reject(e);
        }
    }
    return promise;
};

Promise.reject = (error)=>{
    return new Promise((resolve, reject) => reject(error));
};

/**
 * 只有所有的prmise对象都fulfilled后，才换转换状态。
 * 又或者某个promise rejected后，使用期状态。
 * 
 * @param {any} promises 
 * @returns 
 */
Promise.all = function(promises) {
    const results = [];
    let length = 0, callCount = 0;
    const newPromise = new Promise();
    const onFulfill = (i)=>{
        return r=>{
            results[i] = r;
            callCount++;
            if (callCount === length) {
                resolve.call(newPromise, results);
            }
        };
    };
    const onReject = (e)=>{
        reject.call(newPromise, e);
    };
    for (let [i, promise] of promises.entries()) {
        promise = Promise.resolve(promise);
        promise.then(onFulfill(i), onReject);
        length++;
    }
    return newPromise;
};

/**
 * 竞速。即意味着哪个promise先转换了状态，则使用其状态和值。
 * 
 * @param {Array} promises - Promise对象构成的数组
 * @returns 
 */
Promise.race = function (promises) {
    const newPromise = new Promise();
    const onFulfill = (r) => {
        if (newPromise[PromiseState] !== 'pending') return;
        resolve.call(newPromise, r);
    };
    const onReject = (e)=>{
        if (newPromise[PromiseState] !== 'pending') return;
        reject.call(newPromise, e);
    };
    for (let promise of promises) {
        promise = Promise.resolve(promise);
        promise.then(onFulfill, onReject);
    }
    return newPromise;
};

Object.freeze(Promise);

export default Promise;