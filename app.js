// ===== KONFIGURASI & INISIALISASI =====
const APP_NAME = 'LayUp AI';
const JSON_URL = 'https://fasim-dev.github.io/Layupai/knowledge.json';

// ===== KONFIGURASI DEEPSEEK API =====
let DEEPSEEK_API_KEY = localStorage.getItem('layup_deepseekKey') || 'your_deepseek_api_key_here';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

// Variabel untuk rate limiting
let lastApiCallTime = 0;
const API_CALL_DELAY = 1000;

// Variabel global
let knowledgeBase = [];
let chatHistory = [];
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

// ===== DATABASE PENYAKIT AYAM PETELUR YANG LENGKAP =====
const diseaseInfoMap = {
    newcastle: {
        name: "Newcastle Disease (ND / Tetelo)",
        signs: "Nafsu makan turun, lesu, gangguan pernafasan (bersin, batuk), kelumpuhan, produksi telur turun drastis, telur abnormal",
        causes: "Virus paramyxovirus, penularan melalui kontak langsung, udara, pakan/air terkontaminasi",
        prevention: "Vaksinasi teratur, biosekuriti ketat, isolasi ayam sakit, sanitasi kandang",
        chemical_treatment: "Tidak ada obat antivirus spesifik. Berikan antibiotik spektrum luas (seperti Enrofloxacin) untuk mencegah infeksi sekunder, vitamin dan elektrolit untuk meningkatkan daya tahan",
        herbal_treatment: "Daun pepaya, kunyit, temulawak, dan bawang putih dapat diberikan sebagai imunostimulan. Ramuan: 1kg daun pepaya + 0,5kg kunyit direbus dalam 10L air, berikan sebagai minuman",
        mortality: "Tinggi (bisa mencapai 80-100% pada kasus ganas)",
        severity: "Sangat Tinggi"
    },
    gumboro: {
        name: "Gumboro (Infectious Bursal Disease/IBD)",
        signs: "Lesu, bulu kusam, diare putih, gemetar, pembengkakan bursa fabricius, dehidrasi",
        causes: "Virus IBD, menyerang sistem kekebalan ayam muda (3-6 minggu)",
        prevention: "Vaksinasi program terencana, sanitasi ketat, manajemen litter baik",
        chemical_treatment: "Supportive therapy: elektrolit + vitamin, antibiotik spektrum luas (Amoxicillin atau Colistin) untuk infeksi sekunder",
        herbal_treatment: "Daun jambu biji untuk diare, temulawak dan kunyit untuk antiradang. Berikan larutan gula merah + garam untuk dehidrasi",
        mortality: "Sedang-Tinggi (20-30%)",
        severity: "Tinggi"
    },
    coccidiosis: {
        name: "Coccidiosis",
        signs: "Diare berdarah, lesu, nafsu makan turun, bulu kusam, pucat, pertumbuhan terhambat",
        causes: "Protozoa Eimeria sp., berkembang di litter basah/kandang lembab",
        prevention: "Manajemen litter kering, ventilasi baik, program anticoccidial dalam pakan",
        chemical_treatment: "Antikoksidia: Amprolium, Sulfaquinoxaline, Toltrazuril sesuai dosis anjuran",
        herbal_treatment: "Daun pepaya, biji mahoni, bawang putih. Ramuan: 100g daun pepaya + 50g bawang putih dihaluskan, campur dalam 10L air minum",
        mortality: "Sedang (10-20% jika tidak diobati)",
        severity: "Sedang"
    },
    bronchitis: {
        name: "Avian Infectious Bronchitis (IB)",
        signs: "Bersin-bersin, batuk, ngorok, mata berair, produksi telur turun, telur abnormal (kerabang tipis/bergelombang)",
        causes: "Coronavirus, sangat menular melalui udara",
        prevention: "Vaksinasi, biosekuriti ketat, hindari stres",
        chemical_treatment: "Tidak ada obat spesifik. Antibiotik spektrum luas (Oxytetracycline) untuk infeksi sekunder, ekspektoran untuk pernafasan",
        herbal_treatment: "Jahe, kencur, daun sirih untuk pernafasan. Rebusan: 200g jahe + 100g kencur dalam 10L air, berikan sebagai minuman",
        mortality: "Rendah pada ayam dewasa, tinggi pada anak ayam",
        severity: "Sedang"
    },
    marek: {
        name: "Marek's Disease",
        signs: "Kelumpuhan, pembesaran syaraf, tumor organ dalam, pupil tidak rata, penurunan produksi",
        causes: "Herpesvirus, menular melalui debu/litter",
        prevention: "Vaksinasi day-old chick, sanitasi ketat, all-in/all-out",
        chemical_treatment: "Tidak ada pengobatan efektif. Fokus pada pencegahan",
        herbal_treatment: "Echinacea, bawang putih sebagai imunomodulator. Daun sambiloto untuk antivirus",
        mortality: "Tinggi (bisa mencapai 30-40%)",
        severity: "Tinggi"
    },
    crd: {
        name: "Chronic Respiratory Disease (CRD)",
        signs: "Bersin, batuk, nafas ngorok, mata berbusa, pembengkakan wajah, pertumbuhan lambat",
        causes: "Mycoplasma gallisepticum, diperberat oleh kondisi kandang buruk",
        prevention: "Bibit bebas MG, ventilasi baik, kepadatan tepat, hindari stres",
        chemical_treatment: "Tylosin, Erythromycin, Lincomycin sesuai dosis. Pengobatan minimal 5-7 hari",
        herbal_treatment: "Daun sirih, jahe, temulawak. Rebusan daun sirih (50g dalam 5L air) sebagai desinfektan alami saluran pernafasan",
        mortality: "Rendah tapi menyebabkan penurunan produksi",
        severity: "Sedang"
    },
    colibacillosis: {
        name: "Colibacillosis",
        signs: "Nafsu makan turun, lesu, diare, peradangan kantong udara, pertumbuhan terhambat",
        causes: "Escherichia coli, infeksi oportunistik saat daya tahan turun",
        prevention: "Sanitasi air minum, manajemen litter, ventilasi baik",
        chemical_treatment: "Kolistin sulfat, Amoxicillin, Enrofloxacin sesuai sensitivitas",
        herbal_treatment: "Daun jambu biji untuk diare, kunyit sebagai antiradang, probiotik alami dari fermentasi",
        mortality: "Sedang (10-30% pada kasus berat)",
        severity: "Sedang"
    },
    fowl_cholera: {
        name: "Fowl Cholera",
        signs: "Kematian mendadak, lesu, nafsu makan hilang, pembengkakan jengger/wattle, diare hijau",
        causes: "Pasteurella multocida, menular melalui air/ternak liar",
        prevention: "Biosekuriti ketat, kontrol rodent, vaksinasi di daerah endemik",
        chemical_treatment: "Sulfonamides, Oxytetracycline, Enrofloxacin. Pengobatan minimal 5 hari",
        herbal_treatment: "Daun sirsak, sirih, temulawak. Ekstrak daun sirsak menunjukkan aktivitas antibakteri",
        mortality: "Tinggi (30-45% pada bentuk akut)",
        severity: "Tinggi"
    },
    fowl_pox: {
        name: "Fowl Pox",
        signs: "Bintik-bintik pada jengger/muka (bentuk kutil), lesu, nafsu makan turun, kesulitan makan/minum",
        causes: "Avipoxvirus, ditularkan melalui nyamuk/luka",
        prevention: "Vaksinasi, kontrol nyamuk, hindari luka pada ayam",
        chemical_treatment: "Tidak ada obat spesifik. Antibiotik spektrum luas untuk infeksi sekunder, vitamin untuk penyembuhan",
        herbal_treatment: "Getah jarak untuk dioles pada lesi, daun binahong untuk penyembuhan luka, propolis sebagai antivirus",
        mortality: "Rendah kecuali bentuk difterik",
        severity: "Rendah-Sedang"
    },
    pullorum: {
        name: "Pullorum (Beyo)",
        signs: "Kotoran putih kapur, anak ayam mati mendadak, nafsu makan turun, pertumbuhan terhambat",
        causes: "Salmonella pullorum, menular vertikal (induk ke telur)",
        prevention: "Bibit bebas pullorum, sanitasi ketat, fumigasi telur tetas",
        chemical_treatment: "Furazolidone, Sulfonamides, Amoxicillin sesuai sensitivitas",
        herbal_treatment: "Daun jambu biji, kunyit, bawang putih. Kombinasi ini memiliki aktivitas antibakteri alami",
        mortality: "Tinggi pada anak ayam (bisa mencapai 100%)",
        severity: "Tinggi"
    },
    korisa: {
        name: "Korisa (Infectious Coryza)",
        signs: "Pembengkakan muka, bersin, hidung berlendir, bau tidak sedap, nafsu makan turun",
        causes: "Avibacterium paragallinarum, menular melalui air/udara",
        prevention: "Vaksinasi, biosekuriti, kepadatan tepat, ventilasi baik",
        chemical_treatment: "Erythromycin, Sulfonamides, Oxytetracycline. Pengobatan minimal 5 hari",
        herbal_treatment: "Daun sirih untuk inhalasi, jahe, kencur. Rebusan daun sirih sebagai tetes hidung alami",
        mortality: "Rendah tapi menyebabkan penurunan produksi",
        severity: "Sedang"
    },
    egg_drop_syndrome: {
        name: "Egg Drop Syndrome (EDS)",
        signs: "Produksi telur turun drastis, telur tanpa kerabang, kerabang tipis, warna kerabang memudar",
        causes: "Adenovirus, sering dibawa oleh itik",
        prevention: "Vaksinasi, hindari kontak dengan itik, sanitasi telur konsumsi",
        chemical_treatment: "Tidak ada pengobatan spesifik. Supportive therapy dengan vitamin dan mineral",
        herbal_treatment: "Daun katuk, kelor untuk meningkatkan produksi, kunyit untuk antiradang",
        mortality: "Sangat rendah",
        severity: "Sedang (dampak ekonomi tinggi)"
    },
    mycotoxicosis: {
        name: "Mycotoxicosis (Keracunan Jamur)",
        signs: "Nafsu makan turun, pertumbuhan lambat, imunosupresi, warna bulu kusam, diare",
        causes: "Toksin jamur (aflatoksin, ochratoxin, dll) dalam pakan",
        prevention: "Penyimpanan pakan baik, penggunaan mold inhibitor, pemeriksaan kualitas pakan",
        chemical_treatment: "Toksorbon, Mycosorb, atau toxin binder lainnya. Vitamin dan hepatoprotektor",
        herbal_treatment: "Temulawak, kunyit sebagai hepatoprotektor alami, daun pepaya untuk detoksifikasi",
        mortality: "Bervariasi tergantung tingkat keracunan",
        severity: "Sedang-Tinggi"
    },
    necrotic_enteritis: {
        name: "Necrotic Enteritis",
        signs: "Diare berdarah, lesu, nafsu makan turun, kematian mendadak, performa buruk",
        causes: "Clostridium perfringens, sering dipicu oleh coccidiosis atau pakan tinggi protein",
        prevention: "Manajemen pakan baik, program anticoccidial, probiotik",
        chemical_treatment: "Bacitracin, Virginiamycin, Lincomycin. Pengobatan melalui air minum",
        herbal_treatment: "Daun jambu biji, kunyit, bawang putih. Kombinasi memiliki aktivitas antibakteri alami",
        mortality: "Tinggi pada kasus akut (bisa mencapai 50%)",
        severity: "Tinggi"
    },
    omphalitis: {
        name: "Omphalitis (Infeksi Pusar)",
        signs: "Pembengkakan pusar, kemerahan, nanah, anak ayam lemah, tidak mau makan, kematian tinggi",
        causes: "Infeksi bakteri (E. coli, Staphylococcus, Streptococcus) melalui pusar yang tidak tertutup sempurna",
        prevention: "Kebersihan telur tetas, sanitasi mesin tetas, desinfeksi tali pusar",
        chemical_treatment: "Antibiotik spektrum luas (Amoxicillin, Enrofloxacin) melalui air minum, oleskan povidone iodine pada pusar",
        herbal_treatment: "Daun sirih sebagai antiseptik, getah jarak untuk dioles, kunyit sebagai antiradang",
        mortality: "Tinggi pada anak ayam (30-50%)",
        severity: "Tinggi"
    },
    aspergillosis: {
        name: "Aspergillosis",
        signs: "Sulit bernafas, nafsu makan turun, lesu, mengantuk, kadang keluar cairan dari hidung",
        causes: "Jamur Aspergillus fumigatus dari litter atau pakan yang berjamur",
        prevention: "Litter kering, ventilasi baik, hindari pakan berjamur, kebersihan kandang",
        chemical_treatment: "Nystatin, Copper sulfate melalui air minum, antifungal seperti Itraconazole",
        herbal_treatment: "Bawang putih sebagai antijamur, daun sirih untuk inhalasi, temulawak untuk imunostimulan",
        mortality: "Sedang-Tinggi (20-40%)",
        severity: "Sedang"
    }
};

