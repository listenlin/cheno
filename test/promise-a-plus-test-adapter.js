var aplus = require('promises-aplus-tests');
var describe = require('mocha').describe;

require('babel-register');
var Promise = require('../Promise/promise').default;

var adapter = {
    deferred : function () {
        var pending = {};
        pending.promise = new Promise(function (resolver, reject) {
            pending.resolve = resolver;
            pending.reject = reject;
        });
        return pending;
    },
    resolved : Promise.resolve,
    rejected : Promise.reject
};

describe('Promises/A+ Tests', function () {
    aplus.mocha(adapter);
});