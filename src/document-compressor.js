import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { LLMChainExtractor } from "langchain/retrievers/document_compressors/chain_extract";
import { FaissStore } from "@langchain/community/vectorstores/faiss"; 
import * as dotenv from "dotenv";
import { createRequire } from 'module';
import { ContextualCompressionRetriever } from "langchain/retrievers/contextual_compression";

// 解决CJS模块兼容性
const require = createRequire(import.meta.url);
const { FaissStore: FaissNative } = require('faiss-node');

// 让整个执行过程中所有 langchain 组件都打印其中的过程
process.env.LANGCHAIN_VERBOSE = "true";

dotenv.config();

const run = async () => {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    configuration: {
        baseURL: "https://api.chatanywhere.tech/v1"
    }
  });
  const directory = "./db/kongyiji";
  const embeddings = new OpenAIEmbeddings();
  const vectorstore = await FaissStore.load(directory, embeddings);
  // 创建一个从 Document 中提取核心内容的 compressor
  const compressor = LLMChainExtractor.fromLLM(model);

  const retriever = new ContextualCompressionRetriever({
    baseCompressor: compressor,
    baseRetriever: vectorstore.asRetriever(2),
  });

  console.log(retriever.invoke("茴香豆是做什么用的"))
};

run().catch(console.error);