// ===== FUNGSI UNTUK MENUTUP MODAL =====
function setupCloseModalHandlers() {
    // Event delegation untuk tombol dengan atribut data-close
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-close]')) {
            const modalSelector = e.target.getAttribute('data-close');
            hideModal(modalSelector);
        }
        
        // Tutup modal ketika klik di luar konten modal (backdrop)
        if (e.target.classList.contains('modal-backdrop')) {
            hideModal('#' + e.target.id);
        }
    });
    
    // Tutup modal dengan ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal-backdrop.show');
            if (openModals.length > 0) {
                hideModal('#' + openModals[openModals.length - 1].id);
            }
        }
    });
}

async function callDeepSeekAPI(userMessage) {
    // Validasi API key
    if (DEEPSEEK_API_KEY === 'your_deepseek_api_key_here' || !DEEPSEEK_API_KEY) {
        throw new Error('API_KEY_NOT_SET');
    }

    // Rate limiting yang lebih reasonable
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallTime;
    if (timeSinceLastCall < API_CALL_DELAY) {
        await new Promise(resolve => setTimeout(resolve, API_CALL_DELAY - timeSinceLastCall));
    }
    lastApiCallTime = Date.now();

    try {
        const messages = [
            {
                role: "system",
                content: `Anda adalah Cumil 🐔, asisten AI ahli ayam petelur. Jawab dengan singkat dan informatif.`
            },
            {
                role: "user",
                content: userMessage
            }
        ];

        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: DEEPSEEK_MODEL,
                messages: messages,
                max_tokens: 800,
                temperature: 0.7,
                stream: false
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API_ERROR_${response.status}: ${errorData.message || 'Unknown error'}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;

    } catch (error) {
        console.error('DeepSeek API Error:', error);
        
        // Handle specific error types
        if (error.message === 'API_KEY_NOT_SET') {
            throw new Error('Silakan set API Key DeepSeek terlebih dahulu di pengaturan');
        } else if (error.message.includes('401')) {
            throw new Error('API Key tidak valid. Silakan periksa kembali');
        } else if (error.message.includes('429')) {
            throw new Error('Terlalu banyak permintaan. Coba lagi sebentar');
        } else {
            throw new Error('Gangguan sementara pada layanan AI. Coba lagi ya!');
        }
    }
}

