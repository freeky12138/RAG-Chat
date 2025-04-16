import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { FaissStore } from "@langchain/community/vectorstores/faiss"; 
import * as dotenv from "dotenv";
import { createRequire } from 'module';

// 解决CJS模块兼容性
const require = createRequire(import.meta.url);
const { FaissStore: FaissNative } = require('faiss-node');

dotenv.config();

const run = async () => {
  // 加载文档
  const loader = new TextLoader("./data/word.txt");
  const docs = await loader.load();

  // 分割文档
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 100,
    chunkOverlap: 20,
  });
  const splitDocs = await splitter.splitDocuments(docs);

  // 生成向量存储
  // const embeddings = new OpenAIEmbeddings({
  //   openAIApiKey: process.env.OPENAI_API_KEY,
  //   configuration: {
  //       baseURL: "https://api.chatanywhere.tech/v1"
  //   }
  // });
  // const vectorStore = await FaissStore.fromDocuments(
  //   splitDocs,
  //   embeddings
  // );

  // // 保存向量数据库
  // const directory = "./db/kongyiji";
  // await vectorStore.save(directory);
  console.log(splitDocs);
};

run().catch(console.error);