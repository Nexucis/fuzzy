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

    constructor(conf?: FuzzyConfiguration) {
        this.caseSensitive = conf?.caseSensitive === undefined ? false : conf.caseSensitive;
        this.includeMatches = conf?.includeMatches === undefined ? false : conf.includeMatches;
        this.shouldSort = conf?.shouldSort === undefined ? false : conf.shouldSort;
        this.escapeHTML = conf?.escapeHTML === undefined ? false : conf.escapeHTML;
        this.pre = conf?.pre === undefined ? '' : conf.pre;
        this.post = conf?.post === undefined ? '' : conf.post;
    }

    // filter is the method to use to filter a string list
    // list of result return can be sort if parameter `shouldSort` is set.
    filter(pattern: string, list: string[], conf?: FuzzyConfiguration): FuzzyResult[] {
        const shouldSort = conf?.shouldSort !== undefined ? conf.shouldSort : this.shouldSort
        let result = [];
        for (let i = 0; i < list.length; i++) {
            const matchedText = this.match(pattern, list[i], conf)
            if (matchedText !== null) {
                matchedText.index = i;
                result.push(matchedText)
            }
        }
        if (shouldSort) {
            result = result.sort((a, b) => {
                return b.score - a.score
            })
        }
        return result
    }

    // match will return a result if `pattern` is matching `text`,
    match(pattern: string, text: string, conf?: FuzzyConfiguration): FuzzyResult | null {
        let localPattern = pattern
        let localText = text
        const caseSensitive = conf?.caseSensitive !== undefined ? conf.caseSensitive : this.caseSensitive
        const includeMatches = conf?.includeMatches !== undefined ? conf.includeMatches : this.includeMatches

        if (!caseSensitive) {
            localPattern = localPattern.toLowerCase()
            localText = localText.toLowerCase()
        }
        // in case it's a perfect match, no need to loop to find which char is matching
        if (localPattern === localText) {
            const intervals = [{ from: 0, to: pattern.length - 1 }]
            const result = {
                original: text,
                rendered: this.render(text, intervals, conf),
                score: Infinity,
            } as FuzzyResult
            if (includeMatches) {
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
            rendered: this.render(text, intervals, conf),
            score: score(intervals),
        } as FuzzyResult
        if (includeMatches) {
            result.intervals = intervals
        }
        return result;
    }

    // render will modify the text according to the different parameter set in the conf.
    // If nothing is set, then it will return the text not modified.
    render(text: string, intervals: FuzzyMatchingInterval[], conf?: FuzzyConfiguration): string {
        let rendered = ''
        const pre = conf?.pre ? conf.pre : this.pre
        const post = conf?.post ? conf.post : this.post
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
                previousStr = this.extractSubString(text, previousNotMatchingInterval, conf)
            }
            const currentStr = this.extractSubString(text, currentInterval, conf)
            rendered = rendered + previousStr + pre + currentStr + post
        }

        // check if the last interval contains the end of the string. Otherwise add it
        const lastInterval = intervals[intervals.length - 1]
        if (lastInterval.to < text.length - 1) {
            rendered = rendered + this.extractSubString(text, { from: lastInterval.to + 1, to: text.length }, conf)
        }
        return rendered
    }

    private extractSubString(text: string, interval: FuzzyMatchingInterval, conf?: FuzzyConfiguration) {
        const shouldEscape = conf?.escapeHTML !== undefined ? conf.escapeHTML : this.escapeHTML;
        let str = text.substr(interval.from, interval.to - interval.from + 1)
        if (shouldEscape) {
            str = escapeHTML(str)
        }
        return str
    }
}
