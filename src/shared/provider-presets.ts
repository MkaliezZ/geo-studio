import type {Protocol} from './types';
export const providerPresets=[
 {name:'DeepSeek 改写 / 普通回答',protocol:'compatible-chat' as Protocol,baseUrl:'https://api.deepseek.com',model:'deepseek-flash'},
 {name:'DeepSeek 联网搜索',protocol:'deepseek-search' as Protocol,baseUrl:'https://api.deepseek.com/anthropic',model:'deepseek-flash'},
 {name:'OpenAI 联网 / 改写',protocol:'openai-responses' as Protocol,baseUrl:'https://api.openai.com/v1',model:''},
 {name:'Perplexity 联网 / 改写',protocol:'perplexity-agent' as Protocol,baseUrl:'https://api.perplexity.ai/v1',model:'fast'},
];
