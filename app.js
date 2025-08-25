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
            diseaseSelect.appendChild
