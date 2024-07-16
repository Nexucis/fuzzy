import { filter, Fuzzy, match, render, score } from './index';
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

describe('render test', () => {
    const testSuite = [
        {
            title: 'default conf: shouldn t alter the string',
            text: 'my awesome text',
            intervals: [{ from: 0, to: 14 }],
            result: 'my awesome text',
        },
        {
            title: 'conf used to enable the rendering, full match',
            text: '<p>target is 100% of coverage</p>',
            intervals: [{ from: 0, to: 32 }],
            config: {
                escapeHTML: true,
                pre: '<b style="color: brown">',
                post: '</b>',
            },
            result: '<b style="color: brown">&lt;p&gt;target is 100% of coverage&lt;/p&gt;</b>',
        },
        {
            title: 'conf used to enable the rendering with escape html, partial match',
            text: 'target is <p>100% of coverage</p>',
            intervals: [
                { from: 10, to: 11 },
                { from: 15, to: 18 },
            ],
            config: {
                escapeHTML: true, pre: '<b style="color: brown">', post: '</b>',
            },
            result: 'target is <b style="color: brown">&lt;p</b>&gt;10<b style="color: brown">0% o</b>f coverage&lt;/p&gt;',
        },
        {
            title: 'conf used to enable rendering without escape html, partial match',
            text: 'target is <p>100% of coverage</p>',
            intervals: [
                { from: 10, to: 11 },
                { from: 15, to: 18 },
            ],
            config: { pre: '<b style="color: brown">', post: '</b>' },
            result: 'target is <b style="color: brown"><p</b>>10<b style="color: brown">0% o</b>f coverage</p>',
        },
        {
            title: 'escape all html char',
            text: '<p style="color: brown">&#10 </p>',
            intervals: [{ from: 0, to: 32 }],
            config: { escapeHTML: true },
            result: '&lt;p style=&quot;color: brown&quot;&gt;&amp;#10 &lt;/p&gt;',
        },
    ]
    for (const test of testSuite) {
        it(test.title, () => {
            const fuzWithGlobalConf = new Fuzzy(test.config)
            const fuzWithLocalConf = new Fuzzy()
            expect(fuzWithGlobalConf.render(test.text, test.intervals))
                .to.equal(test.result)
            expect(fuzWithLocalConf.render(test.text, test.intervals, test.config))
                .to.equal(test.result)
            expect(render(test.text, test.intervals, test.config))
                .to.equal(test.result)
        })
    }
})

describe('perfect match test', () => {
    const testSuite = [
        {
            title: 'default conf',
            pattern: 'my awesome text',
            text: 'my awesome text',
            result: {
                original: 'my awesome text',
                rendered: 'my awesome text',
                score: Infinity,
            },
        },
        {
            title: 'default conf with html text',
            pattern: '<p>target is 100% of coverage</p>',
            text: '<p>target is 100% of coverage</p>',
            result: {
                original: '<p>target is 100% of coverage</p>',
                rendered: '<p>target is 100% of coverage</p>',
                score: Infinity,
            },
        },
        {
            title: 'conf used to enable the rendering',
            pattern: '<p>target is 100% of coverage</p>',
            text: '<p>target is 100% of coverage</p>',
            config: {
                escapeHTML: true, includeMatches: true, pre: '<b style="color: brown">', post: '</b>',
            },
            result: {
                original: '<p>target is 100% of coverage</p>',
                rendered: '<b style="color: brown">&lt;p&gt;target is 100% of coverage&lt;/p&gt;</b>',
                score: Infinity,
                intervals: [{ from: 0, to: 32 }],
            },
        },
        {
            title: 'case insensitive',
            pattern: 'This Is So Cool',
            text: 'thIs iS sO cOOl',
            config: {
                caseSensitive: false,
            },
            result: {
                original: 'thIs iS sO cOOl',
                rendered: 'thIs iS sO cOOl',
                score: Infinity,
            },
        },
        {
            title: 'case sensitive',
            pattern: 'This Is So Cool',
            text: 'thIs iS sO cOOl',
            config: {
                caseSensitive: true,
            },
            result: null,
        },
    ]
    for (const test of testSuite) {
        it(test.title, () => {
            const fuzWithGlobalConf = new Fuzzy(test.config)
            const fuzWithLocalConf = new Fuzzy()
            expect(fuzWithGlobalConf.match(test.pattern, test.text))
                .to.deep.equal(test.result)
            expect(fuzWithLocalConf.match(test.pattern, test.text, test.config))
                .to.deep.equal(test.result)
            expect(match(test.pattern, test.text, test.config))
                .to.deep.equal(test.result)
        })
    }
})

