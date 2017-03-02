import 'babel-polyfill';

let PromiseValue = Symbol('PromiseValue');
let PromiseStatus = Symbol('PromiseStatus');
/**
 * 按照ES6规范实现。
 * 
 * @copyright Copyright(c) 2017 listenlin.
 * @author listenlin <listenlin521@foxmail.com>
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
        this[PromiseStatus] = 'Pending';//Resolved, Rejected
        this[PromiseValue] = undefined;

        this._resolved = undefined;
        this._rejected = undefined;
        this._catched = [];
        
        if (typeof fn === 'function') {
            fn(this.resolve.bind(this), this.reject.bind(this));
        }
    }

    /**
     * 将状态转移至Resolved
     * 
     * @param {any} result 
     * @returns 
     * 
     * @memberOf Promise
     */
    resolve(result)
    {
        if (this[PromiseStatus] !== 'Pending') return;
        
        this[PromiseStatus] = 'Resolved';
        if (result instanceof Promise) {
            result.then(this.resolve, this.reject).catch(this.catch);
        } else {
            if (typeof this._resolved === 'function') {
                this[PromiseValue] = this._resolved(result);
            }
        }
    }

    /**
     * 将状态转移至Rejected。
     * 
     * @param {Error} err 
     * @returns 
     * 
     * @memberOf Promise
     */
    reject(err)
    {
        if (this[PromiseStatus] !== 'Pending') return;

        this[PromiseStatus] = 'Rejected';
        
        if (typeof this._rejected === 'function') {
            let result = this._rejected(err);

        }
    }

    /**
     * 注册回调方法
     * 
     * @param {Function} success 
     * @param {Function} failed 
     * @returns {Promise}
     * 
     * @memberOf Promise
     */
    then(success, failed)
    {
        this._resolved = success;
        this._rejected = failed;

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
        this._catched.push(fn);
    }

}