// ===== UTIL =====
const $ = sel => {
    const el = document.querySelector(sel);
    if (!el) console.warn(`Element ${sel} not found`);
    return el;
};

const $$ = sel => Array.from(document.querySelectorAll(sel));

async function copyToClipboard(text){
    if (!text) return;
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            showToast('Disalin', 'success');
        } else {
            fallbackCopy(text);
        }
    } catch (err) {
        console.error('Copy failed:', err);
        fallbackCopy(text);
    }
}

function fallbackCopy(text){
    const ta = document.createElement('textarea');
    ta.value = text; 
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showToast('Disalin', 'success');
        }
    } catch (err) {
        console.error('Fallback copy failed:', err);
        showToast('Gagal menyalin', 'error');
    } finally {
        document.body.removeChild(ta);
    }
}

// ===== FUNGSI UNTUK MENAMPILKAN INFORMASI PENYAKIT =====
function showDiseaseInfo(diseaseKey) {
    const disease = diseaseInfoMap[diseaseKey];
    if (!disease) return "Informasi penyakit tidak ditemukan.";
    
    return `
        <div class="disease-info">
            <h3>${disease.name}</h3>
            <div class="disease-details">
                <div class="disease-section">
                    <h4>🩺 Tanda Klinis</h4>
                    <p>${disease.signs}</p>
                </div>
                <div class="disease-section">
                    <h4>🔍 Penyebab</h4>
                    <p>${disease.causes}</p>
                </div>
                <div class="disease-section">
                    <h4>🛡️ Pencegahan</h4>
                    <p>${disease.prevention}</p>
                </div>
                <div class="treatment-columns">
                    <div class="treatment-column">
                        <h4>💊 Pengobatan Kimia</h4>
                        <p>${disease.chemical_treatment}</p>
                    </div>
                    <div class="treatment-column">
                        <h4>🌿 Pengobatan Herbal</h4>
                        <p>${disease.herbal_treatment}</p>
                    </div>
                </div>
                <div class="disease-meta">
                    <span class="severity severity-${disease.severity.toLowerCase().replace(' ', '-')}">
                        Tingkat Keparahan: ${disease.severity}
                    </span>
                    <span class="mortality">Tingkat Kematian: ${disease.mortality}</span>
                </div>
            </div>
        </div>
    `;
}

