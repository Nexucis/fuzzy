import { Fuzzy, FuzzyResult, score } from './index';
import { expect } from 'chai';
import 'mocha';

describe('scoring test', () => {
    it('prefix match is a perfect uint score', () => {
        expect(score([{ from: 0, to: 4 }], 5))
            .to.equal(25)
    });
    it('prefix match is higher than suffix match', () => {
        expect(score([{ from: 0, to: 2 }], 5) > score([{ from: 2, to: 4 }], 5))
            .to.equal(true)
    });
    it('Consecutive characters have a higher score than distant characters', () => {
        expect(
            score([{ from: 1, to: 2 }, { from: 5, to: 5 }], 6)
            >
            score([{ from: 0, to: 0 }, { from: 2, to: 2 }, { from: 4, to: 4 }], 6))
            .to.equal(true)
    })
})

describe('render test with global conf', () => {
    it('default conf: shouldn t alter the string', () => {
        const fuz = new Fuzzy()
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
    });
    it('escape all html char', () => {
        const fuz = new Fuzzy({ escapeHTML: true });
        expect(fuz.render('<p style="color: brown">&#10 </p>', [{ from: 0, to: 32 }]))
            .to.equal('&lt;p style=&quot;color: brown&quot;&gt;&amp;#10 &lt;/p&gt;')
    })
})

describe('render test with local conf', () => {
    it('conf used to enable the rendering, full match', () => {
        const fuz = new Fuzzy()
        expect(fuz.render('<p>target is 100% of coverage</p>', [{ from: 0, to: 32 }], {
            escapeHTML: true,
            pre: '<b style="color: brown">',
            post: '</b>',
        }))
            .to.equal('<b style="color: brown">&lt;p&gt;target is 100% of coverage&lt;/p&gt;</b>')
    });
    it('conf used to enable the rendering with escape html, partial match', () => {
        const fuz = new Fuzzy()
        expect(fuz.render('target is <p>100% of coverage</p>', [
            { from: 10, to: 11 },
            { from: 15, to: 18 },
        ], {
            escapeHTML: true, pre: '<b style="color: brown">', post: '</b>',
        }))
            .to.equal('target is <b style="color: brown">&lt;p</b>&gt;10<b style="color: brown">0% o</b>f coverage&lt;/p&gt;')
    });
    it('conf used to enable rendering without escape html, partial match', () => {
        const fuz = new Fuzzy()
        expect(fuz.render('target is <p>100% of coverage</p>', [
            { from: 10, to: 11 },
            { from: 15, to: 18 },
        ], { pre: '<b style="color: brown">', post: '</b>' }))
            .to.equal('target is <b style="color: brown"><p</b>>10<b style="color: brown">0% o</b>f coverage</p>')
    });
    it('escape all html char', () => {
        const fuz = new Fuzzy();
        expect(fuz.render('<p style="color: brown">&#10 </p>', [{ from: 0, to: 32 }], { escapeHTML: true }))
            .to.equal('&lt;p style=&quot;color: brown&quot;&gt;&amp;#10 &lt;/p&gt;')
    })
})

