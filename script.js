// 显示排行榜界面
function showLeaderboard() {
    loadLeaderboard(); // 调用加载排行榜数据的函数
    showScreen('leaderboard'); // 切换到排行榜界面
}

// 游戏状态管理
const GameState = {
    currentScreen: 'username',
    username: '',
    quizData: [],
    currentQuestionIndex: 0,
    userAnswers: [],
    score: 0,
    startTime: 0,
    timeElapsed: 0,
    timerInterval: null,
    currentRank: null, // 新增：存储当前排名
    questionScores: [], // 新增：存储每道题的得分情况
    previousHighScore: 0, // 新增：存储历史最高分
    previousRank: null // 新增：存储历史最高排名
};

// DOM 元素
const screens = {
    username: document.getElementById('username-screen'),
    main: document.getElementById('main-screen'),
    quiz: document.getElementById('quiz-screen'),
    leaderboard: document.getElementById('leaderboard-screen'),
    result: document.getElementById('result-screen')
};

// 初始化函数
function init() {
    // 从本地存储中恢复用户名
    const savedUsername = localStorage.getItem('quiz-username');
    if (savedUsername) {
        GameState.username = savedUsername;
        showScreen('main');
        updateUsernameDisplay();
    }
    
    // 加载用户历史数据
    loadUserHistory();
    
    // 设置事件监听器
    setupEventListeners();
    
    // 设置AI弹窗事件监听器
    setupAIModalListeners();
    
    // 预加载题库
    loadQuestions();
}

// 加载用户历史数据
function loadUserHistory() {
    const userHistory = JSON.parse(localStorage.getItem(`user-history-${GameState.username}`) || '{}');
    if (userHistory.highScore) {
        GameState.previousHighScore = userHistory.highScore;
        GameState.previousRank = userHistory.highRank || null;
    }
}

// 保存用户历史数据
function saveUserHistory(score, rank) {
    let userHistory = JSON.parse(localStorage.getItem(`user-history-${GameState.username}`) || '{}');
    
    // 如果当前分数比历史高分高，则更新
    if (score > (userHistory.highScore || 0)) {
        userHistory.highScore = score;
        userHistory.highRank = rank;
        GameState.previousHighScore = score;
        GameState.previousRank = rank;
    } else if (score === userHistory.highScore && rank < (userHistory.highRank || 99)) {
        // 分数相同但排名更靠前
        userHistory.highRank = rank;
        GameState.previousRank = rank;
    }
    
    // 保存到本地存储
    localStorage.setItem(`user-history-${GameState.username}`, JSON.stringify(userHistory));
}

// 设置事件监听器
function setupEventListeners() {
    // 用户名提交
    document.getElementById('username-submit').addEventListener('click', submitUsername);
    document.getElementById('username-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') submitUsername();
    });
    
    // 主界面按钮
    document.getElementById('start-quiz').addEventListener('click', startQuiz);
    document.getElementById('view-leaderboard').addEventListener('click', showLeaderboard);
    
    // 答题界面按钮
    document.getElementById('back-to-main').addEventListener('click', () => showScreen('main'));
    document.getElementById('prev-question').addEventListener('click', prevQuestion);
    document.getElementById('next-question').addEventListener('click', nextQuestion);
    document.getElementById('submit-quiz').addEventListener('click', submitQuiz);
    
    // 排行榜界面按钮
    document.getElementById('back-from-leaderboard').addEventListener('click', () => showScreen('main'));
    document.getElementById('refresh-leaderboard').addEventListener('click', loadLeaderboard);
    
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
        screen.classList.remove('active');
    });
    
    // 显示目标屏幕
    screens[screenName].classList.add('active');
    GameState.currentScreen = screenName;
    
    // 执行特定屏幕的初始化
    switch(screenName) {
        case 'main':
            updateUsernameDisplay();
            break;
        case 'leaderboard':
            loadLeaderboard();
            break;
    }
}

// 用户名提交处理
function submitUsername() {
    const usernameInput = document.getElementById('username-input');
    const username = usernameInput.value.trim();
    
    if (!username) {
        alert('请输入用户名');
        usernameInput.focus();
        return;
    }
    
    if (username.length > 20) {
        alert('用户名不能超过20个字符');
        usernameInput.focus();
        return;
    }
    
    GameState.username = username;
    localStorage.setItem('quiz-username', username);
    showScreen('main');
    updateUsernameDisplay();
    // 加载该用户的历史数据
    loadUserHistory();
}

// 更新用户名显示
function updateUsernameDisplay() {
    document.getElementById('current-username').textContent = GameState.username;
    document.getElementById('welcome-username').textContent = GameState.username;
}

