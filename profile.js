// 用户档案管理系统
// ==============================================

// 用户档案类
class UserProfile {
    constructor(username) {
        this.username = username;
        this.level = 1;
        this.exp = 0;
        this.expToNextLevel = 100;
        this.coins = 0;
        this.intelligence = 0;
        this.strength = 0;
        this.charm = 0;
        this.courses = {};
        this.totalQuizzes = 0;
        this.createdAt = Date.now();
        this.activeEffects = []; // 激活的道具效果
    }
    
    // 从JSON数据恢复
    static fromJSON(json) {
        const profile = new UserProfile(json.username);
        Object.assign(profile, json);
        return profile;
    }
    
    // 转换为JSON
    toJSON() {
        return {
            username: this.username,
            level: this.level,
            exp: this.exp,
            expToNextLevel: this.expToNextLevel,
            coins: this.coins,
            intelligence: this.intelligence,
            strength: this.strength,
            charm: this.charm,
            courses: this.courses,
            totalQuizzes: this.totalQuizzes,
            createdAt: this.createdAt,
            activeEffects: this.activeEffects
        };
    }
    
    // 增加经验值
    addExp(expAmount) {
        this.exp += expAmount;
        
        // 检查升级
        let leveledUp = false;
        let levelsGained = 0;
        
        while (this.exp >= this.expToNextLevel) {
            this.level++;
            this.exp -= this.expToNextLevel;
            this.expToNextLevel = Math.floor(this.expToNextLevel * 1.5);
            leveledUp = true;
            levelsGained++;
            
            // 升级奖励
            this.coins += this.level * 10;
            this.intelligence += Math.floor(Math.random() * 2) + 1;
            this.strength += Math.floor(Math.random() * 2) + 1;
            this.charm += Math.floor(Math.random() * 2) + 1;
        }
        
        return {
            leveledUp: leveledUp,
            levelsGained: levelsGained,
            newLevel: this.level,
            exp: this.exp,
            expToNextLevel: this.expToNextLevel
        };
    }
    
    // 完成课程
    completeCourse(courseName, score, time) {
        // 初始化课程记录
        if (!this.courses[courseName]) {
            this.courses[courseName] = {
                highScore: 0,
                attempts: 0,
                lastScore: 0,
                bestTime: Infinity,
                lastTime: time,
                completed: false
            };
        }
        
        const course = this.courses[courseName];
        course.attempts++;
        course.lastScore = score;
        course.lastTime = time;
        
        // 更新最高分
        if (score > course.highScore) {
            course.highScore = score;
        }
        
        // 更新最佳时间
        if (time < course.bestTime) {
            course.bestTime = time;
        }
        
        // 如果分数达到60分，标记为完成
        if (score >= 60) {
            course.completed = true;
        }
        
        // 计算奖励
        let rewards = this.calculateCourseRewards(score);
        
        // 应用活动效果（如经验/金币加倍）
        this.applyActiveEffects(rewards);
        
        // 应用奖励
        this.exp += rewards.exp;
        this.coins += rewards.coins;
        this.intelligence += rewards.intelligence;
        this.strength += rewards.strength;
        this.charm += rewards.charm;
        this.totalQuizzes++;
        
        // 检查升级
        const levelResult = this.addExp(0); // 只检查不添加额外经验
        
        return {
            profile: this,
            rewards: rewards,
            levelResult: levelResult,
            courseRecord: course
        };
    }
    
    // 计算课程奖励
    calculateCourseRewards(score) {
        // 基础奖励
        const baseExp = score;  // 每1分=1经验
        const baseCoins = Math.floor(score / 2);  // 每2分=1金币
        
        // 随机属性奖励 (0-3点)
        const randomIntelligence = Math.floor(Math.random() * 4);
        const randomStrength = Math.floor(Math.random() * 4);
        const randomCharm = Math.floor(Math.random() * 4);
        
        return {
            exp: baseExp,
            coins: baseCoins,
            intelligence: randomIntelligence,
            strength: randomStrength,
            charm: randomCharm
        };
    }
    
