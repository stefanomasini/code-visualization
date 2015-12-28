var utils = require('./utils');

describe('cart2polar', () => {
    it('(0, 1) cart should be (PI/2, 1) polar', () => {
        const p = utils.cart2polar({x: 0, y: 1});
        expect(p.a).to.equal(Math.PI/2);
        expect(p.r).to.equal(1);
    });
});

describe('polar2cart', () => {
    it('(PI, 1) polar should be (-1, 0) cart', () => {
        const p = utils.polar2cart({a: Math.PI, r: 1});
        expect(p.x).to.almost.equal(-1);
        expect(p.y).to.almost.equal(0);
    });
});
