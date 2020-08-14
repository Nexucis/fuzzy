import { Fuzzy, FuzzyResult } from './index';
import { expect } from 'chai';
import 'mocha';

describe('render test', () => {
    it('default conf: shouldn t alter the string', () => {
        const fuz = new Fuzzy({})
        expect(fuz.render('my awesome text', [{ from: 0, to: 14 }]))
            .to.equal('my awesome text')
    });
    it('conf used to enable the rendering, full match', () => {
        const fuz = new Fuzzy({ escapeHTML: true, pre: '<b style="color: brown">', post: '</b>' })
        expect(fuz.render('<p>target is 100% of coverage</p>', [{ from: 0, to: 32 }]))
            .to.equal('<b style="color: brown">&lt;p&gt;target is 100% of coverage&lt;/p&gt;</b>')
    });
    it('conf used to enable the rendering with escape html, partial match', () => {
        const fuz = new Fuzzy({ escapeHTML: true, pre: '<b style="color: brown">', post: '</b>' })
        expect(fuz.render('target is <p>100% of coverage</p>', [{ from: 10, to: 11 }, { from: 15, to: 18 }]))
            .to.equal('target is <b style="color: brown">&lt;p</b>&gt;10<b style="color: brown">0% o</b>f coverage&lt;/p&gt;')
    });
    it('conf used to enable rendering without escape html, partial match', () => {
        const fuz = new Fuzzy({ pre: '<b style="color: brown">', post: '</b>' })
        expect(fuz.render('target is <p>100% of coverage</p>', [{ from: 10, to: 11 }, { from: 15, to: 18 }]))
            .to.equal('target is <b style="color: brown"><p</b>>10<b style="color: brown">0% o</b>f coverage</p>')
    })
})

describe('perfect match test', () => {
    it('default conf', () => {
        const fuz = new Fuzzy({})
        expect(fuz.match('my awesome text', 'my awesome text'))
            .to.deep.equal({
            original: 'my awesome text',
            rendered: 'my awesome text',
            score: Infinity,
        } as FuzzyResult);
    });
    it('default conf with html text', () => {
        const fuz = new Fuzzy({})
        expect(fuz.match('<p>target is 100% of coverage</p>', '<p>target is 100% of coverage</p>'))
            .to.deep.equal({
            original: '<p>target is 100% of coverage</p>',
            rendered: '<p>target is 100% of coverage</p>',
            score: Infinity,
        } as FuzzyResult)
    });
    it('conf used to enable the rendering', () => {
        const fuz = new Fuzzy({ escapeHTML: true, includeMatches: true, pre: '<b style="color: brown">', post: '</b>' })
        expect(fuz.match('<p>target is 100% of coverage</p>', '<p>target is 100% of coverage</p>'))
            .to.deep.equal({
            original: '<p>target is 100% of coverage</p>',
            rendered: '<b style="color: brown">&lt;p&gt;target is 100% of coverage&lt;/p&gt;</b>',
            score: Infinity,
            intervals: [{ from: 0, to: 32 }],
        } as FuzzyResult)
    });
    it('case insensitive', () => {
        const fuz = new Fuzzy({})
        expect(fuz.match('This Is So Cool', 'thIs iS sO cOOl'))
            .to.deep.equal({
            original: 'thIs iS sO cOOl',
            rendered: 'thIs iS sO cOOl',
            score: Infinity,
        } as FuzzyResult)
    })
    it('case sensitive', () => {
        const fuz = new Fuzzy({ caseSensitive: true })
        expect(fuz.match('This Is So Cool', 'thIs iS sO cOOl'))
            .to.equal(null)
    })
})

describe('partial match test', () => {
    it('default conf: prefix match', () => {
        const fuz = new Fuzzy({})
        expect(fuz.match('my', 'my awesome text'))
            .to.deep.equal({
            original: 'my awesome text',
            rendered: 'my awesome text',
            score: 4,
        } as FuzzyResult);
    });
    it('default conf: sub match', () => {
        const fuz = new Fuzzy({})
        expect(fuz.match('tex', 'my awesome text'))
            .to.deep.equal({
            original: 'my awesome text',
            rendered: 'my awesome text',
            score: 9,
        } as FuzzyResult);
    });
    it('default conf: fuzzy match', () => {
        const fuz = new Fuzzy({})
        expect(fuz.match('met', 'my awesome text'))
            .to.deep.equal({
            original: 'my awesome text',
            rendered: 'my awesome text',
            score: 3,
        } as FuzzyResult);
    });
    it('rendering conf: fuzzy match', () => {
        const fuz = new Fuzzy({ pre: '<b>', post: '</b>', includeMatches: true })
        expect(fuz.match('met', 'my awesome text'))
            .to.deep.equal({
            original: 'my awesome text',
            rendered: '<b>m</b>y aw<b>e</b>some <b>t</b>ext',
            score: 3,
            intervals: [
                {
                    from: 0,
                    to: 0,
                },
                {
                    from: 5,
                    to: 5,
                },
                {
                    from: 11,
                    to: 11,
                },
            ],
        } as FuzzyResult);
    });
    it('include matches: fuzzy match with continuous string', () => {
        const fuz = new Fuzzy({ includeMatches: true })
        expect(fuz.match('<inisbe usel', '<input> my input Is Close To be useless'))
            .to.deep.equal({
            original: '<input> my input Is Close To be useless',
            rendered: '<input> my input Is Close To be useless',
            intervals: [
                {
                    from: 0,
                    to: 2,
                },
                {
                    from: 11,
                    to: 11,
                },
                {
                    from: 18,
                    to: 18,
                },
                {
                    from: 29,
                    to: 35,
                },
            ],
            score: 60,
        } as FuzzyResult)
    })
})

describe('filter test', () => {
    it('empty list', () => {
        const fuz = new Fuzzy({})
        expect(fuz.filter('ter', []))
            .to.deep.equal([])
    });
    it('filter with no rendering', () => {
        const fuz = new Fuzzy({})
        const list = ['lion', 'mouse', 'dragon', 'trust me I now what I am doing', 'goat']
        expect(fuz.filter('oa', list))
            .to.deep.equal([
                {
                    index: 3,
                    original: 'trust me I now what I am doing',
                    rendered: 'trust me I now what I am doing',
                    score: 2,
                },
                {
                    index: 4,
                    original: 'goat',
                    rendered: 'goat',
                    score: 4,
                },
            ]
        )
    });
    it('filter with no rendering, sorted', () => {
        const fuz = new Fuzzy({ shouldSort: true })
        const list = ['lion', 'goat', 'mouse', 'dragon', 'trust me I now what I am doing']
        expect(fuz.filter('oa', list))
            .to.deep.equal([

                {
                    index: 1,
                    original: 'goat',
                    rendered: 'goat',
                    score: 4,
                },
                {
                    index: 4,
                    original: 'trust me I now what I am doing',
                    rendered: 'trust me I now what I am doing',
                    score: 2,
                },
            ]
        )
    })
})
