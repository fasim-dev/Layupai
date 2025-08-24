// ===== KONFIGURASI & INISIALISASI =====
const APP_NAME = 'LayUp AI';
const JSON_URL = 'https://fasim-dev.github.io/Layupai/knowledge.json';

// Variabel global
let knowledgeBase = [];
let chatHistory = [];

// ====== BALASAN RANDOM DEFAULT ======
const fallbackReplies = [
  "Hehe maaf Bosku 🐔, Cumil masih belajar. Coba tanyain dengan cara lain ya ✨",
  "Waduh, kayaknya jawaban tadi belum pas nih Bosku. Yuk kita ulik lagi bareng 💪",
  "Maaf ya Bosku, Cumil kadang bisa salah. Tapi tenang, Cumil terus belajar biar makin jago 🚀",
  "Hmm... sepertinya Cumil salah tangkap pertanyaanmu. Bisa ulangi lagi Bosku?",
  "Ealah, maafkeun Bosku 😅. Jawaban tadi kurang nyambung ya, coba kasih pertanyaan yang lebih detail"
];

// Fakta/Jokes untuk variasi random
const jokesAndFacts = [
    "Tahu nggak? Ayam petelur bisa menghasilkan 250-300 telur per tahun! 🥚",
    "Hebatnya ayam - mereka bisa mengingat lebih dari 100 wajah manusia lho! 🐔",
    "Kalau ayam lagi stres, produksi telurnya bisa turun. Jadi harus dijaga mood-nya! 😊",
    "Di Indonesia, ayam petelur paling banyak di Jawa Timur dan Jawa Barat. 🗺️"
];

// Helper acak jawaban array
function getRandomAnswer(answer) {
    if (Array.isArray(answer)) {
        return answer[Math.floor(Math.random() * answer.length)];
    }
    return answer;
}

let customQna = [];
let fuse;
let currentChatId = null;
let currentCtx = null;
let currentCtxData = null;
let activeChats = [];
let archivedChats = [];
let productionData = [];
let conversationContext = {
    lastTopic: null,
    mentionedSymptoms: [],
    chickenType: null,
    ageRange: null
};
let conversationMemory = {
    currentTopic: null,
    lastQuestion: null,
    mentionedEntities: [],
    followUpQuestions: [],
    userPreferences: {}
};

// ===== NLP DAN INTENT DETECTION =====
function preprocessText(text) {
    return text.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]|_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractKeywords(text) {
    const stopWords = new Set(['yang','dan','di','ke','dari','untuk','pada','dengan','adalah','itu',
    'saya','aku','kamu','dia','kami','kita','mereka','ini','itu','nya',
    'lah','kah','pun','tentang','dalam','oleh','karena','atau','jika','apakah']);
    return preprocessText(text).split(' ').filter(w => w.length > 2 && !stopWords.has(w));
}

function detectIntent(question) {
    const lower = question.toLowerCase();
    const intents = {
        diagnosis: ['sakit','gejala','obat','vaksin','diare','lesu','pengobatan','penyakit'],
        pakan: ['pakan','makan','nutrisi','vitamin','mineral','rasio','konsumsi','feed'],
        produksi: ['telur','produksi','bertelur','layer','butir','hasil','menurun'],
        kandang: ['kandang','suhu','ventilasi','pencahayaan','sirkulasi','udara','tempat'],
        penyakit: ['newcastle','gumboro','bronchitis','coccidiosis','marek','flu','pox','crdf'],
        umum: ['apa','bagaimana','berapa','kapan','mengapa','siapa']
    };
    for (const [intent, kws] of Object.entries(intents)) {
        if (kws.some(k => lower.includes(k))) return intent;
    }
    return 'umum';
}

function detectTopic(message) {
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('sakit')||lowerMsg.includes('penyakit')||lowerMsg.includes('obat')) return 'penyakit';
    if (lowerMsg.includes('pakan')||lowerMsg.includes('makan')||lowerMsg.includes('vitamin')) return 'pakan';
    if (lowerMsg.includes('telur')||lowerMsg.includes('produksi')||lowerMsg.includes('layer')) return 'produksi';
    if (lowerMsg.includes('kandang')||lowerMsg.includes('suhu')||lowerMsg.includes('ventilasi')) return 'kandang';
    if (lowerMsg.includes('vaksin')||lowerMsg.includes('suntik')) return 'vaksin';
    if (lowerMsg.includes('harga')||lowerMsg.includes('biaya')||lowerMsg.includes('untung')) return 'ekonomi';
    return 'umum';
}

// ===== FOLLOW-UP QUESTIONS =====
function generateFollowUpQuestions(context) {
    const followUps = {
        diagnosis: [
            "Sudah berapa lama ayam menunjukkan gejala ini?",
            "Apakah ada ayam lain yang menunjukkan gejala serupa?",
            "Sudah memberikan treatment apa saja?",
            "Berapa persen dari total ayam yang terkena?"
        ],
        pakan: [
            "Jenis pakan apa yang sedang digunakan?",
            "Berapa jumlah ayam yang dipelihara?",
            "Berapa umur ayam-ayam tersebut?",
            "Apakah ada perubahan nafsu makan?"
        ],
        produksi: [
            "Berapa persen produksi telur saat ini?",
            "Apakah ada perubahan pola produksi?",
            "Bagaimana kualitas telur yang dihasilkan?",
            "Sudah berapa lama produksi menurun?"
        ],
        penyakit: [
            "Apakah sudah dilakukan vaksinasi?",
            "Kapan pertama kali gejala muncul?",
            "Apakah ada kematian pada ayam?",
            "Bagaimana kondisi lingkungan kandang?"
        ]
    };
    // Acak urutan
    const arr = followUps[context.intent] || ["Apakah ada info lain?","Bisa dijelaskan lebih detail?"];
    return arr.sort(()=>Math.random()-0.5);
}

// ===== FUNGSI PENCARIAN JAWABAN =====
function findAnswer(userMessage) {
    const preprocessed = preprocessText(userMessage);
    const keywords = extractKeywords(userMessage);
    
    // Cari pertanyaan yang cocok di knowledge base
    let bestMatch = null;
    let highestScore = 0;
    
    knowledgeBase.forEach(item => {
        let score = 0;
        
        // Cek kecocokan pertanyaan
        if (item.question && preprocessed.includes(preprocessText(item.question))) {
            score += 0.8;
        }
        
        // Cek kecocokan keyword
        if (item.keywords) {
            const keywordMatches = item.keywords.filter(keyword => 
                keywords.some(word => word.includes(keyword) || keyword.includes(word))
            );
            score += (keywordMatches.length / item.keywords.length) * 0.2;
        }
        
        // Jika skor cukup tinggi, simpan sebagai best match
        if (score > highestScore && score > 0.3) {
            highestScore = score;
            bestMatch = item;
        }
    });
    
    if (bestMatch) {
        return getRandomAnswer(bestMatch.answer);
    }
    
    return null;
}

