global.chai = require('chai');
global.expect = global.chai.expect;
chai.use(require('chai-stats'));

// Load test suites
require('../js/utils.spec.js');
