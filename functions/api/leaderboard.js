// Cloudflare Pages Function - 获取排行榜API
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

  // 只处理GET请求
  if (context.request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const { env, request } = context;
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    
    // 获取KV存储
    const kv = env.QUIZ_LEADERBOARD;
    
    // 从KV获取排行榜数据
    let leaderboard = [];
    try {
      const data = await kv.get('leaderboard');
      if (data) {
        leaderboard = JSON.parse(data);
      }
    } catch (error) {
      console.error('Error reading leaderboard:', error);
    }
    
    // 按分数降序、时间升序排序（确保顺序正确）
    leaderboard.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.time - b.time;
    });
    
    // 限制返回数量
    const limitedLeaderboard = leaderboard.slice(0, limit);
    
    return new Response(JSON.stringify({
      success: true,
      leaderboard: limitedLeaderboard,
      total: leaderboard.length
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60' // 缓存60秒
      },
    });
    
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}