// ===== FUNGSI UNTUK MENCARI PENYAKIT =====
function searchDisease(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    for (const [key, disease] of Object.entries(diseaseInfoMap)) {
        if (disease.name.toLowerCase().includes(lowerQuery) || 
            disease.signs.toLowerCase().includes(lowerQuery) ||
            key.toLowerCase().includes(lowerQuery)) {
            results.push({ key, disease });
        }
    }
    
    return results;
}

// ===== SETUP ENSIKLOPEDIA PENYAKIT =====
function setupDiseaseEncyclopedia() {
    const diseaseSelect = $('#diseaseSelect');
    const diseaseSearch = $('#diseaseSearch');
    const diseaseInfoContainer = $('#diseaseInfo');
    const diseaseSearchResults = $('#diseaseSearchResults');
    
    // Isi dropdown dengan opsi penyakit
    if (diseaseSelect) {
        diseaseSelect.innerHTML = '';
        for (const [key, disease] of Object.entries(diseaseInfoMap)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = disease.name;
            diseaseSelect.appendChild(option);
        }
    }
    
    // Event listener untuk pencarian
    if (diseaseSearch) {
        diseaseSearch.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length > 2) {
                const results = searchDisease(query);
                updateDiseaseSearchResults(results);
            } else if (diseaseSearchResults) {
                diseaseSearchResults.innerHTML = '';
            }
        });
    }
    
    // Event listener untuk menampilkan info penyakit
    if (diseaseSelect) {
        diseaseSelect.addEventListener('change', (e) => {
            const selectedDisease = e.target.value;
            if (selectedDisease && diseaseInfoContainer) {
                diseaseInfoContainer.innerHTML = showDiseaseInfo(selectedDisease);
            }
        });
    }
    
    // Tampilkan penyakit pertama
    if (diseaseSelect && diseaseInfoContainer && diseaseSelect.options.length > 0) {
        diseaseInfoContainer.innerHTML = showDiseaseInfo(diseaseSelect.options[0].value);
    }
}

