/**
 * 按照ES6的Promise对象，实现一模一样的功能。
 * @copyright Copyright(c) 2017 listenlin.
 * @author listenlin <listenlin521@foxmail.com>
 */
import 'babel-polyfill';

const PromiseValue = Symbol('PromiseValue');
const PromiseStatus = Symbol('PromiseStatus');

const onFulfillMap = new Map();
const onRejectMap = new Map();
const onCatchQueue = new Map();

/**
 * 将状态转移至fulfilled
 * 
 * @param {any} result 
 * @returns 
 */
const resolve = function(...result){
    if (this[PromiseStatus] !== 'pending') return;
    
    if (result[0] instanceof Promise) {
        // 使当前Promise对象状态，依赖上层promise。
        result[0].then(
            resolve.bind(this),
            reject.bind(this)
        ).catch(
            this.catch.bind(this)
        );
    } else {
        // 调用resolve之后，状态要立马确定，防止接着调用reject更改其状态。
        this[PromiseStatus] = 'fulfilled';
        this[PromiseValue] = result[0];

        const fulfill = onFulfillMap.get(this);
        if (typeof fulfill === 'function') {
            // next event loop macro-task
            setTimeout(()=>{
                fulfill.apply(undefined, result);
            }, 0);
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

    const reject = onRejectMap.get(this);
    if (typeof reject === 'function') {
        // next event loop macro-task
        setTimeout(()=>{
            const result = reject.apply(undefined, err);
        }, 0);
    }
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
            fn(resolve.bind(this), reject.bind(this));
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
        onFulfillMap.set(this, onFulfilled);
        onRejectMap.set(this, onRejected);

        return new Promise;
    }

    /**
     * 注册异常回调
     * 
     * @param {Function} fn 
     * 
     * @memberOf Promise
     */
    catch(fn)
    {
        onCatchQueue.set(this, fn);
    }

}
