/**
 * Firebase Firestore & LocalStorage Veri Katmanı (Data Service)
 * 
 * Sistem şu şekilde esnek çalışır:
 * 1. Firebase yapılandırması girilirse verileri Google Firebase Firestore veritabanına yazar/okur.
 * 2. Henüz Firebase girilmemişse veya internet yoksa LocalStorage üzerinden %100 kesintisiz çalışır.
 * 3. GitHub Pages üzerinde harici hiçbir arka uç (backend) sunucuya ihtiyaç duymaz!
 */

class DataService {
  constructor() {
    this.storageKeyPrefix = "proje_odevi_";
    this.firebaseApp = null;
    this.db = null;
    this.isFirebaseReady = false;
    this.listeners = [];
  }

  /**
   * Veri servisini başlatır
   */
  async init() {
    // Önce LocalStorage'da veri var mı kontrol et, yoksa DEMO_DATA ile başlat
    this.ensureInitialData();

    // Kayıtlı Firebase Config var mı kontrol et
    const fbConfig = this.getFirebaseConfig();
    if (fbConfig && fbConfig.apiKey && fbConfig.projectId) {
      await this.initFirebase(fbConfig);
    }
  }

  ensureInitialData() {
    if (!localStorage.getItem(this.storageKeyPrefix + 'initialized')) {
      this.resetToDemoData();
    } else {
      // Var olan yerel derslerde isActiveForProject kontrolü
      const localCourses = this.getLocal('courses');
      if (localCourses && localCourses.some(c => c.isActiveForProject === undefined)) {
        localCourses.forEach(lc => {
          if (lc.isActiveForProject === undefined) {
            lc.isActiveForProject = lc.id === 'c_edb' ? false : true;
          }
        });
        this.setLocal('courses', localCourses);
      }
    }
  }

  resetToDemoData() {
    if (typeof DEMO_DATA !== 'undefined') {
      localStorage.setItem(this.storageKeyPrefix + 'settings', JSON.stringify(DEMO_DATA.settings));
      localStorage.setItem(this.storageKeyPrefix + 'courses', JSON.stringify(DEMO_DATA.courses));
      localStorage.setItem(this.storageKeyPrefix + 'classes', JSON.stringify(DEMO_DATA.classes));
      localStorage.setItem(this.storageKeyPrefix + 'classConstraints', JSON.stringify(DEMO_DATA.classConstraints));
      localStorage.setItem(this.storageKeyPrefix + 'students', JSON.stringify(DEMO_DATA.students));
      localStorage.setItem(this.storageKeyPrefix + 'results', JSON.stringify({}));
      localStorage.setItem(this.storageKeyPrefix + 'admin', JSON.stringify(DEMO_DATA.admin));
      localStorage.setItem(this.storageKeyPrefix + 'initialized', 'true');
    }
  }

  // --- Firebase Yapılandırması ---
  getFirebaseConfig() {
    const raw = localStorage.getItem(this.storageKeyPrefix + 'fb_config');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    // Kullanıcının Firebase Projesi (Varsayılan)
    return {
      apiKey: "AIzaSyCNnGvKqkCg4SxOFIbE4MXYrlm-GLkOzRk",
      authDomain: "okul360flow.firebaseapp.com",
      projectId: "okul360flow",
      storageBucket: "okul360flow.appspot.com",
      messagingSenderId: "210215280486",
      appId: "1:210215280486:web:c5c7a4e8a9c740ed91b2a7"
    };
  }

  async saveFirebaseConfig(config) {
    localStorage.setItem(this.storageKeyPrefix + 'fb_config', JSON.stringify(config));
    return await this.initFirebase(config);
  }

  clearFirebaseConfig() {
    localStorage.removeItem(this.storageKeyPrefix + 'fb_config');
    this.firebaseApp = null;
    this.db = null;
    this.isFirebaseReady = false;
  }

  async initFirebase(config) {
    try {
      if (typeof firebase === 'undefined') {
        console.warn("Firebase SDK yüklenemedi. LocalStorage kullanılacak.");
        this.isFirebaseReady = false;
        return false;
      }

      // Varsa önceki instance'ı kapat/temizle
      if (firebase.apps && firebase.apps.length > 0) {
        this.firebaseApp = firebase.app();
      } else {
        this.firebaseApp = firebase.initializeApp(config);
      }

      this.db = firebase.firestore();
      this.isFirebaseReady = true;
      console.log("Firebase Firestore başarıyla bağlandı!");

      // İlk defa Firebase'e bağlanıyorsa yereldeki verileri Firestore'a aktarabilir
      await this.syncLocalToFirestoreIfNeeded();
      return true;
    } catch (error) {
      console.error("Firebase başlatma hatası:", error);
      this.isFirebaseReady = false;
      return false;
    }
  }

