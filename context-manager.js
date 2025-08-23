// Modul untuk respons ramah dan santai
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