// ===== FUNGSI UNTUK MEMPERBARUI HASIL PENCARIAN =====
function updateDiseaseSearchResults(results) {
    const searchResults = $('#diseaseSearchResults');
    if (!searchResults) return;
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="no-results">Tidak ditemukan penyakit yang sesuai</div>';
        return;
    }
    
    searchResults.innerHTML = '';
    results.forEach(({ key, disease }) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'disease-search-result';
        resultItem.innerHTML = `
            <h4>${disease.name}</h4>
            <p>${disease.signs.substring(0, 100)}...</p>
        `;
        resultItem.addEventListener('click', () => {
            $('#diseaseSelect').value = key;
            $('#diseaseInfo').innerHTML = showDiseaseInfo(key);
            searchResults.innerHTML = '';
            $('#diseaseSearch').value = '';
        });
        searchResults.appendChild(resultItem);
    });
}

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
    const arr = followUps[context.intent] || ["Apakah ada info lain?","Bisa dijelaskan lebih detail?"];
    return arr.sort(()=>Math.random()-0.5);
}

// ===== FUNGSI PENCARIAN JAWABAN =====
function findAnswer(userMessage) {
    const preprocessed = preprocessText(userMessage);
    const keywords = extractKeywords(userMessage);
    
    let bestMatch = null;
    let highestScore = 0;
    
    knowledgeBase.forEach(item => {
        let score = 0;
        
        if (item.question && preprocessed.includes(preprocessText(item.question))) {
            score += 0.8;
        }
        
        if (item.keywords) {
            const keywordMatches = item.keywords.filter(keyword => 
                keywords.some(word => word.includes(keyword) || keyword.includes(word))
            );
            score += (keywordMatches.length / item.keywords.length) * 0.2;
        }
        
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
    
    if (conversationMemory.lastQuestion && (
        lowerQuestion.includes('itu') || 
        lowerQuestion.includes('tersebut') ||
        lowerQuestion.includes('lagi') ||
        lowerQuestion.includes('lanjut') ||
        lowerQuestion.startsWith('bagaimana') ||
        lowerQuestion.startsWith('berapa') ||
        lowerQuestion.startsWith('apakah')
    )) {
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
    
    if (conversationMemory.followUpQuestions.length > 0) {
        for (let i = 0; i < conversationMemory.followUpQuestions.length; i++) {
            if (lowerQuestion.includes(conversationMemory.followUpQuestions[i].toLowerCase())) {
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

function addPersonalityToResponse(response, topic) {
    const emoji = topicEmojis[topic] || "🐔";
    return `${emoji} ${response}`;
}

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

function occasionallyAddFunFact() {
    if (Math.random() < 0.2) {
        const fact = jokesAndFacts[Math.floor(Math.random() * jokesAndFacts.length)];
        return `\n\n${fact}`;
    }
    return "";
}

function getTimeBasedGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Pagi";
    if (hour >= 12 && hour < 15) return "Siang";
    if (hour >= 15 && hour < 19) return "Sore";
    return "Malam";
}

const welcomeMessages = {
    Pagi: "Selamat pagi! Semangat menjalani hari! ☀️",
    Siang: "Selamat siang! Semoga harinya produktif! 🌞",
    Sore: "Selamat sore! Sudah cek produksi telur hari ini? 🌇",
    Malam: "Selamat malam! Semoga ayam-ayamnya tidur nyenyak! 🌙"
};

// ===== MODUL RESPONS RAMAH =====
const friendlyResponses = {
    greeting: [
        "Halo Bosku! Aku Cumil 🐥, Asisten LayUpAI buatan FASIM. Kalau ayammu sibuk bertelur, aku sibuk nemenin kamu. Ada yang bisa saya bantu tentang ayam petelur?",
        "Yuhuu! Selamat datang lagi, Bosku! 😂 Yuk kenalan! Aku Cumil 🐔, Asisten LayUpAI buatan FASIM. Santai aja, aku nggak suka ribet. Ada yang mau ditanyakan?",
        "Hai! Aku Cumil 🐔 Asisten LayUpAI buatan FASIM. Tenang, aku nggak galak kok, sukanya bercanda. Ada yang di tanyakan bos?",
        "Haii, Aku Cumil 🐥 Asisten LayUpAI buatan FASIM. Jangan baper ya kalau aku kebanyakan becanda."
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

function getFriendlyResponse(type, context = {}) {
    let responses = friendlyResponses[type] || ["Oke, saya bantu."];
    let response = responses[Math.floor(Math.random() * responses.length)];
    
    if (context.relatedTopic) {
        response = response.replace('${relatedTopic}', context.relatedTopic);
    }
    
    return response;
}

// ===== INISIALISASI APP =====
function initApp() {
    loadData();
    setupEventListeners();
    setupFollowUpQuestionHandling();
    setupDiseaseEncyclopedia();
    setupModalStyles();
    setupApiKeyManagement();
    setupCloseModalHandlers(); // <-- TAMBAHKAN INI
    
    if (!activeChats.length) {
        createNewChat();
    } else {
        currentChatId = activeChats[0].id;
        renderHistory();
        renderChat();
    }
    
    fetchKnowledgeBase();
    initCustomMultiSelect();
    
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

    let processedContent = content;
    if (conversationMemory.followUpQuestions.length > 0) {
        conversationMemory.followUpQuestions.forEach((q, i) => {
            processedContent = processedContent.replace(
                new RegExp(`${i + 1}\\. ${q}`), 
                `${i + 1}. <a href="#" class="follow-up-question">${q}</a>`
            );
        });
    }

    processedContent = processedContent
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');

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
async function processQuestion(question) {
    addUserMessage(question);
    const typingIndicator = showTyping();
    
    try {
        let finalAnswer = null;
        
        // Coba jawab dengan knowledge base lokal dulu
        const localResult = findBestAnswer(question);
        if (localResult && localResult.score < 0.4) {
            finalAnswer = enhanceAnswer(localResult.answer, question, {
                intent: detectIntent(question),
                topic: detectTopic(question)
            });
        } else {
            // Fallback ke DeepSeek API
            try {
                const useDeepSeek = localStorage.getItem('layup_useDeepSeek') !== 'false';
                
                if (useDeepSeek && DEEPSEEK_API_KEY !== 'your_deepseek_api_key_here') {
                    finalAnswer = await callDeepSeekAPI(question);
                    
                    // Simpan ke custom QnA untuk future reference
                    customQna.push({
                        question: question,
                        answer: finalAnswer,
                        keywords: extractKeywords(question),
                        timestamp: new Date().toISOString()
                    });
                    
                    if (customQna.length > 100) {
                        customQna = customQna.slice(-50);
                    }
                    saveData();
                } else {
                    throw new Error('DEEPSEEK_DISABLED');
                }
                
            } catch (apiError) {
                console.log('API fallback:', apiError.message);
                
                // Fallback ke jawaban lokal
                const relatedTopic = findRelatedTopic(question);
                const context = { relatedTopic };
                
                finalAnswer = getFriendlyResponse('noAnswer', context);
                
                // Tambahkan follow-up questions
                conversationMemory.followUpQuestions = generateFollowUpQuestions({ 
                    intent: detectIntent(question) 
                });
                
                if (conversationMemory.followUpQuestions.length > 0) {
                    finalAnswer += "\n\n**Mungkin Anda ingin tahu:**\n";
                    conversationMemory.followUpQuestions.forEach((q, i) => {
                        finalAnswer += `${i + 1}. ${q}\n`;
                    });
                }
            }
        }
        
        // Terapkan personality dan personalisasi
        finalAnswer = personalizeResponse(finalAnswer);
        finalAnswer = addPersonalityToResponse(finalAnswer, detectTopic(question));
        finalAnswer += occasionallyAddFunFact();
        
        addBotMessage(finalAnswer);
        
    } catch (error) {
        console.error('Process question error:', error);
        
        // Fallback ultimate
        const fallback = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
        addBotMessage(fallback);
        
    } finally {
        if (typingIndicator && typingIndicator.parentNode) {
            typingIndicator.remove();
        }
    }
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
    $$('.ctx').forEach(m=>m.classList.remove('show'));
    const menu = document.getElementById(menuId);
    if (!menu) return;
    
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.classList.add('show');
    const hideMenu = () => { 
        menu.classList.remove('show'); 
        document.removeEventListener('click', hideMenu); 
    };
    setTimeout(()=> document.addEventListener('click', hideMenu), 10);
}

// ===== FUNGSI UNTUK MENAMPILKAN MODAL =====
function showModal(selector){ 
    const modal = $(selector);
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }
}

// ===== FUNGSI UNTUK MENYEMBUNYIKAN MODAL =====
function hideModal(selector){ 
    const modal = $(selector);
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 200);
    }
}

// ===== CUSTOM MULTISELECT =====
let sharedOptionsList = null;
function initCustomMultiSelect(){
    sharedOptionsList = document.createElement('ul');
    sharedOptionsList.className = 'custom-options';
    document.body.appendChild(sharedOptionsList);

    document.addEventListener('click', (e)=>{
        if (!sharedOptionsList.contains(e.target) && !e.target.closest('.custom-multiselect')){
            sharedOptionsList.style.display='none';
        }
    });

    $$('.custom-multiselect').forEach(ms=>{
        const targetId = ms.getAttribute('data-target');
        const select = document.getElementById(targetId);
        if (!select) return;
        
        ms.addEventListener('click', (e)=>{
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
            const rect = ms.getBoundingClientRect();
            sharedOptionsList.style.left = `${rect.left + window.scrollX}px`;
            sharedOptionsList.style.top = `${rect.bottom + window.scrollY + 6}px`;
            sharedOptionsList.style.minWidth = rect.width+'px';
            sharedOptionsList.style.display='block';
        });
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
        if (e.target.classList.contains('follow-up-question')) {
            e.preventDefault();
            const question = e.target.textContent;
            const input = $('#input');
            if (input) input.value = question;
            processQuestion(question);
        }
    });
}

function updateContext(userMessage, botResponse) {
    const lowerMsg = userMessage.toLowerCase();
    
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
    
    const numberMatch = userMessage.match(/\d+/g);
    if (numberMatch) {
        conversationMemory.mentionedEntities = conversationMemory.mentionedEntities.concat(numberMatch);
    }
    
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

    try {
        if (typeof Fuse === 'undefined') {
            console.error('Fuse.js library not loaded');
            showToast('Error: Library pencarian tidak terload', 'error');
            return;
        }

        fuse = new Fuse(knowledgeBase, {
            keys: ['question', 'keywords'],
            threshold: 0.55,
            distance: 200,
            minMatchCharLength: 2,
            includeScore: true
        });
        
        console.log('Fuse.js initialized successfully');
    } catch (error) {
        console.error('Fuse initialization failed:', error);
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

function enhancedDiagnosis(selectedSymptoms) {
    const matches = [];
    
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
    
    return matches.sort((a, b) => b.match - a.match);
}

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

// ===== KALKULATOR PAKAN YANG DIPERBAIKI =====
function setupFeedCalculator() {
    const feedCalculate = $('#feedCalculate');
    if (!feedCalculate) return;
    
    feedCalculate.addEventListener('click', () => {
        const count = parseInt($('#feedChickenCount').value) || 0;
        const age = parseInt($('#feedChickenAge').value) || 0;
        const type = $('#feedChickenType').value;
        
        if (!count || count <= 0) { 
            showToast('Masukkan jumlah ayam yang valid', 'warning'); 
            return; 
        }
        if (!age || age <= 0) { 
            showToast('Masukkan umur ayam yang valid', 'warning'); 
            return; 
        }
        
        hideModal('#modalFeed');

        let feedPerChicken;
        let typeName = '';
        
        if (type === 'doc') {
            typeName = 'DOC (0-3 minggu)';
            if (age < 1) feedPerChicken = 0.015;
            else if (age < 2) feedPerChicken = 0.025;
            else feedPerChicken = 0.035;
        } 
        else if (type === 'starter') {
            typeName = 'Starter (4-8 minggu)';
            if (age < 5) feedPerChicken = 0.045;
            else if (age < 6) feedPerChicken = 0.055;
            else if (age < 7) feedPerChicken = 0.065;
            else feedPerChicken = 0.075;
        }
        else if (type === 'grower') {
            typeName = 'Grower (9-18 minggu)';
            if (age < 12) feedPerChicken = 0.080;
            else if (age < 15) feedPerChicken = 0.090;
            else feedPerChicken = 0.100;
        }
        else if (type === 'layer') {
            typeName = 'Layer (18+ minggu)';
            if (age < 25) feedPerChicken = 0.110;
            else if (age < 45) feedPerChicken = 0.120;
            else feedPerChicken = 0.115;
        }
        else {
            showToast('Pilih jenis ayam yang valid', 'warning');
            return;
        }
        
        const totalFeed = count * feedPerChicken;
        const weeklyFeed = totalFeed * 7;
        const monthlyFeed = totalFeed * 30;
        
        addUserMessage(`Hitung kebutuhan pakan untuk ${count} ekor ayam ${typeName} umur ${age} minggu`);
        
        const response = `**🍚 Hasil Perhitungan Pakan:**\n\n` +
            `• **Jumlah ayam:** ${count} ekor\n` +
            `• **Umur:** ${age} minggu\n` +
            `• **Jenis:** ${typeName}\n` +
            `• **Kebutuhan per ekor:** ${feedPerChicken.toFixed(3)} kg/hari\n\n` +
            `**📊 Total Kebutuhan:**\n` +
            `• **Harian:** ${totalFeed.toFixed(2)} kg/hari\n` +
            `• **Mingguan:** ${weeklyFeed.toFixed(1)} kg/minggu\n` +
            `• **Bulanan:** ${monthlyFeed.toFixed(1)} kg/bulan\n\n` +
            `*💡 Estimasi berdasarkan standar industri. Sesuaikan dengan kondisi ayam dan kualitas pakan.*`;
            
        addBotMessage(response, true, 'success');
    });
}

// ===== FUNGSI UNTUK MODAL DARK MODE =====
function setupModalStyles() {
    const modals = $$('.modal, .modal-content, .modal-header, .modal-body, .modal-footer');
    modals.forEach(modal => {
        modal.style.backgroundColor = 'var(--bg-color)';
        modal.style.color = 'var(--text-color)';
    });
    
    const selects = $$('select');
    selects.forEach(select => {
        select.style.backgroundColor = 'var(--input-bg)';
        select.style.color = 'var(--text-color)';
        select.style.borderColor = 'var(--border-color)';
    });
    
    const inputs = $$('input, textarea');
    inputs.forEach(input => {
        input.style.backgroundColor = 'var(--input-bg)';
        input.style.color = 'var(--text-color)';
        input.style.borderColor = 'var(--border-color)';
    });
    
    const buttons = $$('.btn:not(.btn-close)');
    buttons.forEach(button => {
        button.style.backgroundColor = 'var(--primary-color)';
        button.style.color = 'white';
        button.style.border = 'none';
    });
}

function setupApiKeyManagement() {
    const apiKeyBtn = $('#apiKeyBtn');
    const apiKeySave = $('#apiKeySave');
    const apiKeyInput = $('#apiKeyInput');
    const apiStatus = $('#apiStatus'); // Elemen baru untuk status
    
    // Fungsi untuk update status API Key
    function updateApiKeyStatus() {
        if (!apiStatus) return;
        
        if (DEEPSEEK_API_KEY === 'your_deepseek_api_key_here' || !DEEPSEEK_API_KEY) {
            apiStatus.textContent = '❌ API Key belum diset';
            apiStatus.className = 'api-status disabled';
        } else {
            apiStatus.textContent = '✅ API Key tersedia';
            apiStatus.className = 'api-status enabled';
        }
    }
    
    if (apiKeyBtn) {
        apiKeyBtn.addEventListener('click', () => {
            showModal('#modalApiKey');
            if (apiKeyInput) {
                apiKeyInput.value = DEEPSEEK_API_KEY;
                updateApiKeyStatus(); // Update status saat modal dibuka
            }
        });
    }
    
    if (apiKeySave && apiKeyInput) {
        apiKeySave.addEventListener('click', () => {
            const newApiKey = apiKeyInput.value.trim();
            if (newApiKey) {
                DEEPSEEK_API_KEY = newApiKey;
                localStorage.setItem('layup_deepseekKey', newApiKey);
                updateApiKeyStatus(); // Update status setelah simpan
                hideModal('#modalApiKey');
                showToast('API Key disimpan', 'success');
            } else {
                showToast('Masukkan API Key yang valid', 'warning');
            }
        });
    }
    
    // Panggil saat init untuk set status awal
    updateApiKeyStatus();
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
        diseaseEncyclopedia.addEventListener('click', () => {
            showModal('#modalDisease');
            setTimeout(() => {
                const diseaseSelect = $('#diseaseSelect');
                const diseaseInfo = $('#diseaseInfo');
                if (diseaseSelect && diseaseInfo && diseaseSelect.value) {
                    diseaseInfo.innerHTML = showDiseaseInfo(diseaseSelect.value);
                }
            }, 100);
        });
    }

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
                const results = enhancedDiagnosis(symptoms);
                const diagnosisMsg = formatDiagnosisResults(results);
                addBotMessage(diagnosisMsg, true, 'warning');
            }, 1200);
        });
    }

    // Kalkulator pakan
    setupFeedCalculator();

    // Production tracker
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

    // Disease encyclopedia
    const diseaseInfoBtn = $('#diseaseInfo');
    if (diseaseInfoBtn) {
        diseaseInfoBtn.addEventListener('click', ()=>{
            const val = $('#diseaseSelect').value;
            if (!val) { 
                showToast('Pilih penyakit dahulu', 'warning'); 
                return; 
            }
            hideModal('#modalDisease');
            const d = diseaseInfoMap[val];
            addUserMessage(`Lihat informasi penyakit: ${d?.name||val}`);
            const diseaseInfoContent = showDiseaseInfo(val);
            addBotMessage(diseaseInfoContent, true, 'info');
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

    // User bubble context
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

    // Context menu for user bubble
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
setupCloseModalHandlers();
    }

    // DeepSeek API toggle
    const apiToggle = $('#apiToggle');
    if (apiToggle) {
        apiToggle.addEventListener('change', (e) => {
            const useApi = e.target.checked;
            localStorage.setItem('layup_useDeepSeek', useApi);
            showToast(useApi ? 'DeepSeek API diaktifkan' : 'DeepSeek API dimatikan', 'success');
        });
        
        const useDeepSeek = localStorage.getItem('layup_useDeepSeek') !== 'false';
        apiToggle.checked = useDeepSeek;
    }
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Global error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showToast('Terjadi kesalahan sistem', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showToast('Terjadi kesalahan sistem', 'error');
});

// Export fungsi utama untuk debugging
window.LayUpAI = {
    initApp,
    processQuestion,
    showDiseaseInfo,
    searchDisease,
    getCurrentChat,
    knowledgeBase: () => knowledgeBase
};