  async syncLocalToFirestoreIfNeeded() {
    if (!this.isFirebaseReady) return;
    try {
      const doc = await this.db.collection('system').doc('metadata').get();
      if (!doc.exists) {
        console.log("Firestore boş, yerel veriler senkronize ediliyor...");
        await this.syncAllToFirebase();
      }
    } catch (e) {
      console.warn("Firestore kontrolünde hata:", e);
    }
  }

  async syncAllToFirebase() {
    if (!this.isFirebaseReady) return;
    try {
      const batch = this.db.batch();
      
      const settings = this.getLocal('settings');
      const courses = this.getLocal('courses');
      const classes = this.getLocal('classes');
      const students = this.getLocal('students');
      const classConstraints = this.getLocal('classConstraints');
      const results = this.getLocal('results');

      batch.set(this.db.collection('system').doc('metadata'), { initialized: true, updatedAt: new Date().toISOString() });
      batch.set(this.db.collection('system').doc('settings'), settings || {});
      batch.set(this.db.collection('system').doc('classConstraints'), classConstraints || {});
      batch.set(this.db.collection('system').doc('results'), results || {});

      // Koleksiyonlar
      await batch.commit();

      // Kurslar ve Öğrenciler topluca
      for (const c of (courses || [])) {
        await this.db.collection('courses').doc(c.id).set(c);
      }
      for (const cl of (classes || [])) {
        await this.db.collection('classes').doc(cl.id).set(cl);
      }
      for (const s of (students || [])) {
        await this.db.collection('students').doc(s.id).set(s);
      }

      console.log("Tüm veriler Firebase'e aktarıldı!");
    } catch (err) {
      console.error("Firebase senkronizasyon hatası:", err);
    }
  }

  // --- Genel Veri Erişim Metotları (Hibrit: Firebase VEYA LocalStorage) ---
  
