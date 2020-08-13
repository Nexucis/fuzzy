import { Fuzzy, FuzzyResult } from './index';
import { expect } from 'chai';
import 'mocha';

describe('render test', () => {
    it('default conf: shouldn t alter the string', () => {
        const fuz = new Fuzzy({})
        expect(fuz.render('my awesome text', [{from: 0, to: 14}]))
            .to.equal('my awesome text')
    });
    it('conf used to enable the rendering, full match', () => {
        const fuz = new Fuzzy({escapeHTML: true, pre: '<b style="color: brown">', post: '</b>'})
        expect(fuz.render('<p>target is 100% of coverage</p>', [{from: 0, to: 32}]))
            .to.equal('<b style="color: brown">&lt;p&gt;target is 100% of coverage&lt;/p&gt;</b>')
    });
    it('conf used to enable the rendering, partial match', () => {
        const fuz = new Fuzzy({escapeHTML: true, pre: '<b style="color: brown">', post: '</b>'})
        expect(fuz.render('target is <p>100% of coverage</p>', [{from: 10, to: 11}, {from: 15, to: 18}]))
            .to.equal('target is <b style="color: brown">&lt;p</b>&gt;10<b style="color: brown">0% o</b>f coverage&lt;/p&gt;')
    })
})

describe('perfect match test', () => {
    it('default conf', () => {
        const fuz = new Fuzzy({})
        expect(fuz.match('my awesome text', 'my awesome text'))
            .to.deep.equal({
            original: 'my awesome text',
            rendered: 'my awesome text',
            score: Infinity
        } as FuzzyResult);
    });
    it('default conf with html text', () => {
        const fuz = new Fuzzy({})
        expect(fuz.match('<p>target is 100% of coverage</p>', '<p>target is 100% of coverage</p>'))
            .to.deep.equal({
            original: '<p>target is 100% of coverage</p>',
            rendered: '<p>target is 100% of coverage</p>',
            score: Infinity
        } as FuzzyResult)
    });
    it('conf used to enable the rendering', () => {
        const fuz = new Fuzzy({escapeHTML: true, includeMatches: true, pre: '<b style="color: brown">', post: '</b>'})
        expect(fuz.match('<p>target is 100% of coverage</p>', '<p>target is 100% of coverage</p>'))
            .to.deep.equal({
            original: '<p>target is 100% of coverage</p>',
            rendered: '<b style="color: brown">&lt;p&gt;target is 100% of coverage&lt;/p&gt;</b>',
            score: Infinity,
            indices: [{from: 0, to: 32}]
        } as FuzzyResult)
    });
    it('case insensitive', () => {
        const fuz = new Fuzzy({})
        expect(fuz.match('This Is So Cool', 'thIs iS sO cOOl'))
            .to.deep.equal({
            original: 'thIs iS sO cOOl',
            rendered: 'thIs iS sO cOOl',
            score: Infinity
        } as FuzzyResult)
    })
    it('case sensitive', () => {
        const fuz = new Fuzzy({caseSensitive: true})
        expect(fuz.match('This Is So Cool', 'thIs iS sO cOOl'))
            .to.equal(null)
    })
})