describe('perfect match test with global conf', () => {
    it('default conf', () => {
        const fuz = new Fuzzy()
        expect(fuz.match('my awesome text', 'my awesome text'))
            .to.deep.equal({
            original: 'my awesome text',
            rendered: 'my awesome text',
            score: Infinity,
        } as FuzzyResult);
    });
    it('default conf with html text', () => {
        const fuz = new Fuzzy()
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
        const fuz = new Fuzzy()
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

describe('perfect match test with local conf', () => {
    it('conf used to enable the rendering', () => {
        const fuz = new Fuzzy()
        expect(fuz.match('<p>target is 100% of coverage</p>', '<p>target is 100% of coverage</p>', {
            escapeHTML: true,
            includeMatches: true,
            pre: '<b style="color: brown">',
            post: '</b>',
        }))
            .to.deep.equal({
            original: '<p>target is 100% of coverage</p>',
            rendered: '<b style="color: brown">&lt;p&gt;target is 100% of coverage&lt;/p&gt;</b>',
            score: Infinity,
            intervals: [{ from: 0, to: 32 }],
        } as FuzzyResult)
    });
    it('case insensitive', () => {
        const fuz = new Fuzzy()
        expect(fuz.match('This Is So Cool', 'thIs iS sO cOOl'))
            .to.deep.equal({
            original: 'thIs iS sO cOOl',
            rendered: 'thIs iS sO cOOl',
            score: Infinity,
        } as FuzzyResult)
    })
    it('case sensitive', () => {
        const fuz = new Fuzzy()
        expect(fuz.match('This Is So Cool', 'thIs iS sO cOOl', { caseSensitive: true }))
            .to.equal(null)
    })
})

describe('partial match test: global conf', () => {
    it('default conf: prefix match', () => {
        const fuz = new Fuzzy()
        expect(fuz.match('my', 'my awesome text'))
            .to.deep.equal({
            original: 'my awesome text',
            rendered: 'my awesome text',
            score: 4,
        } as FuzzyResult);
    });
    it('default conf: sub match', () => {
        const fuz = new Fuzzy()
        expect(fuz.match('tex', 'my awesome text'))
            .to.deep.equal({
            original: 'my awesome text',
            rendered: 'my awesome text',
            score: 8.266666666666667,
        } as FuzzyResult);
    });
    it('default conf: fuzzy match', () => {
        const fuz = new Fuzzy()
        expect(fuz.match('met', 'my awesome text'))
            .to.deep.equal({
            original: 'my awesome text',
            rendered: 'my awesome text',
            score: 2.4000000000000004,
        } as FuzzyResult);
    });
    it('rendering conf: fuzzy match', () => {
        const fuz = new Fuzzy({ pre: '<b>', post: '</b>', includeMatches: true })
        expect(fuz.match('met', 'my awesome text'))
            .to.deep.equal({
            original: 'my awesome text',
            rendered: '<b>m</b>y aw<b>e</b>some <b>t</b>ext',
            score: 2.4000000000000004,
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
            score: 59.38461538461539,
        } as FuzzyResult)
    })
})

describe('partial match test: local conf', () => {
    it('rendering conf: fuzzy match', () => {
        const fuz = new Fuzzy()
        expect(fuz.match('met', 'my awesome text', { pre: '<b>', post: '</b>', includeMatches: true }))
            .to.deep.equal({
            original: 'my awesome text',
            rendered: '<b>m</b>y aw<b>e</b>some <b>t</b>ext',
            score: 2.4000000000000004,
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
        const fuz = new Fuzzy()
        expect(fuz.match('<inisbe usel', '<input> my input Is Close To be useless', { includeMatches: true }))
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
            score: 59.38461538461539,
        } as FuzzyResult)
    })
})

describe('filter test, global conf', () => {
    it('empty list', () => {
        const fuz = new Fuzzy()
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
                    score: 1.4666666666666668,
                },
                {
                    index: 4,
                    original: 'goat',
                    rendered: 'goat',
                    score: 3.75,
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
                    score: 3.75,
                },
                {
                    index: 4,
                    original: 'trust me I now what I am doing',
                    rendered: 'trust me I now what I am doing',
                    score: 1.4666666666666668,
                },
            ]
        )
    })
})

describe('filter test, local conf', () => {
    it('filter with no rendering, sorted', () => {
        const fuz = new Fuzzy()
        const list = ['lion', 'goat', 'mouse', 'dragon', 'trust me I now what I am doing']
        expect(fuz.filter('oa', list, { shouldSort: true }))
            .to.deep.equal([

                {
                    index: 1,
                    original: 'goat',
                    rendered: 'goat',
                    score: 3.75,
                },
                {
                    index: 4,
                    original: 'trust me I now what I am doing',
                    rendered: 'trust me I now what I am doing',
                    score: 1.4666666666666668,
                },
            ]
        )
    })
})