  getLocal(key) {
    try {
      const raw = localStorage.getItem(this.storageKeyPrefix + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  setLocal(key, val) {
    localStorage.setItem(this.storageKeyPrefix + key, JSON.stringify(val));
  }

  // Ayarlar
  async getSettings() {
    if (this.isFirebaseReady) {
      try {
        const doc = await this.db.collection('system').doc('settings').get();
        if (doc.exists) {
          const data = doc.data();
          this.setLocal('settings', data);
          return data;
        }
      } catch (e) {
        console.warn("Firestore getSettings hatası:", e);
      }
    }
    return this.getLocal('settings') || {};
  }

  async saveSettings(settings) {
    this.setLocal('settings', settings);
    if (this.isFirebaseReady) {
      try {
        await this.db.collection('system').doc('settings').set(settings, { merge: true });
      } catch (e) {
        console.error("Firebase saveSettings hatası:", e);
      }
    }
    return settings;
  }

  // Dersler
  async getCourses() {
    if (this.isFirebaseReady) {
      try {
        const snap = await this.db.collection('courses').get();
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          this.setLocal('courses', list);
          return list;
        }
      } catch (e) {
        console.warn("Firestore getCourses hatası:", e);
      }
    }
    return this.getLocal('courses') || [];
  }

  async saveCourses(courses) {
    this.setLocal('courses', courses);
    if (this.isFirebaseReady) {
      try {
        for (const c of courses) {
          await this.db.collection('courses').doc(c.id).set(c);
        }
      } catch (e) {
        console.error("Firebase saveCourses hatası:", e);
      }
    }
  }

  async deleteCourse(courseId) {
    const list = (this.getLocal('courses') || []).filter(c => c.id !== courseId);
    this.setLocal('courses', list);
    if (this.isFirebaseReady) {
      try {
        await this.db.collection('courses').doc(courseId).delete();
      } catch (e) {
        console.error("Firebase deleteCourse hatası:", e);
      }
    }
    return list;
  }

  // Sınıflar
  async getClasses() {
    if (this.isFirebaseReady) {
      try {
        const snap = await this.db.collection('classes').get();
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          this.setLocal('classes', list);
          return list;
        } else {
          // Firebase'de boşsa yerel listeyi de boşalt
          const localList = this.getLocal('classes') || []; if (localList.length > 0) { this.saveClasses(localList); return localList; }
          return [];
        }
      } catch (e) {
        console.warn("Firestore getClasses hatası:", e);
      }
    }
    return this.getLocal('classes') || [];
  }

  async saveClasses(classes) {
    this.setLocal('classes', classes);
    if (this.isFirebaseReady) {
      try {
        for (const cl of classes) {
          await this.db.collection('classes').doc(cl.id).set(cl);
        }
      } catch (e) {
        console.error("Firebase saveClasses hatası:", e);
      }
    }
  }

  async deleteClass(classId) {
    const list = (this.getLocal('classes') || []).filter(c => c.id !== classId);
    this.setLocal('classes', list);
    if (this.isFirebaseReady) {
      try {
        await this.db.collection('classes').doc(classId).delete();
      } catch (e) {
        console.error("Firebase deleteClass hatası:", e);
      }
    }
    return list;
  }

  // Öğrenciler
  async getStudents() {
    if (this.isFirebaseReady) {
      try {
        const snap = await this.db.collection('students').get();
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        this.setLocal('students', list);
        return list;
      } catch (e) {
        console.warn("Firestore getStudents hatası:", e);
      }
    }
    return this.getLocal('students') || [];
  }

  async saveStudents(students) {
    this.setLocal('students', students);
    if (this.isFirebaseReady) {
      try {
        for (const s of students) {
          await this.db.collection('students').doc(s.id).set(s);
        }
      } catch (e) {
        console.error("Firebase saveStudents hatası:", e);
      }
    }
  }

  async deleteStudent(studentId) {
    const list = (this.getLocal('students') || []).filter(s => s.id !== studentId);
    this.setLocal('students', list);
    if (this.isFirebaseReady) {
      try {
        await this.db.collection('students').doc(studentId).delete();
      } catch (e) {
        console.error("Firebase deleteStudent hatası:", e);
      }
    }
    return list;
  }

  // Tüm Verileri Sıfırlama (Kendi okul verilerini sıfırdan girmek için)
  async clearAllSchoolData(keepCourses = true) {
    const localList = this.getLocal('classes') || []; if (localList.length > 0) { this.saveClasses(localList); return localList; }
    this.setLocal('students', []);
    this.setLocal('results', {});
    this.setLocal('classConstraints', {});

    if (this.isFirebaseReady) {
      try {
        // Sınıfları sil
        const clsSnap = await this.db.collection('classes').get();
        for (const doc of clsSnap.docs) {
          await doc.ref.delete();
        }
        // Öğrencileri sil
        const stSnap = await this.db.collection('students').get();
        for (const doc of stSnap.docs) {
          await doc.ref.delete();
        }
        // Sonuçları ve kısıtları sıfırla
        await this.db.collection('system').doc('results').set({});
        await this.db.collection('system').doc('classConstraints').set({});
      } catch (e) {
        console.error("Firebase clearAllSchoolData hatası:", e);
      }
    }

    if (!keepCourses) {
      this.setLocal('courses', []);
      if (this.isFirebaseReady) {
        try {
          const cSnap = await this.db.collection('courses').get();
          for (const doc of cSnap.docs) {
            await doc.ref.delete();
          }
        } catch (e) {
          console.error("Firebase clear courses hatası:", e);
        }
      }
    }
  }

  // Öğrenci Tercih Kaydetme
  async saveStudentChoices(studentId, choices) {
    const students = await this.getStudents();
    const student = students.find(s => s.id === studentId || s.number === studentId);
    if (!student) {
      throw new Error("Öğrenci bulunamadı!");
    }

    student.choices = choices;
    student.submitDate = new Date().toISOString();

    await this.saveStudents(students);

    if (this.isFirebaseReady) {
      try {
        await this.db.collection('students').doc(student.id).set({
          choices: student.choices,
          submitDate: student.submitDate
        }, { merge: true });
      } catch (e) {
        console.error("Firebase saveStudentChoices hatası:", e);
      }
    }
    return student;
  }

  // Sınıf Kısıtlamaları (Öğretmen paneli ayarları)
  async getAllClassConstraints() {
    let allConstraints = this.getLocal('classConstraints') || {};
    if (this.isFirebaseReady) {
      try {
        const doc = await this.db.collection('system').doc('classConstraints').get();
        if (doc.exists) {
          allConstraints = doc.data();
          this.setLocal('classConstraints', allConstraints);
        }
      } catch (e) {}
    }
    return allConstraints;
  }

  async getClassConstraints(classId) {
    let allConstraints = this.getLocal('classConstraints') || {};
    if (this.isFirebaseReady) {
      try {
        const doc = await this.db.collection('system').doc('classConstraints').get();
        if (doc.exists) {
          allConstraints = doc.data();
          this.setLocal('classConstraints', allConstraints);
        }
      } catch (e) {
        console.warn("Firestore getClassConstraints hatası:", e);
      }
    }
    return allConstraints[classId] || {
      priorityRule: 'random_fair',
      autoFillRemaining: true,
      courseCapacities: {}
    };
  }

  async saveClassConstraints(classId, constraints) {
    const all = this.getLocal('classConstraints') || {};
    all[classId] = constraints;
    this.setLocal('classConstraints', all);

    if (this.isFirebaseReady) {
      try {
        await this.db.collection('system').doc('classConstraints').set(all, { merge: true });
      } catch (e) {
        console.error("Firebase saveClassConstraints hatası:", e);
      }
    }
    return constraints;
  }

  // Dağıtım Sonuçları
  async getResults() {
    if (this.isFirebaseReady) {
      try {
        const doc = await this.db.collection('system').doc('results').get();
        if (doc.exists) {
          const data = doc.data();
          this.setLocal('results', data);
          return data;
        }
      } catch (e) {
        console.warn("Firestore getResults hatası:", e);
      }
    }
    return this.getLocal('results') || {};
  }

  async saveClassDistributionResult(classId, resultData) {
    const allResults = await this.getResults();
    allResults[classId] = {
      distributedAt: new Date().toISOString(),
      published: true, // Öğrenciler sonuçları görebilsin mi
      ...resultData
    };

    this.setLocal('results', allResults);

    // Sınıf durumunu isDistributed = true yap
    const classes = await this.getClasses();
    const cl = classes.find(c => c.id === classId);
    if (cl) {
      cl.isDistributed = true;
      cl.lastDistributedAt = new Date().toISOString();
      await this.saveClasses(classes);
    }

    if (this.isFirebaseReady) {
      try {
        await this.db.collection('system').doc('results').set(allResults, { merge: true });
      } catch (e) {
        console.error("Firebase saveClassDistributionResult hatası:", e);
      }
    }

    return allResults[classId];
  }

  async toggleResultPublish(classId, published) {
    const allResults = await this.getResults();
    if (allResults[classId]) {
      allResults[classId].published = published;
      this.setLocal('results', allResults);

      if (this.isFirebaseReady) {
        try {
          await this.db.collection('system').doc('results').set(allResults, { merge: true });
        } catch (e) {
          console.error("Firebase toggleResultPublish hatası:", e);
        }
      }
    }
  }

  async saveResults(results) {
    this.setLocal('results', results);
    if (this.isFirebaseReady) {
      try {
        await this.db.collection('system').doc('results').set(results);
      } catch (e) {
        console.error('Firebase saveResults hatasi:', e);
      }
    }
    return results;
  }

  // Sınıf Dağıtımını İptal Et (Hiç yapılmamış say)
  async cancelClassDistribution(classId) {
    const allResults = await this.getResults();
    delete allResults[classId];
    this.setLocal('results', allResults);

    // Sınıf durumunu isDistributed = false yap
    const classes = await this.getClasses();
    const cl = classes.find(c => c.id === classId);
    if (cl) {
      cl.isDistributed = false;
      delete cl.lastDistributedAt;
      await this.saveClasses(classes);
    }

    if (this.isFirebaseReady) {
      try {
        await this.db.collection('system').doc('results').set(allResults);
      } catch (e) {
        console.error("Firebase cancelClassDistribution hatası:", e);
      }
    }
    return true;
  }

  // JSON Yedek Al / İçe Aktar
  exportFullBackup() {
    const data = {
      settings: this.getLocal('settings'),
      courses: this.getLocal('courses'),
      classes: this.getLocal('classes'),
      classConstraints: this.getLocal('classConstraints'),
      students: this.getLocal('students'),
      results: this.getLocal('results'),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    return JSON.stringify(data, null, 2);
  }

  async importFullBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.settings) this.setLocal('settings', data.settings);
      if (data.courses) this.setLocal('courses', data.courses);
      if (data.classes) this.setLocal('classes', data.classes);
      if (data.classConstraints) this.setLocal('classConstraints', data.classConstraints);
      if (data.students) this.setLocal('students', data.students);
      if (data.results) this.setLocal('results', data.results);

      if (this.isFirebaseReady) {
        await this.syncAllToFirebase();
      }
      return true;
    } catch (e) {
      console.error("Import hatası:", e);
      throw new Error("Geçersiz JSON yedek dosyası!");
    }
  }
}

// Global instance
window.dataService = new DataService();
