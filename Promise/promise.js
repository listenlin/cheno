/**
 * 按照ES6的Promise或符合Promise/A+规范的对象，实现一致的功能。
 * @copyright Copyright(c) 2017 listenlin.
 * @author listenlin <listenlin521@foxmail.com>
 */
import 'babel-polyfill';

const PromiseValue = Symbol('PromiseValue');
const PromiseStatus = Symbol('PromiseStatus');

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
    if (typeof result !== 'undefined' && result) {
        const then = result.then; // 注意：如果then是个属性，只允许调用一次。
        if (typeof then === 'function') {
            return then.bind(result);
        }
    }
    return false;
}

/**
 * 处理用户回调的返回值。根据官方标准，不同返回值需要不同处理。
 * 
 * @param {Promise} nextPromise - 下个要更改状态的promise
 * @param {Boolean} isFulfill - 是否更改为fulfill
 * @param {any} result - 结果值或原因值
 * @returns {Array}
 */
const filterResult = (nextPromise, isFulfill, result)=>{
    if (!isFulfill) return [isFulfill, result];
    let then;
    if (nextPromise === result) {
        return [false, new TypeError()];
    } else if (then = isThenable(result)) {
        return [isFulfill, new Promise(then)];
    }
    return [isFulfill, result];
}

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
    const executedCallbacks = callbacks.filter((callback, index)=>{
        let callbackResult = result;
        let isFulfill = status;
        const isFunction = typeof callback === 'function';
        if (isFunction) {
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
            try{
                [isFulfill, callbackResult] = filterResult(
                    nextPromise,
                    isFulfill,
                    callbackResult
                );
            } catch (e) {
                isFulfill = false;
                callbackResult = e;
            }
            (isFulfill ? resolve : reject).call(nextPromise, callbackResult);
        }
        return isFunction;
    });

    if (!status && executedCallbacks.length === 0) {
        // 没有注册rejected状态回调函数，直接抛出异常错误。
        // throw result;
    }
}

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
const delayToNextTick = function(promise) {
    delayFunc(
        executeCallback,
        promise,
        promise[PromiseValue], 
        promise[PromiseStatus] === 'fulfilled'
    );
}

/**
 * 将状态转移至fulfilled。
 * 因为需要动态更改其this，所以function申明，而不是箭头函数。
 * 
 * @param {any} result - 传回的promise结果值
 * @returns 
 */
const resolve = function(result) {
    if (this[PromiseStatus] !== 'pending') return;
    try{
        const then = isThenable(result);
        if (then) {
            // 使当前Promise对象状态，依赖上层promise。
            then(resolve.bind(this), reject.bind(this));
            return;
        }
    } catch(e) {
        reject.call(this, e);
    }
    // 调用resolve之后，状态要立马确定，防止接着调用reject更改其状态。
    this[PromiseStatus] = 'fulfilled';
    this[PromiseValue] = result;
    
    delayToNextTick(this);
}

/**
 * 将状态转移至rejected。
 * 因为需要动态更改其this，所以function申明，而不是箭头函数。
 * 
 * @param {Error} error - 错误原因对象
 * @returns 
 */
const reject = function(error) {
    if (this[PromiseStatus] !== 'pending') return;

    this[PromiseStatus] = 'rejected';
    this[PromiseValue] = error;

    delayToNextTick(this);
}

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
        this[PromiseStatus] = 'pending';//fulfilled, rejected
        this[PromiseValue] = undefined;

        onFulfillMap.set(this, []);
        onRejectMap.set(this, []);
        nextPromiseMap.set(this, []);
        
        if (typeof fn === 'function') {
            try{
                fn(resolve.bind(this), reject.bind(this));
            } catch(e) {
                reject.call(this, e);
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
        if (this[PromiseStatus] !== 'pending') delayToNextTick(this);

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

}

Promise.resolve = (result)=>{
    if (result instanceof Promise) {
        return result;
    }
    if (result && typeof result.then === 'function') {
        return new Promise(result.then);
    }
    // @TODO 这里还需要nextTick处理。立即resolve的是在本轮事件循环末尾执行~~
    return new Promise(resolve => resolve(result));
};

Promise.reject = (error)=>{
    return new Promise((resolve, reject) => reject(error));
};

Promise.all = function() {

}

Object.freeze(Promise);

export default Promise;