    // 应用活动效果
    applyActiveEffects(rewards) {
        this.activeEffects.forEach(effect => {
            if (effect.type === 'expMultiplier' && effect.active) {
                rewards.exp *= effect.value;
            }
            if (effect.type === 'coinMultiplier' && effect.active) {
                rewards.coins *= effect.value;
            }
            if (effect.type === 'lucky' && effect.active) {
                // 增加随机属性奖励
                rewards.intelligence += Math.floor(Math.random() * 2);
                rewards.strength += Math.floor(Math.random() * 2);
                rewards.charm += Math.floor(Math.random() * 2);
            }
            
            // 减少持续时间或使用次数
            if (effect.duration) {
                effect.duration--;
                if (effect.duration <= 0) {
                    effect.active = false;
                }
            }
            if (effect.uses) {
                effect.uses--;
                if (effect.uses <= 0) {
                    effect.active = false;
                }
            }
        });
        
        // 清理已失效的效果
        this.activeEffects = this.activeEffects.filter(effect => effect.active);
    }
    
    // 添加道具效果
    addItemEffect(item) {
        const effect = {
            type: '',
            value: 0,
            active: true,
            itemId: item.id,
            itemName: item.name
        };
        
        // 根据道具类型设置效果
        if (item.effect.intelligence) {
            effect.type = 'intelligence';
            effect.value = item.effect.intelligence;
            this.intelligence += effect.value;
        } else if (item.effect.strength) {
            effect.type = 'strength';
            effect.value = item.effect.strength;
            this.strength += effect.value;
        } else if (item.effect.charm) {
            effect.type = 'charm';
            effect.value = item.effect.charm;
            this.charm += effect.value;
        } else if (item.effect.expMultiplier) {
            effect.type = 'expMultiplier';
            effect.value = item.effect.expMultiplier;
            effect.duration = 1; // 持续1次课程
        } else if (item.effect.coinMultiplier) {
            effect.type = 'coinMultiplier';
            effect.value = item.effect.coinMultiplier;
            effect.duration = 1; // 持续1次课程
        } else if (item.effect.lucky) {
            effect.type = 'lucky';
            effect.value = true;
            effect.duration = 1; // 持续1次课程
        }
        
        // 如果是消耗品，不需要保存到活动效果
        if (!item.consumable) {
            this.activeEffects.push(effect);
        }
        
        return effect;
    }
    
    // 计算总经验值（用于排行榜）
    calculateTotalExp() {
        let totalExp = this.exp;
        
        // 加上之前等级所需的经验
        for (let i = 1; i < this.level; i++) {
            const levelExp = Math.floor(100 * Math.pow(1.5, i - 1));
            totalExp += levelExp;
        }
        
        // 加上课程奖励的经验（从课程记录中累加）
        Object.values(this.courses).forEach(course => {
            if (course.lastScore) {
                totalExp += course.lastScore; // 每门课程的经验值
            }
        });
        
        return totalExp;
    }
    
    // 计算总分（用于排行榜）
    calculateTotalScore() {
        let totalScore = 0;
        
        // 累加所有课程的最高分
        Object.values(this.courses).forEach(course => {
            totalScore += course.highScore || 0;
        });
        
        // 加上等级加成
        totalScore += this.level * 10;
        
        // 加上属性加成
        totalScore += Math.floor((this.intelligence + this.strength + this.charm) / 3);
        
        return totalScore;
    }
    
    // 获取课程进度百分比
    getCourseProgress(courseName) {
        if (!this.courses[courseName]) {
            return 0;
        }
        
        const course = this.courses[courseName];
        const progress = (course.highScore || 0) / 100 * 100; // 假设满分100分
        
        return Math.min(progress, 100);
    }
    
    // 获取已完成课程数量
    getCompletedCoursesCount() {
        return Object.values(this.courses).filter(course => course.completed).length;
    }
    
    // 获取平均分
    getAverageScore() {
        const coursesWithScore = Object.values(this.courses).filter(course => course.highScore > 0);
        
        if (coursesWithScore.length === 0) {
            return 0;
        }
        
        const totalScore = coursesWithScore.reduce((sum, course) => sum + course.highScore, 0);
        return Math.round(totalScore / coursesWithScore.length);
    }
}

