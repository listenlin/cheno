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

// 以当前promise对象为key, 下一个链式promise对象(then调用时返回)为value。
const nextPromiseMap = new Map();

/**
 * resolve执行后，需在下个事件循环才真正执行的fulfill状态监听器函数
 * 
 * @param {any} result 
 */
const executeOnFulfill = function(result){
    try{
        const onFulfilled = onFulfillMap.get(this);
        if (typeof onFulfilled === 'function') {
            result = onFulfilled.call(undefined, result);
            // 结果值只传一次出去。
        }
        const nextPromiseFulfill = nextPromiseMap.get(this);
        // 递归的转移下个promise状态为fulfill，直到某个nextPromise没有注册过回调函数，
        // 也即没有了nextPromise为止。
        if (nextPromiseFulfill instanceof Promise) {
            resolve.call(nextPromiseFulfill, result);
        }
    } catch (e) {

    }
}

/**
 * 将状态转移至fulfilled。
 * 因为需要动态更改其this，所以function申明，而不是箭头函数。
 * 
 * @param {any} result - 传回的promise结果值
 * @returns 
 */
const resolve = function(result){
    if (this[PromiseStatus] !== 'pending') return;
    if (result instanceof Promise) {
        // 使当前Promise对象状态，依赖上层promise。
        result.then(resolve.bind(this), reject.bind(this));
    } else {
        // 调用resolve之后，状态要立马确定，防止接着调用reject更改其状态。
        this[PromiseStatus] = 'fulfilled';
        this[PromiseValue] = result;
        
        // 当回调promise对象为值时，nextPromise对象等待返回的promise状态变化
        if (result instanceof Promise) {
            const nextPromise = nextPromiseMap.get(this);
            result.then(
                result=>resolve.call(nextPromise, result),
                error=>reject.call(nextPromise, error)
            );
        } else {
            // next event loop macro-task
            setTimeout(executeOnFulfill.bind(this), 0, result);
        }
    }
}

/**
 * 将状态转移至rejected。
 * 
 * @param {Error} err 
 * @returns 
 */
const reject = function(...err){
    if (this[PromiseStatus] !== 'pending') return;

    this[PromiseStatus] = 'rejected';
    this[PromiseValue] = err[0];
    
    // next event loop macro-task
    setTimeout(()=>{
        // try{
            const reject = onRejectMap.get(this);
            if (typeof reject === 'function') {
                reject.apply(undefined, err);
            }
        // } catch(e) {
        //     console.log('reject error', e);
        // }
    }, 0);
}


/**
 * 按照ES6规范实现。
 * 
 * @class Promise
 */
export default class Promise
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
        onFulfillMap.set(this, onFulfilled);
        onRejectMap.set(this, onRejected);

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
