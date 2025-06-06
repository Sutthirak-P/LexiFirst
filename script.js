// --- เริ่มโค้ดที่ถูกต้อง ---

const lessonSets = [
    {
        level: 1,
        title: "Basic Vocabulary Set 1",
        passingScore: 80,
        type: 'vocab-spell', // โหมดสะกดคำ
        items: [
            { word: 'apple', thai: 'แอปเปิ้ล' },
            { word: 'book', thai: 'หนังสือ' },
            { word: 'cat', thai: 'แมว' },
            { word: 'dog', thai: 'สุนัข' },
            { word: 'sun', thai: 'พระอาทิตย์' }
        ]
    },
    {
        level: 2,
        title: "Reading Practice Set 1",
        passingScore: 80,
        type: 'read-sentence', // โหมดอ่านประโยค
        items: [
            { text: 'The cat sits on the mat.' },
            { text: 'I have a red book.' },
            { text: 'The sun is very hot.' }
        ]
    },
    {
        level: 3,
        title: "Advanced Vocab Set 2",
        passingScore: 80,
        type: 'vocab-meaning', // โหมดบอกความหมาย (Eng -> Thai)
        items: [
            { word: 'beautiful', thai: 'สวยงาม' },
            { word: 'important', thai: 'สำคัญ' },
            { word: 'delicious', thai: 'อร่อย' }
        ]
    }
    // คุณครูสามารถเพิ่มชุดบทเรียน (Level) ต่อไปได้เรื่อยๆ ที่นี่
];


// ตั้งค่า SpeechRecognition
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.interimResults = false; // ไม่ต้องแสดงผลระหว่างพูด
recognition.continuous = false;

// อ้างอิงถึง Element ใน HTML
const levelSelectionDiv = document.getElementById('level-selection');
const practiceAreaDiv = document.getElementById('practice-area');
const levelTitle = document.getElementById('level-title');
const instructionP = document.getElementById('instruction');
const promptText = document.getElementById('prompt-text');
const startBtn = document.getElementById('start-btn');
const spokenTextSpan = document.getElementById('spoken-text');
const scoreTextSpan = document.getElementById('score-text');
const feedbackText = document.getElementById('feedback-text');
const progressBar = document.getElementById('progress-bar');
const progressLabel = document.getElementById('progress-label');
const nextLevelBtn = document.getElementById('next-level-btn');

// ตัวแปรเก็บสถานะของเกม
let currentLevelIndex = 0;
let currentItemIndex = 0;
let correctAnswers = 0;
let highestLevelUnlocked = 1;

// ฟังก์ชันคำนวณความคล้ายคลึงของข้อความ (ให้คะแนน)
function calculateSimilarity(str1, str2) {
    // ทำให้เป็นตัวพิมพ์เล็กและลบเครื่องหมายวรรคตอนบางส่วนเพื่อการเปรียบเทียบที่ง่ายขึ้น
    let processedStr1 = str1.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    let processedStr2 = str2.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");

    const longer = processedStr1.length > processedStr2.length ? processedStr1 : processedStr2;
    const shorter = processedStr1.length > processedStr2.length ? processedStr2 : processedStr1;
    if (longer.length === 0) return 1.0;
    let editDistance = 0;
    const longerLength = longer.length;
    for (let i = 0; i < shorter.length; i++) {
        if (shorter[i] !== longer[i]) {
            editDistance++;
        }
    }
    editDistance += longerLength - shorter.length;
    return (longerLength - editDistance) / longerLength;
}

// โหลดข้อมูลความคืบหน้าจากเครื่องนักเรียน
function loadProgress() {
    const savedLevel = localStorage.getItem('englishAppHighestLevel');
    if (savedLevel) {
        highestLevelUnlocked = parseInt(savedLevel, 10);
    }
}

// บันทึกข้อมูลความคืบหน้า
function saveProgress() {
    localStorage.setItem('englishAppHighestLevel', highestLevelUnlocked);
}

// แสดงด่านที่เลือกได้
function displayLevelSelection() {
    levelSelectionDiv.innerHTML = '<h2>Choose a Level</h2>';
    lessonSets.forEach((set, index) => {
        const isLocked = set.level > highestLevelUnlocked;
        const button = document.createElement('button');
        button.textContent = `Level ${set.level}: ${set.title} ${isLocked ? '🔒' : ''}`;
        button.disabled = isLocked;
        button.onclick = () => startLevel(index);
        levelSelectionDiv.appendChild(button);
    });
}

// เริ่มต้นด่าน
function startLevel(levelIndex) {
    currentLevelIndex = levelIndex;
    currentItemIndex = 0;
    correctAnswers = 0;
    
    levelSelectionDiv.classList.add('hidden');
    practiceAreaDiv.classList.remove('hidden');
    nextLevelBtn.classList.add('hidden');
    
    levelTitle.textContent = `Level ${lessonSets[currentLevelIndex].level}: ${lessonSets[currentLevelIndex].title}`;
    displayNextItem();
}