// 加载题库
function loadQuestions() {
    // 先尝试加载本地questions.json文件
    fetch('questions.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP错误! 状态码: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // 核心修改：更宽松但有效的验证
            if (data && data.questions && Array.isArray(data.questions)) {
                GameState.quizData = data.questions;
                console.log(`成功加载外部题库，共 ${data.questions.length} 道题目`);
                // 可选：在控制台打印前几题的结构，确认数据正确
                if (data.questions.length > 0) {
                    console.log('题库数据结构示例:', JSON.stringify(data.questions[0]));
                }
            } else {
                // 如果格式不对，抛出错误，让catch块处理
                throw new Error('加载的JSON数据中未找到有效的questions数组');
            }
        })
        .catch(error => {
            console.warn(`加载外部题库失败: ${error.message}，将使用备用题库`);
            // 使用备用题库
            GameState.quizData = getDefaultQuestions();
            console.log(`已使用备用题库，共 ${GameState.quizData.length} 道题目`);
        });
}

// 开始答题
function startQuiz() {
    // 重置游戏状态
    GameState.currentQuestionIndex = 0;
    GameState.userAnswers = [];
    GameState.score = 0;  // 确保分数从0开始
    GameState.questionScores = new Array(10).fill(0); // 初始化每道题的得分
    GameState.startTime = Date.now();
    GameState.timeElapsed = 0;
    GameState.currentRank = null; // 重置排名
    
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
    
    // 显示第一题
    displayQuestion();
    
    // 更新界面
    updateQuizUI();
}