describe('partial match test', () => {
    const testSuite = [
        {
            title: 'default conf: prefix match',
            pattern: 'my',
            text: 'my awesome text',
            result: {
                original: 'my awesome text',
                rendered: 'my awesome text',
                score: 4,
            },
        },
        {
            title: 'default conf: sub match',
            pattern: 'tex',
            text: 'my awesome text',
            result: {
                original: 'my awesome text',
                rendered: 'my awesome text',
                score: 8.266666666666667,
            },
        },
        {
            title: 'default conf: fuzzy match',
            pattern: 'met',
            text: 'my awesome text',
            result: {
                original: 'my awesome text',
                rendered: 'my awesome text',
                score: 4.4,
            },
        },
        {
            title: 'default conf: ignoring space',
            pattern: 'my awesome text',
            text: 'my-awesome-text',
            config: {
                excludedChars: [' '],
            },
            result: {
                original: 'my-awesome-text',
                rendered: 'my-awesome-text',
                score: 68.86666666666666,
            },
        },
        {
            title: 'rendering conf: fuzzy match',
            pattern: 'met',
            text: 'my awesome text',
            config: {
                pre: '<b>', post: '</b>', includeMatches: true,
            },
            result: {
                original: 'my awesome text',
                rendered: 'my aweso<b>me</b> <b>t</b>ext',
                score: 4.4,
                intervals: [
                    {
                        from: 8,
                        to: 9,
                    },
                    {
                        from: 11,
                        to: 11,
                    },
                ],
            },
        },
        {
            title: 'include matches: fuzzy match with continuous string',
            pattern: '<inisbe usel',
            text: '<input> my input Is Close To be useless',
            config: { includeMatches: true },
            result: {
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
            },
        },
    ]
    for (const test of testSuite) {
        it(test.title, () => {
            const fuzWithGlobalConf = new Fuzzy(test.config)
            const fuzWithLocalConf = new Fuzzy()
            expect(fuzWithGlobalConf.match(test.pattern, test.text))
                .to.deep.equal(test.result)
            expect(fuzWithLocalConf.match(test.pattern, test.text, test.config))
                .to.deep.equal(test.result)
            expect(match(test.pattern, test.text, test.config))
                .to.deep.equal(test.result)
        });
    }
})

describe('matching test with rendering', () => {
    const testSuite = [
        {
            title: 'pattern matched better at the end of the text',
            pattern: 'bac',
            text: 'babac',
            config: { pre: '<', post: '>' },
            result: 'ba<bac>',
        },
        {
            title: 'pattern has always higher score when it s a prefix',
            pattern: 'bac',
            text: 'bacbac',
            config: { pre: '<', post: '>' },
            result: '<bac>bac',
        },
        {
            title: 'pattern with duplicated char',
            pattern: 'cccceer',
            text: 'cecccesdceer',
            config: { pre: '<', post: '>' },
            result: 'ce<ccc>esd<ceer>',
        },
    ]
    for (const test of testSuite) {
        it(test.title, () => {
            const fuzWithGlobalConf = new Fuzzy(test.config)
            const fuzWithLocalConf = new Fuzzy()
            expect(fuzWithGlobalConf.match(test.pattern, test.text)?.rendered).to.equal(test.result)
            expect(fuzWithLocalConf.match(test.pattern, test.text, test.config)?.rendered).to.equal(test.result)
            expect(match(test.pattern, test.text, test.config)?.rendered).to.equal(test.result)
        });
    }
})

describe('filter test, global conf', () => {
    const testSuite = [
        {
            title:'empty list',
            pattern: 'ter',
            list: [],
            result: [],
        },
        {
            title: 'filter with no rendering',
            pattern: 'oa',
            list: ['lion', 'mouse', 'dragon', 'trust me I now what I am doing', 'goat'],
            result: [
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
            ],
        },
        {
            title: 'filter with no rendering, sorted',
            pattern: 'oa',
            list: ['lion', 'goat', 'mouse', 'dragon', 'trust me I now what I am doing'],
            config: { shouldSort: true },
            result: [
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
            ],
        },
    ]
    for (const test of testSuite) {
        it(test.title, () => {
            const fuzWithGlobalConf = new Fuzzy(test.config)
            const fuzWithLocalConf = new Fuzzy()
            expect(fuzWithGlobalConf.filter(test.pattern, test.list))
                .to.deep.equal(test.result)
            expect(fuzWithLocalConf.filter(test.pattern, test.list, test.config))
                .to.deep.equal(test.result)
            expect(filter(test.pattern, test.list, test.config))
                .to.deep.equal(test.result)
        });
    }
})
