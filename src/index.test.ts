import { Fuzzy, FuzzyResult } from './index';
import { expect } from 'chai';
import 'mocha';

describe('dummy test', ()=> {
    it('should pass properly' , () => {
        const fuz = new Fuzzy({})
        expect(fuz.match('','')).to.deep.equal({} as FuzzyResult);
    });
})
