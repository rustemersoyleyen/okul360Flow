/**
 * Okul360 - Öğrenci Özel Portalı Kontrolcüsü (StudentApp)
 */
class StudentApp {
  constructor() {
    this.currentStudent = null;
    this.classes = [];
    this.courses = [];
    this.students = [];
    this.results = {};
    this.settings = {};
  }

  async init() {
    await window.dataService.init();
    await this.reloadAllData();
    this.updateDbStatusBadge();
    await this.checkSession();
  }

  async reloadAllData() {
    this.settings = await window.dataService.getSettings();
    this.courses = await window.dataService.getCourses();
    this.classes = await window.dataService.getClasses();
    this.students = await window.dataService.getStudents();
    this.results = await window.dataService.getResults();
    this.updateSchoolTitle();
  }

  updateSchoolTitle() {
    const titleEl = document.getElementById('navSchoolTitle');
    if (titleEl && this.settings.schoolName) {
      titleEl.textContent = this.settings.schoolName;
    }
  }

  updateDbStatusBadge() {
    const badge = document.getElementById('dbStatusBadge');
    const text = document.getElementById('dbStatusText');
    if (!badge || !text) return;
    if (window.dataService.isFirebaseReady) {
      badge.className = "badge-status active";
      text.textContent = "⚡ Firebase Bulut Aktif";
    } else {
      badge.className = "badge-status offline";
      text.textContent = "💾 Yerel Depolama (Demo)";
    }
  }

  async checkSession() {
    const saved = sessionStorage.getItem('active_student_session') || sessionStorage.getItem('active_session');
    if (saved) {
      try {
        const sess = JSON.parse(saved);
        if (sess.role === 'student' || sess.number) {
          const st = this.students.find(s => s.id === sess.id || s.number === sess.number);
          if (st) {
            await this.loginSuccess(st, false);
            return;
          }
        }
      } catch (e) {
        sessionStorage.removeItem('active_student_session');
      }
    }
    this.showLoginView();
  }

  showLoginView() {
    this.currentStudent = null;
    sessionStorage.removeItem('active_student_session');
    const loginSec = document.getElementById('studentLoginSection');
    const dashSec = document.getElementById('studentDashboardSection');
    const navLogout = document.getElementById('navLogoutBtn');
    if (loginSec) loginSec.style.display = 'flex';
    if (dashSec) dashSec.style.display = 'none';
    if (navLogout) navLogout.style.display = 'none';
  }

  async handleLogin(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (this._isLoggingIn) return;
    this._isLoggingIn = true;
    setTimeout(() => { this._isLoggingIn = false; }, 1200);
    const num = document.getElementById('studentNumberInput').value.trim();
    const pass = document.getElementById('studentPassInput').value.trim();

    if (!num) {
      this.showToast("Lütfen okul numaranızı giriniz!", "warning");
      return;
    }

    await this.reloadAllData();
    const st = this.students.find(s => s.number === num);

    if (!st) {
      this.showToast("Bu okul numarasına ait öğrenci kaydı bulunamadı!", "error");
      return;
    }

    if (st.pass && st.pass !== pass) {
      this.showToast("Girdiğiniz şifre hatalı! Lütfen tekrar deneyiniz.", "error");
      return;
    }

    await this.loginSuccess(st, true);
  }

  async loginSuccess(student, saveSession = true) {
    this.currentStudent = student;
    if (saveSession) {
      sessionStorage.setItem('active_student_session', JSON.stringify({
        role: 'student',
        id: student.id,
        number: student.number
      }));
    }

    const loginSec = document.getElementById('studentLoginSection');
    const dashSec = document.getElementById('studentDashboardSection');
    const navLogout = document.getElementById('navLogoutBtn');

    if (loginSec) loginSec.style.display = 'none';
    if (dashSec) dashSec.style.display = 'block';
    if (navLogout) navLogout.style.display = 'inline-flex';

    await this.renderStudentView(student);
    this.showToast(`Hoş geldin, ${student.name}!`, "success");
  }

  logout() {
    sessionStorage.removeItem('active_student_session');
    sessionStorage.removeItem('active_session');
    this.currentStudent = null;
    this.showLoginView();
    this.showToast("Güvenli çıkış yapıldı.", "info");
  }

  quickFill(num, pass) {
    const numEl = document.getElementById('studentNumberInput');
    const passEl = document.getElementById('studentPassInput');
    if (numEl) numEl.value = num;
    if (passEl) passEl.value = pass;
    this.handleLogin();
  }