// แสดงโจทย์ข้อต่อไป
function displayNextItem() {
    const currentSet = lessonSets[currentLevelIndex];
    const currentItem = currentSet.items[currentItemIndex];
    
    // ตั้งค่าภาษาให้ AI
    if (currentSet.type === 'vocab-meaning') {
        recognition.lang = 'th-TH'; // โหมดบอกความหมายเป็นไทย
    } else {
        recognition.lang = 'en-US'; // โหมดภาษาอังกฤษ
    }

    // แสดงคำสั่ง
    if (currentSet.type === 'vocab-spell') {
        instructionP.textContent = 'พูดคำศัพท์ภาษาอังกฤษแล้วสะกด (เช่น Apple, A-P-P-L-E)';
        promptText.textContent = currentItem.thai;
    } else if (currentSet.type === 'read-sentence') {
        instructionP.textContent = 'อ่านประโยคต่อไปนี้ให้ถูกต้อง';
        promptText.textContent = currentItem.text;
    } else if (currentSet.type === 'vocab-meaning') {
        instructionP.textContent = 'บอกความหมายเป็นภาษาไทย';
        promptText.textContent = currentItem.word;
    }
    
    updateProgress();
    feedbackText.textContent = "";
    spokenTextSpan.textContent = "-";
    scoreTextSpan.textContent = "-";
}

// อัปเดตแถบความคืบหน้า
function updateProgress() {
    const totalItems = lessonSets[currentLevelIndex].items.length;
    const progress = (currentItemIndex / totalItems) * 100;
    progressBar.style.width = `${progress}%`;
    progressLabel.textContent = `Progress: ${currentItemIndex} / ${totalItems}`;
}

// ตรวจสอบคำตอบ
function checkAnswer(spoken) {
    const currentSet = lessonSets[currentLevelIndex];
    const currentItem = currentSet.items[currentItemIndex];
    let expectedText = '';

    if (currentSet.type === 'vocab-spell') {
        expectedText = (currentItem.word + currentItem.word.split('').join('')).toLowerCase();
        spoken = spoken.replace(/\s/g, '').toLowerCase();
    } else if (currentSet.type === 'read-sentence') {
        expectedText = currentItem.text;
        spoken = spoken; // ในส่วนนี้ไม่ต้องแปลงเป็นตัวพิมพ์เล็กทั้งหมดทันที เพื่อให้ฟังก์ชันคำนวณจัดการได้ดีกว่า
    } else if (currentSet.type === 'vocab-meaning') {
        expectedText = currentItem.thai;
        spoken = spoken.replace(/\s/g, '');
    }
    
    const accuracy = calculateSimilarity(spoken, expectedText);
    const score = Math.round(accuracy * 100);

    spokenTextSpan.textContent = spoken;
    scoreTextSpan.textContent = `${score}%`;

    if (score >= 80) {
        feedbackText.textContent = "Correct! 👍";
        feedbackText.style.color = 'green';
        correctAnswers++;
    } else {
        feedbackText.textContent = "Try again! 👎";
        feedbackText.style.color = 'red';
    }

    // หน่วงเวลาเล็กน้อยก่อนไปข้อถัดไป
    setTimeout(() => {
        currentItemIndex++;
        if (currentItemIndex < currentSet.items.length) {
            displayNextItem();
        } else {
            finishLevel();
        }
    }, 2000);
}

// จบด่าน
function finishLevel() {
    const currentSet = lessonSets[currentLevelIndex];
    const totalItems = currentSet.items.length;
    const finalScore = (correctAnswers / totalItems) * 100;

    instructionP.textContent = "Level Complete!";
    promptText.textContent = `You got ${correctAnswers} out of ${totalItems} correct. (${finalScore.toFixed(0)}%)`;

    // Clear existing buttons before adding new one
    const existingBackButton = feedbackText.querySelector('button');
    if (existingBackButton) {
        existingBackButton.remove();
    }

    if (finalScore >= currentSet.passingScore) {
        feedbackText.textContent = "Congratulations! You've passed this level.";
        feedbackText.style.color = 'blue';
        if (currentLevelIndex + 1 < lessonSets.length) {
            highestLevelUnlocked = Math.max(highestLevelUnlocked, currentSet.level + 1);
            saveProgress();
            nextLevelBtn.classList.remove('hidden');
        }
    } else {
        feedbackText.textContent = "Please try this level again to pass.";
        feedbackText.style.color = 'orange';
    }
    
    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Level Selection';
    backButton.onclick = () => {
        practiceAreaDiv.classList.add('hidden');
        levelSelectionDiv.classList.remove('hidden');
        nextLevelBtn.classList.add('hidden'); // ซ่อนปุ่ม next level ด้วย
        displayLevelSelection();
    };
    // ใช้ appendChild เพื่อต่อท้ายข้อความ
    feedbackText.appendChild(document.createElement('br'));
    feedbackText.appendChild(backButton);
}

// สั่งให้ AI เริ่มฟังเมื่อกดปุ่ม
startBtn.onclick = () => {
    feedbackText.textContent = "Listening...";
    recognition.start();
};

// เมื่อ AI ประมวลผลเสียงเสร็จ
recognition.onresult = (event) => {
    const spoken = event.results[0][0].transcript;
    checkAnswer(spoken);
};

// เมื่อกดปุ่มไปด่านต่อไป
nextLevelBtn.onclick = () => {
    startLevel(currentLevelIndex + 1);
};

// เริ่มต้นแอปทั้งหมด
function initializeApp() {
    loadProgress();
    displayLevelSelection();
}

initializeApp();

// --- จบโค้ดที่ถูกต้อง ---