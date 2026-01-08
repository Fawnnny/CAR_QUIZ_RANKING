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
    timerInterval: null
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
    
    // 设置事件监听器
    setupEventListeners();
    
    // 预加载题库
    loadQuestions();
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
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
                GameState.quizData = data.questions;
                console.log(`成功加载 ${data.questions.length} 道题目`);
            } else {
                throw new Error('题库格式不正确');
            }
        })
        .catch(error => {
            console.warn('加载题库失败，使用备用题库:', error);
            // 使用备用题库
            GameState.quizData = getDefaultQuestions();
            console.log(`使用备用题库，共 ${GameState.quizData.length} 道题目`);
        });
}

// 开始答题
function startQuiz() {
    // 重置游戏状态
    GameState.currentQuestionIndex = 0;
    GameState.userAnswers = [];
    GameState.score = 0;
    GameState.startTime = Date.now();
    GameState.timeElapsed = 0;
    
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
    optionsContainer.innerHTML = '';
    
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
    
    // 计算分数
    calculateScore();
    
    // 显示结果界面
    showResults();
}

// 计算分数
function calculateScore() {
    GameState.score = 0;
    
    GameState.quizData.forEach((question, index) => {
        const userAnswer = GameState.userAnswers[index];
        if (userAnswer !== undefined && question.correct === userAnswer) {
            GameState.score += 10;
        }
    });
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
        return "太棒了！你对新能源汽车智能网联技术非常了解！";
    } else if (score >= 70) {
        return "不错！你对新能源汽车智能网联技术有较好的了解！";
    } else if (score >= 50) {
        return "还可以，但对新能源汽车智能网联技术还需要更多了解！";
    } else {
        return "需要加强对新能源汽车智能网联技术的学习！";
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
            document.getElementById('final-rank').textContent = result.rank;
            console.log(`最终排名: 第${result.rank}名`);
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

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);