// 用户档案管理器
const UserProfileManager = {
    // 加载用户档案
    loadProfile(username) {
        const savedProfile = localStorage.getItem(`user-profile-${username}`);
        
        if (savedProfile) {
            try {
                const profileData = JSON.parse(savedProfile);
                return UserProfile.fromJSON(profileData);
            } catch (error) {
                console.error('加载用户档案失败:', error);
                return new UserProfile(username);
            }
        } else {
            return new UserProfile(username);
        }
    },
    
    // 保存用户档案
    saveProfile(profile) {
        try {
            localStorage.setItem(`user-profile-${profile.username}`, JSON.stringify(profile.toJSON()));
            console.log('用户档案已保存:', profile.username);
            return true;
        } catch (error) {
            console.error('保存用户档案失败:', error);
            return false;
        }
    },
    
    // 删除用户档案
    deleteProfile(username) {
        localStorage.removeItem(`user-profile-${username}`);
    },
    
    // 获取所有用户档案（用于排行榜）
    getAllProfiles() {
        const profiles = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('user-profile-')) {
                try {
                    const profileData = JSON.parse(localStorage.getItem(key));
                    const profile = UserProfile.fromJSON(profileData);
                    profiles.push(profile);
                } catch (error) {
                    console.warn(`解析用户档案失败: ${key}`, error);
                }
            }
        }
        
        return profiles;
    },
    
    // 获取排行榜数据
    getLeaderboardData(sortBy = 'total') {
        const allProfiles = this.getAllProfiles();
        
        // 根据排序方式排序
        switch (sortBy) {
            case 'level':
                // 按等级排序
                allProfiles.sort((a, b) => {
                    if (b.level !== a.level) {
                        return b.level - a.level;
                    }
                    return b.exp - a.exp;
                });
                break;
                
            case 'courses':
                // 按完成课程数量排序
                allProfiles.sort((a, b) => {
                    const aCourses = a.getCompletedCoursesCount();
                    const bCourses = b.getCompletedCoursesCount();
                    if (bCourses !== aCourses) {
                        return bCourses - aCourses;
                    }
                    return b.calculateTotalScore() - a.calculateTotalScore();
                });
                break;
                
            case 'score':
                // 按总分排序
                allProfiles.sort((a, b) => {
                    return b.calculateTotalScore() - a.calculateTotalScore();
                });
                break;
                
            case 'total':
            default:
                // 按总经验值排序
                allProfiles.sort((a, b) => {
                    return b.calculateTotalExp() - a.calculateTotalExp();
                });
                break;
        }
        
        // 转换为排行榜格式
        return allProfiles.map((profile, index) => {
            let score;
            
            switch (sortBy) {
                case 'level':
                    score = profile.level * 100 + profile.exp;
                    break;
                case 'courses':
                    score = profile.getCompletedCoursesCount() * 100 + profile.getAverageScore();
                    break;
                case 'score':
                    score = profile.calculateTotalScore();
                    break;
                case 'total':
                default:
                    score = profile.calculateTotalExp();
                    break;
            }
            
            return {
                username: profile.username,
                level: profile.level,
                exp: profile.exp,
                coins: profile.coins,
                intelligence: profile.intelligence,
                strength: profile.strength,
                charm: profile.charm,
                completedCourses: profile.getCompletedCoursesCount(),
                totalQuizzes: profile.totalQuizzes,
                score: Math.round(score),
                time: 0 // 本地排行榜暂无时间
            };
        });
    },
    
    // 获取用户排名
    getUserRank(username, sortBy = 'total') {
        const leaderboardData = this.getLeaderboardData(sortBy);
        const userIndex = leaderboardData.findIndex(entry => entry.username === username);
        
        if (userIndex === -1) {
            return null;
        }
        
        return {
            rank: userIndex + 1,
            data: leaderboardData[userIndex],
            total: leaderboardData.length
        };
    },
    
    // 检查用户名是否已存在
    isUsernameTaken(username) {
        return localStorage.getItem(`user-profile-${username}`) !== null;
    },
    
    // 导出用户数据（用于备份）
    exportProfile(username) {
        const profile = this.loadProfile(username);
        return JSON.stringify(profile.toJSON(), null, 2);
    },
    
    // 导入用户数据（用于恢复）
    importProfile(jsonString) {
        try {
            const profileData = JSON.parse(jsonString);
            const profile = UserProfile.fromJSON(profileData);
            this.saveProfile(profile);
            return profile;
        } catch (error) {
            console.error('导入用户档案失败:', error);
            return null;
        }
    }
};

// 导出到全局作用域
if (typeof window !== 'undefined') {
    window.UserProfile = UserProfile;
    window.UserProfileManager = UserProfileManager;
}