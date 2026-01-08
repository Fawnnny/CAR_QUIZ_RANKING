// Cloudflare Pages Function - 提交分数API
export async function onRequest(context) {
  // 处理CORS预检请求
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // 只处理POST请求
  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const { request, env } = context;
    const data = await request.json();
    
    const { username, score, time } = data;
    
    // 验证输入
    if (!username || typeof score !== 'number' || typeof time !== 'number') {
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // 获取KV存储
    const kv = env.QUIZ_LEADERBOARD;
    
    // 获取现有排行榜
    let leaderboard = [];
    try {
      const existingData = await kv.get('leaderboard');
      if (existingData) {
        leaderboard = JSON.parse(existingData);
      }
    } catch (error) {
      console.error('Error reading leaderboard:', error);
    }
    
    // 查找是否已存在该用户名的记录
    const existingIndex = leaderboard.findIndex(entry => entry.username === username);
    
    // 准备新记录
    const newEntry = {
      username,
      score,
      time,
      timestamp: Date.now()
    };
    
    if (existingIndex !== -1) {
      // 如果已存在，检查是否需要更新
      const existingEntry = leaderboard[existingIndex];
      if (score > existingEntry.score || 
          (score === existingEntry.score && time < existingEntry.time)) {
        // 新成绩更好，更新记录
        leaderboard[existingIndex] = newEntry;
      }
    } else {
      // 新用户，添加记录
      leaderboard.push(newEntry);
    }
    
    // 按分数降序、时间升序排序
    leaderboard.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.time - b.time;
    });
    
    // 只保留前100名（可选）
    if (leaderboard.length > 100) {
      leaderboard = leaderboard.slice(0, 100);
    }
    
    // 保存到KV
    await kv.put('leaderboard', JSON.stringify(leaderboard));
    
    // 计算用户排名
    const userRank = leaderboard.findIndex(entry => entry.username === username) + 1;
    
    return new Response(JSON.stringify({
      success: true,
      rank: userRank,
      leaderboard: leaderboard.slice(0, 20) // 返回前20名用于即时显示
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
    
  } catch (error) {
    console.error('Error submitting score:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}