// Cloudflare Pages Function - 提交分数API
// 路径: /functions/api/submit-score.js
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
    
    const { 
      username, 
      score, 
      time, 
      courseName,
      rewards // 新增：包含exp, coins, intelligence, strength, charm
    } = data;
    
    // 验证输入
    if (!username || typeof score !== 'number') {
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
    
    // 用户档案key
    const userKey = `user-profile-${username}`;
    
    // 获取现有用户档案
    let userProfile = {
      username: username,
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      coins: 0,
      intelligence: 0,
      strength: 0,
      charm: 0,
      courses: {},
      totalQuizzes: 0,
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };
    
    try {
      const existingData = await kv.get(userKey);
      if (existingData) {
        userProfile = JSON.parse(existingData);
      }
    } catch (error) {
      console.error('Error reading user profile:', error);
    }
    
    // 更新用户档案
    userProfile.lastUpdated = Date.now();
    
    // 应用奖励
    if (rewards) {
      userProfile.exp += rewards.exp || 0;
      userProfile.coins += rewards.coins || 0;
      userProfile.intelligence += rewards.intelligence || 0;
      userProfile.strength += rewards.strength || 0;
      userProfile.charm += rewards.charm || 0;
    }
    
    // 检查升级
    while (userProfile.exp >= userProfile.expToNextLevel) {
      userProfile.level++;
      userProfile.exp -= userProfile.expToNextLevel;
      userProfile.expToNextLevel = Math.floor(userProfile.expToNextLevel * 1.5);
      
      // 升级奖励
      userProfile.coins += userProfile.level * 10;
      userProfile.intelligence += Math.floor(Math.random() * 2) + 1;
      userProfile.strength += Math.floor(Math.random() * 2) + 1;
      userProfile.charm += Math.floor(Math.random() * 2) + 1;
    }
    
    // 更新课程记录
    if (courseName) {
      if (!userProfile.courses[courseName]) {
        userProfile.courses[courseName] = {
          highScore: 0,
          attempts: 0,
          lastScore: 0,
          bestTime: Infinity,
          lastTime: time || 0,
          completed: false
        };
      }
      
      const course = userProfile.courses[courseName];
      course.attempts++;
      course.lastScore = score;
      course.lastTime = time || 0;
      
      // 更新最高分
      if (score > course.highScore) {
        course.highScore = score;
      }
      
      // 更新最佳时间
      if (time && time < course.bestTime) {
        course.bestTime = time;
      }
      
      // 如果分数达到60分，标记为完成
      if (score >= 60) {
        course.completed = true;
      }
    }
    
    // 更新总答题次数
    userProfile.totalQuizzes++;
    
    // 保存到KV
    await kv.put(userKey, JSON.stringify(userProfile));
    
    // 计算用户排名
    const rankData = await calculateUserRank(kv, username, 'total');
    
    // 获取排行榜前20名用于即时显示
    const leaderboardData = await getTopLeaderboard(kv, 20, 'total');
    
    return new Response(JSON.stringify({
      success: true,
      rank: rankData.rank,
      profile: {
        username: userProfile.username,
        level: userProfile.level,
        exp: userProfile.exp,
        expToNextLevel: userProfile.expToNextLevel,
        coins: userProfile.coins,
        intelligence: userProfile.intelligence,
        strength: userProfile.strength,
        charm: userProfile.charm
      },
      leaderboard: leaderboardData,
      message: "成绩已保存"
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

// 计算用户排名
async function calculateUserRank(kv, username, sortBy = 'total') {
  // 获取所有用户档案
  let allProfiles = [];
  
  try {
    const keys = await kv.list({ prefix: 'user-profile-' });
    const profilePromises = keys.keys.map(key => kv.get(key.name));
    const profileData = await Promise.all(profilePromises);
    
    allProfiles = profileData
      .filter(data => data !== null)
      .map(data => JSON.parse(data))
      .filter(profile => profile && profile.username);
      
  } catch (error) {
    console.error('Error reading user profiles for ranking:', error);
    return { rank: null, total: 0 };
  }
  
  // 根据排序方式计算分数并排序
  const profilesWithScore = allProfiles.map(profile => {
    let score = 0;
    
    switch (sortBy) {
      case 'level':
        score = profile.level * 1000 + (profile.exp || 0);
        break;
        
      case 'courses':
        const completedCourses = Object.values(profile.courses || {}).filter(course => course.completed).length;
        score = completedCourses * 100;
        const courseScores = Object.values(profile.courses || {}).map(c => c.highScore || 0);
        const avgScore = courseScores.length > 0 ? 
          courseScores.reduce((a, b) => a + b, 0) / courseScores.length : 0;
        score += avgScore;
        break;
        
      case 'score':
        const totalScore = Object.values(profile.courses || {}).reduce((sum, course) => sum + (course.highScore || 0), 0);
        score = totalScore;
        break;
        
      case 'total':
      default:
        let totalExp = profile.exp || 0;
        for (let i = 1; i < profile.level; i++) {
          totalExp += Math.floor(100 * Math.pow(1.5, i - 1));
        }
        Object.values(profile.courses || {}).forEach(course => {
          totalExp += (course.highScore || 0);
        });
        score = totalExp;
        break;
    }
    
    return {
      username: profile.username,
      score: Math.round(score)
    };
  });
  
  // 按分数降序排序
  profilesWithScore.sort((a, b) => b.score - a.score);
  
  // 查找用户排名
  const userIndex = profilesWithScore.findIndex(entry => entry.username === username);
  
  if (userIndex === -1) {
    return { rank: null, total: profilesWithScore.length };
  }
  
  return { 
    rank: userIndex + 1, 
    total: profilesWithScore.length,
    score: profilesWithScore[userIndex].score
  };
}

// 获取排行榜前N名
async function getTopLeaderboard(kv, limit = 20, sortBy = 'total') {
  // 获取所有用户档案
  let allProfiles = [];
  
  try {
    const keys = await kv.list({ prefix: 'user-profile-' });
    const profilePromises = keys.keys.map(key => kv.get(key.name));
    const profileData = await Promise.all(profilePromises);
    
    allProfiles = profileData
      .filter(data => data !== null)
      .map(data => JSON.parse(data))
      .filter(profile => profile && profile.username);
      
  } catch (error) {
    console.error('Error reading user profiles for leaderboard:', error);
    return [];
  }
  
  // 根据排序方式计算排行榜数据
  let leaderboardData = allProfiles.map(profile => {
    let score = 0;
    
    switch (sortBy) {
      case 'level':
        score = profile.level * 1000 + (profile.exp || 0);
        break;
        
      case 'courses':
        const completedCourses = Object.values(profile.courses || {}).filter(course => course.completed).length;
        score = completedCourses * 100;
        const courseScores = Object.values(profile.courses || {}).map(c => c.highScore || 0);
        const avgScore = courseScores.length > 0 ? 
          courseScores.reduce((a, b) => a + b, 0) / courseScores.length : 0;
        score += avgScore;
        break;
        
      case 'score':
        const totalScore = Object.values(profile.courses || {}).reduce((sum, course) => sum + (course.highScore || 0), 0);
        score = totalScore;
        break;
        
      case 'total':
      default:
        let totalExp = profile.exp || 0;
        for (let i = 1; i < profile.level; i++) {
          totalExp += Math.floor(100 * Math.pow(1.5, i - 1));
        }
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
      time: 0
    };
  });
  
  // 按分数降序排序并限制数量
  leaderboardData.sort((a, b) => b.score - a.score);
  return leaderboardData.slice(0, limit);
}