// 获取随机题目
function getRandomQuestions(questions, count) {
    // 如果题目数量不足，返回所有题目
    if (questions.length <= count) {
        return [...questions];
    }
    
    // 随机选择题目
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// 显示题目
function displayQuestion() {
    const question = GameState.quizData[GameState.currentQuestionIndex];
    if (!question) return;
    
    // 更新题目文本
    document.getElementById('question-text').textContent = question.question;
    
    // 更新选项
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = ''; // 清空旧选项
    
    // 关键修改：根据当前题目的 options 数组长度，动态创建按钮
    question.options.forEach((option, index) => {
        const optionElement = document.createElement('button');
        optionElement.className = 'option';
        optionElement.textContent = option;
        optionElement.dataset.index = index;
        
        // 检查是否已经选择过此选项
        if (GameState.userAnswers[GameState.currentQuestionIndex] === index) {
            optionElement.classList.add('selected');
        }
        
        optionElement.addEventListener('click', () => selectOption(index));
        optionsContainer.appendChild(optionElement);
    });
    
    // 更新导航按钮状态
    updateNavigationButtons();
}

// 选择选项
function selectOption(optionIndex) {
    // 保存用户答案
    GameState.userAnswers[GameState.currentQuestionIndex] = optionIndex;
    
    // 更新UI显示
    const options = document.querySelectorAll('.option');
    options.forEach((option, index) => {
        option.classList.remove('selected');
        if (index === optionIndex) {
            option.classList.add('selected');
        }
    });
    
    // === 修改：不再实时计算分数，只在点击下一题时计算 ===
}

// 更新导航按钮状态
function updateNavigationButtons() {
    const prevButton = document.getElementById('prev-question');
    const nextButton = document.getElementById('next-question');
    
    // 上一题按钮
    prevButton.disabled = GameState.currentQuestionIndex === 0;
    
    // 下一题按钮
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
    // 检查是否已回答当前题目
    if (GameState.userAnswers[GameState.currentQuestionIndex] === undefined) {
        alert('请先选择答案');
        return;
    }
    
    // === 修改：在切换到下一题前计算当前题目的得分 ===
    calculateCurrentQuestionScore();
    
    if (GameState.currentQuestionIndex < GameState.quizData.length - 1) {
        GameState.currentQuestionIndex++;
        displayQuestion();
        updateQuizUI();
    } else {
        // 如果是最后一题，显示提交确认
        if (confirm('你已经完成了所有题目！是否要提交答卷？')) {
            submitQuiz();
        }
    }
}

// 计算当前题目的分数
function calculateCurrentQuestionScore() {
    const questionIndex = GameState.currentQuestionIndex;
    const userAnswer = GameState.userAnswers[questionIndex];
    
    // 如果用户已经回答过这道题，才计算分数
    if (userAnswer !== undefined) {
        const question = GameState.quizData[questionIndex];
        
        // 检查答案是否正确
        const isCorrect = question.correct === userAnswer;
        
        // 如果之前没有计算过这道题的分数，或者答案有变化，重新计算
        if (GameState.questionScores[questionIndex] === 0) {
            GameState.questionScores[questionIndex] = isCorrect ? 10 : 0;
        }
        
        // 重新计算总分
        updateTotalScore();
    }
}

// 更新总分
function updateTotalScore() {
    // 计算所有题目的总分
    let totalScore = 0;
    for (let i = 0; i < GameState.questionScores.length; i++) {
        totalScore += GameState.questionScores[i];
    }
    
    // 更新游戏状态和UI
    GameState.score = totalScore;
    document.getElementById('score-counter').textContent = totalScore;
}

// 更新答题界面UI
function updateQuizUI() {
    // 更新题目计数器
    document.getElementById('question-counter').textContent = 
        `${GameState.currentQuestionIndex + 1}/${GameState.quizData.length}`;
    
    // 更新分数
    document.getElementById('score-counter').textContent = GameState.score;
    
    // 更新计时器
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
    // 停止计时器
    if (GameState.timerInterval) {
        clearInterval(GameState.timerInterval);
        GameState.timerInterval = null;
    }
    
    // 计算最后一题的分数
    calculateCurrentQuestionScore();
    
    // 计算总分
    calculateScore();
    
    // 显示结果界面
    showResults();
}

// 计算分数（最终提交时使用）
function calculateScore() {
    // 使用questionScores数组计算总分
    let totalScore = 0;
    GameState.questionScores.forEach(score => {
        totalScore += score;
    });
    
    GameState.score = totalScore;
}

// 显示结果
function showResults() {
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
        `;
        
        reviewContainer.appendChild(reviewItem);
    });
}

// 提交分数到排行榜
async function submitScoreToLeaderboard() {
    showLoading(true);
    
    const scoreData = {
        username: GameState.username,
        score: GameState.score,
        time: GameState.timeElapsed,
        timestamp: Date.now()
    };
    
    try {
        console.log('正在提交分数到服务器:', scoreData);
        // 关键：发送真实的POST请求到你的Cloudflare Function
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
            GameState.currentRank = finalRank; // 保存排名到状态
            
            // 保存用户历史数据
            saveUserHistory(GameState.score, finalRank);
            
            console.log(`最终排名: 第${finalRank}名`);
            
            // 检查是否需要触发AI赞扬（基于本次提交的分数和排名）
            checkAndTriggerAIPraise(finalRank, result.leaderboard);
        } else {
            console.error('服务器返回错误:', result.error);
            alert('提交成绩时出现错误，请稍后重试');
        }
        
    } catch (error) {
        console.error('提交分数到排行榜失败:', error);
        // 网络失败时的降级方案：保存到本地
        alert('网络异常，成绩已保存到本地榜单');
        saveScoreToLocalStorage(scoreData);
        const localRank = getLocalRank(GameState.score, GameState.timeElapsed);
        document.getElementById('final-rank').textContent = localRank || '未上榜';
        GameState.currentRank = localRank; // 保存本地排名
        
        // 保存用户历史数据
        saveUserHistory(GameState.score, localRank);
        
        // 即使网络失败，也检查是否需要触发AI赞扬
        if (localRank !== '未上榜') {
            // 获取本地排行榜数据
            let localLeaderboard = JSON.parse(localStorage.getItem('quiz-leaderboard') || '[]');
            localLeaderboard.sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                return a.time - b.time;
            });
            checkAndTriggerAIPraise(localRank, localLeaderboard);
        }
    } finally {
        showLoading(false);
    }
}

// 保存分数到本地存储
function saveScoreToLocalStorage(scoreData) {
    let leaderboard = JSON.parse(localStorage.getItem('quiz-leaderboard') || '[]');
    
    // 检查用户名是否已存在
    const existingIndex = leaderboard.findIndex(entry => entry.username === scoreData.username);
    
    if (existingIndex !== -1) {
        // 如果新分数更高，或者分数相同但时间更短，则更新
        const existingEntry = leaderboard[existingIndex];
        if (scoreData.score > existingEntry.score || 
            (scoreData.score === existingEntry.score && scoreData.time < existingEntry.time)) {
            leaderboard[existingIndex] = scoreData;
        }
    } else {
        // 添加新记录
        leaderboard.push(scoreData);
    }
    
    // 保存回本地存储
    localStorage.setItem('quiz-leaderboard', JSON.stringify(leaderboard));
}

// 获取本地排名
function getLocalRank(score, time) {
    let leaderboard = JSON.parse(localStorage.getItem('quiz-leaderboard') || '[]');
    
    // 按分数降序、时间升序排序
    leaderboard.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return a.time - b.time;
    });
    
    // 找到当前用户的排名
    const userIndex = leaderboard.findIndex(entry => 
        entry.username === GameState.username && 
        entry.score === score && 
        entry.time === time
    );
    
    return userIndex !== -1 ? userIndex + 1 : '未上榜';
}

// 显示排行榜
async function loadLeaderboard(filter = 'all') {
    showLoading(true);
    
    try {
        console.log('正在从服务器加载排行榜...');
        // 关键：发送真实的GET请求到你的Cloudflare Function
        const response = await fetch('/api/leaderboard');
        
        if (!response.ok) {
            throw new Error(`加载失败! 状态码: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('排行榜数据加载成功:', result);
        
        if (result.success) {
            let leaderboardData = result.leaderboard;
            
            // 前端筛选（如果需要）
            if (filter === 'top10') {
                leaderboardData = leaderboardData.slice(0, 10);
            }
            
            // 显示排行榜
            displayLeaderboard(leaderboardData);
            // 显示用户排名（传入完整数据用于查找）
            displayUserRank(result.leaderboard);
            
        } else {
            console.error('服务器返回错误:', result.error);
            document.getElementById('leaderboard-list').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>加载排行榜失败，请稍后重试</p>
                </div>
            `;
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
        const minutes = Math.floor(entry.time / 60).toString().padStart(2, '0');
        const seconds = (entry.time % 60).toString().padStart(2, '0');
        const timeString = `${minutes}:${seconds}`;
        
        const rankClass = rank <= 3 ? `rank-${rank}` : '';
        
        leaderboardHTML += `
            <div class="leaderboard-item ${rankClass}">
                <div class="rank">${rank}</div>
                <div class="user-info-leaderboard">
                    <div class="username">${entry.username}</div>
                    <div class="score-info">
                        <span class="score">得分: ${entry.score}</span>
                        <span class="time">用时: ${timeString}</span>
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
    
    if (!GameState.username) {
        userRankInfo.innerHTML = `
            <p>请先登录查看您的排名</p>
        `;
        return;
    }
    
    // 查找用户排名
    const userEntry = leaderboardData.find(entry => entry.username === GameState.username);
    
    if (!userEntry) {
        userRankInfo.innerHTML = `
            <p>您还没有完成过挑战</p>
            <button class="btn-primary" style="margin-top: 15px;" onclick="startQuiz()">开始挑战</button>
        `;
        return;
    }
    
    const rank = leaderboardData.findIndex(entry => entry.username === GameState.username) + 1;
    const minutes = Math.floor(userEntry.time / 60).toString().padStart(2, '0');
    const seconds = (userEntry.time % 60).toString().padStart(2, '0');
    const timeString = `${minutes}:${seconds}`;
    
    userRankInfo.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h4>${GameState.username}</h4>
                <p>最佳成绩: ${userEntry.score}分 (${timeString})</p>
            </div>
            <div class="user-rank-badge">
                <span class="rank-number">${rank}</span>
                <span>排名</span>
            </div>
        </div>
    `;
}

// 显示/隐藏加载动画
function showLoading(show) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (show) {
        loadingOverlay.classList.add('active');
    } else {
        loadingOverlay.classList.remove('active');
    }
}

// 备用题库
function getDefaultQuestions() {
    return [
        {
            question: "新能源汽车的智能网联技术主要不包括以下哪个方面？",
            options: [
                "车辆自动驾驶",
                "车与车通信(V2V)",
                "传统机械传动优化",
                "车与基础设施通信(V2I)"
            ],
            correct: 2
        },
        {
            question: "以下哪种电池是目前电动汽车最常用的电池类型？",
            options: [
                "铅酸电池",
                "镍氢电池",
                "锂离子电池",
                "钠硫电池"
            ],
            correct: 2
        },
        {
            question: "新能源汽车的续航里程主要受什么因素影响？",
            options: [
                "车身颜色",
                "电池容量和能量管理",
                "轮胎尺寸",
                "车载娱乐系统"
            ],
            correct: 1
        },
        {
            question: "智能网联汽车的V2X通信中，X代表什么？",
            options: [
                "任何事物(Everything)",
                "车辆(Vehicle)",
                "基础设施(Infrastructure)",
                "行人(Pedestrian)"
            ],
            correct: 0
        },
        {
            question: "以下哪项不是新能源汽车的优势？",
            options: [
                "零尾气排放",
                "能源利用效率高",
                "噪音污染小",
                "续航里程无限"
            ],
            correct: 3
        },
        {
            question: "新能源汽车的充电方式中，快速充电通常使用什么类型的充电桩？",
            options: [
                "交流充电桩(AC)",
                "直流充电桩(DC)",
                "无线充电",
                "太阳能充电"
            ],
            correct: 1
        },
        {
            question: "智能网联汽车的自动驾驶技术中，L3级别代表什么？",
            options: [
                "无自动化",
                "部分自动化",
                "有条件自动化",
                "高度自动化"
            ],
            correct: 2
        },
        {
            question: "以下哪种技术可以帮助新能源汽车提高续航里程？",
            options: [
                "能量回收系统",
                "更大的娱乐屏幕",
                "更多的USB接口",
                "更亮的车灯"
            ],
            correct: 0
        },
        {
            question: "新能源汽车的电池管理系统(BMS)主要功能不包括以下哪项？",
            options: [
                "电池状态监控",
                "充放电控制",
                "温度管理",
                "提高发动机功率"
            ],
            correct: 3
        },
        {
            question: "智能网联汽车通过什么技术实现车辆间的实时通信？",
            options: [
                "蓝牙技术",
                "DSRC专用短程通信",
                "传统无线电",
                "红外技术"
            ],
            correct: 1
        },
        {
            question: "以下哪种新能源汽车不需要外部充电？",
            options: [
                "纯电动汽车(BEV)",
                "插电式混合动力汽车(PHEV)",
                "燃料电池汽车(FCEV)",
                "增程式电动汽车(EREV)"
            ],
            correct: 2
        },
        {
            question: "智能网联汽车的OTA升级功能可以更新什么？",
            options: [
                "车辆软件系统",
                "轮胎花纹",
                "车身颜色",
                "座椅材质"
            ],
            correct: 0
        },
        {
            question: "新能源汽车的动力电池在低温环境下会出现什么问题？",
            options: [
                "续航里程增加",
                "充电速度变快",
                "电池容量下降",
                "电池永久损坏"
            ],
            correct: 2
        },
        {
            question: "智能网联汽车的感知系统通常不包括以下哪个传感器？",
            options: [
                "摄像头",
                "激光雷达",
                "超声波雷达",
                "温度计"
            ],
            correct: 3
        },
        {
            question: "新能源汽车的再生制动系统可以将什么能量转化为电能？",
            options: [
                "太阳能",
                "风能",
                "制动时的动能",
                "发动机热能"
            ],
            correct: 2
        }
    ];
}

// AI赞扬相关函数
// ==============================================

// 检查并触发AI赞扬（根据本次提交的排名和排行榜数据）
function checkAndTriggerAIPraise(rank, leaderboardData = []) {
    console.log('检查AI赞扬触发条件:', { 
        rank, 
        score: GameState.score,
        previousHighScore: GameState.previousHighScore,
        previousRank: GameState.previousRank
    });
    
    // 只有当用户有有效排名时才检查
    if (rank && rank !== '未上榜') {
        // 获取排行榜中的前几名信息
        let firstPlaceName = '';
        let secondPlaceName = '';
        let thirdPlaceName = '';
        
        if (leaderboardData.length >= 1) {
            firstPlaceName = leaderboardData[0]?.username || '';
        }
        if (leaderboardData.length >= 2) {
            secondPlaceName = leaderboardData[1]?.username || '';
        }
        if (leaderboardData.length >= 3) {
            thirdPlaceName = leaderboardData[2]?.username || '';
        }
        
        // 检查是否应该触发AI赞扬 - 扩展的条件逻辑
        let triggerType = null;
        let additionalData = {
            firstPlaceName,
            secondPlaceName,
            thirdPlaceName
        };
        
        // 条件1：历史排名很高但本次分数低（调侃）
        if (GameState.previousRank && GameState.previousRank <= 10 && GameState.score < 60) {
            triggerType = 'tease';
        }
        // 条件2：前三名
        else if (rank === 1 || rank === 2 || rank === 3) {
            triggerType = 'praise';
        }
        // 条件3：第4-10名
        else if (rank <= 10) {
            triggerType = 'good-rank';
        }
        // 条件4：分数很低（低于20分）
        else if (GameState.score <= 20) {
            triggerType = 'encourage';
        }
        // 条件5：分数中等但进步很大
        else if (GameState.previousHighScore > 0 && GameState.score > GameState.previousHighScore + 20) {
            triggerType = 'improvement';
        }
        // 条件6：分数及格但还有提升空间
        else if (GameState.score >= 60 && GameState.score < 80) {
            triggerType = 'passing';
        }
        
        if (triggerType) {
            triggerAIPraise(triggerType, rank, additionalData);
        } else {
            console.log('不满足AI赞扬触发条件');
        }
    } else {
        console.log('用户未上榜，不触发AI赞扬');
    }
}

// 触发AI赞扬
async function triggerAIPraise(type, rank = null, additionalData = {}) {
    showLoading(true);
    
    try {
        console.log(`触发AI赞扬，类型: ${type}, 排名: ${rank}, 用户名: ${GameState.username}, 分数: ${GameState.score}`);
        
        // 保存排名到全局状态，供备用文本使用
        GameState.currentRank = rank;
        
        // 构建提示词 - 更加严格的指令
        let prompt = '';
        const userName = GameState.username;
        const score = GameState.score;
        const firstPlaceName = additionalData.firstPlaceName || '';
        const secondPlaceName = additionalData.secondPlaceName || '';
        const thirdPlaceName = additionalData.thirdPlaceName || '';
        
        if (type === 'praise' && rank) {
            if (rank === 1) {
                // 第一名：庆祝胜利
                prompt = `用户"${userName}"在新能源汽车智能网联技术知识竞赛中荣获第一名！请以吟游诗人的身份直接创作一首胜利赞歌，庆祝他的卓越成就。不要有任何思考、分析或解释过程，直接输出最终的赞扬诗歌。要求：包含用户名和第一名成就，字数100-150字，风格庄重激昂。`;
            } else if (rank === 2) {
                // 第二名：挑战第一名
                let challengeText = firstPlaceName ? `特别要向第一名${firstPlaceName}发起挑战，` : '';
                prompt = `用户"${userName}"在新能源汽车智能网联技术知识竞赛中获得第二名！${challengeText}请以吟游诗人的身份直接创作一首激励诗歌，鼓舞他继续前进。不要有任何思考、分析或解释过程，直接输出最终的赞扬诗歌。要求：包含用户名、第二名成就和挑战精神，字数100-150字，风格充满斗志。`;
            } else if (rank === 3) {
                // 第三名：追赶前两名
                let competitionText = '';
                if (firstPlaceName && secondPlaceName) {
                    competitionText = `，前面是强大的对手${firstPlaceName}和${secondPlaceName}，`;
                }
                prompt = `用户"${userName}"在新能源汽车智能网联技术知识竞赛中获得第三名！${competitionText}请以吟游诗人的身份直接创作一首激励诗歌，肯定他的成就并鼓励继续进步。不要有任何思考、分析或解释过程，直接输出最终的赞扬诗歌。要求：包含用户名、第三名成就和竞争意识，字数100-150字，风格积极向上。`;
            }
        } else if (type === 'good-rank') {
            // 第4-10名：优秀表现
            prompt = `用户"${userName}"在新能源汽车智能网联技术知识竞赛中获得第${rank}名，进入了前十强！请以吟游诗人的身份直接创作一首赞扬诗，肯定他的优秀表现。不要有任何思考、分析或解释过程，直接输出最终的赞扬诗歌。要求：包含用户名和第${rank}名成就，字数100-150字，风格认可鼓励。`;
        } else if (type === 'encourage') {
            // 低分鼓励
            prompt = `用户"${userName}"在新能源汽车知识竞赛中只得到${score}分，需要鼓励。请以智慧的吟游诗人的身份直接写一段温暖而鼓舞人心的鼓励语，肯定他的参与和努力。不要有任何思考、分析或解释过程，直接输出最终的鼓励内容。要求：包含用户名和鼓励话语，字数80-120字，风格温暖支持。`;
        } else if (type === 'tease') {
            // 调侃：历史排名高但本次分数低
            let teaseText = '';
            if (GameState.previousRank && GameState.previousRank <= 3) {
                teaseText = `作为曾经的第${GameState.previousRank}名高手，`;
            } else if (GameState.previousRank && GameState.previousRank <= 10) {
                teaseText = `作为曾经的前十强选手，`;
            }
            prompt = `用户"${userName}"${teaseText}这次在新能源汽车知识竞赛中只得到${score}分，排名第${rank}。请以幽默的吟游诗人的身份直接写一段调侃式提醒，友善地督促他认真对待。不要有任何思考、分析或解释过程，直接输出最终的调侃内容。要求：包含用户名、历史成就对比和幽默提醒，字数80-120字，风格幽默友善。`;
        } else if (type === 'improvement') {
            // 进步显著
            const improvement = score - GameState.previousHighScore;
            prompt = `用户"${userName}"在新能源汽车知识竞赛中取得巨大进步！分数从${GameState.previousHighScore}分提高到${score}分，进步了${improvement}分！请以激励的吟游诗人的身份直接写一段祝贺语，赞扬他的努力和进步。不要有任何思考、分析或解释过程，直接输出最终的祝贺内容。要求：包含用户名、进步数据和肯定话语，字数80-120字，风格热烈祝贺。`;
        } else if (type === 'passing') {
            // 及格但需努力
            prompt = `用户"${userName}"在新能源汽车知识竞赛中得到${score}分，刚刚及格。请以严谨的吟游诗人的身份直接写一段评价语，肯定他的及格成绩，同时指出还有提升空间。不要有任何思考、分析或解释过程，直接输出最终的评语内容。要求：包含用户名、分数评价和提升建议，字数80-120字，风格严谨鼓励。`;
        }
        
        console.log('AI提示词:', prompt);
        
        // 调用AI API获取赞扬文本
        const aiResponse = await callAIApi(prompt);
        
        // 显示AI赞扬弹窗
        showAIPraiseModal(aiResponse, type, rank);
        
    } catch (error) {
        console.error('AI赞扬调用失败:', error);
        // 即使API调用失败，也显示备用文本弹窗
        const fallbackText = getFallbackText(type, rank, additionalData);
        showAIPraiseModal(fallbackText, type, rank);
    } finally {
        showLoading(false);
    }
}

// 调用AI API的函数
async function callAIApi(prompt) {
    try {
        // 心流API信息
        const API_URL = 'https://apis.iflow.cn/v1/chat/completions';
        const API_KEY = 'sk-0b75784188f361cc59f3474ba175aa1d';
        
        // 按照心流API官方示例格式
        const requestBody = {
            "model": "deepseek-r1",
            "messages": [
                {
                    "role": "system",
                    "content": "你是一位吟游诗人，你的语言风格是贴合现实又浪漫主义的，全部基于20世纪以前的文明著作，如莎士比亚、《荷马史诗》、《贝奥武夫》等**绝对禁止涉及任何科幻、玄幻、超自然的事物，禁止使用“钢铁”“数据”“代码”等会出戏的词汇。**请直接输出最终的回答内容，不要包含任何思考过程、分析过程或解释说明。直接给出最终的诗歌或鼓励语。"
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "stream": false,
            "max_tokens": 512,
            "stop": ["null"],
            "temperature": 0.7,
            "top_p": 0.7,
            "top_k": 50,
            "frequency_penalty": 0.5,
            "n": 1,
            "response_format": { "type": "text" }
        };
        
        console.log('发送AI请求:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('AI API请求失败:', response.status, errorText);
            throw new Error(`API请求失败: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('AI API完整响应:', data);
        
        // 提取AI响应文本
        let aiText = '';
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const message = data.choices[0].message;
            
            // 优先使用 content 字段（最终答案）
            if (message.content && message.content.trim()) {
                aiText = message.content;
                console.log('使用content字段:', aiText);
            }
            // 如果没有content但有reasoning_content，使用它（但清理思考过程）
            else if (message.reasoning_content && message.reasoning_content.trim()) {
                aiText = message.reasoning_content;
                console.log('使用reasoning_content字段（需要清理）:', aiText);
            }
            
            // 如果两个字段都没有或者都是空的，抛出错误
            if (!aiText) {
                console.error('两个内容字段都为空:', data);
                throw new Error('AI响应内容为空');
            }
            
            // 清理思考过程
            const cleanedText = cleanAIText(aiText);
            console.log('清理后内容:', cleanedText);
            
            return cleanedText;
        } else {
            console.error('AI响应格式错误:', data);
            throw new Error('AI响应格式错误');
        }
        
    } catch (error) {
        console.error('AI API调用失败，详细信息:', error);
        
        // 返回备用文本
        return getFallbackText();
    }
}

