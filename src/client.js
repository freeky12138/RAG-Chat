// FILEPATH: c:/Users/10626/node/src/client.js
const port = 8080;

/**
 * 异步函数，用于从服务器获取流数据并在控制台输出
 */
async function fetchStream() {
  // 发送POST请求到服务器
  const response = await fetch(`http://localhost:${port}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      question: "什么是球状闪电",
      session_id: "test-server",
    }),
  });

  // 获取响应体的读取器
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  // 循环读取流数据并输出到控制台
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.log(decoder.decode(value));
  }

  // 输出流结束的消息
  console.log("Stream has ended");
}

// 调用fetchStream函数
fetchStream();