// ===== SISTEM RESPONS =====
function findBestAnswer(question) {
    if (!fuse) return null;
    const keywords = extractKeywords(question);
    const intent = detectIntent(question);
    conversationMemory.lastQuestion = question;
    conversationMemory.currentTopic = intent;
    const fuseResults = fuse.search(question, {limit:3});
    if (fuseResults.length>0 && fuseResults[0].score<0.4){
        return {answer:getRandomAnswer(fuseResults[0].item.answer),score:fuseResults[0].score};
    }
    if (customQna.length>0){
        const customFuse = new Fuse(customQna,{keys:['question','answer','keywords'],threshold:0.5,includeScore:true});
        const customResults = customFuse.search(question,{limit:1});
        if(customResults.length>0 && customResults[0].score<0.45){
            return {answer:getRandomAnswer(customResults[0].item.answer),score:customResults[0].score};
        }
    }
    for(const item of knowledgeBase){
        const itemKeywords = item.keywords||[];
        const matches = itemKeywords.filter(kw=>keywords.some(word=>word.includes(kw)||kw.includes(word)));
        if(matches.length>=2){
            return {answer:getRandomAnswer(item.answer),score:0.3};
        }
    }
    return null;
}

// Multi-turn & kontekstual
function handleContextualQuestion(question) {
    const lowerQuestion = question.toLowerCase();
    
    // Deteksi pertanyaan lanjutan
    if (conversationMemory.lastQuestion && (
        lowerQuestion.includes('itu') || 
        lowerQuestion.includes('tersebut') ||
        lowerQuestion.includes('lagi') ||
        lowerQuestion.includes('lanjut') ||
        lowerQuestion.startsWith('bagaimana') ||
        lowerQuestion.startsWith('berapa') ||
        lowerQuestion.startsWith('apakah')
    )) {
        // Gabungkan dengan pertanyaan sebelumnya untuk konteks
        const contextualQuestion = `${conversationMemory.lastQuestion} ${question}`;
        const result = findBestAnswer(contextualQuestion);
        
        if (result && result.score < 0.5) {
            return result.answer;
        }
    }
    
    return null;
}

function handleMultiTurnConversation(question) {
    const lowerQuestion = question.toLowerCase();
    
    // Jika user merespons pertanyaan lanjutan
    if (conversationMemory.followUpQuestions.length > 0) {
        for (let i = 0; i < conversationMemory.followUpQuestions.length; i++) {
            if (lowerQuestion.includes(conversationMemory.followUpQuestions[i].toLowerCase())) {
                // Gabungkan dengan konteks sebelumnya
                const contextualQuestion = `${conversationMemory.lastQuestion} ${question}`;
                const result = findBestAnswer(contextualQuestion);
                
                if (result) {
                    return result.answer;
                }
            }
        }
    }
    
    return null;
}

function enhanceAnswer(answer, question, context) {
    let enhancedAnswer = answer;
    
    // Tambahkan informasi tambahan berdasarkan konteks
    if (context.intent === 'diagnosis' && answer.includes('penyakit')) {
        enhancedAnswer += "\n\n💡 **Tips Pencegahan:**\n" +
            "• Selalu jaga kebersihan kandang\n" +
            "• Lakukan vaksinasi sesuai jadwal\n" +
            "• Berikan pakan bergizi dan air bersih\n" +
            "• Isolasi ayam yang sakit segera";
    }
    
    if (context.intent === 'pakan' && answer.includes('pakan')) {
        enhancedAnswer += "\n\n📊 **Catatan Penting:**\n" +
            "• Kebutuhan pakan bisa bervariasi tergantung suhu lingkungan\n" +
            "• Ayam stres atau sakit mungkin makan lebih sedikit\n" +
            "• Selalu sediakan air bersih yang cukup";
    }
    
    // Personalisasi dengan nama user jika ada
    const userName = localStorage.getItem('layup_userName');
    if (userName && Math.random() > 0.7) {
        enhancedAnswer = enhancedAnswer.replace(/Bosku|Sob|Bang/, userName);
    }
    
    return enhancedAnswer;
}

// ===== MODUL KEPRIBADIAN AI =====
const topicEmojis = {
    penyakit: "🤒",
    pakan: "🍚",
    produksi: "🥚",
    kandang: "🏠",
    vaksin: "💉",
    umum: "🐔",
    ekonomi: "💸"
};

// Tambahkan emoji berdasarkan topik
function addPersonalityToResponse(response, topic) {
    const emoji = topicEmojis[topic] || "🐔";
    return `${emoji} ${response}`;
}

// Personalisasi respons dengan nama pengguna
function personalizeResponse(response) {
    const userName = localStorage.getItem('layup_userName');
    
    if (userName && Math.random() > 0.6) {
        const prefixes = [
            `${userName}, `,
            `Sob ${userName}, `,
            `Bos ${userName}, `,
            `${userName} yang budiman, `
        ];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        return prefix + response;
    }
    return response;
}

// Sesekali selipkan fakta menarik
function occasionallyAddFunFact() {
    if (Math.random() < 0.2) {
        const fact = jokesAndFacts[Math.floor(Math.random() * jokesAndFacts.length)];
        return `\n\n${fact}`;
    }
    return "";
}

// Fungsi untuk mendapatkan salam berdasarkan waktu
function getTimeBasedGreeting() {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) return "Pagi";
    if (hour >= 12 && hour < 15) return "Siang";
    if (hour >= 15 && hour < 19) return "Sore";
    return "Malam";
}

// Pesan pembuka berdasarkan waktu
const welcomeMessages = {
    Pagi: "Selamat pagi! Semangat menjalani hari! ☀️",
    Siang: "Selamat siang! Semoga harinya produktif! 🌞",
    Sore: "Selamat sore! Sudah cek produksi telur hari ini? 🌇",
    Malam: "Selamat malam! Semoga ayam-ayamnya tidur nyenyak! 🌙"
};