// 清理AI文本，移除思考过程
function cleanAIText(text) {
    if (!text) return text;
    
    // 常见思考过程模式
    const patterns = [
        // 用户说...用户要求...用户希望...
        /用户(?:说|表示|要求|希望|提到|)[:：].*?[\n]/g,
        /用户[\s\S]*?[:：].*?[\n]/g,
        
        // 让我想想...让我分析...我来思考...
        /让我(?:想想|思考|分析|考虑|)[:：].*?[\n]/g,
        /我(?:来|先|要|)(?:思考|分析|考虑|想想)[:：].*?[\n]/g,
        
        // 首先...其次...然后...最后...
        /首先[，,].*?[\n]/g,
        /其次[，,].*?[\n]/g,
        /然后[，,].*?[\n]/g,
        /最后[，,].*?[\n]/g,
        /第一[，,].*?[\n]/g,
        /第二[，,].*?[\n]/g,
        /第三[，,].*?[\n]/g,
        
        // 思考过程标记
        /思考[:：].*?[\n]/g,
        /分析[:：].*?[\n]/g,
        /理解[:：].*?[\n]/g,
        
        // 根据提示...根据要求...
        /根据(?:提示|要求|题目|问题)[:：].*?[\n]/g,
        
        // 诗歌应该...赞扬应该...
        /(?:诗歌|赞扬|鼓励)(?:应该|要|需要)[:：].*?[\n]/g,
        
        // 我来创作...我来写...
        /我(?:来|将|要)(?:创作|写|创作一首|写一段)[:：].*?[\n]/g,
        
        // 思考内容...
        /思考内容[:：].*?[\n]/g,
        
        // 分析一下...
        /分析一下[，,].*?[\n]/g
    ];
    
    let cleaned = text;
    
    // 移除所有匹配的思考过程
    patterns.forEach(pattern => {
        cleaned = cleaned.replace(pattern, '');
    });
    
    // 移除开头的空行和多余空格
    cleaned = cleaned.trim();
    
    // 如果清理后为空，返回原文本
    if (!cleaned) {
        return text;
    }
    
    return cleaned;
}

