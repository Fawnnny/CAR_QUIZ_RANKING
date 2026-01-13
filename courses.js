// 课程管理系统
// ==============================================

// 课程类
class Course {
    constructor(id, name, description, icon, color, questionFile) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.icon = icon;
        this.color = color;
        this.questionFile = questionFile;
        this.questions = [];
        this.loaded = false;
    }
    
    // 加载题目
    async loadQuestions() {
        if (this.loaded && this.questions.length > 0) {
            return this.questions;
        }
        
        try {
            const response = await fetch(this.questionFile);
            if (!response.ok) {
                throw new Error(`HTTP错误! 状态码: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.questions && Array.isArray(data.questions)) {
                this.questions = data.questions;
                this.loaded = true;
                console.log(`成功加载 ${this.name} 题库，共 ${this.questions.length} 道题目`);
                return this.questions;
            } else {
                throw new Error('加载的JSON数据中未找到有效的questions数组');
            }
        } catch (error) {
            console.error(`加载课程 ${this.name} 题目失败:`, error);
            
            // 返回默认题目作为备用
            this.questions = this.getDefaultQuestions();
            this.loaded = true;
            console.log(`已使用备用题库，共 ${this.questions.length} 道题目`);
            return this.questions;
        }
    }
    
    // 获取默认题目（备用）
    getDefaultQuestions() {
        return [
            {
                question: `${this.name} - 默认题目1`,
                options: ["选项A", "选项B", "选项C", "选项D"],
                correct: 0,
                explanation: "这是默认题目的解释"
            },
            {
                question: `${this.name} - 默认题目2`,
                options: ["选项A", "选项B", "选项C", "选项D"],
                correct: 1,
                explanation: "这是默认题目的解释"
            },
            {
                question: `${this.name} - 默认题目3`,
                options: ["选项A", "选项B", "选项C", "选项D"],
                correct: 2,
                explanation: "这是默认题目的解释"
            },
            {
                question: `${this.name} - 默认题目4`,
                options: ["选项A", "选项B", "选项C", "选项D"],
                correct: 3,
                explanation: "这是默认题目的解释"
            },
            {
                question: `${this.name} - 默认题目5`,
                options: ["选项A", "选项B", "选项C", "选项D"],
                correct: 0,
                explanation: "这是默认题目的解释"
            }
        ];
    }
    
    // 获取随机题目
    getRandomQuestions(count = 10) {
        if (this.questions.length <= count) {
            return [...this.questions];
        }
        
        // 随机选择题目
        const shuffled = [...this.questions].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
    
    // 验证答案
    checkAnswer(questionIndex, userAnswer) {
        if (questionIndex < 0 || questionIndex >= this.questions.length) {
            return false;
        }
        
        const question = this.questions[questionIndex];
        return question.correct === userAnswer;
    }
    
    // 获取题目解释
    getExplanation(questionIndex) {
        if (questionIndex < 0 || questionIndex >= this.questions.length) {
            return "暂无解释";
        }
        
        return this.questions[questionIndex].explanation || "暂无解释";
    }
}

// 课程管理器
const CourseManager = {
    courses: {},
    
    // 初始化课程
    init() {
        // 定义所有课程
        this.courses = {
            "智能网联技术": new Course(
                "smart-connect",
                "智能网联技术",
                "学习新能源汽车的智能网联技术，包括车联网、自动驾驶等",
                "fas fa-network-wired",
                "#4a90e2",
                "questions.json"
            ),
            "电池管理系统": new Course(
                "bms",
                "电池管理系统",
                "掌握新能源汽车电池管理系统的工作原理和维护",
                "fas fa-car-battery",
                "#e2b14a",
                "questions-bms.json"
            ),
            "充电技术": new Course(
                "charging",
                "充电技术",
                "了解新能源汽车的各种充电技术和工作原理",
                "fas fa-bolt",
                "#e24a4a",
                "questions-charging.json"
            ),
            "动力系统": new Course(
                "powertrain",
                "动力系统",
                "学习新能源汽车的动力系统结构和原理",
                "fas fa-cogs",
                "#5cb85c",
                "questions-powertrain.json"
            ),
            "安全技术": new Course(
                "safety",
                "安全技术",
                "掌握新能源汽车的安全技术和应急处理",
                "fas fa-shield-alt",
                "#9a7a42",
                "questions-safety.json"
            )
        };
        
        // 预加载第一个课程（智能网联技术）
        this.preloadCourse("智能网联技术");
        
        return this.courses;
    },
    
    // 获取所有课程
    getAllCourses() {
        return this.courses;
    },
    
    // 获取课程
    getCourse(courseName) {
        return this.courses[courseName];
    },
    
    // 预加载课程
    async preloadCourse(courseName) {
        const course = this.courses[courseName];
        if (course) {
            await course.loadQuestions();
        }
    },
    
    // 获取课程列表（用于界面显示）
    getCourseList() {
        return Object.values(this.courses).map(course => ({
            id: course.id,
            name: course.name,
            description: course.description,
            icon: course.icon,
            color: course.color,
            loaded: course.loaded
        }));
    },
    
    // 批量预加载课程
    async preloadAllCourses() {
        const promises = Object.values(this.courses).map(course => course.loadQuestions());
        await Promise.all(promises);
        console.log('所有课程题目已预加载');
    },
    
    // 添加新课程
    addCourse(id, name, description, icon, color, questionFile) {
        const newCourse = new Course(id, name, description, icon, color, questionFile);
        this.courses[name] = newCourse;
        return newCourse;
    },
    
    // 移除课程
    removeCourse(courseName) {
        delete this.courses[courseName];
    },
    
    // 获取课程数量
    getCourseCount() {
        return Object.keys(this.courses).length;
    },
    
    // 获取已加载课程数量
    getLoadedCourseCount() {
        return Object.values(this.courses).filter(course => course.loaded).length;
    },
    
    // 创建课程选择界面HTML
    createCourseSelectionHTML(userProfile) {
        const courses = this.getCourseList();
        let html = '';
        
        courses.forEach(course => {
            const courseRecord = userProfile.courses[course.name] || {};
            const highScore = courseRecord.highScore || 0;
            const attempts = courseRecord.attempts || 0;
            const progress = userProfile.getCourseProgress ? userProfile.getCourseProgress(course.name) : 0;
            
            html += `
                <div class="course-card" data-course-id="${course.id}">
                    <div class="course-icon" style="color: ${course.color};">
                        <i class="${course.icon}"></i>
                    </div>
                    <h3>${course.name}</h3>
                    <p class="course-description">${course.description}</p>
                    
                    ${attempts > 0 ? `
                    <div class="course-progress">
                        <div class="progress-text">
                            <span>最高分: ${highScore}</span>
                            <span>尝试次数: ${attempts}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                    </div>
                    ` : '<p class="course-description" style="color: #999;">尚未学习</p>'}
                    
                    <button class="btn-primary select-course-btn" data-course="${course.name}" 
                            style="margin-top: 15px; width: 100%;">
                        <i class="fas fa-play-circle"></i> 开始学习
                    </button>
                </div>
            `;
        });
        
        return html;
    }
};

// 商店道具定义
const ShopItems = {
    intelligence: [
        {
            id: "brain-book",
            name: "智慧之书",
            description: "阅读此书可提升智力5点",
            price: 50,
            effect: { intelligence: 5 },
            icon: "fas fa-book",
            rarity: "common"
        },
        {
            id: "ai-chip",
            name: "AI芯片",
            description: "植入AI芯片，智力提升15点",
            price: 150,
            effect: { intelligence: 15 },
            icon: "fas fa-microchip",
            rarity: "rare"
        },
        {
            id: "genius-potion",
            name: "天才药水",
            description: "饮用后智力瞬间提升30点",
            price: 300,
            effect: { intelligence: 30 },
            icon: "fas fa-flask",
            rarity: "epic"
        }
    ],
    strength: [
        {
            id: "training-dumbbell",
            name: "训练哑铃",
            description: "日常锻炼，武力提升5点",
            price: 50,
            effect: { strength: 5 },
            icon: "fas fa-dumbbell",
            rarity: "common"
        },
        {
            id: "power-glove",
            name: "力量手套",
            description: "戴上后武力提升15点",
            price: 150,
            effect: { strength: 15 },
            icon: "fas fa-hand-fist",
            rarity: "rare"
        },
        {
            id: "hercules-belt",
            name: "大力神腰带",
            description: "传说中的腰带，武力提升30点",
            price: 300,
            effect: { strength: 30 },
            icon: "fas fa-wrench",
            rarity: "epic"
        }
    ],
    charm: [
        {
            id: "gentleman-hat",
            name: "绅士礼帽",
            description: "戴上后气质提升5点",
            price: 50,
            effect: { charm: 5 },
            icon: "fas fa-hat-cowboy",
            rarity: "common"
        },
        {
            id: "princess-dress",
            name: "公主礼服",
            description: "穿上后气质提升15点",
            price: 150,
            effect: { charm: 15 },
            icon: "fas fa-vest",
            rarity: "rare"
        },
        {
            id: "royal-crown",
            name: "皇家王冠",
            description: "戴上后气质提升30点",
            price: 300,
            effect: { charm: 30 },
            icon: "fas fa-crown",
            rarity: "epic"
        }
    ],
    special: [
        {
            id: "exp-boost",
            name: "经验双倍卡",
            description: "下一场课程经验值翻倍",
            price: 200,
            effect: { expMultiplier: 2 },
            icon: "fas fa-rocket",
            rarity: "rare",
            consumable: true
        },
        {
            id: "coin-doubler",
            name: "金币加倍器",
            description: "下一场课程金币翻倍",
            price: 200,
            effect: { coinMultiplier: 2 },
            icon: "fas fa-coins",
            rarity: "rare",
            consumable: true
        },
        {
            id: "lucky-charm",
            name: "幸运护符",
            description: "增加随机属性奖励的概率",
            price: 100,
            effect: { lucky: true },
            icon: "fas fa-clover",
            rarity: "common",
            consumable: true
        }
    ]
};

// 商店管理器
const ShopManager = {
    // 获取所有道具
    getAllItems() {
        return ShopItems;
    },
    
    // 获取道具分类
    getItemCategories() {
        return Object.keys(ShopItems);
    },
    
    // 获取某个分类的道具
    getItemsByCategory(category) {
        return ShopItems[category] || [];
    },
    
    // 根据ID查找道具
    findItemById(itemId) {
        for (const category in ShopItems) {
            const item = ShopItems[category].find(item => item.id === itemId);
            if (item) {
                return item;
            }
        }
        return null;
    },
    
    // 购买道具
    buyItem(userProfile, itemId) {
        const item = this.findItemById(itemId);
        
        if (!item) {
            return { success: false, message: "道具不存在" };
        }
        
        // 检查金币是否足够
        if (userProfile.coins < item.price) {
            return { success: false, message: "金币不足" };
        }
        
        // 扣除金币
        userProfile.coins -= item.price;
        
        // 应用道具效果
        const effect = userProfile.addItemEffect(item);
        
        return {
            success: true,
            message: `购买成功！已获得【${item.name}】的效果！`,
            item: item,
            effect: effect,
            remainingCoins: userProfile.coins
        };
    },
    
    // 创建商店界面HTML
    createShopHTML(userProfile) {
        let html = '';
        const categories = this.getItemCategories();
        
        categories.forEach((category, index) => {
            const items = this.getItemsByCategory(category);
            
            // 确定分类标题和图标
            let categoryTitle = '';
            let categoryIcon = '';
            
            switch(category) {
                case 'intelligence':
                    categoryTitle = '智力道具';
                    categoryIcon = 'fas fa-brain';
                    break;
                case 'strength':
                    categoryTitle = '武力道具';
                    categoryIcon = 'fas fa-fist-raised';
                    break;
                case 'charm':
                    categoryTitle = '气质道具';
                    categoryIcon = 'fas fa-star';
                    break;
                case 'special':
                    categoryTitle = '特殊道具';
                    categoryIcon = 'fas fa-gift';
                    break;
            }
            
            html += `
                <div class="shop-category">
                    <h3><i class="${categoryIcon}"></i> ${categoryTitle}</h3>
                    <div class="items-grid" id="${category}-items">
            `;
            
            items.forEach(item => {
                const canAfford = userProfile.coins >= item.price;
                const itemClass = canAfford ? '' : 'disabled';
                const buttonText = canAfford ? '购买' : '金币不足';
                
                // 根据稀有度设置不同样式
                let rarityClass = '';
                let rarityColor = '';
                
                switch(item.rarity) {
                    case 'common':
                        rarityClass = 'rarity-common';
                        rarityColor = '#5c5c5c';
                        break;
                    case 'rare':
                        rarityClass = 'rarity-rare';
                        rarityColor = '#4a90e2';
                        break;
                    case 'epic':
                        rarityClass = 'rarity-epic';
                        rarityColor = '#9a42c5';
                        break;
                }
                
                html += `
                    <div class="shop-item ${itemClass} ${rarityClass}" style="border-color: ${rarityColor};">
                        <div class="item-icon">
                            <i class="${item.icon}"></i>
                        </div>
                        <h4>${item.name}</h4>
                        <p class="item-description">${item.description}</p>
                        <div class="item-effect">
                            ${Object.entries(item.effect).map(([key, value]) => {
                                let effectText = '';
                                switch(key) {
                                    case 'intelligence': effectText = `智力 +${value}`; break;
                                    case 'strength': effectText = `武力 +${value}`; break;
                                    case 'charm': effectText = `气质 +${value}`; break;
                                    case 'expMultiplier': effectText = `经验值 ×${value}`; break;
                                    case 'coinMultiplier': effectText = `金币 ×${value}`; break;
                                    case 'lucky': effectText = `增加幸运值`; break;
                                }
                                return effectText;
                            }).join(', ')}
                        </div>
                        <div class="item-price">
                            <i class="fas fa-coins"></i>
                            <span>${item.price} 金币</span>
                        </div>
                        <button class="btn-primary buy-btn" data-item-id="${item.id}" 
                                ${!canAfford ? 'disabled' : ''} style="width: 100%; margin-top: 10px;">
                            ${buttonText}
                        </button>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        return html;
    }
};

// 初始化课程管理器
CourseManager.init();

// 导出到全局作用域
if (typeof window !== 'undefined') {
    window.Course = Course;
    window.CourseManager = CourseManager;
    window.ShopItems = ShopItems;
    window.ShopManager = ShopManager;
}