// ===== MODUL RESPONS RAMAH =====
const friendlyResponses = {
    greeting: [
        "Halo Bosku! 🐔 Ada yang bisa saya bantu tentang ayam petelur hari ini?",
        "Yuhuu! Selamat datang lagi, Sob! Ada yang mau ditanyakan?",
        "Hai! Siap membantu urusan ayam petelur nih. Ada apa?",
        "Halo! Lagi ada kendala dengan layer kesayangan? Yuk cerita..."
    ],
    noAnswer: [
        "Wah, pertanyaannya menarik nih. Tapi aku masih belajar soal itu, Bos. Mungkin bisa coba tanya hal lain?",
        "Hmm... kayaknya aku perlu belajar lagi nih tentang itu. Tapi kalau soal ${relatedTopic}, aku bisa bantu!",
        "Maaf ya, pengetahuanku masih terbatas soal itu. Tapi jangan sungkan tanya hal lain!",
        "Waduh, pertanyaan yang sulit nih. Aku belum punya info lengkapnya. Mungkin soal ${relatedTopic} lebih aku kuasai."
    ],
    confirmation: [
        "Oke, mantap! Langsung saya proses...",
        "Sip! Nah ini dia infonya...",
        "Oke Bos, ini dia penjelasannya...",
        "Nih, saya udah siapin infonya khusus buat kamu..."
    ],
    typing: [
        "Lagi cari info terbaik buat kamu...",
        "Sedang mempersiapkan jawaban...",
        "Tunggu sebentar ya, lagi konsultasi dengan pakar...",
        "Satu saat, lagi mengumpulkan data..."
    ]
};

// Fungsi untuk memilih respons santai secara acak
function getFriendlyResponse(type, context = {}) {
    let responses = friendlyResponses[type] || ["Oke, saya bantu."];
    let response = responses[Math.floor(Math.random() * responses.length)];
    
    // Replace placeholder dengan konteks
    if (context.relatedTopic) {
        response = response.replace('${relatedTopic}', context.relatedTopic);
    }
    
    return response;
}

// ===== UTIL =====
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function copyToClipboard(text){
    if (!text) return;
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(()=>showToast('Disalin', 'success')).catch(()=>fallbackCopy(text));
    } else fallbackCopy(text);
}

function fallbackCopy(text){
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); ta.remove();
    showToast('Disalin', 'success');
}

// ===== INISIALISASI APP =====
function initApp() {
    loadData();
    setupEventListeners();
    setupFollowUpQuestionHandling();
    
    if (!activeChats.length) {
        createNewChat();
    } else {
        currentChatId = activeChats[0].id;
        renderHistory();
        renderChat();
    }
    
    fetchKnowledgeBase();
    initCustomMultiSelect();
    
    // Tampilkan prompt nama jika belum ada
    if (!localStorage.getItem('layup_userName')) {
        setTimeout(() => showModal('#modalNamePrompt'), 2000);
    }
}

// ===== MANAJEMEN DATA LOKAL =====
function loadData() {
    try{
        const savedChats = localStorage.getItem('layup_chats');
        const savedCustom = localStorage.getItem('layup_custom_qna');
        const savedProduction = localStorage.getItem('layup_production');
        if (savedChats) {
            const chats = JSON.parse(savedChats);
            activeChats = chats.active || [];
            archivedChats = chats.archived || [];
            renderHistory();
        }
        if (savedCustom) customQna = JSON.parse(savedCustom);
        if (savedProduction) productionData = JSON.parse(savedProduction);
    }catch(e){ console.warn('Load data error', e); }
}

function saveData() {
    const chatData = { active: activeChats, archived: archivedChats };
    localStorage.setItem('layup_chats', JSON.stringify(chatData));
    localStorage.setItem('layup_custom_qna', JSON.stringify(customQna));
    localStorage.setItem('layup_production', JSON.stringify(productionData));
}

// ===== MANAJEMEN CHAT =====
function createNewChat() {
    const newId = 'chat_' + Date.now();
    currentChatId = newId;
    const newChat = { id: newId, title: 'Chat Baru', messages: [], createdAt: new Date().toISOString() };
    activeChats.unshift(newChat);
    saveData();
    renderHistory();
    clearStream();
    
    // Tampilkan pesan pembuka yang lebih personal
    const greeting = getTimeBasedGreeting();
    const welcomeMsg = `${welcomeMessages[greeting]} ${getFriendlyResponse('greeting')}`;
    addBotMessage(welcomeMsg);
}

function clearStream() { 
    const stream = $('#stream');
    if (stream) stream.innerHTML = ''; 
}

function renderChat() {
    const chat = getCurrentChat(); 
    if (!chat) return;
    clearStream();
    chat.messages.forEach(msg => {
        if (msg.role === 'user') addUserMessage(msg.content, false);
        else addBotMessage(msg.content, false);
    });
}

function getCurrentChat() { 
    return activeChats.find(chat => chat.id === currentChatId); 
}

// ===== RENDER HISTORY =====
function renderHistory() {
    const activeContainer = $('#historyActive');
    const archiveContainer = $('#historyArchive');
    if (!activeContainer || !archiveContainer) return;
    
    activeContainer.innerHTML = '';
    archiveContainer.innerHTML = '';

    archivedChats.forEach(chat => archiveContainer.appendChild(createHistoryElement(chat, true)));
    activeChats.forEach(chat => activeContainer.appendChild(createHistoryElement(chat, false)));
}

function createHistoryElement(chat, isArchived) {
    const div = document.createElement('div');
    div.className = 'item' + (chat.id === currentChatId ? ' active' : '');
    div.innerHTML = `
        <div class="icon"><i class="fa-regular fa-message"></i></div>
        <div class="name">${chat.title}</div>
    `;
    div.addEventListener('click', () => {
        if (chat.id !== currentChatId) { 
            currentChatId = chat.id; 
            renderChat(); 
            renderHistory(); 
        }
    });
    // Context menu
    div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        currentCtx = 'history'; 
        currentCtxData = { chat, archived:isArchived };
        showContextMenu(e, 'ctxHistory');
    });
    return div;
}