// 获取备用文本的函数
function getFallbackText(type = '', rank = null, additionalData = {}) {
    // 备用赞扬文本
    let fallbackTexts = [];
    const userName = GameState.username || '同学';
    const score = GameState.score;
    const firstPlaceName = additionalData.firstPlaceName || '';
    const secondPlaceName = additionalData.secondPlaceName || '';
    const thirdPlaceName = additionalData.thirdPlaceName || '';
    
    if (type === 'praise') {
        if (rank === 1) {
            fallbackTexts = [
                `🏆 冠军${userName}！你在新能源汽车智能网联技术知识竞赛中勇夺第一！你的知识深度令人赞叹，展现了卓越的专业素养。继续保持这种王者风范！`,
                `👑 第一名！${userName}，你是真正的知识王者！对新能源汽车技术的全面掌握让你稳坐榜首，为你骄傲！`,
                `🌟 冠军荣耀属于${userName}！在激烈的竞争中脱颖而出，你的专业知识和敏捷思维令人印象深刻。继续领跑新能源汽车知识领域！`
            ];
        } else if (rank === 2) {
            let challengeText = firstPlaceName ? `，下次一定要超越${firstPlaceName}！` : '，下次一定要冲击冠军！';
            fallbackTexts = [
                `🥈 第二名！${userName}，你的表现非常出色${challengeText}你的新能源汽车知识储备已经达到顶尖水平！`,
                `⚡ ${userName}荣获第二名！距离冠军仅一步之遥，你的实力有目共睹。继续努力，下次定能登顶！`,
                `🔝 ${userName}稳坐第二名宝座！你的专业知识和快速反应能力令人赞叹。保持这种势头，冠军就在眼前！`
            ];
        } else if (rank === 3) {
            let competitionText = '';
            if (firstPlaceName && secondPlaceName) {
                competitionText = `，紧跟在${firstPlaceName}和${secondPlaceName}之后，`;
            }
            fallbackTexts = [
                `🥉 第三名！${userName}${competitionText}你的新能源汽车智能网联技术知识非常扎实。继续前进，争取更高名次！`,
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
    } else if (type === 'encourage') {
        fallbackTexts = [
            `💫 ${userName}，虽然这次只得到${score}分，但重要的是你勇敢地参与了挑战！新能源汽车智能网联技术是一个充满机遇的领域，保持好奇心，继续探索！`,
            `🌱 别灰心，${userName}！每一次尝试都是成长的养分。新能源汽车技术日新月异，坚持学习，你一定会越来越棒！`,
            `🤝 ${userName}，感谢你的积极参与！分数只是暂时的，你对新能源汽车技术的热情才是最宝贵的。继续加油，下次会更好！`
        ];
    } else if (type === 'tease') {
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
    } else if (type === 'improvement') {
        const improvement = score - GameState.previousHighScore;
        fallbackTexts = [
            `🚀 太棒了，${userName}！你的分数从${GameState.previousHighScore}分飞跃到${score}分，进步了整整${improvement}分！你的努力和坚持得到了回报！`,
            `📊 惊人进步！${userName}，你的成绩提升了${improvement}分，这是你勤奋学习的最好证明。继续保持这种上升势头！`,
            `💥 哇！${userName}，你的分数大幅提升${improvement}分！这充分展现了你的学习能力和进步潜力。为你感到骄傲！`
        ];
    } else if (type === 'passing') {
        fallbackTexts = [
            `✅ ${userName}，${score}分及格过关！这是一个不错的起点，但你的潜力远不止于此。继续深入学习，争取更高分数！`,
            `🎓 恭喜${userName}通过测试！${score}分证明你已经掌握了基础知识，接下来可以向更高难度的挑战进发！`,
            `📚 ${userName}获得${score}分，成功达标！这是一个良好的开端，继续努力，你的新能源汽车知识会越来越丰富！`
        ];
    } else {
        // 默认，如果没有匹配类型，返回通用赞扬
        fallbackTexts = [
            `🎉 太棒了，${userName}！你在新能源汽车智能网联技术知识竞赛中表现出色！`,
            `👍 恭喜你，${userName}！你的知识储备令人印象深刻，继续在新能源汽车领域发光发热！`,
            `💡 做得好，${userName}！你对新能源汽车智能网联技术的理解非常深入，为你点赞！`
        ];
    }
    
    // 随机选择一个备用文本
    const randomIndex = Math.floor(Math.random() * fallbackTexts.length);
    return fallbackTexts[randomIndex];
}

// 显示AI赞扬弹窗
function showAIPraiseModal(text, type, rank = null) {
    const modal = document.getElementById('ai-praise-modal');
    const title = document.getElementById('ai-praise-title');
    const praiseText = document.getElementById('ai-praise-text');
    
    // 设置标题和图标
    if (type === 'praise' && rank === 1) {
        title.innerHTML = `<i class="fas fa-crown"></i> 冠军！`;
    } else if (type === 'praise' && rank === 2) {
        title.innerHTML = `<i class="fas fa-medal"></i> 亚军！`;
    } else if (type === 'praise' && rank === 3) {
        title.innerHTML = `<i class="fas fa-award"></i> 季军！`;
    } else if (type === 'good-rank') {
        title.innerHTML = `<i class="fas fa-trophy"></i> 第${rank}名！`;
    } else if (type === 'encourage') {
        title.innerHTML = `<i class="fas fa-heart"></i> 加油鼓励！`;
    } else if (type === 'tease') {
        title.innerHTML = `<i class="fas fa-grin-wink"></i> 友善提醒`;
    } else if (type === 'improvement') {
        title.innerHTML = `<i class="fas fa-chart-line"></i> 巨大进步！`;
    } else if (type === 'passing') {
        title.innerHTML = `<i class="fas fa-check-circle"></i> 达标过关`;
    }
    
    // 设置赞扬文本
    praiseText.textContent = text;
    
    // 显示弹窗
    modal.classList.add('active');
    
    // 设置弹窗关闭事件
    const closeBtn = document.getElementById('ai-modal-close-btn');
    const closeIcon = document.querySelector('.ai-modal-close');
    
    const closeModal = () => {
        modal.classList.remove('active');
        // 清除事件监听器
        closeBtn.removeEventListener('click', closeModal);
        closeIcon.removeEventListener('click', closeModal);
    };
    
    closeBtn.addEventListener('click', closeModal);
    closeIcon.addEventListener('click', closeModal);
}

// 在初始化时设置AI弹窗事件监听器
function setupAIModalListeners() {
    const modal = document.getElementById('ai-praise-modal');
    
    // 点击模态框背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);