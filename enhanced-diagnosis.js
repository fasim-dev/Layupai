// Modul untuk diagnosis penyakit yang lebih cerdas

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
    // Tambahkan penyakit lainnya...
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