  async renderStudentView(student) {
    const studentClass = this.classes.find(c => c.id === student.classId);
    const className = studentClass ? studentClass.name : "Belirsiz";
    const grade = studentClass ? studentClass.grade : "9";

    // Profil kartı
    const avatarEl = document.getElementById('studentAvatar');
    const nameEl = document.getElementById('studentFullName');
    const classEl = document.getElementById('studentTagClass');
    const numberEl = document.getElementById('studentTagNumber');

    if (avatarEl) avatarEl.textContent = student.name ? student.name.charAt(0).toUpperCase() : "Ö";
    if (nameEl) nameEl.textContent = student.name;
    if (classEl) classEl.textContent = `Sınıf: ${className}`;
    if (numberEl) numberEl.textContent = `No: ${student.number}`;

    // Öğrenci derse yerleşti mi kontrolü
    const classResult = this.results[student.classId];
    let isPlaced = false;
    let placedRecord = null;

    if (classResult && classResult.published !== false && classResult.assignedStudents) {
      placedRecord = classResult.assignedStudents.find(s => s.id === student.id || s.number === student.number);
      if (placedRecord && placedRecord.assignedCourse) {
        isPlaced = true;
      }
    }

    const placedCard = document.getElementById('studentPlacedCard');
    const prefWrapper = document.getElementById('studentPrefWrapper');
    const statusTag = document.getElementById('studentTagStatus');

    if (isPlaced && placedRecord) {
      // --- DURUM 1: DERSE YERLEŞTİ -> TERCİH EKRANI KAPALI, YERLEŞTİRİLDİĞİ DERS GÖRÜNÜR ---
      if (placedCard) {
        placedCard.style.display = 'block';
        const courseNameEl = document.getElementById('placedCourseName');
        const courseCodeEl = document.getElementById('placedCourseCode');
        const teacherNameEl = document.getElementById('placedTeacherName');
        const reasonDetailEl = document.getElementById('placedReasonDetail');

        if (courseNameEl) courseNameEl.textContent = placedRecord.assignedCourse.name;
        if (courseCodeEl) courseCodeEl.textContent = placedRecord.assignedCourse.code ? `[${placedRecord.assignedCourse.code}]` : '';

        const courseObj = this.courses.find(c => c.id === placedRecord.assignedCourse.id);
        const teacherName = courseObj ? (courseObj.teacher || "Belirtilmemiş") : (placedRecord.assignedCourse.teacher || "Ders Öğretmeni");
        if (teacherNameEl) teacherNameEl.textContent = `👨‍🏫 Ders Öğretmeni: ${teacherName}`;

        let reason = "";
        if (typeof placedRecord.preferenceLevel === 'number') {
          reason = `${placedRecord.preferenceLevel}. tercihiniz olan bu derse başarıyla yerleştirildiniz.`;
        } else {
          reason = `Yerleştirme kriterlerine göre bu derse başarıyla atandınız (${placedRecord.preferenceLevel}).`;
        }
        if (reasonDetailEl) reasonDetailEl.textContent = reason;
      }

      // Tercih formunu tamamen kapat
      if (prefWrapper) prefWrapper.style.display = 'none';

      // Durum rozeti
      if (statusTag) {
        statusTag.className = "tag tag-success";
        statusTag.textContent = `🎯 Yerleşti: ${placedRecord.assignedCourse.name}`;
      }
    } else {
      // --- DURUM 2: HENÜZ YERLEŞMEDİ -> TERCİH SEÇİM FORMU AÇIK ---
      if (placedCard) placedCard.style.display = 'none';
      if (prefWrapper) prefWrapper.style.display = 'grid';

      const hasChoices = student.choices && student.choices.length > 0;
      if (statusTag) {
        if (hasChoices) {
          statusTag.className = "tag tag-success";
          statusTag.textContent = `Tercih Yapıldı (${student.choices.length} Tercih)`;
        } else {
          statusTag.className = "tag";
          statusTag.style.background = "#fffbeb";
          statusTag.style.color = "#d97706";
          statusTag.textContent = "Tercih Bekleniyor";
        }
      }

      // Sınıfa ait açık dersleri sınıf kısıtlamalarına göre filtrele
      const constraints = await window.dataService.getClassConstraints(student.classId);
      const classCapacities = constraints.courseCapacities || {};

      const availableCourses = this.courses.filter(c => {
        if (c.isActiveForProject === false) return false;
        return (classCapacities[c.id] || 0) > 0;
      });

      // Açık dersler listesi
      const courseListEl = document.getElementById('studentAvailableCoursesList');
      if (courseListEl) {
        if (availableCourses.length === 0) {
          courseListEl.innerHTML = '<div style="padding: 1rem; color: var(--warning); font-size: 0.85rem; font-weight: 600;">⚠️ Sınıf öğretmeniniz henüz bu sınıf için ders kontenjanı tanımlamamıştır.</div>';
        } else {
          courseListEl.innerHTML = availableCourses.map(c => `
            <div style="padding: 0.65rem 0.85rem; background: #f8fafc; border-radius: var(--radius-sm); border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>${c.name}</strong> <span style="color:var(--text-muted); font-size:0.8rem;">(${c.code})</span>
                ${c.teacher ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top:2px;">👨‍🏫 Öğretmen: ${c.teacher}</div>` : ''}
              </div>
              <span class="tag tag-secondary" style="font-size: 0.72rem; font-weight: 700;">Kontenjan: ${classCapacities[c.id]} Öğrenci</span>
            </div>
          `).join('');
        }
      }

      // 5 Tercih Seçim Kutularını Doldur
      for (let i = 1; i <= 5; i++) {
        const select = document.getElementById(`prefChoice${i}`);
        if (!select) continue;
        select.disabled = false;
        select.innerHTML = '<option value="">Ders Seçiniz...</option>';
        availableCourses.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          const teacherText = c.teacher ? ` (${c.teacher})` : '';
          opt.textContent = `${c.name} [${c.code}]${teacherText}`;
          select.appendChild(opt);
        });

        if (student.choices && student.choices[i - 1]) {
          select.value = student.choices[i - 1];
        } else {
          select.value = "";
        }
      }

      this.validateChoicesLive();
    }
  }

  validateChoicesLive() {
    const errorEl = document.getElementById('choiceValidationError');
    const btn = document.getElementById('btnSavePreferences');
    if (!btn) return true;

    const selected = [];
    let hasDuplicate = false;
    let allFilled = true;

    for (let i = 1; i <= 5; i++) {
      const select = document.getElementById(`prefChoice${i}`);
      if (!select) continue;
      const val = select.value;
      const slot = select.closest('.preference-slot');

      if (!val) {
        allFilled = false;
        if (slot) slot.classList.remove('filled');
      } else {
        if (slot) slot.classList.add('filled');
        if (selected.includes(val)) {
          hasDuplicate = true;
        } else {
          selected.push(val);
        }
      }
    }

    if (hasDuplicate) {
      if (errorEl) {
        errorEl.style.display = 'block';
        errorEl.textContent = "⚠️ Bir dersi yalnızca bir kez seçebilirsiniz! Lütfen farklı dersler seçiniz.";
      }
      btn.disabled = true;
      return false;
    } else {
      if (errorEl) errorEl.style.display = 'none';
      btn.disabled = false;
      return true;
    }
  }

  async handleSavePreferences(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (this._isSavingPrefs) return;
    this._isSavingPrefs = true;
    setTimeout(() => { this._isSavingPrefs = false; }, 1500);
    if (!this.currentStudent) return;

    // Tekrar yerleşti kontrolü
    const classResult = this.results[this.currentStudent.classId];
    if (classResult && classResult.published !== false && classResult.assignedStudents) {
      const assigned = classResult.assignedStudents.find(s => s.id === this.currentStudent.id || s.number === this.currentStudent.number);
      if (assigned && assigned.assignedCourse) {
        this.showToast("Proje dersiniz kesinleştiği için tercih ekranınız kilitlidir!", "warning");
        return;
      }
    }

    if (!this.validateChoicesLive()) return;

    const choices = [];
    for (let i = 1; i <= 5; i++) {
      const val = document.getElementById(`prefChoice${i}`).value;
      if (!val) {
        this.showToast(`Lütfen ${i}. tercihinizi de belirleyiniz! 5 tercih zorunludur.`, "warning");
        return;
      }
      choices.push(val);
    }

    try {
      const updated = await window.dataService.saveStudentChoices(this.currentStudent.id, choices);
      this.currentStudent = updated;
      await this.reloadAllData();
      await this.renderStudentView(updated);
      this.showToast("🎉 Tercihleriniz başarıyla kaydedildi! Sınıf öğretmeniniz dağıtımı tamamladığında sonucunuz bu ekranda görünecektir.", "success");
    } catch (err) {
      console.error(err);
      this.showToast("Tercihler kaydedilirken bir hata oluştu: " + err.message, "error");
    }
  }

  showToast(message, type = 'info') {
    const now = Date.now();
    // 2 saniye içinde aynı mesajın tekrar tetiklenmesini engelle
    if (this._lastToastMsg === message && (now - (this._lastToastTime || 0)) < 2000) {
      return;
    }
    this._lastToastMsg = message;
    this._lastToastTime = now;

    const container = document.getElementById('toast-container');
    if (!container) return;

    // Ekranda halihazırda aynı metne sahip açık toast varsa tekrar ekleme
    const existing = Array.from(container.querySelectorAll('.toast')).find(t => t.textContent.includes(message));
    if (existing) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span style="font-size: 1.2rem;">${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.studentApp = new StudentApp();
  window.studentApp.init();
});
