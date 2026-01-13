// 新能源汽车游戏化学习平台 - 主逻辑文件
// 依赖: profile.js, courses.js
// ==============================================

// 游戏状态管理
const GameState = {
    currentScreen: 'username',
    username: '',
    userProfile: null,
    currentCourse: null,
    quizData: [],
    currentQuestionIndex: 0,
    userAnswers: [],
    score: 0,
    startTime: 0,
    timeElapsed: 0,
    timerInterval: null,
    currentRank: null,
    questionScores: [],
    previousHighScore: 0,
    previousRank: null,
    lastRewards: null
};

// DOM 元素引用
const screens = {
    username: document.getElementById('username-screen'),
    main: document.getElementById('main-screen'),
    courseSelection: document.getElementById('course-selection-screen'),
    quiz: document.getElementById('quiz-screen'),
    leaderboard: document.getElementById('leaderboard-screen'),
    profile: document.getElementById('profile-screen'),
    shop: document.getElementById('shop-screen'),
    result: document.getElementById('result-screen')
};

// 初始化函数
function init() {
    // 从本地存储中恢复用户名
    const savedUsername = localStorage.getItem('quiz-username');
    if (savedUsername) {
        GameState.username = savedUsername;
        // 加载用户档案
        loadUserProfile();
        showScreen('main');
        updateUserDisplay();
    }
    
    // 设置事件监听器
    setupEventListeners();
    
    // 设置AI弹窗事件监听器
    setupAIModalListeners();
}

// 加载用户档案
function loadUserProfile() {
    if (GameState.username) {
        GameState.userProfile = UserProfileManager.loadProfile(GameState.username);
        console.log('用户档案已加载:', GameState.userProfile.username);
    }
}

// 保存用户档案
function saveUserProfile() {
    if (GameState.userProfile) {
        UserProfileManager.saveProfile(GameState.userProfile);
    }
}

// 事件监听器设置
function setupEventListeners() {
    // 用户名提交
    document.getElementById('username-submit').addEventListener('click', submitUsername);
    document.getElementById('username-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') submitUsername();
    });
    
    // 主界面按钮
    document.getElementById('start-quiz').addEventListener('click', () => showScreen('courseSelection'));
    document.getElementById('view-profile').addEventListener('click', () => {
        showScreen('profile');
        updateProfileDisplay();
    });
    document.getElementById('view-leaderboard').addEventListener('click', showLeaderboard);
    document.getElementById('view-shop').addEventListener('click', () => {
        showScreen('shop');
        updateShopDisplay();
    });
    
    // 课程选择界面按钮
    document.getElementById('back-from-courses').addEventListener('click', () => showScreen('main'));
    
    // 答题界面按钮
    document.getElementById('back-to-courses').addEventListener('click', () => showScreen('courseSelection'));
    document.getElementById('prev-question').addEventListener('click', prevQuestion);
    document.getElementById('next-question').addEventListener('click', nextQuestion);
    document.getElementById('submit-quiz').addEventListener('click', submitQuiz);
    
    // 排行榜界面按钮
    document.getElementById('back-from-leaderboard').addEventListener('click', () => showScreen('main'));
    document.getElementById('refresh-leaderboard').addEventListener('click', () => loadLeaderboard());
    
    // 个人主页按钮
    document.getElementById('back-from-profile').addEventListener('click', () => showScreen('main'));
    document.getElementById('refresh-profile').addEventListener('click', () => updateProfileDisplay());
    
    // 商店界面按钮
    document.getElementById('back-from-shop').addEventListener('click', () => showScreen('main'));
    
    // 结果界面按钮
    document.getElementById('view-result-leaderboard').addEventListener('click', showLeaderboard);
    document.getElementById('try-again').addEventListener('click', startQuiz);
    document.getElementById('back-to-main-from-result').addEventListener('click', () => showScreen('main'));
    
    // 排行榜筛选器
    document.querySelectorAll('.filter-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.filter-option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            loadLeaderboard(this.dataset.filter);
        });
    });
}

// 屏幕切换函数
function showScreen(screenName) {
    // 隐藏所有屏幕
    Object.values(screens).forEach(screen => {
        if (screen) screen.classList.remove('active');
    });
    
    // 显示目标屏幕
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
        GameState.currentScreen = screenName;
        
        // 执行特定屏幕的初始化
        switch(screenName) {
            case 'main':
                updateUserDisplay();
                break;
            case 'courseSelection':
                updateCourseSelectionDisplay();
                break;
            case 'profile':
                updateProfileDisplay();
                break;
            case 'shop':
                updateShopDisplay();
                break;
            case 'leaderboard':
                loadLeaderboard();
                break;
        }
    } else {
        console.error(`屏幕 ${screenName} 不存在`);
    }
}

