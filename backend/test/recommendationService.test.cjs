const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidMatchData } = require('../services/recommendationService');

const validMatch = {
    matchScore: 82,
    matchReason: '兴趣和价值观相近',
    icebreakers: ['周末喜欢做什么？', '最近看了什么电影？', '最想去哪里旅行？'],
};

test('accepts valid AI match output', () => {
    assert.equal(isValidMatchData(validMatch), true);
});

test('rejects invalid scores and malformed content', () => {
    for (const matchScore of [-1, 101, 82.5, NaN, '82']) {
        assert.equal(isValidMatchData({ ...validMatch, matchScore }), false);
    }

    assert.equal(isValidMatchData({ ...validMatch, matchReason: '' }), false);
    assert.equal(isValidMatchData({ ...validMatch, icebreakers: ['', 'a', 'b'] }), false);
    assert.equal(isValidMatchData({ ...validMatch, icebreakers: ['a', 'b'] }), false);
});
