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

function intervalSize(interval: FuzzyMatchingInterval): number {
    return interval.to - interval.from + 1
}

function calculatePreviousNotMatchingInterval(intervals: FuzzyMatchingInterval[], idx: number): FuzzyMatchingInterval | null {
    const currentInterval = intervals[idx]
    let previousNotMatchingInterval = null;
    if (idx === 0 && currentInterval.from !== 0) {
        previousNotMatchingInterval = { from: 0, to: currentInterval.from - 1 }
    }
    if (idx > 0) {
        previousNotMatchingInterval = { from: intervals[idx - 1].to + 1, to: currentInterval.from - 1 }
    }
    return previousNotMatchingInterval
}

// score should be used to calculate the score based on the intervals created during the matching step.
// Here is how the score is determinate:
//   1. Consecutive characters should increase the score more than linearly
//   2. More there is a distance between the characters, higher it reduces the score.
//      For example, for the pattern 'abc', the following strings are sorted by the highest score
//      abcdef > defabc > abec > defabec
// Note: this function is exported only for testing purpose.
export function score(intervals: FuzzyMatchingInterval[], strLength: number): number {
    let result = 0;
    for (let i = 0; i < intervals.length; i++) {
        const currentInterval = intervals[i]
        const previousNotMatchingInterval = calculatePreviousNotMatchingInterval(intervals, i);
        if (previousNotMatchingInterval !== null) {
            result = result - intervalSize(previousNotMatchingInterval) / strLength
        }
        result = result + intervalSize(currentInterval) ** 2
    }
    return result
}

export interface FuzzyConfiguration {
    caseSensitive?: boolean;
    // List of characters that should be ignored in the pattern or in the word used for matching
    excludedChars?: string[];
    // Whenever the result should contain the list of intervals.
    includeMatches?: boolean;
    // If true, results will be sorted based on the score.
    shouldSort?: boolean;
    // If true, then the strings matched will be automatically rendered using the config pre/post and escapeHTML.
    // By default, shouldRender is set to true.
    // In case you want to render it yourself, set it to false, and set `includeMatches` to true.
    // You will need the intervals to call the method render.
    shouldRender?: boolean;
    // escapeHTML will escape any HTML tag and special char after applying the rendering
    escapeHTML?: boolean;
    // The string value that will be used during the rendering process.
    // It will be placed before each succession of chars that are matching.
    pre?: string;
    // The string value that will be used during the rendering process.
    // It will be placed after each succession of chars that are matching.
    post?: string;
}


