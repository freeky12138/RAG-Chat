/** 私域数据库来构建 rag chatbot */ 
/** Time： 2025/4/13 */

import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import * as dotenv from "dotenv";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
dotenv.config();

// 加载文档
const loader = new TextLoader("./data/qiu.txt");
const docs = await loader.load();

// 分割文档
const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 100,
});
const splitDocs = await splitter.splitDocuments(docs);

// 创建embedding模型
const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    configuration: {
        baseURL: "https://api.chatanywhere.tech/v1"
    }
});

// 创建LLM模型
const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    configuration: {
        baseURL: "https://api.chatanywhere.tech/v1"
    }
});

// 对数据块中每一个数据调用embedding模型并存储在内存的store中
const vectorStore = new MemoryVectorStore(embeddings)
await vectorStore.addDocuments(splitDocs)

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
{context}

现在，你需要基于原文，回答以下问题：
{question}`;

const prompt = ChatPromptTemplate.fromTemplate(TEMPLATE)

// 组装成完整的Chain
const ragChain = RunnableSequence.from([
    {
        context: contextRetriverChain,
        question: (input) => input.question,
    },
    prompt,
    model,
    new StringOutputParser()
])

try {
    const res = await ragChain.invoke({
        question:"原文中，谁提出了宏原子的假设？并详细介绍给我宏原子假设的理论"
    })
    console.log(res);
} catch (error) {
    console.error("[ERROR] Full error details:", error);
}
