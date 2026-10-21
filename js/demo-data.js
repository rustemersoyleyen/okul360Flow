/**
 * Hazır ve Sabit Sistem Verileri (Kıraç Borsa İstanbul MTAL)
 * Bu veriler sistemin temel omurgasını oluşturur; tarayıcı sıfırlansa veya
 * Firebase çevrimdışı olsa bile daima bu okul ve sınıflar açılır.
 */

const DEMO_DATA = {
  // Okul & Sistem Ayarları
  settings: {
    schoolName: "Kıraç Borsa İstanbul Mesleki ve Teknik Anadolu Lisesi",
    termName: "2024-2025 Eğitim Öğretim Yılı",
    preferenceActive: true,
    startDate: "2024-10-15",
    endDate: "2024-11-15",
    allowChoiceChange: true,
    announcement: "Değerli öğrencilerimiz, 2024-2025 Eğitim-Öğretim yılı proje ödevi tercihleriniz başlamıştır. Lütfen 5 farklı ders seçiniz ve 'Tercihlerimi Kaydet' butonuna basınız."
  },

  // Proje Dersleri
  courses: [
    { id: "c_mat", code: "MAT-10", name: "Matematik", teacher: "Mustafa Hoca", defaultCapacity: 6, targetGrades: ["10"], isActiveForProject: true },
    { id: "c_fiz", code: "FIZ-10", name: "Fizik", teacher: "Zeynep Hoca", defaultCapacity: 5, targetGrades: ["10"], isActiveForProject: true },
    { id: "c_kim", code: "KIM-10", name: "Kimya", teacher: "Ahmet Hoca", defaultCapacity: 5, targetGrades: ["10"], isActiveForProject: true },
    { id: "c_biy", code: "BIY-10", name: "Biyoloji", teacher: "Elif Hoca", defaultCapacity: 5, targetGrades: ["10"], isActiveForProject: true },
    { id: "c_edb", code: "EDB-10", name: "Türk Dili ve Edebiyatı", teacher: "Mehmet Hoca", defaultCapacity: 6, targetGrades: ["10"], isActiveForProject: false },
    { id: "c_tar", code: "TAR-10", name: "Tarih", teacher: "Fatma Hoca", defaultCapacity: 5, targetGrades: ["10"], isActiveForProject: true },
    { id: "c_cog", code: "COG-10", name: "Coğrafya", teacher: "Ali Hoca", defaultCapacity: 5, targetGrades: ["10"], isActiveForProject: true },
    { id: "c_ing", code: "ING-10", name: "İngilizce", teacher: "Ayşe Hoca", defaultCapacity: 6, targetGrades: ["10"], isActiveForProject: true },
    { id: "c_fel", code: "FEL-10", name: "Felsefe", teacher: "Can Hoca", defaultCapacity: 4, targetGrades: ["10"], isActiveForProject: true },
    { id: "c_bil", code: "NES-10", name: "Nesne Tabanlı Programlama", teacher: "Rustem Ersöyleyen", defaultCapacity: 6, targetGrades: ["10"], isActiveForProject: true },
    { id: "c_rob", code: "ROB-10", name: "Robotik ve Kodlama", teacher: "Uğur Demir", defaultCapacity: 6, targetGrades: ["10"], isActiveForProject: true }
  ],

  // Sınıflar ve Sınıf Rehber Öğretmenleri
  classes: [
    { id: "cls_10a", name: "10-A", grade: "10", teacherName: "Uğur Demir", teacherUsername: "ugur10a", teacherPass: "1234", isDistributed: false },
    { id: "cls_10bb", name: "10-BB", grade: "10", teacherName: "Rustem Ersöyleyen", teacherUsername: "rustem10bb", teacherPass: "1234", isDistributed: false }
  ],

  // Sınıf Öğretmenlerinin Sınıflarına Özel Kontenjan / Kısıt Ayarları
  classConstraints: {
    cls_10a: {
      priorityRule: "random_fair",
      autoFillUnassigned: true,
      maxPerCourse: { c_mat: 6, c_fiz: 5, c_kim: 5, c_biy: 5, c_bil: 6, c_rob: 6, c_ing: 6, c_tar: 5, c_cog: 5, c_fel: 4 }
    },
    cls_10bb: {
      priorityRule: "random_fair",
      autoFillUnassigned: true,
      maxPerCourse: { c_mat: 5, c_fiz: 4, c_kim: 4, c_biy: 4, c_bil: 5, c_rob: 5, c_ing: 5, c_tar: 4, c_cog: 4, c_fel: 4 }
    }
  },

  // Gerçek Öğrenciler (10-BB ve 10-A)
  students: [
    // 10-BB Öğrencileri
    { id: "s_674", number: "674", name: "Özcan Cengiz", classId: "cls_10bb", pass: "674", choices: ["c_bil", "c_mat", "c_rob", "c_fiz", "c_ing"], submitDate: "2024-10-18T10:15:00" },
    { id: "s_101", number: "101", name: "Sinem Çelik", classId: "cls_10bb", pass: "101", choices: ["c_bil", "c_kim", "c_biy", "c_mat", "c_ing"], submitDate: "2024-10-18T10:18:00" },
    { id: "s_173", number: "173", name: "Rukhshona Shamsuddinova", classId: "cls_10bb", pass: "173", choices: ["c_mat", "c_bil", "c_ing", "c_fiz", "c_tar"], submitDate: "2024-10-18T10:20:00" },
    { id: "s_102", number: "102", name: "Sıla Yılmaz", classId: "cls_10bb", pass: "102", choices: ["c_bil", "c_biy", "c_mat", "c_fiz", "c_kim"], submitDate: "2024-10-18T10:22:00" },
    { id: "s_104", number: "104", name: "Mustafa Efecan Şimşek", classId: "cls_10bb", pass: "104", choices: ["c_bil", "c_rob", "c_mat", "c_fiz", "c_ing"], submitDate: "2024-10-18T10:25:00" },
    { id: "s_105", number: "105", name: "Hüseyin Erdem Aslan", classId: "cls_10bb", pass: "105", choices: ["c_mat", "c_fiz", "c_bil", "c_kim", "c_biy"], submitDate: "2024-10-18T10:28:00" },
    { id: "s_106", number: "106", name: "Ali Birkan Demir", classId: "cls_10bb", pass: "106", choices: ["c_bil", "c_rob", "c_mat", "c_ing", "c_tar"], submitDate: "2024-10-18T10:30:00" },
    { id: "s_747", number: "747", name: "Bora Özden", classId: "cls_10bb", pass: "747", choices: ["c_bil", "c_mat", "c_fiz", "c_rob", "c_ing"], submitDate: "2024-10-18T10:32:00" },
    { id: "s_107", number: "107", name: "Koray Kaya", classId: "cls_10bb", pass: "107", choices: ["c_fiz", "c_mat", "c_bil", "c_kim", "c_biy"], submitDate: "2024-10-18T10:35:00" },
    { id: "s_108", number: "108", name: "Muzaffer Kaya", classId: "cls_10bb", pass: "108", choices: ["c_bil", "c_mat", "c_rob", "c_fiz", "c_kim"], submitDate: "2024-10-18T10:38:00" },
    { id: "s_109", number: "109", name: "Zeynep Öz", classId: "cls_10bb", pass: "109", choices: ["c_biy", "c_kim", "c_mat", "c_fiz", "c_ing"], submitDate: "2024-10-18T10:40:00" },
    { id: "s_279", number: "279", name: "Kerim Özkan", classId: "cls_10bb", pass: "279", choices: ["c_bil", "c_rob", "c_mat", "c_fiz", "c_ing"], submitDate: "2024-10-18T10:42:00" },
    { id: "s_110", number: "110", name: "Ahmet Emin Yarar", classId: "cls_10bb", pass: "110", choices: ["c_mat", "c_bil", "c_fiz", "c_kim", "c_biy"], submitDate: "2024-10-18T10:45:00" },
    { id: "s_151", number: "151", name: "Nevzat Köse", classId: "cls_10bb", pass: "151", choices: ["c_bil", "c_rob", "c_mat", "c_fiz", "c_ing"], submitDate: "2024-10-18T10:48:00" },
    { id: "s_111", number: "111", name: "Muhammed Emin Kara", classId: "cls_10bb", pass: "111", choices: ["c_bil", "c_mat", "c_fiz", "c_kim", "c_biy"], submitDate: "2024-10-18T10:50:00" },
    { id: "s_112", number: "112", name: "Alibek Mamedov", classId: "cls_10bb", pass: "112", choices: ["c_mat", "c_fiz", "c_bil", "c_kim", "c_biy"], submitDate: "2024-10-18T10:52:00" },
    { id: "s_113", number: "113", name: "Efe Kerim Tekdemir", classId: "cls_10bb", pass: "113", choices: ["c_bil", "c_rob", "c_mat", "c_ing", "c_fiz"], submitDate: "2024-10-18T10:55:00" },
    { id: "s_114", number: "114", name: "Mete Duroğlu", classId: "cls_10bb", pass: "114", choices: ["c_fiz", "c_kim", "c_mat", "c_bil", "c_biy"], submitDate: "2024-10-18T10:58:00" },
    { id: "s_103", number: "103", name: "Ceren Yalçın", classId: "cls_10bb", pass: "103", choices: ["c_bil", "c_biy", "c_kim", "c_mat", "c_ing"], submitDate: "2024-10-18T11:00:00" },
    { id: "s_115", number: "115", name: "Raşit Ersin Ulutaş", classId: "cls_10bb", pass: "115", choices: [], submitDate: null },

    // 10-A Öğrencileri
    { id: "s_201", number: "201", name: "Bilal Baran Güngör", classId: "cls_10a", pass: "201", choices: ["c_rob", "c_bil", "c_mat", "c_fiz", "c_ing"], submitDate: "2024-10-18T11:05:00" },
    { id: "s_202", number: "202", name: "Ubeyt Muharrem Kızıltaş", classId: "cls_10a", pass: "202", choices: ["c_mat", "c_fiz", "c_rob", "c_bil", "c_kim"], submitDate: "2024-10-18T11:08:00" },
    { id: "s_203", number: "203", name: "Ela Nur Karslı", classId: "cls_10a", pass: "203", choices: ["c_biy", "c_kim", "c_mat", "c_fiz", "c_ing"], submitDate: "2024-10-18T11:10:00" },
    { id: "s_204", number: "204", name: "Emirhan Yıldız", classId: "cls_10a", pass: "204", choices: ["c_rob", "c_mat", "c_bil", "c_fiz", "c_kim"], submitDate: "2024-10-18T11:12:00" },
    { id: "s_205", number: "205", name: "Ayşe Melek Koç", classId: "cls_10a", pass: "205", choices: ["c_kim", "c_biy", "c_mat", "c_ing", "c_tar"], submitDate: "2024-10-18T11:15:00" },
    { id: "s_206", number: "206", name: "Yusuf İslam Doğan", classId: "cls_10a", pass: "206", choices: ["c_mat", "c_fiz", "c_rob", "c_bil", "c_kim"], submitDate: "2024-10-18T11:18:00" },
    { id: "s_207", number: "207", name: "Merve Nur Şimşek", classId: "cls_10a", pass: "207", choices: ["c_biy", "c_kim", "c_mat", "c_ing", "c_fiz"], submitDate: "2024-10-18T11:20:00" },
    { id: "s_208", number: "208", name: "Burak Can Çetin", classId: "cls_10a", pass: "208", choices: ["c_rob", "c_bil", "c_mat", "c_fiz", "c_tar"], submitDate: "2024-10-18T11:22:00" },
    { id: "s_209", number: "209", name: "Esra Deniz Aydın", classId: "cls_10a", pass: "209", choices: ["c_mat", "c_biy", "c_kim", "c_ing", "c_fiz"], submitDate: "2024-10-18T11:25:00" },
    { id: "s_210", number: "210", name: "Hasan Basri Yavuz", classId: "cls_10a", pass: "210", choices: ["c_fiz", "c_mat", "c_rob", "c_bil", "c_kim"], submitDate: "2024-10-18T11:28:00" },
    { id: "s_211", number: "211", name: "Zehra Betül Arslan", classId: "cls_10a", pass: "211", choices: ["c_kim", "c_biy", "c_mat", "c_ing", "c_tar"], submitDate: "2024-10-18T11:30:00" },
    { id: "s_212", number: "212", name: "Oğuzhan Polat", classId: "cls_10a", pass: "212", choices: ["c_rob", "c_mat", "c_bil", "c_fiz", "c_ing"], submitDate: "2024-10-18T11:32:00" },
    { id: "s_213", number: "213", name: "Fatma Zehra Korkmaz", classId: "cls_10a", pass: "213", choices: ["c_biy", "c_mat", "c_kim", "c_fiz", "c_ing"], submitDate: "2024-10-18T11:35:00" },
    { id: "s_214", number: "214", name: "Mert Ali Bozkurt", classId: "cls_10a", pass: "214", choices: ["c_mat", "c_fiz", "c_rob", "c_bil", "c_kim"], submitDate: "2024-10-18T11:38:00" },
    { id: "s_215", number: "215", name: "İrem Su Erdem", classId: "cls_10a", pass: "215", choices: [], submitDate: null }
  ],

  // Yönetici Girişi
  admin: {
    username: "admin",
    pass: "admin123"
  }
};

// Global dışa aktarım
if (typeof window !== 'undefined') {
  window.DEMO_DATA = DEMO_DATA;
}