// FuzzyMatchingInterval represents the start and the end position of the continuous characters that is matching the pattern.
// For example, for the pattern `bc`, with the string`abcd`, the corresponding interval will be [{from: 1, to: 2}]
// Another example, for the pattern `fuz`, with the string `fzduzf`, the corresponding intervals will be:
// [ { from: 0, to: 0 }, { from: 3, to: 4 } ]
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
    private readonly conf: FuzzyConfiguration;

    constructor(conf?: FuzzyConfiguration) {
        this.conf = {
            caseSensitive: conf?.caseSensitive === undefined ? false : conf.caseSensitive,
            excludedChars: conf?.excludedChars === undefined ? [] : conf.excludedChars,
            includeMatches: conf?.includeMatches === undefined ? false : conf.includeMatches,
            shouldSort: conf?.shouldSort === undefined ? false : conf.shouldSort,
            shouldRender: conf?.shouldRender === undefined ? true : conf.shouldRender,
            escapeHTML: conf?.escapeHTML === undefined ? false : conf.escapeHTML,
            pre: conf?.pre === undefined ? '' : conf.pre,
            post: conf?.post === undefined ? '' : conf.post,
        }
    }

    // filter is the method to use to filter a string list
    // list of result return can be sort if parameter `shouldSort` is set.
    filter(pattern: string, list: string[], conf?: FuzzyConfiguration): FuzzyResult[] {
        const shouldSort = conf?.shouldSort !== undefined ? conf.shouldSort : this.conf.shouldSort
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
        const caseSensitive = conf?.caseSensitive !== undefined ? conf.caseSensitive : this.conf.caseSensitive
        const includeMatches = conf?.includeMatches !== undefined ? conf.includeMatches : this.conf.includeMatches
        const shouldRender = conf?.shouldRender !== undefined ? conf.shouldRender : this.conf.shouldRender

        if (!caseSensitive) {
            localPattern = localPattern.toLowerCase()
            localText = localText.toLowerCase()
        }
        // in case it's a perfect match, no need to loop to find which char is matching
        if (localPattern === localText) {
            const intervals = [{ from: 0, to: pattern.length - 1 }]
            const result = {
                original: text,
                rendered: shouldRender ? this.render(text, intervals, conf) : text,
                score: Infinity,
            } as FuzzyResult
            if (includeMatches) {
                result.intervals = intervals
            }
            return result
        }
        // otherwise, let's calculate the different indices that will then be used to calculate the score
        let intervals: FuzzyMatchingInterval[] = [];
        let score = 0
        for (let i = 0; i < localText.length - localPattern.length + 1; i++) {
            // Each time a char is matching the first char of the pattern
            // loop other the rest of the text to generate the different matching interval.
            // Like that, we will be able to find the best matching possibility.
            // For example, given the pattern `bac` and the text `babac`
            // instead of matching `<ba>ba<c>, it will match ba<bac> which has a better score than the previous one.
            if (localText[i] === localPattern[0]) {
                const matchingResult = this.generateMatchingInterval(localPattern, localText, i, conf);
                if (matchingResult === null) {
                    break
                }
                if (matchingResult.score > score) {
                    score = matchingResult.score
                    intervals = matchingResult.intervals
                }
            }
        }
        if (intervals.length === 0) {
            return null;
        }
        const result = {
            original: text,
            rendered: shouldRender ? this.render(text, intervals, conf) : text,
            score: score,
        } as FuzzyResult
        if (includeMatches) {
            result.intervals = intervals
        }
        return result;
    }

    // render will modify the text according to the different parameter set in the conf.
    // If nothing is set, then it will return the text not modified.
    render(text: string, intervals: FuzzyMatchingInterval[], conf?: FuzzyConfiguration): string {
        if (intervals.length == 0) {
            return text
        }

        let rendered = ''
        const pre = conf?.pre ? conf.pre : this.conf.pre
        const post = conf?.post ? conf.post : this.conf.post
        for (let i = 0; i < intervals.length; i++) {
            const currentInterval = intervals[i]
            const previousNotMatchingInterval = calculatePreviousNotMatchingInterval(intervals, i);
            let previousStr = ''
            if (previousNotMatchingInterval !== null) {
                previousStr = this.extractSubString(text, previousNotMatchingInterval, conf)
            }
            const currentStr = this.extractSubString(text, currentInterval, conf)
            rendered = `${rendered}${previousStr}${pre}${currentStr}${post}`
        }

        // check if the last interval contains the end of the string. Otherwise, add it
        const lastInterval = intervals[intervals.length - 1]
        if (lastInterval.to < text.length - 1) {
            rendered = rendered + this.extractSubString(text, { from: lastInterval.to + 1, to: text.length }, conf)
        }
        return rendered
    }

    private extractSubString(text: string, interval: FuzzyMatchingInterval, conf?: FuzzyConfiguration) {
        const shouldEscape = conf?.escapeHTML !== undefined ? conf.escapeHTML : this.conf.escapeHTML;
        let str = text.substr(interval.from, intervalSize(interval))
        if (shouldEscape) {
            str = escapeHTML(str)
        }
        return str
    }

    // generateMatchingInterval will iterate other the given text to find the different char that matched the given pattern
    private generateMatchingInterval(pattern: string, text: string, idxText: number, conf?: FuzzyConfiguration): null | {
        score: number;
        intervals: FuzzyMatchingInterval[]
    } {
        let excludedChars: string[] = []
        if (conf?.excludedChars !== undefined) {
            excludedChars = conf.excludedChars
        } else if (this.conf.excludedChars !== undefined) {
            excludedChars = this.conf.excludedChars
        }
        let patternIdx = 0;
        const intervals = [];
        for (let i = idxText; i < text.length && patternIdx < pattern.length;) {
            if (excludedChars.includes(text[i])) {
                i++
                continue
            }
            if (excludedChars.includes(pattern[patternIdx])) {
                patternIdx++
                continue
            }
            if (text[i] === pattern[patternIdx]) {
                const interval = { from: i, to: i }
                patternIdx++;
                i++;
                for (let j = i; j < text.length && patternIdx < pattern.length && text[j] === pattern[patternIdx]; j++) {
                    interval.to = j
                    patternIdx++
                    i = j
                }
                intervals.push(interval)
            }
            i++;
        }
        if (intervals.length === 0 || patternIdx !== pattern.length) {
            return null;
        }
        return { score: score(intervals, text.length), intervals: intervals }
    }
}

const fuz = new Fuzzy()

export function filter(pattern: string, list: string[], conf?: FuzzyConfiguration): FuzzyResult[] {
    return fuz.filter(pattern, list, conf)
}

export function match(pattern: string, text: string, conf?: FuzzyConfiguration): FuzzyResult | null {
    return fuz.match(pattern, text, conf)
}

export function render(text: string, intervals: FuzzyMatchingInterval[], conf?: FuzzyConfiguration): string {
    return fuz.render(text, intervals, conf)
}
