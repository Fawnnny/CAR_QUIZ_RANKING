// Cloudflare Pages Function - 获取排行榜API
// 路径: /functions/api/leaderboard.js
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
    const sortBy = url.searchParams.get('sortBy') || 'total';
    
    // 获取KV存储
    const kv = env.QUIZ_LEADERBOARD;
    
    // 从KV获取所有用户档案
    let allProfiles = [];
    
    try {
      // 列出所有以 'user-profile-' 开头的key
      const keys = await kv.list({ prefix: 'user-profile-' });
      
      // 批量获取所有用户档案
      const profilePromises = keys.keys.map(key => kv.get(key.name));
      const profileData = await Promise.all(profilePromises);
      
      // 解析JSON数据
      allProfiles = profileData
        .filter(data => data !== null)
        .map(data => JSON.parse(data))
        .filter(profile => profile && profile.username);
      
    } catch (error) {
      console.error('Error reading user profiles:', error);
    }
    
    // 根据排序方式计算排行榜分数
    let leaderboardData = allProfiles.map(profile => {
      let score = 0;
      
      switch (sortBy) {
        case 'level':
          // 按等级排序，等级高的在前
          score = profile.level * 1000 + (profile.exp || 0);
          break;
          
        case 'courses':
          // 按完成课程数量排序
          const completedCourses = Object.values(profile.courses || {}).filter(course => course.completed).length;
          score = completedCourses * 100;
          // 如果课程数量相同，按平均分排序
          const courseScores = Object.values(profile.courses || {}).map(c => c.highScore || 0);
          const avgScore = courseScores.length > 0 ? 
            courseScores.reduce((a, b) => a + b, 0) / courseScores.length : 0;
          score += avgScore;
          break;
          
        case 'score':
          // 按总分排序
          const totalScore = Object.values(profile.courses || {}).reduce((sum, course) => sum + (course.highScore || 0), 0);
          score = totalScore;
          break;
          
        case 'total':
        default:
          // 按总经验值排序（计算历史总经验）
          let totalExp = profile.exp || 0;
          // 加上之前等级的经验
          for (let i = 1; i < profile.level; i++) {
            totalExp += Math.floor(100 * Math.pow(1.5, i - 1));
          }
          // 加上课程经验（假设每分=1经验）
          Object.values(profile.courses || {}).forEach(course => {
            totalExp += (course.highScore || 0);
          });
          score = totalExp;
          break;
      }
      
      return {
        username: profile.username,
        level: profile.level || 1,
        exp: profile.exp || 0,
        coins: profile.coins || 0,
        intelligence: profile.intelligence || 0,
        strength: profile.strength || 0,
        charm: profile.charm || 0,
        completedCourses: Object.values(profile.courses || {}).filter(c => c.completed).length,
        totalQuizzes: profile.totalQuizzes || 0,
        score: Math.round(score),
        time: 0 // 暂时不存储时间
      };
    });
    
    // 按分数降序排序
    leaderboardData.sort((a, b) => b.score - a.score);
    
    // 限制返回数量
    const limitedLeaderboard = leaderboardData.slice(0, limit);
    
    return new Response(JSON.stringify({
      success: true,
      leaderboard: limitedLeaderboard,
      total: leaderboardData.length,
      sortBy: sortBy
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