// ===== PESAN =====
function attachUserBubbleEvents(bubble, content, msgObj){
    const [btnCopy, btnEdit] = bubble.querySelectorAll('.tool-btn');
    btnCopy?.addEventListener('click', ()=> copyToClipboard(content));
    btnEdit?.addEventListener('click', ()=>{
        const ta = document.createElement('textarea');
        ta.value = content;
        ta.style.width='100%'; 
        ta.style.minHeight='80px';
        const old = bubble.querySelector('.content');
        old.replaceWith(ta);
        ta.focus();
        ta.addEventListener('blur', ()=>{
            const newTxt = ta.value.trim();
            const div = document.createElement('div'); 
            div.className='content'; 
            div.textContent = newTxt || content;
            ta.replaceWith(div);
            if (newTxt && msgObj){
                msgObj.content = newTxt; 
                saveData();
                // update chat title jika ini pesan pertama
                const chat = getCurrentChat();
                if (chat && chat.messages[0]===msgObj){
                    chat.title = newTxt.length>30? newTxt.slice(0,30)+'...' : newTxt;
                    renderHistory();
                }
            }
        }, {once:true});
    });
}

function addUserMessage(content, save = true) {
    const stream = $('#stream');
    if (!stream) return null;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'msg user';
    msgDiv.innerHTML = `
        <div class="avatar">🧑</div>
        <div class="bubble">
            <div class="content">${content}</div>
            <div class="tools">
                <button class="tool-btn" title="Salin"><i class="fa-regular fa-copy"></i></button>
                <button class="tool-btn" title="Edit"><i class="fa-regular fa-pen-to-square"></i></button>
            </div>
        </div>`;
    stream.appendChild(msgDiv);
    stream.scrollTop = stream.scrollHeight;

    let msgObj = null;
    if (save) {
        const chat = getCurrentChat();
        if (chat) {
            msgObj = { role:'user', content, timestamp:new Date().toISOString() };
            chat.messages.push(msgObj);
            if (chat.messages.length === 1) { 
                chat.title = content.length>30? content.slice(0,30)+'...' : content; 
                renderHistory(); 
            }
            saveData();
        }
    }
    attachUserBubbleEvents(msgDiv.querySelector('.bubble'), content, msgObj);
    return msgDiv;
}

function attachBotBubbleEvents(bubble, content){
    const [btnLike, btnDislike, btnCopy] = bubble.querySelectorAll('.bot-actions .act');
    btnCopy?.addEventListener('click', ()=> copyToClipboard(bubble.querySelector('.content')?.innerText || content));
    btnLike?.addEventListener('click', ()=>{
        btnLike.classList.toggle('active'); 
        btnDislike.classList.remove('active');
    });
    btnDislike?.addEventListener('click', ()=>{
        btnDislike.classList.toggle('active'); 
        btnLike.classList.remove('active');
    });
}

function addBotMessage(content, save = true, type = 'normal') {
    const stream = $('#stream');
    if (!stream) return null;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'msg bot';
    let bubbleClass = 'bubble';
    if (type === 'info') bubbleClass += ' info';
    else if (type === 'success') bubbleClass += ' success';
    else if (type === 'warning') bubbleClass += ' warning';
    else if (type === 'error') bubbleClass += ' danger';

    // Proses konten untuk menemukan pertanyaan lanjutan
    let processedContent = content;
    if (conversationMemory.followUpQuestions.length > 0) {
        conversationMemory.followUpQuestions.forEach((q, i) => {
            processedContent = processedContent.replace(
                new RegExp(`${i + 1}\\. ${q}`), 
                `${i + 1}. <a href="#" class="follow-up-question">${q}</a>`
            );
        });
    }

    // Proses formatting teks
    processedContent = processedContent
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
        .replace(/\n/g, '<br>'); // Line breaks

    msgDiv.innerHTML = `
        <div class="avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="${bubbleClass}">
            <div class="content">${processedContent}</div>
            <div class="meta">${APP_NAME} · ${new Date().toLocaleTimeString()}</div>
            <div class="bot-actions">
                <button class="act like" title="Suka"><i class="fa-regular fa-thumbs-up"></i></button>
                <button class="act dislike" title="Tidak Suka"><i class="fa-regular fa-thumbs-down"></i></button>
                <button class="act" title="Salin"><i class="fa-regular fa-copy"></i></button>
            </div>
        </div>`;
    stream.appendChild(msgDiv);
    stream.scrollTop = stream.scrollHeight;

    attachBotBubbleEvents(msgDiv.querySelector('.bubble'), content);

    if (save) {
        const chat = getCurrentChat();
        if (chat) {
            chat.messages.push({ role:'assistant', content, timestamp:new Date().toISOString() });
            saveData();
        }
    }
    return msgDiv;
}

// ===== PROSES PERTANYAAN USER =====
function processQuestion(question) {
    addUserMessage(question);
    const typingIndicator = showTyping();
    
    // Deteksi intent dan topik
    const intent = detectIntent(question);
    const topic = detectTopic(question);
    updateContext(question);
    
    setTimeout(() => {
        if (typingIndicator) typingIndicator.remove();
        
        let finalAnswer;
        
        // 1. Coba tangani sebagai percakapan multi-turn
        const multiTurnAnswer = handleMultiTurnConversation(question);
        if (multiTurnAnswer) {
            finalAnswer = multiTurnAnswer;
        } 
        // 2. Coba tangani sebagai pertanyaan kontekstual
        else {
            const contextualAnswer = handleContextualQuestion(question);
            if (contextualAnswer) {
                finalAnswer = contextualAnswer;
            } 
            // 3. Cari jawaban biasa
            else {
                const result = findBestAnswer(question);
                
                if (result) {
                    finalAnswer = enhanceAnswer(result.answer, question, { intent, topic });
                } else {
                    // Generate follow-up questions berdasarkan konteks
                    conversationMemory.followUpQuestions = generateFollowUpQuestions({ intent });
                    const relatedTopic = findRelatedTopic(question);
                    const context = { relatedTopic };
                    
                    finalAnswer = getFriendlyResponse('noAnswer', context);
                    
                    // Tambahkan pertanyaan lanjutan jika ada
                    if (conversationMemory.followUpQuestions.length > 0) {
                        finalAnswer += "\n\n**Mungkin Anda ingin tahu:**\n";
                        conversationMemory.followUpQuestions.forEach((q, i) => {
                            finalAnswer += `${i + 1}. <a href="#" class="follow-up-question">${q}</a>\n`;
                        });
                    }
                }
            }
        }
        
        // Tambahkan personality dan fakta menarik
        finalAnswer = personalizeResponse(finalAnswer);
        finalAnswer = addPersonalityToResponse(finalAnswer, topic);
        finalAnswer += occasionallyAddFunFact();
        
        addBotMessage(finalAnswer);
    }, 800 + Math.random() * 700);
}