// 用户名提交处理
function submitUsername() {
    const usernameInput = document.getElementById('username-input');
    const username = usernameInput.value.trim();
    
    if (!username) {
        alert('请输入学员姓名');
        usernameInput.focus();
        return;
    }
    
    if (username.length > 6) {
        alert('学员姓名不能超过6个字符');
        usernameInput.focus();
        return;
    }
    
    GameState.username = username;
    
    // 保存用户名
    localStorage.setItem('quiz-username', username);
    
    // 加载或创建用户档案
    loadUserProfile();
    
    showScreen('main');
    updateUserDisplay();
}

// 更新用户显示信息
function updateUserDisplay() {
    if (!GameState.username || !GameState.userProfile) return;
    
    const profile = GameState.userProfile;
    
    // 更新主界面用户名显示
    document.getElementById('current-username').textContent = profile.username;
    document.getElementById('welcome-username').textContent = profile.username;
    
    // 更新主界面等级和金币
    document.getElementById('current-level').textContent = profile.level;
    document.getElementById('current-coins').textContent = profile.coins;
    
    // 更新主界面属性显示
    document.getElementById('main-intelligence').textContent = profile.intelligence;
    document.getElementById('main-strength').textContent = profile.strength;
    document.getElementById('main-charm').textContent = profile.charm;
    
    // 更新课程选择界面的迷你信息
    document.getElementById('mini-level').textContent = profile.level;
    document.getElementById('mini-coins').textContent = profile.coins;
}

// 课程选择界面
function updateCourseSelectionDisplay() {
    const coursesGrid = document.getElementById('courses-grid');
    if (!coursesGrid || !GameState.userProfile) return;
    
    const html = CourseManager.createCourseSelectionHTML(GameState.userProfile);
    coursesGrid.innerHTML = html;
    
    // 为课程选择按钮添加事件监听
    document.querySelectorAll('.select-course-btn').forEach(button => {
        button.addEventListener('click', function() {
            const courseName = this.dataset.course;
            selectCourse(courseName);
        });
    });
}

// 选择课程
async function selectCourse(courseName) {
    const course = CourseManager.getCourse(courseName);
    
    if (!course) {
        console.error(`课程 ${courseName} 不存在`);
        return;
    }
    
    GameState.currentCourse = courseName;
    
    // 显示加载动画
    showLoading(true);
    
    try {
        // 加载课程题目
        GameState.quizData = await course.loadQuestions();
        console.log(`成功加载 ${courseName} 题库，共 ${GameState.quizData.length} 道题目`);
        
        // 开始答题
        startQuiz();
    } catch (error) {
        console.error(`加载课程 ${courseName} 失败:`, error);
        alert('加载课程题目失败，请稍后重试');
    } finally {
        showLoading(false);
    }
}

// 个人主页
function updateProfileDisplay() {
    if (!GameState.userProfile) return;
    
    const profile = GameState.userProfile;
    
    // 更新基本信息
    document.getElementById('profile-username').textContent = profile.username;
    document.getElementById('profile-level').textContent = profile.level;
    document.getElementById('current-exp').textContent = profile.exp;
    document.getElementById('next-level-exp').textContent = profile.expToNextLevel;
    
    // 更新经验条
    const expPercent = (profile.exp / profile.expToNextLevel) * 100;
    document.getElementById('exp-progress').style.width = `${expPercent}%`;
    
    // 更新属性值
    document.getElementById('profile-coins').textContent = profile.coins;
    document.getElementById('profile-intelligence').textContent = profile.intelligence;
    document.getElementById('profile-strength').textContent = profile.strength;
    document.getElementById('profile-charm').textContent = profile.charm;
    
    // 更新课程记录
    updateCourseProgressList();
}

