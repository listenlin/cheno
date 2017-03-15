/* globals mocha:false, describe:false, it:false */
/** 上述三个全局变量由mocha.js引入~ */

import 'babel-polyfill';

// 这里导入的话，browserify又会去解析已打包的mocha,掩面哭泣。只能html中引入。
// import { describe, it } from './mocha.js'; 

import { expect } from 'chai';

import Promise from '../../src/promise';
import aplus from 'promises-aplus-tests';

import MyTest from '../my-promise.spec';
import AplusTest from '../promise-a-plus-test-adapter';

mocha.setup('bdd');

MyTest(Promise, describe, it, expect);
AplusTest(Promise, describe, aplus);

mocha.run();