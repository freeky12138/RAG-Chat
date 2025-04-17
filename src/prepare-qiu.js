import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { createRequire } from 'module';
import { HttpsProxyAgent } from "https-proxy-agent";
import * as dotenv from "dotenv";

const run = async () => {
  dotenv.config();

  // 解决CJS模块兼容性
  const require = createRequire(import.meta.url);
  const { FaissStore: FaissNative } = require('faiss-node');

  // 创建代理Agent（根据你的Clash端口配置）
  const proxy = process.env.PROXY_URL;  // Clash默认HTTP代理端口
  const agent = new HttpsProxyAgent(proxy);

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
      baseURL: "https://api.chatanywhere.tech/v1",
      httpAgent: agent,
      httpsAgent: agent
    }
  });

  // 对数据块中每一个数据调用embedding模型并
  // 1.存储在内存的store中
  // const vectorStore = new MemoryVectorStore(embeddings)
  // await vectorStore.addDocuments(splitDocs)

  // 2.存储在FaissStore中
  const vectorStore = await FaissStore.fromDocuments(splitDocs, embeddings);
  await vectorStore.save("./db/qiu");
};

run().catch(console.error);
