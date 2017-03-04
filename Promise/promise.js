/**
 * 按照ES6的Promise对象，实现一模一样的功能。
 * @copyright Copyright(c) 2017 listenlin.
 * @author listenlin <listenlin521@foxmail.com>
 */
import 'babel-polyfill';

const PromiseValue = Symbol('PromiseValue');
const PromiseStatus = Symbol('PromiseStatus');

const onFulfillMap = new Map(); // 储存某个promise的fulfilled状态监听函数。
const onRejectMap = new Map(); // 储存某个promise的rejected状态监听函数。

const onFulfillStatusMap = new Map(); // 某个promise函数的执行情况记录。
const onRejectStatusMap = new Map(); // 某个promise函数的执行情况记录。

// 以当前promise对象为key, 下一个链式promise对象(then调用时返回)为value。
const nextPromiseMap = new Map();

/**
 * resolve执行后，需在下个事件循环才真正执行的fulfill状态监听器函数
 * 因为需要动态更改其this，所以function申明，而不是箭头函数。
 * 
 * @param {any} result - 结果值或异常原因值
 * @param {Boolean} status - 执行reject为true,resolve为false.
 * @returns
 */
const executeCallback = function(result, status) {
    let callbackResult = result;
    const onCallbackMap = status ? onFulfillMap : onRejectMap;
    try{
        let executed = false;
        for (let callback of onCallbackMap.get(this)) {
            if (typeof callback === 'function') {
                callbackResult = callback.call(undefined, result); 
                executed = true;  
            }
        }
        // 执行过的回调函数都丢弃掉。
        onCallbackMap.set(this, []);
        // rejected回调至少执行过一次。才转换后面的执行为resolve。
        if (executed && !status) {
            callbackResult = undefined; // 如果触发reject，则后续回调都无值。
            status = true; // 不管如何，后续都去执行resolve.
        }
    } catch (e) {
        onCallbackMap.set(this, []);
        callbackResult = e;
        status = false;
    }
    // 如果是resolve,会递归的转移下个promise状态，直到某个nextPromise没有注册过回调函数，
    // 也即没有了nextPromise为止。
    // 如果是reject, 会一直去找注册了rejected状态的回调函数来调用，保证只调用一次。
    const nextPromise = nextPromiseMap.get(this);
    if (nextPromise instanceof Promise) {
        (status ? resolve : reject).call(nextPromise, callbackResult);
    }
}

/**
 * next event loop macro-task
 * 
 * @param {any} result - 结果值或原因值
 * @param {String} promiseStatus - Promise状态
 */
const delayToNextTick = function(result, promiseStatus) {
    setTimeout(executeCallback.bind(this), 0, result, promiseStatus === 'fulfilled');
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
    if (result instanceof Promise) {
        // 使当前Promise对象状态，依赖上层promise。
        result.then(resolve.bind(this), reject.bind(this));
    } else {
        // 调用resolve之后，状态要立马确定，防止接着调用reject更改其状态。
        this[PromiseStatus] = 'fulfilled';
        this[PromiseValue] = result;
        
        // 当回调值为promise对象时，nextPromise对象等待返回的promise状态变化
        if (result instanceof Promise) {
            const nextPromise = nextPromiseMap.get(this);
            result.then(
                result=>resolve.call(nextPromise, result),
                error=>reject.call(nextPromise, error)
            );
        } else {
            delayToNextTick.call(this, result, this[PromiseStatus]);
        }
    }
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

    delayToNextTick.call(this, error, this[PromiseStatus]);
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
        const nextPromise = new Promise();
        
        nextPromiseMap.set(this, nextPromise);

        onFulfillMap.get(this).push(onFulfilled);
        if (this[PromiseStatus] === 'fulfilled') {
            delayToNextTick.call(this, this[PromiseValue], this[PromiseStatus]);
        }
        onRejectMap.get(this).push(onRejected);
        if (this[PromiseStatus] === 'rejected') {
            delayToNextTick.call(this, this[PromiseValue], this[PromiseStatus]);
        }

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

export default Promise;