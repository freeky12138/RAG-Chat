/** 私域数据库来构建 rag chatbot */
/** Time： 2025/4/13 */

import {ChatOpenAI, OpenAIEmbeddings} from "@langchain/openai";
import {RunnablePassthrough, RunnableSequence, RunnableWithMessageHistory} from "@langchain/core/runnables";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { HttpsProxyAgent } from "https-proxy-agent";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { JSONChatHistory } from "../JSONChatHistory/index.js";
import * as dotenv from "dotenv";
import * as path from "node:path";
dotenv.config();  

// 创建代理Agent（根据你的Clash端口配置）
const proxy = process.env.PROXY_URL;  // Clash默认HTTP代理端口
const agent = new HttpsProxyAgent(proxy);

async function loadVectorStore() {
    const directory = "./db/qiu"
    const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
        configuration: { 
            baseURL: "https://api.chatanywhere.tech/v1",
            httpAgent: agent,
            httpsAgent: agent
        }
    });
    let vectorStore;
    vectorStore = await FaissStore.load(directory, embeddings);

    return vectorStore;
}

/**
 * 创建一个重述问题的链
 * @returns {Promise<RunnableSequence>} 返回一个重述问题的链
 */
async function getRephraseChain() {
    const rephraseChainPrompt = ChatPromptTemplate.fromMessages([
        [
            "system",
            "给定以下对话和一个后续问题，请将后续问题重述为一个独立的问题。请注意，重述的问题应该包含足够的信息，使得没有看过对话历史的人也能理解。",
        ],
        new MessagesPlaceholder("history"),
        ["human", "将以下问题重述为一个独立的问题：\n{question}"],
    ]);
    let rephraseChain;
    rephraseChain = RunnableSequence.from([
        rephraseChainPrompt,
        new ChatOpenAI({
            temperature: 0.2,
            openAIApiKey: process.env.OPENAI_API_KEY,
            configuration: {
                baseURL: "https://api.chatanywhere.tech/v1",
                httpAgent: agent,
                httpsAgent: agent
            }
        }),
        new StringOutputParser(),
    ]);

    return rephraseChain;
}

/**
 * 获取RAG链
 * @returns {Promise<RunnableWithMessageHistory>} 返回一个带有消息历史记录的RAG链
 */
export async function getRagChain() {
    const vectorStore = await loadVectorStore();
    const rephraseChain = await getRephraseChain();

    // 从 vectorstore 获取到一个 retriever 实例 (2指的是最相关的两条数据)
    const retriever = vectorStore.asRetriever(2)

    // 将结果处理成普通文本
    const convertDocsToString = (documents) => {
        return documents.map(doc => doc.pageContent).join('\n')
    }

    // 构建获取数据库中上下文的chain
    // contextRetriverChain 接收一个 input 对象作为输入，
    // 然后从中获得 question 属性，
    // 然后传递给 retriever，
    // 返回的 Document 对象输入作为参数传递给 convertDocsToString 然后被转换成纯文本。
    const contextRetriverChain = RunnableSequence.from([
        (input) => input.question,
        retriever,
        convertDocsToString
    ])

    // 构建用户提问的template
    const TEMPLATE = `
    你是一个熟读刘慈欣的《球状闪电》的终极原著党，精通根据作品原文详细解释和回答问题，你在回答时会引用作品原文并且回答时仅根据原文尽可能回答用户的问题，如果原文中没有相关内容，你可以回答“原文中没有相关内容”，
    
    以下是原文中跟用户回答相关的内容：
    {context}`;

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", TEMPLATE],
        new MessagesPlaceholder("history"),
        ["human", "现在，你需要基于原文，回答以下问题：\n{question}"]
    ])

    // 创建LLM模型
    const model = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        configuration: {
            baseURL: "https://api.chatanywhere.tech/v1",
            httpAgent: agent,
            httpsAgent: agent
        }
    });

    // 组装成完整的Chain
    const ragChain = RunnableSequence.from([
        RunnablePassthrough.assign({
            // 根据改写后的提问
            standalone_question: rephraseChain,
        }),
        RunnablePassthrough.assign({
            context: contextRetriverChain,
        }),
        prompt,
        model,
        new StringOutputParser()
    ])

    const chatHistoryDir = "./chat_data"

    // 增加聊天记录功能
    let ragChainWithHistory;
    ragChainWithHistory = new RunnableWithMessageHistory({
        runnable: ragChain,
        getMessageHistory: (sessionId) => new JSONChatHistory({sessionId, dir: chatHistoryDir}),
        historyMessagesKey: "history",
        inputMessagesKey: "question",
    });

    return ragChainWithHistory
}

async function run() {
    const ragChain = await getRagChain();

    const res = await ragChain.invoke(
        {
            //   question: "什么是球状闪电？",
            question: "这个现象在文中有什么故事",
        },
        {
            configurable: { sessionId: "test-history" },
        }
    );

    console.log(res);
}

run();
