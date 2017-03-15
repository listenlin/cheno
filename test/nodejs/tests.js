import 'babel-polyfill';

import { expect } from 'chai';
import { describe, it } from 'mocha';

import Promise from '../../src/promise';
import aplus from 'promises-aplus-tests';

import MyTest from '../my-promise.spec';
import AplusTest from '../promise-a-plus-test-adapter';

MyTest(Promise, describe, it, expect);
AplusTest(Promise, describe, aplus);