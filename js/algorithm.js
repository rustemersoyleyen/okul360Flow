/**
 * Akıllı Proje Dağıtım Algoritması (High-Satisfaction Placement Engine)
 * 
 * Felsefe: "YÜKSEK MEMNUNİYET" (High Satisfaction)
 * 
 * 1. Kademe: "İlk 2 Tercih Çekirdeği" (Maksimum Memnuniyet)
 *    - Öncelikli hedef herkesi 1. tercihine yerleştirmektir.
 *    - Bir derste aşırı talep olduğunda (talep > kontenjan), sistem alelacele kura çekip
 *      öğrencileri 3, 4 veya 5. tercihe fırlatmak yerine, yarışan öğrencilerin 2. tercihlerini inceler.
 *    - 2. tercihinde kontenjanı müsait olan öğrencileri 2. tercihine yumuşakça kaydırarak
 *      öğrencilerin tamamının (veya azami çoğunluğunun) İLK 2 TERCİHİNDE kalmasını sağlar.
 * 
 * 2. Kademe: Sıralı Emniyet Ağı (3. ve 4. Tercihler)
 *    - İlk 2 tercihine sığamayan öğrenciler için sırasıyla 3., dolarsa 4. tercih denenir.
 * 
 * 3. Kademe: 5. Tercih (En Az İstenen - Son Çare)
 *    - Sadece ilk 4 tercih tamamen dolmuşsa son çare olarak işletilir.
 * 
 * 4. Kademe: Açıkta Kalanların Raporlanması (Zoraki Atama Yok)
 *    - 5 tercihi de dolan öğrenciler rastgele istemedikleri bir derse zorla ATANMAZ.
 *    - "⚠️ Yerleşemedi / Açıkta Kaldı" statüsüyle öğretmen ekranına net şekilde bildirilir.
 */

class ProjectDistributionAlgorithm {
  /**
   * @param {Object} options
   * @param {Array} options.students - Sınıftaki öğrenciler [{ id, name, number, submitDate, choices: [c1, c2, c3, c4, c5] }]
   * @param {Array} options.courses - Mevcut dersler [{ id, code, name, defaultCapacity, isActiveForProject }]
   * @param {Object} options.constraints - Sınıf öğretmeni kısıtlamaları { courseCapacities: { courseId: maxCount }, priorityRule: 'random_fair' | 'first_submitted' }
   */
  constructor({ students, courses, constraints = {} }) {
    this.students = JSON.parse(JSON.stringify(students || []));
    this.courses = JSON.parse(JSON.stringify(courses || []));
    this.constraints = {
      courseCapacities: {},
      priorityRule: 'random_fair',
      ...constraints
    };
    this.logs = [];
  }

  log(message, type = 'info') {
    this.logs.push({
      time: new Date().toLocaleTimeString('tr-TR'),
      message,
      type
    });
  }

