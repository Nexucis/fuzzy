// MIT License
//
// Copyright (c) 2020 Augustin Husson
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

function escapeHTML(text: string): string {
    return text.replace(/[&<>"']/g, (m: string) => {
        switch (m) {
            case '&':
                return '&amp;';
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '"':
                return '&quot;';
            default:
                return '&#039;';
        }
    });
}

function score(intervals: FuzzyMatchingInterval[]): number {
    let result = 0;
    for (const interval of intervals) {
        result = result + (interval.to - interval.from + 1) ** 2
    }
    return result
}

export interface FuzzyConfiguration {
    caseSensitive?: boolean;
    includeMatches?: boolean;
    shouldSort?: boolean;
    // escapeHTML will escape any HTML tag and special char after applying the rendering
    escapeHTML?: boolean;
    pre?: string;
    post?: string;
}

export interface FuzzyMatchingInterval {
    from: number;
    to: number;
}

export interface FuzzyResult {
    rendered: string;
    original: string;
    index: number;
    score: number;
    intervals?: FuzzyMatchingInterval[];
}

export class Fuzzy {
    private readonly caseSensitive: boolean;
    private readonly includeMatches: boolean;
    private readonly shouldSort: boolean;
    private readonly escapeHTML: boolean;
    private readonly pre: string
    private readonly post: string;

    constructor(conf: FuzzyConfiguration) {
        this.caseSensitive = conf.caseSensitive === undefined ? false : conf.caseSensitive;
        this.includeMatches = conf.includeMatches === undefined ? false : conf.includeMatches;
        this.shouldSort = conf.shouldSort === undefined ? false : conf.shouldSort;
        this.escapeHTML = conf.escapeHTML === undefined ? false : conf.escapeHTML;
        this.pre = conf.pre === undefined ? '' : conf.pre;
        this.post = conf.post === undefined ? '' : conf.post;
    }

    filter(pattern: string, list: string[]): FuzzyResult[] {
        let result = [];
        for (let i = 0; i < list.length; i++) {
            const matchedText = this.match(pattern, list[i])
            if (matchedText !== null) {
                matchedText.index = i;
                result.push(matchedText)
            }
        }
        if (this.shouldSort) {
            result = result.sort((a, b) => {
                return b.score - a.score
            })
        }
        return result
    }

    // match will return a result if `pattern` is matching `text`,
    match(pattern: string, text: string): FuzzyResult | null {
        let localPattern = pattern
        let localText = text
        if (!this.caseSensitive) {
            localPattern = localPattern.toLowerCase()
            localText = localText.toLowerCase()
        }
        // in case it's a perfect match, no need to loop to find which char is matching
        if (localPattern === localText) {
            const intervals = [{ from: 0, to: pattern.length - 1 }]
            const result = {
                original: text,
                rendered: this.render(text, intervals),
                score: Infinity,
            } as FuzzyResult
            if (this.includeMatches) {
                result.intervals = intervals
            }
            return result
        }
        // otherwise let's calculate the different indices that will then be used to calculate the score
        let patternIdx = 0;
        const intervals = [];
        for (let i = 0; i < localText.length && patternIdx < localPattern.length;) {
            if (localText[i] === localPattern[patternIdx]) {
                const interval = { from: i, to: i }
                patternIdx++;
                i++;
                for (let j = i; j < localText.length && patternIdx < localPattern.length && localText[j] === localPattern[patternIdx]; j++) {
                    interval.to = j
                    patternIdx++
                    i = j
                }
                intervals.push(interval)
            }
            i++;
        }
        if (intervals.length === 0 || patternIdx !== localPattern.length) {
            return null;
        }
        const result = {
            original: text,
            rendered: this.render(text, intervals),
            score: score(intervals),
        } as FuzzyResult
        if (this.includeMatches) {
            result.intervals = intervals
        }
        return result;
    }

    render(text: string, intervals: FuzzyMatchingInterval[]): string {
        let rendered = ''
        for (let i = 0; i < intervals.length; i++) {
            const currentInterval = intervals[i]
            let previousNotMatchingInterval = null;
            if (i === 0 && currentInterval.from !== 0) {
                previousNotMatchingInterval = { from: 0, to: currentInterval.from - 1 }
            }
            if (i > 0) {
                previousNotMatchingInterval = { from: intervals[i - 1].to + 1, to: currentInterval.from - 1 }
            }
            let previousStr = ''
            if (previousNotMatchingInterval !== null) {
                previousStr = this.extractSubString(text, previousNotMatchingInterval)
            }
            const currentStr = this.extractSubString(text, currentInterval)
            rendered = rendered + previousStr + this.pre + currentStr + this.post
        }

        // check if the last interval contains the end of the string. Otherwise add it
        const lastInterval = intervals[intervals.length - 1]
        if (lastInterval.to < text.length - 1) {
            rendered = rendered + this.extractSubString(text, { from: lastInterval.to + 1, to: text.length })
        }
        return rendered
    }

    private extractSubString(text: string, interval: FuzzyMatchingInterval) {
        let str = text.substr(interval.from, interval.to - interval.from + 1)
        if (this.escapeHTML) {
            str = escapeHTML(str)
        }
        return str
    }
}