function showTyping() {
    const stream = $('#stream');
    if (!stream) return null;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'msg bot';
    msgDiv.innerHTML = `
        <div class="avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="bubble">
            <div class="typing">
                <div>${getFriendlyResponse('typing')}</div>
                <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
            </div>
        </div>`;
    stream.appendChild(msgDiv);
    stream.scrollTop = stream.scrollHeight;
    return msgDiv;
}

// ===== TOAST & MODAL & CONTEXT MENU =====
function showToast(message, type = 'normal') {
    const toast = $('#toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast';
    if (type) toast.classList.add(type);
    toast.classList.add('show');
    setTimeout(()=> toast.classList.remove('show'), 2600);
}

function showContextMenu(e, menuId) {
    // tutup semua menu lain dulu
    $$('.ctx').forEach(m=>m.classList.remove('show'));
    const menu = document.getElementById(menuId);
    if (!menu) return;
    
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';
    menu.classList.add('show');
    const hideMenu = () => { 
        menu.classList.remove('show'); 
        document.removeEventListener('click', hideMenu); 
    };
    setTimeout(()=> document.addEventListener('click', hideMenu), 10);
}

function showModal(selector){ 
    const modal = document.querySelector(selector);
    if (modal) modal.classList.add('show'); 
}

function hideModal(selector){ 
    const modal = document.querySelector(selector);
    if (modal) modal.classList.remove('show'); 
}

// ===== CUSTOM MULTISELECT =====
let sharedOptionsList = null; // <ul> dropdown global
function initCustomMultiSelect(){
    // buat dropdown global sekali
    sharedOptionsList = document.createElement('ul');
    sharedOptionsList.className = 'custom-options';
    document.body.appendChild(sharedOptionsList);

    // klik di luar → tutup
    document.addEventListener('click', (e)=>{
        if (!sharedOptionsList.contains(e.target) && !e.target.closest('.custom-multiselect')){
            sharedOptionsList.style.display='none';
        }
    });

    // bind ke setiap .custom-multiselect
    $$('.custom-multiselect').forEach(ms=>{
        const targetId = ms.getAttribute('data-target');
        const select = document.getElementById(targetId);
        ms.addEventListener('click', (e)=>{
            // render opsi
            sharedOptionsList.innerHTML = '';
            Array.from(select.options).forEach(opt=>{
                const li = document.createElement('li');
                li.textContent = opt.textContent;
                if (opt.selected) li.style.opacity = .6;
                li.addEventListener('click', (ev)=>{
                    ev.stopPropagation();
                    opt.selected = !opt.selected;
                    updateTags(ms, select);
                    sharedOptionsList.style.display='none';
                });
                sharedOptionsList.appendChild(li);
            });
            // posisikan
            const rect = ms.getBoundingClientRect();
            sharedOptionsList.style.left = `${rect.left + window.scrollX}px`;
            sharedOptionsList.style.top = `${rect.bottom + window.scrollY + 6}px`;
            sharedOptionsList.style.minWidth = rect.width+'px';
            sharedOptionsList.style.display='block';
        });
        // render awal
        updateTags(ms, select);
    });
}

function updateTags(ms, select){
    ms.innerHTML = '';
    const selected = Array.from(select.selectedOptions);
    if (!selected.length){
        const ph = document.createElement('span'); 
        ph.className='placeholder'; 
        ph.textContent='Pilih gejala';
        ms.appendChild(ph); 
        return;
    }
    selected.forEach(opt=>{
        const tag = document.createElement('span'); 
        tag.className='tag';
        tag.innerHTML = `${opt.textContent} <span class="x">×</span>`;
        tag.querySelector('.x').addEventListener('click',(e)=>{
            e.stopPropagation(); 
            opt.selected=false; 
            updateTags(ms, select);
        });
        ms.appendChild(tag);
    });
}

// ===== FUNGSI UNTUK MENANGANI PERTANYAAN LANJUTAN =====
function setupFollowUpQuestionHandling() {
    const stream = $('#stream');
    if (!stream) return;
    
    stream.addEventListener('click', (e) => {
        // Tangani klik pada pertanyaan lanjutan
        if (e.target.classList.contains('follow-up-question')) {
            e.preventDefault();
            const question = e.target.textContent;
            const input = $('#input');
            if (input) input.value = question;
            processQuestion(question);
        }
    });
}

// ===== UPDATE CONTEXT UNTUK MENANGANI ENTITAS =====
function updateContext(userMessage, botResponse) {
    const lowerMsg = userMessage.toLowerCase();
    
    // Deteksi topik berdasarkan kata kunci
    const topics = {
        penyakit: ['sakit', 'gejala', 'obat', 'vaksin', 'diare', 'lesu'],
        pakan: ['pakan', 'makan', 'nutrisi', 'vitamin', 'mineral'],
        produksi: ['telur', 'produksi', 'bertelur', 'layer'],
        kandang: ['kandang', 'suhu', 'ventilasi', 'pencahayaan']
    };
    
    for (const [topic, keywords] of Object.entries(topics)) {
        if (keywords.some(keyword => lowerMsg.includes(keyword))) {
            conversationContext.lastTopic = topic;
            conversationMemory.currentTopic = topic;
            break;
        }
    }
    
    // Ekstrak entitas yang disebutkan (jumlah, usia, dll)
    const numberMatch = userMessage.match(/\d+/g);
    if (numberMatch) {
        conversationMemory.mentionedEntities = conversationMemory.mentionedEntities.concat(numberMatch);
    }
    
    // Simpan informasi spesifik yang disebutkan
    if (conversationContext.lastTopic === 'penyakit') {
        const symptoms = ['diare', 'lesu', 'nafsu makan turun', 'bulu kusam'];
        symptoms.forEach(symptom => {
            if (userMessage.includes(symptom) && !conversationContext.mentionedSymptoms.includes(symptom)) {
                conversationContext.mentionedSymptoms.push(symptom);
                conversationMemory.mentionedEntities.push(symptom);
            }
        });
    }
}

// ===== CARI TOPIK TERKAIT =====
function findRelatedTopic(question) {
    const keywords = question.toLowerCase().split(' ');
    const topics = ['penyakit', 'pakan', 'produksi', 'kandang', 'vaksin'];
    
    for (const topic of topics) {
        if (keywords.some(keyword => topic.includes(keyword) || keyword.includes(topic))) {
            return topic;
        }
    }
    
    return 'ayam petelur';
}

// ===== FETCH KNOWLEDGE BASE =====
async function fetchKnowledgeBase() {
    try {
        const url = JSON_URL + '?t=' + new Date().getTime();
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            mode: 'cors'
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        if (data && Array.isArray(data.faq)) {
            knowledgeBase = data.faq;
        } else if (Array.isArray(data)) {
            knowledgeBase = data;
        } else {
            showToast('Struktur knowledge.json tidak sesuai', 'warning');
            knowledgeBase = [];
        }
        
        showToast(`Basis pengetahuan: ${knowledgeBase.length} item`);
        initFuse();
    } catch (err) {
        console.error(err);
        showToast('Gagal memuat knowledge.json', 'error');
        knowledgeBase = [];
        initFuse();
    }
}

// ===== INISIALISASI FUSE =====
function initFuse() {
    if (!knowledgeBase || knowledgeBase.length === 0) return;

    fuse = new Fuse(knowledgeBase, {
        keys: ['question', 'keywords'],
        threshold: 0.55,
        distance: 200,
        minMatchCharLength: 2,
        includeScore: true
    });
}

// ===== SETUP EVENT LISTENERS =====
function setupEventListeners() {
    // Toggle sidebar
    const sideToggle = $('#sideToggle');
    if (sideToggle) {
        sideToggle.addEventListener('click', () => {
            const sidebar = $('#sidebar');
            const sidebarBackdrop = $('#sidebarBackdrop');
            if (sidebar) sidebar.classList.toggle('show');
            if (sidebarBackdrop) sidebarBackdrop.classList.toggle('show');
        });
    }
    
    const sidebarBackdrop = $('#sidebarBackdrop');
    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', () => {
            const sidebar = $('#sidebar');
            if (sidebar) sidebar.classList.remove('show');
            sidebarBackdrop.classList.remove('show');
        });
    }

    // Input text message
    const input = $('#input');
    const sendBtn = $('#sendBtn');
    if (input && sendBtn) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.value.trim()) { 
                    processQuestion(input.value.trim()); 
                    input.value = ''; 
                }
            }
        });
        sendBtn.addEventListener('click', () => {
            if (input.value.trim()) { 
                processQuestion(input.value.trim()); 
                input.value = ''; 
            }
        });
    }

    // Menu ⋮
    const moreBtn = $('#moreBtn');
    if (moreBtn) {
        moreBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            const moreMenu = $('#moreMenu');
            if (moreMenu) moreMenu.classList.toggle('show');
        });
    }
    document.addEventListener('click', () => { 
        const moreMenu = $('#moreMenu');
        if (moreMenu) moreMenu.classList.remove('show'); 
    });

    // New chat
    const newChatBtn = $('#newChatBtn');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', createNewChat);
    }

    // Account menu
    const accountBtn = $('#accountBtn');
    if (accountBtn) {
        accountBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            const accountMenu = $('#accountMenu');
            if (accountMenu) accountMenu.classList.toggle('show');
        });
    }
    document.addEventListener('click', ()=> { 
        const accountMenu = $('#accountMenu');
        if (accountMenu) accountMenu.classList.remove('show'); 
    });

    // Attach menu
    const attachBtn = $('#attachBtn');
    if (attachBtn) {
        attachBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            const attachMenu = $('#attachMenu');
            if (attachMenu) attachMenu.classList.toggle('show');
        });
    }
    document.addEventListener('click', ()=> { 
        const attachMenu = $('#attachMenu');
        if (attachMenu) attachMenu.classList.remove('show'); 
    });

    // Expand composer
    const expandBtn = $('#expandBtn');
    if (expandBtn) {
        expandBtn.addEventListener('click', () => {
            const overlay = $('#overlay');
            const overlayInput = $('#overlayInput');
            const input = $('#input');
            if (overlay) overlay.classList.add('show');
            if (overlayInput && input) overlayInput.value = input.value;
            if (overlayInput) overlayInput.focus();
        });
    }
    
    const closeOverlay = $('#closeOverlay');
    if (closeOverlay) {
        closeOverlay.addEventListener('click', () => { 
            const overlay = $('#overlay');
            if (overlay) overlay.classList.remove('show'); 
        });
    }
    
    const overlayCancel = $('#overlayCancel');
    if (overlayCancel) {
        overlayCancel.addEventListener('click', () => { 
            const overlay = $('#overlay');
            if (overlay) overlay.classList.remove('show'); 
        });
    }
    
    const overlaySend = $('#overlaySend');
    if (overlaySend) {
        overlaySend.addEventListener('click', () => {
            const overlayInput = $('#overlayInput');
            const overlay = $('#overlay');
            if (overlayInput && overlayInput.value.trim()) { 
                processQuestion(overlayInput.value.trim()); 
                overlayInput.value = ''; 
                if (overlay) overlay.classList.remove('show'); 
            }
        });
    }

    // Fitur khusus (open modal)
    const healthDiagnosis = $('#healthDiagnosis');
    if (healthDiagnosis) {
        healthDiagnosis.addEventListener('click', () => showModal('#modalHealth'));
    }
    
    const feedCalculator = $('#feedCalculator');
    if (feedCalculator) {
        feedCalculator.addEventListener('click', () => showModal('#modalFeed'));
    }
    
    const productionTracker = $('#productionTracker');
    if (productionTracker) {
        productionTracker.addEventListener('click', () => showModal('#modalProduction'));
    }
    
    const diseaseEncyclopedia = $('#diseaseEncyclopedia');
    if (diseaseEncyclopedia) {
        diseaseEncyclopedia.addEventListener('click', () => showModal('#modalDisease'));
    }

    // Modal close generic
    $$('[data-close]').forEach(btn=>{
        btn.addEventListener('click', ()=> hideModal(btn.getAttribute('data-close')));
    });

    // Diagnosis
    const healthDiagnose = $('#healthDiagnose');
    if (healthDiagnose) {
        healthDiagnose.addEventListener('click', () => {
            const symptoms = Array.from($('#symptoms').selectedOptions).map(o=>o.value);
            if (!symptoms.length) { 
                showToast('Pilih setidaknya satu gejala', 'warning'); 
                return; 
            }
            hideModal('#modalHealth');
            addUserMessage('Diagnosis kesehatan dengan gejala: ' + symptoms.join(', '));
            const typing = showTyping();
            setTimeout(() => {
                if (typing) typing.remove();
                // Gunakan sistem diagnosis yang ditingkatkan
                const results = enhancedDiagnosis(symptoms);
                const diagnosisMsg = formatDiagnosisResults(results);
                addBotMessage(diagnosisMsg, true, 'warning');
            }, 1200);
        });
    }

    // Kalkulator pakan
    const feedCalculate = $('#feedCalculate');
    if (feedCalculate) {
        feedCalculate.addEventListener('click', () => {
            const count = parseInt($('#feedChickenCount').value);
            const age = parseInt($('#feedChickenAge').value);
            const type = $('#feedChickenType').value;
            if (!count || !age) { 
                showToast('Masukkan jumlah dan umur ayam', 'warning'); 
                return; 
            }
            hideModal('#modalFeed');

            let feedPerChicken;
            if (type==='layer'){
                if (age<5) feedPerChicken=0.05; 
                else if (age<10) feedPerChicken=0.07; 
                else if (age<20) feedPerChicken=0.1; 
                else feedPerChicken=0.12;
            } else {
                if (age<3) feedPerChicken=0.05; 
                else if (age<6) feedPerChicken=0.1; 
                else feedPerChicken=0.15;
            }
            const totalFeed = count * feedPerChicken;
            addUserMessage(`Hitung kebutuhan pakan untuk ${count} ekor ayam ${type} umur ${age} minggu`);
            
            const response = `**Hasil Perhitungan:**\n`+
                `• Jumlah ayam: ${count} ekor\n`+
                `• Umur: ${age} minggu\n`+
                `• Jenis: ${type==='layer'?'Petelur (Layer)':'Pedaging (Broiler)'}\n`+
                `• Kebutuhan per ekor: ${feedPerChicken} kg/hari\n`+
                `• **Total: ${totalFeed.toFixed(2)} kg/hari**\n\n`+
                `*Estimasi, sesuaikan kondisi lapangan.*`;
                
            addBotMessage(response, true, 'success');
        });
    }

    // Production tracker (minimal)
    const prodSave = $('#prodSave');
    if (prodSave) {
        prodSave.addEventListener('click', ()=>{
            const date = $('#prodDate').value;
            const eggs = parseInt($('#prodEggCount').value||'0',10);
            const chickens = parseInt($('#prodChickenCount').value||'0',10);
            if (!date || !eggs || !chickens){ 
                showToast('Lengkapi tanggal, telur, dan jumlah ayam', 'warning'); 
                return; 
            }
            productionData.push({date, eggs, chickens});
            saveData();
            hideModal('#modalProduction');
            const hd = (eggs/chickens*100).toFixed(1);
            addUserMessage(`Catat produksi: ${eggs} butir (${date}) dari ${chickens} ekor`);
            addBotMessage(`Data disimpan. Performa **HD: ${hd}%** pada ${date}.`, true, 'success');
        });
    }

    // Disease encyclopedia (mini info)
    const diseaseInfo = $('#diseaseInfo');
    if (diseaseInfo) {
        diseaseInfo.addEventListener('click', ()=>{
            const val = $('#diseaseSelect').value;
            if (!val) { 
                showToast('Pilih penyakit dahulu', 'warning'); 
                return; 
            }
            hideModal('#modalDisease');
            const d = diseaseInfoMap[val];
            addUserMessage(`Lihat informasi penyakit: ${d?.name||val}`);
            addBotMessage(
                `<div class="card-grid">
                    <div class="card"><h4>${d.name}</h4><p><b>Tanda klinis:</b> ${d.signs}</p></div>
                    <div class="card"><h4>Kontrol</h4><p>${d.control}</p></div>
                </div>`, true, 'info');
        });
    }

    // History context actions
    const ctxHistory = $('#ctxHistory');
    if (ctxHistory) {
        ctxHistory.addEventListener('click', (e)=>{
            const row = e.target.closest('.row'); 
            if (!row) return;
            const act = row.getAttribute('data-act');
            const {chat, archived} = currentCtxData||{};
            if (!chat) return;
            if (act==='rename'){
                $('#renameInput').value = chat.title || '';
                showModal('#modalRename');
            } else if (act==='archive'){
                if (archived){
                    // pulihkan
                    archivedChats = archivedChats.filter(c=>c.id!==chat.id);
                    activeChats.unshift(chat);
                    showToast('Dipulihkan dari arsip', 'success');
                } else {
                    activeChats = activeChats.filter(c=>c.id!==chat.id);
                    archivedChats.unshift(chat);
                    if (currentChatId===chat.id && activeChats.length){ 
                        currentChatId = activeChats[0].id; 
                    }
                    showToast('Diarsipkan', 'success');
                }
                saveData(); 
                renderHistory(); 
                if (getCurrentChat()) renderChat(); 
                else clearStream();
            } else if (act==='delete'){
                showModal('#modalConfirm');
            }
            ctxHistory.classList.remove('show');
        });
    }

    // Rename save
    const renameSave = $('#renameSave');
    if (renameSave) {
        renameSave.addEventListener('click', ()=>{
            const {chat} = currentCtxData||{}; 
            if (!chat) return;
            const v = $('#renameInput').value.trim(); 
            if (!v) return;
            chat.title = v; 
            saveData(); 
            renderHistory(); 
            hideModal('#modalRename');
        });
    }

    // Confirm delete
    const confirmDelete = $('#confirmDelete');
    if (confirmDelete) {
        confirmDelete.addEventListener('click', ()=>{
            const {chat, archived} = currentCtxData||{}; 
            if (!chat) return;
            if (archived) archivedChats = archivedChats.filter(c=>c.id!==chat.id);
            else activeChats = activeChats.filter(c=>c.id!==chat.id);
            if (currentChatId===chat.id){ 
                currentChatId = activeChats[0]?.id || null; 
            }
            saveData(); 
            renderHistory(); 
            hideModal('#modalConfirm');
            if (currentChatId) renderChat(); 
            else clearStream();
            showToast('Chat dihapus', 'success');
        });
    }

    // User bubble context (opsional; copy/select/edit cepat)
    const ctxUser = $('#ctxUser');
    if (ctxUser) {
        ctxUser.addEventListener('click', (e)=>{
            const row = e.target.closest('.row'); 
            if (!row) return;
            const act = row.getAttribute('data-act');
            if (act==='copy'){
                const sel = window.getSelection().toString();
                if (sel) copyToClipboard(sel); 
                else showToast('Pilih teks dulu', 'warning');
            }else if (act==='select'){
                const range = document.createRange();
                const bubble = document.elementFromPoint(parseInt(ctxUser.style.left), parseInt(ctxUser.style.top))?.closest('.bubble');
                if (bubble){
                    range.selectNodeContents(bubble.querySelector('.content'));
                    const sel = window.getSelection(); 
                    sel.removeAllRanges(); 
                    sel.addRange(range);
                }
            }else if (act==='edit'){
                showToast('Klik ikon pena di bubble untuk edit', 'info');
            }
            ctxUser.classList.remove('show');
        });
    }

    // QnA modal open/save
    const addQna = $('#addQna');
    if (addQna) {
        addQna.addEventListener('click', ()=> showModal('#modalQna'));
    }
    
    const qnaSave = $('#qnaSave');
    if (qnaSave) {
        qnaSave.addEventListener('click', ()=>{
            const q = $('#qnaQ').value.trim();
            const a = $('#qnaA').value.trim();
            if (!q || !a){ 
                showToast('Isi pertanyaan & jawaban', 'warning'); 
                return; 
            }
            const item = {question:q, answer:a, keywords:[...new Set(q.toLowerCase().split(/\s+/).filter(w=>w.length>3))]};
            customQna.push(item); 
            saveData(); 
            initFuse(); 
            hideModal('#modalQna');
            showToast('QnA ditambahkan', 'success');
        });
    }

    // Export / Import chat
    const exportChat = $('#exportChat');
    if (exportChat) {
        exportChat.addEventListener('click', ()=>{
            const blob = new Blob([JSON.stringify({active:activeChats, archived:archivedChats}, null, 2)], {type:'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); 
            a.href = url; 
            a.download = 'layup_chats.json'; 
            a.click();
            URL.revokeObjectURL(url);
        });
    }
    
    const importChat = $('#importChat');
    if (importChat) {
        importChat.addEventListener('click', ()=> {
            const importFile = $('#importFile');
            if (importFile) importFile.click();
        });
    }
    
    const importFile = $('#importFile');
    if (importFile) {
        importFile.addEventListener('change', (e)=>{
            const file = e.target.files[0]; 
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ()=>{
                try{
                    const data = JSON.parse(reader.result);
                    activeChats = Array.isArray(data.active)? data.active: [];
                    archivedChats = Array.isArray(data.archived)? data.archived: [];
                    currentChatId = activeChats[0]?.id || null;
                    saveData(); 
                    renderHistory(); 
                    if (currentChatId) renderChat(); 
                    else clearStream();
                    showToast('Import berhasil', 'success');
                }catch(err){ 
                    console.error(err); 
                    showToast('File tidak valid', 'error'); 
                }
            };
            reader.readAsText(file);
        });
    }

    // Context menu for user bubble (right click)
    const stream = $('#stream');
    if (stream) {
        stream.addEventListener('contextmenu', (e)=>{
            const bubble = e.target.closest('.msg.user .bubble');
            if (bubble){ 
                e.preventDefault(); 
                showContextMenu(e, 'ctxUser'); 
            }
        });
    }

    // Event listener untuk prompt nama
    const saveName = $('#saveName');
    if (saveName) {
        saveName.addEventListener('click', () => {
            const userName = $('#nameInput').value.trim();
            if (userName) {
                localStorage.setItem('layup_userName', userName);
                hideModal('#modalNamePrompt');
                addBotMessage(`Siap, ${userName}! Senang bisa membantu Anda. Ada yang bisa saya bantu?`);
            }
        });
    }
}

// ===== SISTEM DIAGNOSIS YANG DITINGKATKAN =====
const diseaseDatabase = {
    newcastle: {
        name: "Newcastle Disease (ND)",
        symptoms: ["nafsu_makan_turun", "lesu", "gangguan_pernafasan", "kelumpuhan", "produksi_telur_turun"],
        severity: "Tinggi",
        urgency: "Segera konsultasi dokter hewan",
        treatments: ["Isolasi ayam sakit", "Vaksinasi", "Biosecurity ketat", "Vitamin dan elektrolit"]
    },
    gumboro: {
        name: "Gumboro (IBD)",
        symptoms: ["lesu", "bulu_kusam", "diare", "pembengkakan"],
        severity: "Sedang-Tinggi",
        urgency: "Konsultasi dokter hewan dalam 48 jam",
        treatments: ["Vaksinasi", "Suportif cairan", "Kontrol stres"]
    },
    coccidiosis: {
        name: "Coccidiosis",
        symptoms: ["diare", "lesu", "nafsu_makan_turun", "bulu_kusam"],
        severity: "Sedang",
        urgency: "Konsultasi dokter hewan dalam 72 jam",
        treatments: ["Koksidiostat", "Sanitasi kandang", "Pisahkan ayam sakit"]
    }
};

// Diagnosis yang lebih cerdas dengan pohon keputusan
function enhancedDiagnosis(selectedSymptoms) {
    const matches = [];
    
    // Hitung kecocokan dengan setiap penyakit
    for (const [diseaseId, diseaseInfo] of Object.entries(diseaseDatabase)) {
        const matchingSymptoms = diseaseInfo.symptoms.filter(symptom => 
            selectedSymptoms.includes(symptom)
        );
        
        const matchPercentage = (matchingSymptoms.length / diseaseInfo.symptoms.length) * 100;
        
        if (matchPercentage >= 40) {
            matches.push({
                disease: diseaseId,
                name: diseaseInfo.name,
                match: matchPercentage,
                severity: diseaseInfo.severity,
                urgency: diseaseInfo.urgency,
                treatments: diseaseInfo.treatments
            });
        }
    }
    
    // Urutkan berdasarkan kecocokan tertinggi
    return matches.sort((a, b) => b.match - a.match);
}

// Format hasil diagnosis menjadi respons yang ramah
function formatDiagnosisResults(results) {
    if (results.length === 0) {
        return "Berdasarkan gejala yang dipilih, sepertinya ayam Anda tidak menunjukkan tanda-tanda penyakit serius. Namun, tetap pantau kondisinya dan jaga kebersihan kandang.";
    }
    
    const topResult = results[0];
    let response = `Berdasarkan gejala yang dipilih, kemungkinan besar ayam mengalami **${topResult.name}** (${topResult.match.toFixed(0)}% kecocokan).\n\n`;
    
    response += `**Tingkat Keparahan:** ${topResult.severity}\n`;
    response += `**Saran:** ${topResult.urgency}\n\n`;
    response += `**Rekomendasi Penanganan:**\n`;
    
    topResult.treatments.forEach((treatment, index) => {
        response += `${index + 1}. ${treatment}\n`;
    });
    
    response += `\n*Disclaimer: Diagnosis ini berdasarkan gejala yang dipilih dan tidak menggantikan konsultasi dengan dokter hewan.*`;
    
    return response;
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);