  /**
   * Dağıtım motorunu çalıştırır
   */
  distribute() {
    this.logs = [];
    this.log("🎯 Yüksek Memnuniyet Odaklı Dağıtım Motoru Başlatıldı.", "start");

    // 1. Kontenjanları ve Açık/Kapalı Dersleri Hazırla
    const capacities = {};
    const assignmentsByCourse = {};
    const courseLookup = {};

    this.courses.forEach(c => {
      courseLookup[c.id] = c;
      
      // Eğer ders genel olarak veya sınıfça proje ödevine kapatıldıysa kapasite 0
      const isCourseActive = c.isActiveForProject !== false;
      let cap = 0;
      
      if (isCourseActive && this.constraints.courseCapacities) {
        if (this.constraints.courseCapacities[c.id] !== undefined) {
          cap = parseInt(this.constraints.courseCapacities[c.id], 10) || 0;
        } else {
          cap = 0; // Sınıf bazlı kontenjan - varsayılan yok
        }
      }

      capacities[c.id] = Math.max(0, cap);
      assignmentsByCourse[c.id] = [];
    });

    const activeCoursesSummary = this.courses
      .filter(c => capacities[c.id] > 0)
      .map(c => `${c.name}: ${capacities[c.id]}`)
      .join(', ');

    this.log(`Aktif ders kontenjanları: ${activeCoursesSummary}`, 'info');

    // Kapalı dersleri logla
    const closedCourses = this.courses.filter(c => capacities[c.id] === 0);
    if (closedCourses.length > 0) {
      this.log(`ℹ️ Proje ödevine kapalı dersler: ${closedCourses.map(c => c.name).join(', ')}`, 'warning');
    }

    // 2. Öğrencileri filtrele
    const validStudents = this.students.filter(s => s.choices && s.choices.length > 0);
    const noChoiceStudents = this.students.filter(s => !s.choices || s.choices.length === 0);

    if (noChoiceStudents.length > 0) {
      this.log(`⚠️ ${noChoiceStudents.length} öğrenci tercih bildirmemiş. Açıkta kalanlar listesine aktarılacak.`, 'warning');
    }

    // Öncelik kuralına göre ön sıralama
    let studentPool = [...validStudents];
    if (this.constraints.priorityRule === 'first_submitted') {
      studentPool.sort((a, b) => new Date(a.submitDate || 0) - new Date(b.submitDate || 0));
      this.log("Eşitlik durumlarında başvuru zamanı önceliği esas alınacak.", 'info');
    } else {
      studentPool = this.shuffleArray(studentPool);
      this.log("Eşitlik durumlarında rastgele adil kura esas alınacak.", 'info');
    }

    // Öğrenci durum takip nesneleri
    const state = studentPool.map(s => ({
      ...s,
      assigned: false,
      assignedCourse: null,
      preferenceLevel: null
    }));

    // =========================================================================
    // 1. KADEME: "İLK 2 TERCİH ÇEKİRDEĞİ" (HIGH-SATISFACTION OPTIMIZATION)
    // =========================================================================
    this.log("--- 1. Kademe: İlk 2 Tercih Memnuniyet Optimizasyonu Başladı ---", 'round');

    // 1. Tercihlere göre grupla
    const firstChoiceDemands = {};
    this.courses.forEach(c => firstChoiceDemands[c.id] = []);

    state.forEach(student => {
      const c1 = student.choices[0];
      if (firstChoiceDemands[c1]) {
        firstChoiceDemands[c1].push(student);
      }
    });

    // Kontenjanı aşmayan derslerde 1. tercihler anında yerleştirilir
    this.courses.forEach(c => {
      const demand = firstChoiceDemands[c.id] || [];
      const cap = capacities[c.id];

      if (demand.length <= cap) {
        demand.forEach(st => {
          assignmentsByCourse[c.id].push(st);
          st.assigned = true;
          st.assignedCourse = { id: c.id, name: c.name, code: c.code };
          st.preferenceLevel = 1;
          this.log(`⭐ ${st.name} -> 1. tercihi olan "${c.name}" dersine yerleştirildi.`, 'success');
        });
      }
    });

    // Kontenjanı aşan dersler için: "Akıllı 2. Tercih Köprüsü"
    this.courses.forEach(c => {
      const demand = firstChoiceDemands[c.id] || [];
      const cap = capacities[c.id];

      if (demand.length > cap) {
        this.log(`⚡ "${c.name}" dersi için yoğun talep var (Kontenjan: ${cap}, Talep: ${demand.length}). Akıllı 2. tercih analizi yapılıyor...`, 'round');

        // Talep eden öğrencileri incele: Hangisinin 2. tercihinde boş yer var?
        const candidatesForChoice2 = [];
        const preferChoice1 = [];

        demand.forEach(st => {
          const c2Id = st.choices[1];
          const c2Cap = capacities[c2Id] || 0;
          const c2Current = assignmentsByCourse[c2Id] ? assignmentsByCourse[c2Id].length : 0;
          
          // 2. tercih dersi aktif ve boş yeri var mı?
          if (c2Id && c2Cap > c2Current) {
            candidatesForChoice2.push({ student: st, targetCourseId: c2Id });
          } else {
            preferChoice1.push(st);
          }
        });

        // 1. tercihi doldururken öncelik
        const remainingSpots = cap;
        let placedIn1 = 0;

        // Öncelikle 2. tercih alternatifi olmayan öğrencileri 1. tercihe yerleştir
        for (const st of preferChoice1) {
          if (placedIn1 < remainingSpots) {
            assignmentsByCourse[c.id].push(st);
            st.assigned = true;
            st.assignedCourse = { id: c.id, name: c.name, code: c.code };
            st.preferenceLevel = 1;
            placedIn1++;
            this.log(`⭐ ${st.name} -> 1. tercihi olan "${c.name}" dersine yerleştirildi.`, 'success');
          }
        }

        // Kalan kontenjan varsa 2. tercihi müsait olan adaylardan da 1. tercihe al
        for (const item of candidatesForChoice2) {
          const st = item.student;
          if (placedIn1 < remainingSpots) {
            assignmentsByCourse[c.id].push(st);
            st.assigned = true;
            st.assignedCourse = { id: c.id, name: c.name, code: c.code };
            st.preferenceLevel = 1;
            placedIn1++;
            this.log(`⭐ ${st.name} -> 1. tercihi olan "${c.name}" dersine yerleştirildi.`, 'success');
          } else {
            // Kontenjan doldu, öğrenciyi 2. tercihine yumuşakça kaydır (Böylece 3-4-5'e düşmez!)
            const c2Course = courseLookup[item.targetCourseId];
            if (c2Course && assignmentsByCourse[item.targetCourseId].length < capacities[item.targetCourseId]) {
              assignmentsByCourse[item.targetCourseId].push(st);
              st.assigned = true;
              st.assignedCourse = { id: c2Course.id, name: c2Course.name, code: c2Course.code };
              st.preferenceLevel = 2;
              this.log(`✨ ${st.name} -> 1. tercih yoğunluğu nedeniyle 2. tercihi olan "${c2Course.name}" dersine başarıyla yerleştirildi.`, 'auto');
            }
          }
        }
      }
    });

    // Henüz yerleşememiş ve 2. tercihinde boş yer bulunan diğer öğrencileri tara
    state.filter(s => !s.assigned).forEach(st => {
      const c2Id = st.choices[1];
      if (c2Id && courseLookup[c2Id] && capacities[c2Id] > assignmentsByCourse[c2Id].length) {
        const c2Course = courseLookup[c2Id];
        assignmentsByCourse[c2Id].push(st);
        st.assigned = true;
        st.assignedCourse = { id: c2Course.id, name: c2Course.name, code: c2Course.code };
        st.preferenceLevel = 2;
        this.log(`✨ ${st.name} -> 2. tercihi olan "${c2Course.name}" dersine yerleştirildi.`, 'auto');
      }
    });

    // =========================================================================
    // 2. KADEME: SIRALI EMNİYET AĞI (3. VE 4. TERCİHLER)
    // =========================================================================
    this.log("--- 2. Kademe: Sıralı Emniyet Ağı (3. ve 4. Tercihler) ---", 'round');

    // 3. Tercih Turu
    state.filter(s => !s.assigned).forEach(st => {
      const c3Id = st.choices[2];
      if (c3Id && courseLookup[c3Id] && capacities[c3Id] > assignmentsByCourse[c3Id].length) {
        const c3Course = courseLookup[c3Id];
        assignmentsByCourse[c3Id].push(st);
        st.assigned = true;
        st.assignedCourse = { id: c3Course.id, name: c3Course.name, code: c3Course.code };
        st.preferenceLevel = 3;
        this.log(`🔹 ${st.name} -> 3. tercihi olan "${c3Course.name}" dersine yerleştirildi.`, 'info');
      }
    });

    // 4. Tercih Turu
    state.filter(s => !s.assigned).forEach(st => {
      const c4Id = st.choices[3];
      if (c4Id && courseLookup[c4Id] && capacities[c4Id] > assignmentsByCourse[c4Id].length) {
        const c4Course = courseLookup[c4Id];
        assignmentsByCourse[c4Id].push(st);
        st.assigned = true;
        st.assignedCourse = { id: c4Course.id, name: c4Course.name, code: c4Course.code };
        st.preferenceLevel = 4;
        this.log(`🔸 ${st.name} -> 4. tercihi olan "${c4Course.name}" dersine yerleştirildi.`, 'info');
      }
    });

    // =========================================================================
    // 3. KADEME: 5. TERCİH (EN AZ İSTENEN - SON ÇARE)
    // =========================================================================
    this.log("--- 3. Kademe: 5. Tercih Değerlendirmesi (Son Çare) ---", 'round');

    state.filter(s => !s.assigned).forEach(st => {
      const c5Id = st.choices[4];
      if (c5Id && courseLookup[c5Id] && capacities[c5Id] > assignmentsByCourse[c5Id].length) {
        const c5Course = courseLookup[c5Id];
        assignmentsByCourse[c5Id].push(st);
        st.assigned = true;
        st.assignedCourse = { id: c5Course.id, name: c5Course.name, code: c5Course.code };
        st.preferenceLevel = 5;
        this.log(`⚠️ ${st.name} -> İlk 4 tercihi dolduğu için 5. tercihi olan "${c5Course.name}" dersine yerleştirildi.`, 'warning');
      }
    });

    // =========================================================================
    // 4. KADEME: AÇIKTA KALANLARIN BELİRLENMESİ (ZORAKİ ATAMA YOK)
    // =========================================================================
    const assignedStudents = state.filter(s => s.assigned);
    const unassignedStudents = state.filter(s => !s.assigned);

    // Tercih bildirmeyenleri de açıkta kalanlara ekle
    noChoiceStudents.forEach(st => {
      unassignedStudents.push({
        ...st,
        assigned: false,
        assignedCourse: null,
        preferenceLevel: 'Tercih Bildirmedi'
      });
    });

    if (unassignedStudents.length > 0) {
      this.log(`🚨 DİKKAT: ${unassignedStudents.length} öğrenci 5 tercihine de yerleşemedi veya tercih bildirmedi. Zoraki atama yapılmadı, öğretmene bildirildi.`, 'finish');
      unassignedStudents.forEach(st => {
        this.log(`  ✗ ${st.name} (${st.number}) -> Tercih ettiği derslerin tüm kontenjanları doldu.`, 'warning');
      });
    } else {
      this.log(`🎉 Tebrikler! Sınıftaki tüm öğrenciler tercihlerine başarıyla yerleştirildi!`, 'finish');
    }

    // İstatistikler
    const courseStats = this.courses.map(c => {
      const assignedCount = (assignmentsByCourse[c.id] || []).length;
      return {
        id: c.id,
        name: c.name,
        code: c.code,
        capacity: capacities[c.id],
        assignedCount,
        occupancyRate: capacities[c.id] > 0 ? Math.round((assignedCount / capacities[c.id]) * 100) : 0,
        isFull: capacities[c.id] > 0 && assignedCount >= capacities[c.id],
        isClosed: capacities[c.id] === 0
      };
    });

    const preferenceDistribution = {
      firstChoice: assignedStudents.filter(s => s.preferenceLevel === 1).length,
      secondChoice: assignedStudents.filter(s => s.preferenceLevel === 2).length,
      thirdChoice: assignedStudents.filter(s => s.preferenceLevel === 3).length,
      fourthChoice: assignedStudents.filter(s => s.preferenceLevel === 4).length,
      fifthChoice: assignedStudents.filter(s => s.preferenceLevel === 5).length,
      topTwoTotal: assignedStudents.filter(s => s.preferenceLevel === 1 || s.preferenceLevel === 2).length,
      unassignedCount: unassignedStudents.length
    };

    return {
      success: true,
      timestamp: new Date().toISOString(),
      assignedStudents,
      unassignedStudents,
      courseStats,
      preferenceDistribution,
      totalStudents: this.students.length,
      logs: this.logs
    };
  }

  shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

if (typeof window !== 'undefined') {
  window.ProjectDistributionAlgorithm = ProjectDistributionAlgorithm;
}