function updateCourseProgressList() {
    const courseList = document.getElementById('course-progress-list');
    if (!courseList || !GameState.userProfile) return;
    
    const profile = GameState.userProfile;
    const courses = profile.courses;
    
    if (Object.keys(courses).length === 0) {
        courseList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open fa-3x"></i>
                <h3>暂无课程记录</h3>
                <p>快去开始你的第一门课程吧！</p>
            </div>
        `;
        return;
    }
    
    let courseHTML = '';
    
    Object.entries(courses).forEach(([courseName, record]) => {
        const minutes = Math.floor(record.bestTime / 60).toString().padStart(2, '0');
        const seconds = (record.bestTime % 60).toString().padStart(2, '0');
        const bestTimeStr = record.bestTime !== Infinity ? `${minutes}:${seconds}` : '暂无';
        
        courseHTML += `
            <div class="course-record">
                <div class="course-name">${courseName}</div>
                <div class="course-info">
                    <div class="course-score">最高分: ${record.highScore}</div>
                    <div class="course-attempts">
                        最佳用时: ${bestTimeStr} | 尝试: ${record.attempts}次
                    </div>
                </div>
            </div>
        `;
    });
    
    courseList.innerHTML = courseHTML;
}

// 商店界面
function updateShopDisplay() {
    if (!GameState.userProfile) return;
    
    const profile = GameState.userProfile;
    
    // 更新商店金币显示
    document.getElementById('shop-coins').textContent = profile.coins;
    
    // 更新道具列表
    updateShopItems();
}

function updateShopItems() {
    const profile = GameState.userProfile;
    
    // 使用ShopManager创建商店HTML
    const shopContent = document.querySelector('.shop-content');
    if (shopContent) {
        shopContent.innerHTML = ShopManager.createShopHTML(profile);
        
        // 添加购买事件监听
        document.querySelectorAll('.buy-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const itemId = this.dataset.itemId;
                await buyItem(itemId);
            });
        });
    }
}

async function buyItem(itemId) {
    if (!GameState.userProfile) return;
    
    const result = ShopManager.buyItem(GameState.userProfile, itemId);
    
    if (result.success) {
        // 保存档案
        saveUserProfile();
        
        // 更新显示
        updateShopDisplay();
        updateUserDisplay();
        
        // 显示购买成功消息
        alert(result.message);
    } else {
        alert(result.message);
    }
}

// 开始答题
function startQuiz() {
    if (!GameState.quizData || GameState.quizData.length === 0) {
        alert('没有可用的题目，请重新选择课程');
        return;
    }
    
    // 重置游戏状态
    GameState.currentQuestionIndex = 0;
    GameState.userAnswers = [];
    GameState.score = 0;
    GameState.questionScores = new Array(10).fill(0);
    GameState.startTime = Date.now();
    GameState.timeElapsed = 0;
    GameState.currentRank = null;
    GameState.lastRewards = null;
    
    // 清除之前的计时器
    if (GameState.timerInterval) {
        clearInterval(GameState.timerInterval);
    }
    
    // 开始计时器
    GameState.timerInterval = setInterval(updateTimer, 1000);
    
    // 随机选择10道题目
    const selectedQuestions = getRandomQuestions(GameState.quizData, 10);
    GameState.quizData = selectedQuestions;
    
    // 显示答题界面
    showScreen('quiz');
    
    // 更新课程名称显示
    if (GameState.currentCourse) {
        document.getElementById('quiz-course-name').textContent = GameState.currentCourse;
    }
    
    // 显示第一题
    displayQuestion();
    
    // 更新界面
    updateQuizUI();
}

// 获取随机题目
function getRandomQuestions(questions, count) {
    if (questions.length <= count) {
        return [...questions];
    }
    
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// 显示题目
function displayQuestion() {
    const question = GameState.quizData[GameState.currentQuestionIndex];
    if (!question) return;
    
    document.getElementById('question-text').textContent = question.question;
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    question.options.forEach((option, index) => {
        const optionElement = document.createElement('button');
        optionElement.className = 'option';
        optionElement.textContent = option;
        optionElement.dataset.index = index;
        
        if (GameState.userAnswers[GameState.currentQuestionIndex] === index) {
            optionElement.classList.add('selected');
        }
        
        optionElement.addEventListener('click', () => selectOption(index));
        optionsContainer.appendChild(optionElement);
    });
    
    updateNavigationButtons();
}

// 选择选项
function selectOption(optionIndex) {
    GameState.userAnswers[GameState.currentQuestionIndex] = optionIndex;
    
    const options = document.querySelectorAll('.option');
    options.forEach((option, index) => {
        option.classList.remove('selected');
        if (index === optionIndex) {
            option.classList.add('selected');
        }
    });
}

// 更新导航按钮状态
function updateNavigationButtons() {
    const prevButton = document.getElementById('prev-question');
    const nextButton = document.getElementById('next-question');
    
    prevButton.disabled = GameState.currentQuestionIndex === 0;
    
    const hasAnswer = GameState.userAnswers[GameState.currentQuestionIndex] !== undefined;
    nextButton.textContent = GameState.currentQuestionIndex === GameState.quizData.length - 1 
        ? '完成' 
        : '下一题';
}

// 上一题
function prevQuestion() {
    if (GameState.currentQuestionIndex > 0) {
        GameState.currentQuestionIndex--;
        displayQuestion();
        updateQuizUI();
    }
}

// 下一题
function nextQuestion() {
    if (GameState.userAnswers[GameState.currentQuestionIndex] === undefined) {
        alert('请先选择答案');
        return;
    }
    
    calculateCurrentQuestionScore();
    
    if (GameState.currentQuestionIndex < GameState.quizData.length - 1) {
        GameState.currentQuestionIndex++;
        displayQuestion();
        updateQuizUI();
    } else {
        if (confirm('你已经完成了所有题目！是否要提交答卷？')) {
            submitQuiz();
        }
    }
}

// 计算当前题目分数
function calculateCurrentQuestionScore() {
    const questionIndex = GameState.currentQuestionIndex;
    const userAnswer = GameState.userAnswers[questionIndex];
    
    if (userAnswer !== undefined) {
        const question = GameState.quizData[questionIndex];
        const isCorrect = question.correct === userAnswer;
        
        if (GameState.questionScores[questionIndex] === 0) {
            GameState.questionScores[questionIndex] = isCorrect ? 10 : 0;
        }
        
        updateTotalScore();
    }
}

// 更新总分
function updateTotalScore() {
    let totalScore = 0;
    for (let i = 0; i < GameState.questionScores.length; i++) {
        totalScore += GameState.questionScores[i];
    }
    
    GameState.score = totalScore;
    document.getElementById('score-counter').textContent = totalScore;
}

// 更新答题界面UI
function updateQuizUI() {
    document.getElementById('question-counter').textContent = 
        `${GameState.currentQuestionIndex + 1}/${GameState.quizData.length}`;
    
    document.getElementById('score-counter').textContent = GameState.score;
    
    updateTimer();
}

// 更新计时器
function updateTimer() {
    if (GameState.startTime) {
        GameState.timeElapsed = Math.floor((Date.now() - GameState.startTime) / 1000);
        const minutes = Math.floor(GameState.timeElapsed / 60).toString().padStart(2, '0');
        const seconds = (GameState.timeElapsed % 60).toString().padStart(2, '0');
        document.getElementById('timer').textContent = `${minutes}:${seconds}`;
    }
}

// 提交答卷
function submitQuiz() {
    if (GameState.timerInterval) {
        clearInterval(GameState.timerInterval);
        GameState.timerInterval = null;
    }
    
    calculateCurrentQuestionScore();
    
    calculateScore();
    
    showResults();
}

// 计算分数（最终提交时使用）
function calculateScore() {
    let totalScore = 0;
    GameState.questionScores.forEach(score => {
        totalScore += score;
    });
    
    GameState.score = totalScore;
}

// 显示结果
function showResults() {
    if (!GameState.userProfile) return;
    
    // 更新结果界面
    document.getElementById('final-score').textContent = GameState.score;
    
    const minutes = Math.floor(GameState.timeElapsed / 60).toString().padStart(2, '0');
    const seconds = (GameState.timeElapsed % 60).toString().padStart(2, '0');
    document.getElementById('final-time').textContent = `${minutes}:${seconds}`;
    
    // 显示结果消息
    const resultMessage = getResultMessage(GameState.score);
    document.getElementById('result-message').textContent = resultMessage;
    
    // 显示答题详情
    displayAnswersReview();
    
    // 应用课程奖励
    if (GameState.currentCourse) {
        const rewardResult = GameState.userProfile.completeCourse(
            GameState.currentCourse, 
            GameState.score, 
            GameState.timeElapsed
        );
        
        // 保存奖励结果
        GameState.lastRewards = rewardResult.rewards;
        
        // 保存档案
        saveUserProfile();
        
        // 显示奖励
        updateRewardsDisplay(GameState.lastRewards);
        
        // 检查是否升级
        if (rewardResult.levelResult.leveledUp) {
            setTimeout(() => {
                alert(`恭喜！你升级到了 ${GameState.userProfile.level} 级！`);
            }, 500);
        }
    }
    
    // 显示结果界面
    showScreen('result');
    
    // 提交分数到排行榜
    submitScoreToLeaderboard();
}

// 获取结果消息
function getResultMessage(score) {
    if (score >= 90) {
        return "太棒了！你对本门课程的掌握非常好！";
    } else if (score >= 70) {
        return "不错！你的表现较好！";
    } else if (score >= 50) {
        return "还可以，但以后还要认真听课呀！";
    } else {
        return "以后还需要加强的学习！";
    }
}

// 显示奖励
function updateRewardsDisplay(rewards) {
    if (!rewards) return;
    
    document.getElementById('reward-exp').textContent = rewards.exp;
    document.getElementById('reward-coins').textContent = rewards.coins;
    document.getElementById('reward-intelligence').textContent = rewards.intelligence;
    document.getElementById('reward-strength').textContent = rewards.strength;
    document.getElementById('reward-charm').textContent = rewards.charm;
}

// 显示答题详情
function displayAnswersReview() {
    const reviewContainer = document.getElementById('answers-review');
    reviewContainer.innerHTML = '';
    
    GameState.quizData.forEach((question, index) => {
        const userAnswerIndex = GameState.userAnswers[index];
        const isCorrect = userAnswerIndex !== undefined && question.correct === userAnswerIndex;
        
        const reviewItem = document.createElement('div');
        reviewItem.className = `review-item ${isCorrect ? 'correct' : 'incorrect'}`;
        
        const statusIcon = isCorrect ? '✓' : '✗';
        const statusText = isCorrect ? '正确' : '错误';
        
        reviewItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <strong>第${index + 1}题</strong>
                <span>${statusIcon} ${statusText}</span>
            </div>
            <p><strong>题目：</strong>${question.question}</p>
            <p><strong>你的答案：</strong>${userAnswerIndex !== undefined ? question.options[userAnswerIndex] : '未作答'}</p>
            ${!isCorrect ? `<p><strong>正确答案：</strong>${question.options[question.correct]}</p>` : ''}
            ${question.explanation ? `<p><strong>解析：</strong>${question.explanation}</p>` : ''}
        `;
        
        reviewContainer.appendChild(reviewItem);
    });
}

