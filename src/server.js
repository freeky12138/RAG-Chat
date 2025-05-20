// FILEPATH: c:/Users/10626/node/src/server.js
import express from "express";
import cors from "cors";
import { getRagChain } from "./index.js"; // 导入获取RagChain实例的函数

const app = express(); // 创建Express应用
const port = 8080; // 定义服务器端口

app.use(cors({
  origin: 'http://127.0.0.1:8081', // 允许所有来源
  methods: ['GET', 'POST', 'OPTIONS'], // 允许的请求方法
  allowedHeaders: ['Content-Type', 'Authorization'], // 允许的请求头
}));
app.options('/', cors()); // 处理预检请求
app.use(express.json()); // 使用JSON中间件解析请求体

// 定义POST请求处理
app.post("/", async (req, res) => {
  const ragChain = await getRagChain(); // 获取RagChain实例
  const body = req.body; // 获取请求体
  const result = await ragChain.stream(
    { 
      question: body.question, // 从请求体中获取问题
    },
    { configurable: { sessionId: body.session_id } } // 从请求体中获取会话ID
  );

  res.set("Content-Type", "text/plain"); // 设置响应头
  for await (const chunk of result) {
    res.write(chunk); // 将流数据写入响应
  }
  res.end(); // 结束响应
});

// 启动服务器并监听端口
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});