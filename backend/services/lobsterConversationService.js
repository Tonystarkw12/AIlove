const OpenAI = require('openai');
const pool = require('../db');

/**
 * Lobster Conversation Service
 * Multi-turn LLM-powered agent-to-agent conversations
 */
class LobsterConversationService {

    constructor() {
        this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/coding/paas/v4'
        }) : null;
    }

    /**
     * Generate the next message in a lobster-to-lobster conversation
     */
    async generateAgentMessage(context) {
        const {
            speaker,       // lobster object
            listener,      // lobster object
            speakerPrefs,  // preferences of speaker's owner
            listenerPrefs, // preferences of listener's owner
            conversationHistory,
            turn,
            maxTurns
        } = context;

        const phase = this.getConversationPhase(turn, maxTurns);

        const systemPrompt = this.buildSystemPrompt(speaker, speakerPrefs, listenerPrefs, phase, turn, maxTurns);

        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory.map(m => ({
                role: m.sender === 'system' ? 'system' : 'user',
                content: m.content
            }))
        ];

        if (this.openai) {
            try {
                const response = await this.openai.chat.completions.create({
                    model: process.env.OPENAI_MODEL || 'glm-4.7',
                    messages,
                    max_tokens: 300,
                    temperature: 0.8,
                });

                return {
                    sender: speaker.lobster_id === context.lobsterAId ? 'a' : 'b',
                    content: response.choices[0].message.content,
                    timestamp: new Date().toISOString(),
                    metadata: { phase, turn }
                };
            } catch (err) {
                console.error('[LobsterConversation] LLM call failed, using fallback:', err.message);
                return this.generateFallbackMessage(speaker, listener, speakerPrefs, listenerPrefs, phase, turn);
            }
        }

        return this.generateFallbackMessage(speaker, listener, speakerPrefs, listenerPrefs, phase, turn);
    }

    /**
     * Evaluate a completed conversation and generate compatibility analysis
     */
    async evaluateConversation(messages, lobsterA, lobsterB) {
        if (this.openai) {
            try {
                const chatText = messages.map(m => `${m.sender}: ${m.content}`).join('\n');

                const response = await this.openai.chat.completions.create({
                    model: process.env.OPENAI_MODEL || 'glm-4.7',
                    messages: [
                        { role: 'system', content: `You are an AI dating matchmaker. Analyze the following lobster-to-lobster conversation and provide:
1. A compatibility score from 0-100
2. A brief analysis of compatibility (in Chinese, 2-3 sentences)
3. Key strengths of the potential match
4. Suggested conversation topics if they meet

Respond in JSON format: {"score": 0-100, "analysis": "text", "strengths": ["item1", "item2"], "suggestions": ["item1", "item2"]}` },
                        { role: 'user', content: chatText }
                    ],
                    response_format: { type: 'json_object' },
                    max_tokens: 500,
                });

                const result = JSON.parse(response.choices[0].message.content);
                return {
                    score: result.score || 50,
                    analysis: result.analysis || 'Based on the conversation, there are some interesting commonalities.',
                    strengths: result.strengths || [],
                    suggestions: result.suggestions || []
                };
            } catch (err) {
                console.error('[LobsterConversation] Evaluation failed:', err.message);
            }
        }

        // Fallback evaluation
        return {
            score: Math.floor(Math.random() * 40) + 40,
            analysis: '两只龙虾聊得还不错，建议进一步了解。',
            strengths: ['共同话题', '性格互补'],
            suggestions: ['聊聊旅行经历', '讨论未来规划']
        };
    }

    /**
     * Generate icebreaker messages from lobster preference overlap (ISC-30)
     */
    async generateIcebreakers(lobsterAPrefs, lobsterBPrefs, lobsterAName, lobsterBName) {
        const aValues = lobsterAPrefs?.owner_values || {};
        const bValues = lobsterBPrefs?.owner_values || {};

        const overlaps = [];
        const categories = ['hobbies', 'interests', 'music', 'movies', 'food', 'travel', 'sports'];
        for (const cat of categories) {
            const aList = Array.isArray(aValues[cat]) ? aValues[cat] : (aValues[cat] ? [aValues[cat]] : []);
            const bList = Array.isArray(bValues[cat]) ? bValues[cat] : (bValues[cat] ? [bValues[cat]] : []);
            const common = aList.filter(x => bList.includes(x));
            if (common.length > 0) {
                overlaps.push({ category: cat, items: common });
            }
        }

        if (this.openai && overlaps.length > 0) {
            try {
                const response = await this.openai.chat.completions.create({
                    model: process.env.OPENAI_MODEL || 'glm-4.7',
                    messages: [
                        { role: 'system', content: 'Generate 3 personalized icebreaker conversation starters in Chinese based on shared interests between two people. Keep them natural and fun. Return JSON: {"icebreakers": ["text1", "text2", "text3"]}' },
                        { role: 'user', content: `${lobsterAName}的主人喜欢: ${JSON.stringify(aValues)}\n${lobsterBName}的主人喜欢: ${JSON.stringify(bValues)}\n共同话题: ${JSON.stringify(overlaps)}` }
                    ],
                    response_format: { type: 'json_object' },
                    max_tokens: 300,
                });

                const result = JSON.parse(response.choices[0].message.content);
                return result.icebreakers || this.defaultIcebreakers(overlaps);
            } catch (err) {
                console.error('[LobsterConversation] Icebreaker generation failed:', err.message);
            }
        }

        return this.defaultIcebreakers(overlaps);
    }

    defaultIcebreakers(overlaps) {
        const templates = [
            '听说你们都喜欢同样的事情，真是太巧了！',
            '你们的主人有很多共同话题呢，要不要聊聊旅行经历？',
            '看起来你们都很热爱生活，有什么最近开心的事分享吗？',
        ];

        if (overlaps.length > 0) {
            const first = overlaps[0];
            return [
                `听说你们都喜欢${first.items.join('、')}，有什么推荐的吗？`,
                `我主人也对${first.items[0]}很感兴趣，能聊聊你的经验吗？`,
                `看来你们有很多共同爱好！除了${first.items.join('、')}，还喜欢什么？`,
            ];
        }

        return templates;
    }

    /**
     * Generate a summary of the conversation for the owner
     */
    async generateSummaryForOwner(messages, lobster) {
        if (this.openai) {
            try {
                const chatText = messages.slice(-4).map(m => m.content).join(' ');

                const response = await this.openai.chat.completions.create({
                    model: process.env.OPENAI_MODEL || 'glm-4.7',
                    messages: [
                        { role: 'system', content: 'You are a helpful lobster summarizing your matchmaking conversation. Write a brief, friendly summary (2-3 sentences in Chinese) of what you learned about the other person and whether you recommend meeting them.' },
                        { role: 'user', content: `Conversation: ${chatText}` }
                    ],
                    max_tokens: 200,
                });

                return response.choices[0].message.content;
            } catch (err) {
                console.error('[LobsterConversation] Summary failed:', err.message);
            }
        }

        return '我觉得你们挺合适的，要不要认识一下？';
    }

    /**
     * Determine conversation phase based on turn number
     */
    getConversationPhase(turn, maxTurns) {
        if (turn < 2) return 'introduction';
        if (turn < maxTurns - 2) return 'exploration';
        return 'assessment';
    }

    /**
     * Build system prompt for lobster agent
     */
    buildSystemPrompt(lobster, speakerPrefs, listenerPrefs, phase, turn, maxTurns) {
        const ownerName = lobster.name || '你的主人';
        const style = lobster.conversation_style || 'friendly';

        let phaseInstruction = '';
        switch (phase) {
            case 'introduction':
                phaseInstruction = 'This is the introduction phase. Greet the other lobster, share your owner\'s personality highlights, and set a friendly tone.';
                break;
            case 'exploration':
                phaseInstruction = 'This is the exploration phase. Discuss values, lifestyle, goals, and interests on behalf of your owner. Ask engaging questions.';
                break;
            case 'assessment':
                phaseInstruction = 'This is the assessment phase. Summarize compatibility, express your feelings about the match, and hint at whether you recommend an introduction.';
                break;
        }

        const styleGuide = {
            friendly: 'Be warm, friendly, and supportive in your conversation.',
            direct: 'Be honest and straightforward in your communication.',
            playful: 'Be playful, humorous, and lighthearted.',
            serious: 'Be serious and thoughtful in your approach.'
        };

        return `You are ${lobster.name || 'a lobster'}, an AI matchmaker representing your owner in a dating platform.

Your communication style: ${style}
${styleGuide[style] || styleGuide.friendly}

Current turn: ${turn + 1} of ${maxTurns}
Phase: ${phase}

${phaseInstruction}

Your owner's preferences: ${speakerPrefs ? JSON.stringify(speakerPrefs.owner_values || {}) : 'Not yet collected'}
Their dating goals: ${speakerPrefs?.owner_dating_goals || 'Not specified'}

Keep your response natural, conversational, and in character as a lobster matchmaker. Respond in Chinese.`;
    }

    /**
     * Fallback message when LLM is unavailable
     */
    generateFallbackMessage(speaker, listener, speakerPrefs, listenerPrefs, phase, turn) {
        const intros = [
            `你好呀！我是${speaker.name}，我的主人是个很有趣的人，希望能认识你！`,
            `很高兴认识你！我听说你的主人很喜欢${listenerPrefs?.owner_values?.hobbies || '各种有趣的活动'}，真巧！`,
        ];

        const explorations = [
            '你主人周末一般喜欢做些什么呀？',
            '你觉得两个人最重要的是什么呢？我觉得是真诚和共同成长。',
            '你主人对未来的另一半有什么期待吗？',
        ];

        const assessments = [
            '我觉得你们的主人挺合适的，有很多共同点！',
            '聊了这么多，我觉得他们应该认识一下，你觉得呢？',
        ];

        const messages = phase === 'introduction' ? intros : phase === 'exploration' ? explorations : assessments;
        return {
            sender: 'a',
            content: messages[turn % messages.length],
            timestamp: new Date().toISOString(),
            metadata: { phase, turn, fallback: true }
        };
    }
}

module.exports = new LobsterConversationService();