// 显示排行榜界面
function showLeaderboard() {
    loadLeaderboard();
    showScreen('leaderboard');
}

// 加载排行榜
function loadLeaderboard(filter = 'total') {
    showLoading(true);
    
    try {
        // 从本地获取排行榜数据
        const leaderboardData = UserProfileManager.getLeaderboardData(filter);
        
        // 显示排行榜
        displayLeaderboard(leaderboardData);
        
        // 显示用户排名
        if (GameState.username) {
            displayUserRank(leaderboardData);
        }
        
    } catch (error) {
        console.error('加载排行榜失败:', error);
        document.getElementById('leaderboard-list').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>加载排行榜失败，请检查网络连接</p>
            </div>
        `;
    } finally {
        showLoading(false);
    }
}

// 显示排行榜
function displayLeaderboard(leaderboardData) {
    const leaderboardList = document.getElementById('leaderboard-list');
    
    if (!leaderboardList) return;
    
    if (leaderboardData.length === 0) {
        leaderboardList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-line fa-3x"></i>
                <h3>暂无排行榜数据</h3>
                <p>成为第一个完成挑战的玩家！</p>
            </div>
        `;
        return;
    }
    
    let leaderboardHTML = '';
    
    leaderboardData.forEach((entry, index) => {
        const rank = index + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';
        
        leaderboardHTML += `
            <div class="leaderboard-item ${rankClass}">
                <div class="rank">${rank}</div>
                <div class="user-info-leaderboard">
                    <div class="username">${entry.username}</div>
                    <div class="score-info">
                        <span class="score">等级: ${entry.level} | 分数: ${entry.score}</span>
                        <span class="time">课程: ${entry.completedCourses}门</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    leaderboardList.innerHTML = leaderboardHTML;
}

// 显示用户排名
function displayUserRank(leaderboardData) {
    const userRankInfo = document.getElementById('user-rank-info');
    
    if (!userRankInfo || !GameState.username) {
        return;
    }
    
    // 查找用户排名
    const userIndex = leaderboardData.findIndex(entry => entry.username === GameState.username);
    
    if (userIndex === -1) {
        userRankInfo.innerHTML = `
            <p>您还没有完成过挑战</p>
            <button class="btn-primary" style="margin-top: 15px;" onclick="showScreen('courseSelection')">开始学习</button>
        `;
        return;
    }
    
    const rank = userIndex + 1;
    const userEntry = leaderboardData[userIndex];
    
    userRankInfo.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h4>${GameState.username}</h4>
                <p>当前排名: 第${rank}名</p>
                <p>等级: ${userEntry.level} | 分数: ${userEntry.score}</p>
            </div>
            <div class="user-rank-badge">
                <span class="rank-number">${rank}</span>
                <span>排名</span>
            </div>
        </div>
    `;
}

// 在 script.js 中找到以下函数并更新：

// 提交分数到排行榜
async function submitScoreToLeaderboard() {
    showLoading(true);
    
    if (!GameState.userProfile || !GameState.currentCourse) {
        console.error('用户档案或课程信息缺失');
        showLoading(false);
        return;
    }
    
    const scoreData = {
        username: GameState.username,
        score: GameState.score,
        time: GameState.timeElapsed,
        courseName: GameState.currentCourse,
        rewards: GameState.lastRewards || {
            exp: Math.floor(GameState.score),
            coins: Math.floor(GameState.score / 2),
            intelligence: 0,
            strength: 0,
            charm: 0
        }
    };
    
    try {
        console.log('正在提交分数到服务器:', scoreData);
        const response = await fetch('/api/submit-score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(scoreData)
        });
        
        if (!response.ok) {
            throw new Error(`提交失败! 状态码: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('服务器响应:', result);
        
        if (result.success) {
            // 使用服务器计算并返回的真实排名
            const finalRank = result.rank;
            document.getElementById('final-rank').textContent = finalRank;
            GameState.currentRank = finalRank;
            
            // 更新本地用户档案数据
            if (result.profile && GameState.userProfile) {
                Object.assign(GameState.userProfile, result.profile);
                // 保存到本地存储作为缓存
                UserProfileManager.saveProfile(GameState.userProfile);
            }
            
            console.log(`最终排名: 第${finalRank}名`);
            
            // 检查是否需要触发AI赞扬
            checkAndTriggerAIPraise(finalRank, result.leaderboard);
        } else {
            console.error('服务器返回错误:', result.error);
            alert('提交成绩时出现错误，请稍后重试');
        }
        
    } catch (error) {
        console.error('提交分数到排行榜失败:', error);
        // 网络失败时的降级方案：保存到本地
        alert('网络异常，成绩已保存到本地');
        
        // 使用本地计算排名
        const localRank = calculateLocalRank();
        document.getElementById('final-rank').textContent = localRank || '未上榜';
        GameState.currentRank = localRank;
        
        // 即使网络失败，也检查是否需要触发AI赞扬
        if (localRank !== '未上榜') {
            const localLeaderboard = UserProfileManager.getLeaderboardData('total');
            checkAndTriggerAIPraise(localRank, localLeaderboard);
        }
    } finally {
        showLoading(false);
    }
}

// 加载排行榜
async function loadLeaderboard(filter = 'total') {
    showLoading(true);
    
    try {
        console.log('正在从服务器加载排行榜...');
        const response = await fetch(`/api/leaderboard?sortBy=${filter}`);
        
        if (!response.ok) {
            throw new Error(`加载失败! 状态码: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('排行榜数据加载成功:', result);
        
        if (result.success) {
            let leaderboardData = result.leaderboard;
            
            // 显示排行榜
            displayLeaderboard(leaderboardData);
            // 显示用户排名
            displayUserRank(leaderboardData);
            
        } else {
            console.error('服务器返回错误:', result.error);
            // 使用本地排行榜作为降级方案
            loadLocalLeaderboard(filter);
        }
        
    } catch (error) {
        console.error('加载排行榜失败:', error);
        // 使用本地排行榜作为降级方案
        loadLocalLeaderboard(filter);
    } finally {
        showLoading(false);
    }
}

// 显示排行榜
function displayLeaderboard(leaderboardData) {
    const leaderboardList = document.getElementById('leaderboard-list');
    
    if (!leaderboardList) return;
    
    if (leaderboardData.length === 0) {
        leaderboardList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-line fa-3x"></i>
                <h3>暂无排行榜数据</h3>
                <p>成为第一个完成挑战的玩家！</p>
            </div>
        `;
        return;
    }
    
    let leaderboardHTML = '';
    
    leaderboardData.forEach((entry, index) => {
        const rank = index + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';
        
        leaderboardHTML += `
            <div class="leaderboard-item ${rankClass}">
                <div class="rank">${rank}</div>
                <div class="user-info-leaderboard">
                    <div class="username">${entry.username}</div>
                    <div class="score-info">
                        <span class="score">等级: ${entry.level} | 分数: ${entry.score}</span>
                        <span class="time">课程: ${entry.completedCourses}门</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    leaderboardList.innerHTML = leaderboardHTML;
}

// 显示用户排名
function displayUserRank(leaderboardData) {
    const userRankInfo = document.getElementById('user-rank-info');
    
    if (!userRankInfo || !GameState.username) {
        return;
    }
    
    // 查找用户排名
    const userEntry = leaderboardData.find(entry => entry.username === GameState.username);
    
    if (!userEntry) {
        userRankInfo.innerHTML = `
            <p>您还没有完成过挑战</p>
            <button class="btn-primary" style="margin-top: 15px;" onclick="showScreen('courseSelection')">开始学习</button>
        `;
        return;
    }
    
    const rank = leaderboardData.findIndex(entry => entry.username === GameState.username) + 1;
    
    userRankInfo.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h4>${GameState.username}</h4>
                <p>等级: ${userEntry.level} | 金币: ${userEntry.coins}</p>
                <p>课程: ${userEntry.completedCourses}门 | 总答题: ${userEntry.totalQuizzes}次</p>
            </div>
            <div class="user-rank-badge">
                <span class="rank-number">${rank}</span>
                <span>排名</span>
            </div>
        </div>
    `;
}

// 计算本地排名（降级方案）
function calculateLocalRank() {
    if (!GameState.userProfile) return null;
    
    // 获取本地所有用户排名
    const localLeaderboard = UserProfileManager.getLeaderboardData('total');
    const userIndex = localLeaderboard.findIndex(entry => entry.username === GameState.username);
    
    return userIndex !== -1 ? userIndex + 1 : null;
}



// 加载用户历史数据（兼容旧版）
function loadUserHistory() {
    if (!GameState.username) return;
    
    const userHistory = JSON.parse(localStorage.getItem(`user-history-${GameState.username}`) || '{}');
    if (userHistory.highScore) {
        GameState.previousHighScore = userHistory.highScore;
        GameState.previousRank = userHistory.highRank || null;
    }
}

// 保存用户历史数据（兼容旧版）
function saveUserHistory(score, rank) {
    if (!GameState.username) return;
    
    let userHistory = JSON.parse(localStorage.getItem(`user-history-${GameState.username}`) || '{}');
    
    if (score > (userHistory.highScore || 0)) {
        userHistory.highScore = score;
        userHistory.highRank = rank;
        GameState.previousHighScore = score;
        GameState.previousRank = rank;
    } else if (score === userHistory.highScore && rank < (userHistory.highRank || 99)) {
        userHistory.highRank = rank;
        GameState.previousRank = rank;
    }
    
    localStorage.setItem(`user-history-${GameState.username}`, JSON.stringify(userHistory));
}

// 显示/隐藏加载动画
function showLoading(show) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        if (show) {
            loadingOverlay.classList.add('active');
        } else {
            loadingOverlay.classList.remove('active');
        }
    }
}

// AI赞扬功能
function checkAndTriggerAIPraise(rank, leaderboardData = []) {
    if (rank && rank !== '未上榜') {
        let triggerType = null;
        
        if (GameState.previousRank && GameState.previousRank <= 10 && GameState.score < 60) {
            triggerType = 'tease';
        } else if (GameState.score <= 20) {
            triggerType = 'encourage';
        } else if (GameState.previousHighScore > 0 && GameState.score > GameState.previousHighScore + 20) {
            triggerType = 'improvement';
        } else if (rank === 1 || rank === 2 || rank === 3) {
            triggerType = 'praise';
        } else if (rank <= 10) {
            triggerType = 'good-rank';
        } else if (GameState.score >= 60 && GameState.score < 80) {
            triggerType = 'passing';
        }
        
        if (triggerType) {
            triggerAIPraise(triggerType, rank);
        }
    }
}

// 触发AI赞扬（简化版本）
function triggerAIPraise(type, rank = null) {
    const fallbackText = getFallbackText(type, rank);
    showAIPraiseModal(fallbackText, type, rank);
}

// 获取备用文本的函数
function getFallbackText(type = '', rank = null) {
    let fallbackTexts = [];
    const userName = GameState.username || '同学';
    const score = GameState.score;
    
    if (type === 'tease') {
        let teasePrefix = '';
        if (GameState.previousRank === 1) {
            teasePrefix = `曾经的冠军${userName}，`;
        } else if (GameState.previousRank === 2) {
            teasePrefix = `曾经的亚军${userName}，`;
        } else if (GameState.previousRank === 3) {
            teasePrefix = `曾经的季军${userName}，`;
        } else if (GameState.previousRank && GameState.previousRank <= 10) {
            teasePrefix = `曾经的前十强选手${userName}，`;
        }
        
        fallbackTexts = [
            `😄 ${teasePrefix}这次只得了${score}分，是不是有点大意了？作为榜上有名的强者，要认真对待每一次挑战哦！`,
            `🤔 ${userName}同学，你可是曾经的第${GameState.previousRank}名啊！这次${score}分可不符合你的实力水平。是不是昨晚没休息好？下次要全力以赴！`,
            `🎭 喂，${userName}！排名第${rank}却只拿到${score}分，这分数和你的实力不匹配啊！是不是太轻敌了？作为优秀学生，要给其他人做好榜样！`
        ];
    } else if (type === 'encourage') {
        fallbackTexts = [
            `💫 ${userName}，虽然这次只得到${score}分，但重要的是你勇敢地参与了挑战！新能源汽车智能网联技术是一个充满机遇的领域，保持好奇心，继续探索！`,
            `🌱 别灰心，${userName}！每一次尝试都是成长的养分。新能源汽车技术日新月异，坚持学习，你一定会越来越棒！`,
            `🤝 ${userName}，感谢你的积极参与！分数只是暂时的，你对新能源汽车技术的热情才是最宝贵的。继续加油，下次会更好！`
        ];
    } else if (type === 'improvement') {
        const improvement = score - GameState.previousHighScore;
        fallbackTexts = [
            `🚀 太棒了，${userName}！你的分数从${GameState.previousHighScore}分飞跃到${score}分，进步了整整${improvement}分！你的努力和坚持得到了回报！`,
            `📊 惊人进步！${userName}，你的成绩提升了${improvement}分，这是你勤奋学习的最好证明。继续保持这种上升势头！`,
            `💥 哇！${userName}，你的分数大幅提升${improvement}分！这充分展现了你的学习能力和进步潜力。为你感到骄傲！`
        ];
    } else if (type === 'praise') {
        if (rank === 1) {
            fallbackTexts = [
                `🏆 冠军${userName}！你在新能源汽车智能网联技术知识竞赛中勇夺第一！你的知识深度令人赞叹，展现了卓越的专业素养。继续保持这种王者风范！`,
                `👑 第一名！${userName}，你是真正的知识王者！对新能源汽车技术的全面掌握让你稳坐榜首，为你骄傲！`,
                `🌟 冠军荣耀属于${userName}！在激烈的竞争中脱颖而出，你的专业知识和敏捷思维令人印象深刻。继续领跑新能源汽车知识领域！`
            ];
        } else if (rank === 2) {
            fallbackTexts = [
                `🥈 第二名！${userName}，你的表现非常出色，下次一定要冲击冠军！你的新能源汽车知识储备已经达到顶尖水平！`,
                `⚡ ${userName}荣获第二名！距离冠军仅一步之遥，你的实力有目共睹。继续努力，下次定能登顶！`,
                `🔝 ${userName}稳坐第二名宝座！你的专业知识和快速反应能力令人赞叹。保持这种势头，冠军就在眼前！`
            ];
        } else if (rank === 3) {
            fallbackTexts = [
                `🥉 第三名！${userName}，你的新能源汽车智能网联技术知识非常扎实。继续前进，争取更高名次！`,
                `🎯 ${userName}获得第三名！在强手如林的竞争中站稳脚跟，展现了你的专业实力。再接再厉，向更高目标迈进！`,
                `💪 季军${userName}！你的知识掌握程度令人赞叹，排名前三实至名归。保持学习热情，未来可期！`
            ];
        }
    } else if (type === 'good-rank') {
        fallbackTexts = [
            `🏅 ${userName}荣获第${rank}名，进入前十强！你在新能源汽车智能网联技术知识竞赛中的表现非常优秀，展现了扎实的专业基础！`,
            `📈 第${rank}名！${userName}，你已经跻身知识竞赛的前列。继续努力，争取进入前三甲！`,
            `✨ 恭喜${userName}获得第${rank}名！你的新能源汽车知识储备令人称赞，保持这种学习状态，成绩会越来越好！`
        ];
    } else if (type === 'passing') {
        fallbackTexts = [
            `✅ ${userName}，${score}分及格过关！这是一个不错的起点，但你的潜力远不止于此。继续深入学习，争取更高分数！`,
            `🎓 恭喜${userName}通过测试！${score}分证明你已经掌握了基础知识，接下来可以向更高难度的挑战进发！`,
            `📚 ${userName}获得${score}分，成功达标！这是一个良好的开端，继续努力，你的新能源汽车知识会越来越丰富！`
        ];
    } else {
        fallbackTexts = [
            `🎉 太棒了，${userName}！你在新能源汽车智能网联技术知识竞赛中表现出色！`,
            `👍 恭喜你，${userName}！你的知识储备令人印象深刻，继续在新能源汽车领域发光发热！`,
            `💡 做得好，${userName}！你对新能源汽车智能网联技术的理解非常深入，为你点赞！`
        ];
    }
    
    const randomIndex = Math.floor(Math.random() * fallbackTexts.length);
    return fallbackTexts[randomIndex];
}

// 显示AI赞扬弹窗
function showAIPraiseModal(text, type, rank = null) {
    const modal = document.getElementById('ai-praise-modal');
    const title = document.getElementById('ai-praise-title');
    const praiseText = document.getElementById('ai-praise-text');
    
    if (!modal || !title || !praiseText) return;
    
    if (type === 'tease') {
        title.innerHTML = `<i class="fas fa-grin-wink"></i> 友善提醒`;
    } else if (type === 'encourage') {
        title.innerHTML = `<i class="fas fa-heart"></i> 加油鼓励！`;
    } else if (type === 'improvement') {
        title.innerHTML = `<i class="fas fa-chart-line"></i> 巨大进步！`;
    } else if (type === 'praise' && rank === 1) {
        title.innerHTML = `<i class="fas fa-crown"></i> 冠军！`;
    } else if (type === 'praise' && rank === 2) {
        title.innerHTML = `<i class="fas fa-medal"></i> 亚军！`;
    } else if (type === 'praise' && rank === 3) {
        title.innerHTML = `<i class="fas fa-award"></i> 季军！`;
    } else if (type === 'good-rank') {
        title.innerHTML = `<i class="fas fa-trophy"></i> 第${rank}名！`;
    } else if (type === 'passing') {
        title.innerHTML = `<i class="fas fa-check-circle"></i> 达标过关`;
    }
    
    praiseText.textContent = text;
    
    modal.classList.add('active');
    
    const closeBtn = document.getElementById('ai-modal-close-btn');
    const closeIcon = document.querySelector('.ai-modal-close');
    
    const closeModal = () => {
        modal.classList.remove('active');
        closeBtn.removeEventListener('click', closeModal);
        closeIcon.removeEventListener('click', closeModal);
    };
    
    closeBtn.addEventListener('click', closeModal);
    closeIcon.addEventListener('click', closeModal);
}

// 在初始化时设置AI弹窗事件监听器
function setupAIModalListeners() {
    const modal = document.getElementById('ai-praise-modal');
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);