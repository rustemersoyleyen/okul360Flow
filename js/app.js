/**
 * Proje Ödevi Seçim ve Dağıtım Sistemi - Ana Kontrolcü (App Controller)
 */

class AppController {
  constructor() {
    this.currentUser = null; // { role: 'student' | 'teacher' | 'admin', data: Object }
    this.currentTeacherClass = null;
    this.classes = [];
    this.courses = [];
    this.students = [];
    this.settings = {};
    this.results = {};
  }

  async init() {
    console.log("Uygulama başlatılıyor...");
    await window.dataService.init();

    // Verileri yükle
    await this.reloadAllData();

    // Arayüzü güncelle
    this.updateNavbarHeader();
    this.updateDbStatusBadge();
    this.populateTeacherLoginClasses();

    // Check if previously logged in (session persistence)
    const savedSession = sessionStorage.getItem('active_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        if (session.role === 'student') {
          const st = this.students.find(s => s.id === session.id || s.number === session.number);
          if (st) this.showStudentView(st, false);
        } else if (session.role === 'teacher') {
          const cl = this.classes.find(c => c.id === session.classId);
          if (cl) this.showTeacherView(cl, false);
        } else if (session.role === 'admin') {
          this.showAdminView(false);
        }
      } catch (e) {
        sessionStorage.removeItem('active_session');
      }
    }
  }

  async reloadAllData() {
    this.settings = await window.dataService.getSettings();
    this.courses = await window.dataService.getCourses();
    this.classes = await window.dataService.getClasses();
    this.students = await window.dataService.getStudents();
    this.results = await window.dataService.getResults();
  }

  updateNavbarHeader() {
    if (this.settings.schoolName) {
      document.getElementById('navSchoolTitle').textContent = this.settings.schoolName;
    }
    if (this.settings.termName) {
      document.getElementById('navTermTitle').textContent = this.settings.termName + " - Proje Portalı";
    }
  }

  updateDbStatusBadge() {
    const badge = document.getElementById('dbStatusBadge');
    const text = document.getElementById('dbStatusText');
    if (window.dataService.isFirebaseReady) {
      badge.className = "badge-status active";
      text.textContent = "🔥 Firebase Firestore Aktif";
    } else {
      badge.className = "badge-status offline";
      text.textContent = "💾 Yerel Depolama (Demo Modu)";
    }
  }

  // --- Görünüm Yönetimi ---
  showView(viewId) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const logoutBtn = document.getElementById('navLogoutBtn');
    if (viewId === 'viewPortal') {
      logoutBtn.style.display = 'none';
    } else {
      logoutBtn.style.display = 'inline-flex';
    }

    // Veritabanı durumu ve ayar butonları SADECE yönetici (viewAdmin) ekranında gösterilir
    const dbStatusBadge = document.getElementById('dbStatusBadge');
    const navDbConfigBtn = document.getElementById('navDbConfigBtn');
    if (viewId === 'viewAdmin') {
      if (dbStatusBadge) dbStatusBadge.style.display = 'inline-flex';
      if (navDbConfigBtn) navDbConfigBtn.style.display = 'inline-flex';
    } else {
      if (dbStatusBadge) dbStatusBadge.style.display = 'none';
      if (navDbConfigBtn) navDbConfigBtn.style.display = 'none';
    }
  }

  showPortalView() {
    this.currentUser = null;
    sessionStorage.removeItem('active_session');
    this.showView('viewPortal');
    this.populateTeacherLoginClasses();
  }

  logout() {
    this.showPortalView();
    this.showToast("Güvenli çıkış yapıldı.", "info");
  }

  // =========================================================================
  // GİRİŞ İŞLEMLERİ (AUTH)
  // =========================================================================

  populateTeacherLoginClasses() {
    const select = document.getElementById('teacherClassSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Sınıf Seçiniz...</option>';
    this.classes.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} (${c.teacherName})`;
      select.appendChild(opt);
    });
  }

  // Öğrenci Girişi
  async handleStudentLogin(e) {
    e.preventDefault();
    const number = document.getElementById('studentNumberInput').value.trim();
    const pass = document.getElementById('studentPassInput').value.trim();

    await this.reloadAllData();
    const student = this.students.find(s => s.number === number);

    if (!student) {
      this.showToast("Bu numaraya ait öğrenci kaydı bulunamadı!", "error");
      return;
    }

    if (student.pass && student.pass !== pass) {
      this.showToast("Girdiğiniz şifre hatalı!", "error");
      return;
    }

    this.showToast(`Hoş geldin, ${student.name}!`, "success");
    this.showStudentView(student);
  }

  // Öğretmen Girişi
  async handleTeacherLogin(e) {
    e.preventDefault();
    const classId = document.getElementById('teacherClassSelect').value;
    const pass = document.getElementById('teacherPassInput').value.trim();

    if (!classId) {
      this.showToast("Lütfen bir sınıf seçiniz!", "warning");
      return;
    }

    await this.reloadAllData();
    const classObj = this.classes.find(c => c.id === classId);

    if (!classObj) {
      this.showToast("Sınıf kaydı bulunamadı!", "error");
      return;
    }

    if (classObj.teacherPass && classObj.teacherPass !== pass) {
      this.showToast("Öğretmen şifresi hatalı!", "error");
      return;
    }

    this.showToast(`Hoş geldiniz Sayın ${classObj.teacherName}! (${classObj.name})`, "success");
    this.showTeacherView(classObj);
  }

  // İdare Girişi
  async handleAdminLogin(e) {
    e.preventDefault();
    const username = document.getElementById('adminUsernameInput').value.trim();
    const pass = document.getElementById('adminPassInput').value.trim();

    const admin = window.dataService.getLocal('admin') || { username: 'admin', pass: 'admin123' };

    if (username === admin.username && pass === admin.pass) {
      this.showToast("Yönetici girişi başarılı!", "success");
      this.showAdminView();
    } else {
      this.showToast("Yönetici kullanıcı adı veya şifresi hatalı!", "error");
    }
  }

  // Hızlı doldurma test yardımcıları
  quickFillStudent(num, pass) {
    const n = document.getElementById('studentNumberInput');
    const p = document.getElementById('studentPassInput');
    if (n) { n.value = num; n.dispatchEvent(new Event('input')); }
    if (p) { p.value = pass; p.dispatchEvent(new Event('input')); }
  }

  quickFillTeacher(classId, pass) {
    const s = document.getElementById('teacherClassSelect');
    const p = document.getElementById('teacherPassInput');
    if (s) { s.value = classId; s.dispatchEvent(new Event('change')); }
    if (p) { p.value = pass; p.dispatchEvent(new Event('input')); }
  }

  quickFillAdmin(user, pass) {
    const u = document.getElementById('adminUsernameInput');
    const p = document.getElementById('adminPassInput');
    if (u) { u.value = user; u.dispatchEvent(new Event('input')); }
    if (p) { p.value = pass; p.dispatchEvent(new Event('input')); }
  }

  // =========================================================================
  // ÖĞRENCİ PANELİ
  // =========================================================================

  async showStudentView(student, saveSession = true) {
    this.currentUser = { role: 'student', data: student };
    if (saveSession) {
      sessionStorage.setItem('active_session', JSON.stringify({ role: 'student', id: student.id, number: student.number }));
    }

    this.showView('viewStudent');
    await this.renderStudentDetails(student);
  }

  async renderStudentDetails(student) {
    // Sınıf bilgisini bul
    const studentClass = this.classes.find(c => c.id === student.classId);
    const className = studentClass ? studentClass.name : "Belirsiz";
    const grade = studentClass ? studentClass.grade : "9";

    // Profil Başlığı
    document.getElementById('studentAvatar').textContent = student.name ? student.name.charAt(0).toUpperCase() : "Ö";
    document.getElementById('studentFullName').textContent = student.name;
    document.getElementById('studentTagClass').textContent = `Sınıf: ${className}`;
    document.getElementById('studentTagNumber').textContent = `No: ${student.number}`;

    const hasChoices = student.choices && student.choices.length > 0;
    const statusTag = document.getElementById('studentTagStatus');
    if (hasChoices) {
      statusTag.className = "tag tag-success";
      statusTag.textContent = "Tercih Yapıldı (" + student.choices.length + " Tercih)";
    } else {
      statusTag.className = "tag";
      statusTag.style.background = "#fffbeb";
      statusTag.style.color = "#d97706";
      statusTag.textContent = "Tercih Bekleniyor";
    }

    // Sınıfa özel belirlenen ders ve kontenjanları al
    const constraints = await window.dataService.getClassConstraints(student.classId);
    const classCapacities = constraints.courseCapacities || {};

    const availableCourses = this.courses.filter(c => {
      if (c.isActiveForProject === false) return false;
      return (classCapacities[c.id] || 0) > 0;
    });

    // Sağ taraftaki açık dersler listesi
    const courseListEl = document.getElementById('studentAvailableCoursesList');
    if (availableCourses.length === 0) {
      courseListEl.innerHTML = '<div style="padding: 1rem; color: var(--warning); font-size: 0.85rem; font-weight: 600;">⚠️ Sınıf öğretmeniniz henüz bu sınıf için ders kontenjanı tanımlamamıştır.</div>';
    } else {
      courseListEl.innerHTML = availableCourses.map(c => `
        <div style="padding: 0.6rem 0.8rem; background: #f8fafc; border-radius: var(--radius-sm); border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${c.name}</strong> (${c.code})
            ${c.teacher ? `<div style="font-size: 0.75rem; color: var(--text-muted);">Öğretmen: ${c.teacher}</div>` : ''}
          </div>
          <span class="tag tag-secondary" style="font-size: 0.72rem; font-weight: 700;">Kontenjan: ${classCapacities[c.id]} Öğrenci</span>
        </div>
      `).join('');
    }

    // 5 Tercih Seçim Kutularını Doldur
    for (let i = 1; i <= 5; i++) {
      const select = document.getElementById(`prefChoice${i}`);
      select.innerHTML = '<option value="">Ders Seçiniz...</option>';
      availableCourses.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        const teacherText = c.teacher ? ` (${c.teacher})` : '';
        opt.textContent = `${c.name} [${c.code}]${teacherText}`;
        select.appendChild(opt);
      });

      // Öğrencinin daha önceki tercihi varsa ata
      if (student.choices && student.choices[i - 1]) {
        select.value = student.choices[i - 1];
      } else {
        select.value = "";
      }
    }

    this.validateChoicesLive();

    // Dağıtım Sonucu Kontrolü (Eğer sınıf dağıtılmış ve yayınlanmışsa)
    const resultContainer = document.getElementById('studentResultContainer');
    const lockedNotice = document.getElementById('studentLockedNotice');
    const btnSave = document.getElementById('btnSavePreferences');
    const choiceDesc = document.getElementById('studentChoiceDesc');
    const classResult = this.results[student.classId];

    let isPlaced = false;
    let assigned = null;

    if (classResult && classResult.published !== false && classResult.assignedStudents) {
      assigned = classResult.assignedStudents.find(s => s.id === student.id || s.number === student.number);
      if (assigned && assigned.assignedCourse) {
        isPlaced = true;
      }
    }

    if (isPlaced && assigned) {
      if (resultContainer) {
        resultContainer.style.display = 'block';
        document.getElementById('studentResultCourse').textContent = assigned.assignedCourse.name;
        
        const courseObj = this.courses.find(c => c.id === assigned.assignedCourse.id);
        const teacherName = courseObj ? (courseObj.teacher || "Belirtilmemiş") : (assigned.assignedCourse.teacher || "Ders Öğretmeni");
        document.getElementById('studentResultTeacher').textContent = `Ders Öğretmeni: ${teacherName}`;
        
        let reasonText = "";
        if (typeof assigned.preferenceLevel === 'number') {
          reasonText = `${assigned.preferenceLevel}. tercihiniz olan bu derse başarıyla yerleştirildiniz.`;
        } else {
          reasonText = `Yerleştirme kriterlerine göre bu derse başarıyla atandınız (${assigned.preferenceLevel}).`;
        }
        document.getElementById('studentResultDetail').textContent = reasonText;
      }

      if (lockedNotice) lockedNotice.style.display = 'flex';
      if (choiceDesc) choiceDesc.textContent = "Proje ödevi yerleştirmeniz tamamlandığı için tercih ekranınız kilitlenmiştir. Tekrar tercih yapılamaz.";
      if (btnSave) {
        btnSave.style.display = 'none';
        btnSave.disabled = true;
      }
      const prefForm = document.getElementById('studentPreferencesForm');
      if (prefForm) prefForm.style.display = 'none';

      // Seçim kutularını kilitli (disabled) yap
      for (let i = 1; i <= 5; i++) {
        const select = document.getElementById(`prefChoice${i}`);
        if (select) select.disabled = true;
      }

      // Durum etiketini güncelle
      statusTag.className = "tag tag-success";
      statusTag.textContent = `🎯 Yerleşti: ${assigned.assignedCourse.name}`;
    } else {
      if (resultContainer) resultContainer.style.display = 'none';
      if (lockedNotice) lockedNotice.style.display = 'none';
      if (choiceDesc) choiceDesc.textContent = "1. tercihten başlayarak en çok istediğiniz dersleri sırayla seçiniz. Aynı dersi birden fazla kez seçemezsiniz.";
      if (btnSave) {
        btnSave.style.display = 'inline-flex';
        btnSave.disabled = false;
      }
      const prefForm = document.getElementById('studentPreferencesForm');
      if (prefForm) prefForm.style.display = 'block';

      // Seçim kutularını aktif yap
      for (let i = 1; i <= 5; i++) {
        const select = document.getElementById(`prefChoice${i}`);
        if (select) select.disabled = false;
      }
    }
  }

  validateChoicesLive() {
    const errorEl = document.getElementById('choiceValidationError');
    const btn = document.getElementById('btnSavePreferences');
    const selected = [];
    let hasDuplicate = false;
    let allFilled = true;

    for (let i = 1; i <= 5; i++) {
      const val = document.getElementById(`prefChoice${i}`).value;
      const slot = document.getElementById(`prefChoice${i}`).closest('.preference-slot');

      if (!val) {
        allFilled = false;
        slot.classList.remove('filled');
      } else {
        slot.classList.add('filled');
        if (selected.includes(val)) {
          hasDuplicate = true;
        } else {
          selected.push(val);
        }
      }
    }

    if (hasDuplicate) {
      errorEl.style.display = 'block';
      errorEl.textContent = "⚠️ Bir dersi yalnızca bir kez seçebilirsiniz! Lütfen farklı dersler seçiniz.";
      btn.disabled = true;
      return false;
    } else {
      errorEl.style.display = 'none';
      btn.disabled = false;
      return true;
    }
  }

  async handleSavePreferences(e) {
    e.preventDefault();
    if (!this.currentUser || this.currentUser.role !== 'student') return;
    const student = this.currentUser.data;

    // Dağıtım yapılmış ve yerleşmişse tercih formu kilitlidir
    const classResult = this.results[student.classId];
    if (classResult && classResult.published !== false && classResult.assignedStudents) {
      const assigned = classResult.assignedStudents.find(s => s.id === student.id || s.number === student.number);
      if (assigned && assigned.assignedCourse) {
        this.showToast("Proje dersi yerleştirmeniz yapıldığı için tercihleriniz kilitlidir, değiştirilemez!", "warning");
        return;
      }
    }

    if (!this.validateChoicesLive()) {
      return;
    }

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
      const updated = await window.dataService.saveStudentChoices(this.currentUser.data.id, choices);
      this.currentUser.data = updated;
      await this.reloadAllData();
      this.renderStudentDetails(updated);
      this.showToast("🎉 Tercihleriniz başarıyla kaydedildi!", "success");
    } catch (err) {
      console.error(err);
      this.showToast("Tercihler kaydedilirken bir hata oluştu: " + err.message, "error");
    }
  }

  // =========================================================================
  // SINIF ÖĞRETMENİ PANELİ
  // =========================================================================

  showTeacherView(classObj, saveSession = true) {
    this.currentUser = { role: 'teacher', data: classObj };
    this.currentTeacherClass = classObj;
    if (saveSession) {
      sessionStorage.setItem('active_session', JSON.stringify({ role: 'teacher', classId: classObj.id }));
    }

    this.showView('viewTeacher');
    this.renderTeacherView(classObj);
  }

  async refreshTeacherView() {
    await this.reloadAllData();
    const cl = this.classes.find(c => c.id === this.currentTeacherClass.id);
    if (cl) {
      this.currentTeacherClass = cl;
      this.renderTeacherView(cl);
      this.showToast("Sınıf verileri yenilendi.", "info");
    }
  }

  switchTeacherTab(tabId, btn) {
    document.querySelectorAll('#viewTeacher .tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('#viewTeacher .tab-btn').forEach(b => b.classList.remove('active'));

    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');
    if (btn) btn.classList.add('active');
  }

  async renderTeacherView(classObj) {
    document.getElementById('teacherClassTitle').textContent = `${classObj.name} Sınıfı Proje Yönetimi`;
    document.getElementById('teacherNameTag').textContent = `Rehber Öğretmen: ${classObj.teacherName}`;

    // Sınıf öğrencilerini filtrele
    const classStudents = this.students.filter(s => s.classId === classObj.id);
    const submittedCount = classStudents.filter(s => s.choices && s.choices.length > 0).length;

    document.getElementById('teacherStudentCountTag').textContent = `${classStudents.length} Öğrenci`;
    document.getElementById('teacherSubmittedCountTag').textContent = `${submittedCount} Tercih Yapıldı`;

    // 1. Sekme: Öğrenci Tercih Tablosu
    this.renderTeacherStudentsTable(classStudents);

    // 2. Sekme: Sınıf Kısıtları & Kontenjan Ayarları
    await this.renderTeacherConstraintsForm(classObj);

    // 3. Sekme: Sonuçlar (Varsa)
    this.renderTeacherResultsView(classObj);
  }

  renderTeacherStudentsTable(classStudents) {
    const tbody = document.getElementById('teacherStudentsTableBody');
    tbody.innerHTML = '';

    if (classStudents.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">Bu sınıfa henüz öğrenci kaydı yapılmamış.</td></tr>`;
      return;
    }

    const courseMap = {};
    this.courses.forEach(c => courseMap[c.id] = c.name);

    classStudents.forEach(st => {
      const tr = document.createElement('tr');
      const hasChoices = st.choices && st.choices.length > 0;

      let choicesBadges = '';
      if (hasChoices) {
        choicesBadges = st.choices.map((cId, idx) => {
          const name = courseMap[cId] || cId;
          const cls = idx === 0 ? 'c1' : (idx === 1 ? 'c2' : 'c3');
          return `<td><span class="choice-pill ${cls}">${idx + 1}. ${name}</span></td>`;
        }).join('');
      } else {
        choicesBadges = `<td colspan="5" style="color: var(--danger); font-size: 0.82rem; font-weight: 600;">Tercih Bildirmedi</td>`;
      }

      tr.innerHTML = `
        <td><strong>${st.number}</strong></td>
        <td><strong>${st.name}</strong></td>
        ${choicesBadges}
        <td>
          ${hasChoices 
            ? `<span class="tag tag-success">Hazır</span>` 
            : `<span class="tag" style="background:#fee2e2; color:#b91c1c;">Eksik</span>`
          }
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  async renderTeacherConstraintsForm(classObj) {
    const constraints = await window.dataService.getClassConstraints(classObj.id);

    // Kaynak sınıf kopyalama seçeneklerini doldur
    const copySelect = document.getElementById('teacherCopyClassSelect');
    if (copySelect) {
      copySelect.innerHTML = '<option value="">Kaynak Sınıfı Seçiniz...</option>';
      this.classes.filter(c => c.id !== classObj.id).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.teacherName || 'Öğretmen'})`;
        copySelect.appendChild(opt);
      });
    }

    // Öncelik kuralı
    document.getElementById('constraintPriorityRule').value = constraints.priorityRule || 'random_fair';
    document.getElementById('constraintAutoFill').checked = constraints.autoFillRemaining !== false;

    // Ders bazında kontenjan kutucukları (Okul Ders Havuzundaki TÜM dersler)
    const grid = document.getElementById('teacherCourseCapacitiesGrid');
    grid.innerHTML = '';

    const classCapacities = constraints.courseCapacities || {};

    this.courses.forEach(c => {
      const isCourseActive = c.isActiveForProject !== false;
      const currentCap = (classCapacities[c.id] !== undefined)
        ? classCapacities[c.id]
        : 0; // Sınıf bazlı kontenjan - varsayılan 0

      const isClassCourseActive = currentCap > 0;

      const div = document.createElement('div');
      div.className = "form-group";
      div.id = `card_course_${c.id}`;
      div.style.background = isClassCourseActive ? "#f0fdf4" : "#f8fafc";
      div.style.padding = "0.85rem";
      div.style.borderRadius = "var(--radius-sm)";
      div.style.border = isClassCourseActive ? "1.5px solid #86efac" : "1px solid var(--border)";

      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.35rem;">
          <label for="cap_${c.id}" style="font-weight: 700; color: var(--text-main); font-size: 0.9rem;">
            ${c.name}
          </label>
          <span class="tag" id="tag_${c.id}" style="font-size: 0.7rem; font-weight: 700; ${isClassCourseActive ? 'background:#dcfce7; color:#15803d;' : 'background:#f1f5f9; color:#64748b;'}">
            ${isClassCourseActive ? 'Açık' : 'Kapalı'}
          </span>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.4rem;">
          Kod: <strong>${c.code}</strong> | Öğretmen: ${c.teacher || 'Belirtilmemiş'}
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted);">Kontenjan:</label>
          <input type="number" id="cap_${c.id}" class="form-control teacher-course-cap-input" 
                 data-course-id="${c.id}" value="${currentCap}" min="0" max="40" style="font-weight: 800; max-width: 80px;"
                 oninput="app.updateCourseCardState('${c.id}', this.value)">
          <span style="font-size: 0.8rem; color: var(--text-muted);">öğrenci</span>
        </div>
      `;
      grid.appendChild(div);
    });
  }

  async handleSaveTeacherConstraints(e) {
    e.preventDefault();
    if (!this.currentTeacherClass) return;

    const classId = this.currentTeacherClass.id;
    const priorityRule = document.getElementById('constraintPriorityRule').value;
    const autoFillRemaining = document.getElementById('constraintAutoFill').checked;

    const courseCapacities = {};
    document.querySelectorAll('.teacher-course-cap-input').forEach(inp => {
      const cId = inp.dataset.courseId;
      courseCapacities[cId] = parseInt(inp.value, 10) || 0;
    });

    const newConstraints = {
      priorityRule,
      autoFillRemaining,
      courseCapacities
    };

    try {
      await window.dataService.saveClassConstraints(classId, newConstraints);
      this.showToast("Sınıf kısıtlama ve kontenjan ayarları kaydedildi!", "success");
    } catch (err) {
      console.error(err);
      this.showToast("Kaydedilirken hata oluştu: " + err.message, "error");
    }
  }

  // --- Akıllı Dağıtımı Çalıştırma ---
  async runDistributionForCurrentClass() {
    if (!this.currentTeacherClass) return;
    const classId = this.currentTeacherClass.id;

    // Verileri taze al
    await this.reloadAllData();
    const classStudents = this.students.filter(s => s.classId === classId);
    
    if (classStudents.length === 0) {
      this.showToast("Sınıfta öğrenci bulunmuyor!", "warning");
      return;
    }

    const constraints = await window.dataService.getClassConstraints(classId);

    // Yalnızca bu sınıfta kontenjan verilmiş (>0) dersler dağıtıma dahil edilir
    const classCapacities = constraints.courseCapacities || {};
    const availableCourses = this.courses.filter(c => (classCapacities[c.id] || 0) > 0);

    if (availableCourses.length === 0) {
      this.showToast("Bu sınıf için henüz hiçbir derse kontenjan verilmemiş! Lütfen 2. sekmeden ders kontenjanlarını belirleyiniz.", "warning");
      return;
    }

    // Konsol alanını aç
    const consoleEl = document.getElementById('distributionConsole');
    consoleEl.style.display = 'block';
    consoleEl.innerHTML = '';

    // Algoritmayı çalıştır
    const engine = new ProjectDistributionAlgorithm({
      students: classStudents,
      courses: availableCourses,
      constraints
    });

    const result = engine.distribute();

    // Animasyonlu konsol logları
    let logIndex = 0;
    const interval = setInterval(() => {
      if (logIndex < result.logs.length) {
        const log = result.logs[logIndex];
        const line = document.createElement('div');
        line.className = `console-line ${log.type}`;
        line.innerHTML = `<span class="time">[${log.time}]</span> <span>${log.message}</span>`;
        consoleEl.appendChild(line);
        consoleEl.scrollTop = consoleEl.scrollHeight;
        logIndex++;
      } else {
        clearInterval(interval);
        // Dağıtım verisini kalıcı kaydet
        this.saveAndRenderDistributionResult(classId, result);
      }
    }, 40); // 40ms aralıklarla canlı aksiyon hissi
  }

  async saveAndRenderDistributionResult(classId, result) {
    try {
      const savedResult = await window.dataService.saveClassDistributionResult(classId, result);
      await this.reloadAllData();
      this.renderTeacherResultsView(this.currentTeacherClass);
      this.showToast("🎉 Dağıtım başarıyla tamamlandı ve kaydedildi!", "success");
    } catch (err) {
      console.error(err);
      this.showToast("Sonuç kaydedilirken hata oluştu: " + err.message, "error");
    }
  }

  renderTeacherResultsView(classObj) {
    const classResult = this.results[classObj.id];
    const statsSection = document.getElementById('distributionStatsSection');

    if (!classResult || !classResult.assignedStudents) {
      statsSection.style.display = 'none';
      return;
    }

    statsSection.style.display = 'block';

    // İstatistikler
    const totalStudents = classResult.totalStudents || (classResult.assignedStudents.length + (classResult.unassignedStudents || []).length);
    document.getElementById('statTotalAssigned').textContent = `${classResult.assignedStudents.length} / ${totalStudents}`;
    
    const prefDist = classResult.preferenceDistribution || {};
    document.getElementById('statFirstChoiceCount').textContent = prefDist.firstChoice || 0;
    
    const otherChoices = (prefDist.secondChoice || 0) + (prefDist.thirdChoice || 0) + (prefDist.fourthChoice || 0) + (prefDist.fifthChoice || 0) + (prefDist.automatic || 0);
    document.getElementById('statOtherChoicesCount').textContent = otherChoices;
    
    const unassignedCount = (classResult.unassignedStudents || []).length;
    document.getElementById('statUnassignedCount').textContent = unassignedCount;

    // Açıkta kalanlar için belirgin uyarı bannerı
    const banner = document.getElementById('unassignedAlertBanner');
    if (banner) {
      if (unassignedCount > 0) {
        banner.style.display = 'block';
        banner.innerHTML = `⚠️ <strong>DİKKAT:</strong> Bu sınıfta seçtiği 5 derse de kontenjan yetersizliği nedeniyle yerleşemeyen <strong>${unassignedCount} öğrenci</strong> bulunmaktadır! Zoraki atama yapılmamıştır. Aşağıdaki listeden açılır kutuyu kullanarak bu öğrencilere manuel ders atayabilir veya ilgili derslerin kontenjanını artırabilirsiniz.`;
      } else {
        banner.style.display = 'none';
      }
    }

    // Yayın durumu toggle
    document.getElementById('togglePublishResults').checked = classResult.published !== false;

    // Sonuç tablosunu çiz
    const tbody = document.getElementById('resultsTableBody');
    tbody.innerHTML = '';

    const allRows = [...classResult.assignedStudents];
    if (classResult.unassignedStudents) {
      allRows.push(...classResult.unassignedStudents);
    }

    // Numaraya göre sırala
    allRows.sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));

    allRows.forEach(s => {
      const tr = document.createElement('tr');
      const isAssigned = s.assigned && s.assignedCourse;

      let reasonBadge = '';
      if (!isAssigned) {
        reasonBadge = `<span class="tag" style="background:#fee2e2; color:#b91c1c;">Yerleşemedi</span>`;
      } else if (typeof s.preferenceLevel === 'number') {
        reasonBadge = `<span class="tag tag-success">${s.preferenceLevel}. Tercihi</span>`;
      } else {
        reasonBadge = `<span class="tag tag-secondary">${s.preferenceLevel || 'Otomatik'}</span>`;
      }

      // Manuel düzenleme için ders seçenekleri
      let courseOptions = `<option value="">Seçim yok (Açıkta)</option>`;
      this.courses.forEach(c => {
        const isSelected = isAssigned && s.assignedCourse.id === c.id;
        courseOptions += `<option value="${c.id}" ${isSelected ? 'selected' : ''}>${c.name}</option>`;
      });

      const courseObj = isAssigned ? this.courses.find(c => c.id === s.assignedCourse.id) : null;
      const teacherName = courseObj ? (courseObj.teacher || '-') : '-';

      tr.innerHTML = `
        <td><strong>${s.number}</strong></td>
        <td><strong>${s.name}</strong></td>
        <td>
          <span style="font-weight: 700; color: ${isAssigned ? 'var(--primary)' : 'var(--danger)'}">
            ${isAssigned ? s.assignedCourse.name : 'Açıkta Kaldı'}
          </span>
        </td>
        <td>${reasonBadge}</td>
        <td>${teacherName}</td>
        <td>
          <select class="form-control" style="padding: 0.3rem 0.5rem; font-size: 0.8rem; width: auto;"
                  onchange="app.handleManualOverrideResult('${classObj.id}', '${s.id}', this.value)">
            ${courseOptions}
          </select>
        </td>
        <td>
          <button type="button" class="btn btn-outline btn-sm" style="padding: 0.25rem 0.6rem; font-size: 0.75rem; font-weight: 700; color: var(--primary); border-color: var(--primary);"
                  onclick="app.printSingleOfficialForm('${classObj.id}', '${s.id}')" title="Bu ogrencinin resmi proje secim dilekcesini yazdir">
            📄 Form Yazdir
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  async handleManualOverrideResult(classId, studentId, newCourseId) {
    const classResult = this.results[classId];
    if (!classResult) return;

    let student = (classResult.assignedStudents || []).find(s => s.id === studentId);
    let wasUnassigned = false;

    if (!student) {
      student = (classResult.unassignedStudents || []).find(s => s.id === studentId);
      wasUnassigned = true;
    }

    if (!student) return;

    if (!newCourseId) {
      // Açıkta kaldı yap
      if (!wasUnassigned) {
        classResult.assignedStudents = classResult.assignedStudents.filter(s => s.id !== studentId);
        student.assigned = false;
        student.assignedCourse = null;
        student.preferenceLevel = "Manuel Açıkta Bırakıldı";
        classResult.unassignedStudents = classResult.unassignedStudents || [];
        classResult.unassignedStudents.push(student);
      }
    } else {
      const course = this.courses.find(c => c.id === newCourseId);
      student.assigned = true;
      student.assignedCourse = { id: course.id, name: course.name, code: course.code };
      student.preferenceLevel = "Manuel Öğretmen Ataması";

      if (wasUnassigned) {
        classResult.unassignedStudents = classResult.unassignedStudents.filter(s => s.id !== studentId);
        classResult.assignedStudents.push(student);
      }
    }

    await window.dataService.saveClassDistributionResult(classId, classResult);
    await this.reloadAllData();
    this.renderTeacherResultsView(this.currentTeacherClass);
    this.showToast(`${student.name} için atama güncellendi!`, "info");
  }

  async handleTogglePublishResults(published) {
    if (!this.currentTeacherClass) return;
    const classId = this.currentTeacherClass.id;
    await window.dataService.toggleResultPublish(classId, published);
    await this.reloadAllData();
    this.showToast(published ? "Sonuçlar öğrencilerin görünümüne açıldı!" : "Sonuçlar öğrencilerden gizlendi.", "info");
  }

  // Sınıf Dağıtımını İptal Et (Hiç olmamış gibi kabul edilir)
  async handleCancelClassDistribution() {
    if (!this.currentTeacherClass) return;
    const classId = this.currentTeacherClass.id;
    const className = this.currentTeacherClass.name;

    const confirmed = confirm(
      `⚠️ DİKKAT!\n\n"${className}" sınıfına ait yapılmış olan proje ödevi dağıtımını tamamen İPTAL etmek istediğinize emin misiniz?\n\n` +
      `• Bu işlem sonucunda yapılan tüm yerleştirmeler sıfırlanacaktır.\n` +
      `• Dağıtım hiç yapılmamış gibi kabul edilecek ve öğrencilerin tercih formları tekrar açılacaktır.\n\n` +
      `İptal işlemini onaylıyor musunuz?`
    );

    if (!confirmed) return;

    try {
      await window.dataService.cancelClassDistribution(classId);
      await this.reloadAllData();

      const cl = this.classes.find(c => c.id === classId);
      if (cl) this.currentTeacherClass = cl;

      const consoleEl = document.getElementById('distributionConsole');
      if (consoleEl) {
        consoleEl.style.display = 'none';
        consoleEl.innerHTML = '';
      }

      // Sonuç panelini ve istatistikleri sıfırla
      this.renderTeacherView(this.currentTeacherClass);

      // İlk sekmeye (Öğrenci Tercihleri) geçiş yap
      const tabBtn = document.querySelector('#viewTeacher .tab-btn:first-child');
      this.switchTeacherTab('tabTeacherStudents', tabBtn);

      this.showToast(`"${className}" sınıfının dağıtımı başarıyla iptal edildi! Tercih formları yeniden açıldı.`, "info");
    } catch (err) {
      console.error("Dağıtım iptal hatası:", err);
      this.showToast("Dağıtım iptal edilirken hata oluştu: " + err.message, "error");
    }
  }

  exportTeacherStudentsTableCSV() {
    if (!this.currentTeacherClass) return;
    const classStudents = this.students.filter(s => s.classId === this.currentTeacherClass.id);
    const courseMap = {};
    this.courses.forEach(c => courseMap[c.id] = c.name);

    let csvContent = "\uFEFFNumara;Ad Soyad;1. Tercih;2. Tercih;3. Tercih;4. Tercih;5. Tercih;Basvuru Tarihi\n";

    classStudents.forEach(s => {
      const c1 = (s.choices && courseMap[s.choices[0]]) || '-';
      const c2 = (s.choices && courseMap[s.choices[1]]) || '-';
      const c3 = (s.choices && courseMap[s.choices[2]]) || '-';
      const c4 = (s.choices && courseMap[s.choices[3]]) || '-';
      const c5 = (s.choices && courseMap[s.choices[4]]) || '-';
      const date = s.submitDate ? new Date(s.submitDate).toLocaleString('tr-TR') : '-';

      csvContent += `${s.number};${s.name};${c1};${c2};${c3};${c4};${c5};${date}\n`;
    });

    this.downloadFile(csvContent, `${this.currentTeacherClass.name}_Ogrenci_Tercihleri.csv`, 'text/csv;charset=utf-8;');
  }

  exportResultsToExcel() {
    if (!this.currentTeacherClass) return;
    const classResult = this.results[this.currentTeacherClass.id];
    if (!classResult || !classResult.assignedStudents) {
      this.showToast("İndirilecek dağıtım sonucu bulunamadı!", "warning");
      return;
    }

    let csvContent = "\uFEFFNumara;Ad Soyad;Sınıf;Yerleştiği Ders;Ders Kodu;Öğretmen;Yerleşme Şekli\n";

    const all = [...classResult.assignedStudents, ...(classResult.unassignedStudents || [])];
    all.sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));

    all.forEach(s => {
      const courseName = s.assignedCourse ? s.assignedCourse.name : 'Açıkta';
      const courseCode = s.assignedCourse ? s.assignedCourse.code : '-';
      const courseObj = s.assignedCourse ? this.courses.find(c => c.id === s.assignedCourse.id) : null;
      const teacher = courseObj ? (courseObj.teacher || '-') : '-';
      const reason = s.assigned ? (typeof s.preferenceLevel === 'number' ? `${s.preferenceLevel}. Tercih` : s.preferenceLevel) : 'Açıkta';

      csvContent += `${s.number};${s.name};${this.currentTeacherClass.name};${courseName};${courseCode};${teacher};${reason}\n`;
    });

    this.downloadFile(csvContent, `${this.currentTeacherClass.name}_Proje_Dagitim_Sonuclari.csv`, 'text/csv;charset=utf-8;');
  }

  // =========================================================================
  // İDARE / YÖNETİCİ PANELİ
  // =========================================================================

  showAdminView(saveSession = true) {
    this.currentUser = { role: 'admin', data: { username: 'admin' } };
    if (saveSession) {
      sessionStorage.setItem('active_session', JSON.stringify({ role: 'admin' }));
    }

    this.showView('viewAdmin');
    this.renderAdminView();
  }

  async refreshAdminView() {
    await this.reloadAllData();
    this.renderAdminView();
    this.showToast("İdare verileri yenilendi.", "info");
  }

  switchAdminTab(tabId, btn) {
    document.querySelectorAll('#viewAdmin .tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('#viewAdmin .tab-btn').forEach(b => b.classList.remove('active'));

    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');
    if (btn) btn.classList.add('active');
  }

  renderAdminView() {
    // Üst Bilgi Rozetleri
    document.getElementById('adminActiveSchoolTag').textContent = `Okul: ${this.settings.schoolName || 'Okul'}`;
    document.getElementById('adminTotalStudentTag').textContent = `Toplam ${this.students.length} Öğrenci`;

    const distributedClassCount = this.classes.filter(c => this.results[c.id] && this.results[c.id].assignedStudents).length;
    document.getElementById('adminCompletedClassesTag').textContent = `Dağıtılan Sınıflar: ${distributedClassCount} / ${this.classes.length}`;

    // Sekmeler
    this.renderAdminClassesTable();
    this.renderAdminClassCoursesTab();
    this.renderAdminCoursesTable();
    this.renderAdminStudentsTable();
    this.renderAdminSettingsForm();
  }

  // 1. Sınıflar Sekmesi
  renderAdminClassesTable() {
    const tbody = document.getElementById('adminClassesTableBody');
    tbody.innerHTML = '';

    this.classes.forEach(cl => {
      const tr = document.createElement('tr');
      const studentCount = this.students.filter(s => s.classId === cl.id).length;
      const submittedCount = this.students.filter(s => s.classId === cl.id && s.choices && s.choices.length > 0).length;
      const isDist = !!(this.results[cl.id] && this.results[cl.id].assignedStudents);

      tr.innerHTML = `
        <td><strong>${cl.name}</strong></td>
        <td>${cl.grade}. Sınıf</td>
        <td>${cl.teacherName || '-'}</td>
        <td><code>${cl.teacherPass || '1234'}</code></td>
        <td>${studentCount}</td>
        <td><span class="tag tag-secondary">${submittedCount} / ${studentCount}</span></td>
        <td>
          ${isDist 
            ? `<span class="tag tag-success">✓ Dağıtıldı</span>` 
            : `<span class="tag" style="background:#f1f5f9; color:#64748b;">Bekliyor</span>`
          }
        </td>
        <td>
          <button class="btn btn-outline btn-sm" style="font-weight: 700; color: var(--primary); border-color: var(--primary);" onclick="app.adminGoToClassCourses('${cl.id}')" title="Bu sınıfın derslerini ve kontenjanlarını belirleyin">
            🎯 Ders & Kontenjan Ayarla
          </button>
          <button class="btn btn-outline btn-sm" onclick="app.showTeacherViewFromAdmin('${cl.id}')">
            👨‍🏫 Sınıf Paneline Git
          </button>
          <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: #fca5a5;" onclick="app.deleteClass('${cl.id}')">
            Sil
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  showTeacherViewFromAdmin(classId) {
    const cl = this.classes.find(c => c.id === classId);
    if (cl) {
      this.showTeacherView(cl, false);
      this.showToast(`${cl.name} öğretmen ekranına yönetici olarak geçildi.`, "info");
    }
  }

  async deleteClass(classId) {
    if (!confirm("Bu sınıfı silmek istediğinize emin misiniz? Sınıfa bağlı kayıtlar da silinecektir.")) return;
    await window.dataService.deleteClass(classId);
    await this.reloadAllData();
    this.renderAdminView();
    this.showToast("Sınıf hem yerelden hem veritabanından başarıyla silindi.", "info");
  }

  // 2. Dersler Sekmesi
  renderAdminCoursesTable() {
    const tbody = document.getElementById('adminCoursesTableBody');
    tbody.innerHTML = '';

    this.courses.forEach(c => {
      const tr = document.createElement('tr');
      const gradesText = (c.targetGrades && c.targetGrades.length > 0) ? c.targetGrades.join(', ') + '. Sınıflar' : 'Tüm Kademeler';
      const isActive = c.isActiveForProject !== false;

      tr.innerHTML = `
        <td><code>${c.code}</code></td>
        <td><strong>${c.name}</strong></td>
        <td>${c.teacher || '-'}</td>
        <td>${c.defaultCapacity || 5} Kişi</td>
        <td><span class="tag tag-secondary">${gradesText}</span></td>
        <td>
          <button class="btn btn-sm" style="${isActive ? 'background:#ecfdf5; color:#047857; border:1px solid #a7f3d0;' : 'background:#fef2f2; color:#b91c1c; border:1px solid #fecaca;'}"
                  onclick="app.toggleCourseProjectStatus('${c.id}')" title="Tıklayarak proje durumunu değiştirin">
            ${isActive ? '✓ Proje Açık' : '⛔ Proje Verilmez'}
          </button>
        </td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="app.openEditCourseModal('${c.id}')" title="Dersi Düzenle">
            ✏️ Düzenle
          </button>
          <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: #fca5a5;" onclick="app.deleteCourse('${c.id}')">
            Sil
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  async toggleCourseProjectStatus(courseId) {
    const course = this.courses.find(c => c.id === courseId);
    if (!course) return;
    course.isActiveForProject = course.isActiveForProject === false ? true : false;
    await window.dataService.saveCourses(this.courses);
    await this.reloadAllData();
    this.renderAdminCoursesTable();
    this.showToast(`"${course.name}" dersi proje durumu güncellendi: ${course.isActiveForProject ? 'AÇIK' : 'KAPALI (Seçilemez)'}`, "info");
  }

  async deleteCourse(courseId) {
    if (!confirm("Bu dersi silmek istediğinize emin misiniz?")) return;
    await window.dataService.deleteCourse(courseId);
    await this.reloadAllData();
    this.renderAdminCoursesTable();
    this.showToast("Ders silindi.", "info");
  }

  async handleClearAllCourses() {
    if (!confirm("Tüm dersleri kalıcı olarak silmek istediğinize emin misiniz? (Kendi ders listenizi sıfırdan girmek için)")) return;
    this.showToast("Dersler temizleniyor...", "info");
    this.courses = [];
    await window.dataService.saveCourses([]);
    if (window.dataService.isFirebaseReady) {
      try {
        const cSnap = await window.dataService.db.collection('courses').get();
        for (const doc of cSnap.docs) {
          await doc.ref.delete();
        }
      } catch (e) {
        console.error("Firebase clear courses hatası:", e);
      }
    }
    await this.reloadAllData();
    this.renderAdminCoursesTable();
    this.showToast("Tüm dersler temizlendi. Artık yeni derslerinizi tek tek veya toplu olarak ekleyebilirsiniz.", "success");
  }

  // 3. Öğrenciler Sekmesi
  renderAdminStudentsTable(filteredList = null) {
    const tbody = document.getElementById('adminStudentsTableBody');
    tbody.innerHTML = '';

    const list = filteredList || this.students;
    const classMap = {};
    this.classes.forEach(c => classMap[c.id] = c.name);

    // Filtre seçeneklerini güncelle
    const classFilter = document.getElementById('adminStudentClassFilter');
    if (classFilter && classFilter.children.length <= 1) {
      this.classes.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        classFilter.appendChild(opt);
      });
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Kayıt bulunamadı.</td></tr>`;
      return;
    }

    list.forEach(st => {
      const tr = document.createElement('tr');
      const hasChoices = st.choices && st.choices.length > 0;

      tr.innerHTML = `
        <td><strong>${st.number}</strong></td>
        <td><strong>${st.name}</strong></td>
        <td>${classMap[st.classId] || st.classId}</td>
        <td><code>${st.pass || st.number}</code></td>
        <td>
          ${hasChoices 
            ? `<span class="tag tag-success">5 Tercih Yapıldı</span>` 
            : `<span class="tag" style="background:#fee2e2; color:#b91c1c;">Yapılmadı</span>`
          }
        </td>
        <td>
          <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: #fca5a5;" onclick="app.deleteStudent('${st.id}')">
            Sil
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  filterAdminStudentsTable() {
    const q = document.getElementById('adminStudentSearchInput').value.toLowerCase().trim();
    const classId = document.getElementById('adminStudentClassFilter').value;

    let filtered = [...this.students];
    if (classId) {
      filtered = filtered.filter(s => s.classId === classId);
    }
    if (q) {
      filtered = filtered.filter(s => 
        (s.name && s.name.toLowerCase().includes(q)) || 
        (s.number && s.number.toLowerCase().includes(q))
      );
    }

    this.renderAdminStudentsTable(filtered);
  }

  async deleteStudent(studentId) {
    if (!confirm("Bu öğrenciyi silmek istediğinize emin misiniz?")) return;
    await window.dataService.deleteStudent(studentId);
    await this.reloadAllData();
    this.filterAdminStudentsTable();
    this.showToast("Öğrenci hem yerelden hem veritabanından silindi.", "info");
  }

  async handleClearAllSchoolData() {
    const confirmed = confirm(
      "DİKKAT: Tüm demo sınıfları, öğrencileri ve yapılmış tüm tercih/dağıtım sonuçlarını kalıcı olarak silmek üzeresiniz!\n\n" +
      "Bu işlem veritabanınızı temizler, böylece kendi okulunuzun sınıflarını ve öğrencilerini sıfırdan ekleyebilirsiniz.\n\n" +
      "(Ders listesi şablon olarak korunacaktır)\n\n" +
      "Temizleme işlemini onaylıyor musunuz?"
    );
    if (!confirmed) return;

    this.showToast("Tüm sınıf ve öğrenci verileri temizleniyor...", "info");
    await window.dataService.clearAllSchoolData(true);
    await this.reloadAllData();
    this.renderAdminView();
    this.showToast("✨ Veritabanı başarıyla sıfırlandı! Artık kendi sınıflarınızı ve öğrencilerinizi ekleyebilirsiniz.", "success");
  }

  // 4. Sistem Ayarları Sekmesi
  renderAdminSettingsForm() {
    document.getElementById('settingSchoolName').value = this.settings.schoolName || '';
    document.getElementById('settingTermName').value = this.settings.termName || '';
    document.getElementById('settingStartDate').value = this.settings.startDate || '';
    document.getElementById('settingEndDate').value = this.settings.endDate || '';
    document.getElementById('settingAnnouncement').value = this.settings.announcement || '';
  }

  async handleSaveGeneralSettings(e) {
    e.preventDefault();
    const newSettings = {
      ...this.settings,
      schoolName: document.getElementById('settingSchoolName').value.trim(),
      termName: document.getElementById('settingTermName').value.trim(),
      startDate: document.getElementById('settingStartDate').value,
      endDate: document.getElementById('settingEndDate').value,
      announcement: document.getElementById('settingAnnouncement').value.trim()
    };

    try {
      await window.dataService.saveSettings(newSettings);
      await this.reloadAllData();
      this.updateNavbarHeader();
      this.showToast("Sistem ve okul ayarları başarıyla kaydedildi!", "success");
    } catch (err) {
      console.error(err);
      this.showToast("Ayarlar kaydedilemedi: " + err.message, "error");
    }
  }

  // =========================================================================
  // MODALLAR VE EKLEME İŞLEMLERİ
  // =========================================================================

  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
  }

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
  }

  openFirebaseModal() {
    const cfg = window.dataService.getFirebaseConfig() || {};
    document.getElementById('fbApiKey').value = cfg.apiKey || '';
    document.getElementById('fbProjectId').value = cfg.projectId || '';
    document.getElementById('fbAuthDomain').value = cfg.authDomain || '';
    document.getElementById('fbAppId').value = cfg.appId || '';
    this.openModal('modalFirebase');
  }

  async handleSaveFirebaseConfig(e) {
    e.preventDefault();
    const config = {
      apiKey: document.getElementById('fbApiKey').value.trim(),
      projectId: document.getElementById('fbProjectId').value.trim(),
      authDomain: document.getElementById('fbAuthDomain').value.trim(),
      appId: document.getElementById('fbAppId').value.trim()
    };

    this.showToast("Firebase'e bağlanılıyor...", "info");
    const success = await window.dataService.saveFirebaseConfig(config);

    if (success) {
      this.updateDbStatusBadge();
      this.closeModal('modalFirebase');
      this.showToast("🔥 Google Firebase Firestore başarıyla bağlandı ve senkronize edildi!", "success");
    } else {
      this.showToast("Firebase'e bağlanırken hata oluştu. Bilgileri kontrol ediniz.", "error");
    }
  }

  handleClearFirebase() {
    window.dataService.clearFirebaseConfig();
    this.updateDbStatusBadge();
    this.closeModal('modalFirebase');
    this.showToast("Firebase yapılandırması kaldırıldı. Sistem Yerel Depolama (LocalStorage) moduna geçti.", "info");
  }

  openAddClassModal() {
    this.openModal('modalAddClass');
  }

  async handleSaveNewClass(e) {
    e.preventDefault();
    const name = document.getElementById('newClassName').value.trim();
    const grade = document.getElementById('newClassGrade').value;
    const teacherName = document.getElementById('newClassTeacher').value.trim();
    const teacherPass = document.getElementById('newClassTeacherPass').value.trim();

    const id = 'cls_' + Date.now();
    const newClass = { id, name, grade, teacherName, teacherPass, isDistributed: false };

    this.classes.push(newClass);
    await window.dataService.saveClasses(this.classes);
    await this.reloadAllData();
    this.renderAdminView();
    this.closeModal('modalAddClass');
    this.showToast(`${name} sınıfı başarıyla eklendi!`, "success");
  }

  openAddCourseModal() {
    this.openModal('modalAddCourse');
  }

  async handleSaveNewCourse(e) {
    e.preventDefault();
    const name = document.getElementById('newCourseName').value.trim();
    const code = document.getElementById('newCourseCode').value.trim().toUpperCase();
    const teacher = document.getElementById('newCourseTeacher').value.trim(); // Opsiyonel
    const isActiveForProject = document.getElementById('newCourseActive').checked;

    const id = 'c_' + Date.now();
    const newCourse = { id, code, name, teacher, isActiveForProject };

    this.courses.push(newCourse);
    await window.dataService.saveCourses(this.courses);
    await this.reloadAllData();
    this.renderAdminView();
    this.closeModal('modalAddCourse');
    this.showToast(`"${name}" dersi başarıyla eklendi!`, "success");
  }

  // --- Ders Düzenleme Metotları ---
  openEditCourseModal(courseId) {
    const c = this.courses.find(x => x.id === courseId);
    if (!c) return;

    document.getElementById('editCourseId').value = c.id;
    document.getElementById('editCourseName').value = c.name;
    document.getElementById('editCourseCode').value = c.code;
    document.getElementById('editCourseTeacher').value = c.teacher || '';
    document.getElementById('editCourseActive').checked = c.isActiveForProject !== false;

    this.openModal('modalEditCourse');
  }

  async handleUpdateCourse(e) {
    e.preventDefault();
    const courseId = document.getElementById('editCourseId').value;
    const course = this.courses.find(x => x.id === courseId);
    if (!course) return;

    course.name = document.getElementById('editCourseName').value.trim();
    course.code = document.getElementById('editCourseCode').value.trim().toUpperCase();
    course.teacher = document.getElementById('editCourseTeacher').value.trim();
    course.isActiveForProject = document.getElementById('editCourseActive').checked;

    await window.dataService.saveCourses(this.courses);
    await this.reloadAllData();
    this.renderAdminView();
    this.closeModal('modalEditCourse');
    this.showToast(`"${course.name}" dersi başarıyla güncellendi!`, "success");
  }

  // --- Toplu Ders Yükleme Metotları ---
  openBulkCourseModal() {
    this.openModal('modalBulkCourseImport');
  }

  async processBulkCourseImport() {
    const raw = document.getElementById('bulkCourseImportTextarea').value.trim();
    if (!raw) {
      this.showToast("Lütfen içe aktarılacak dersleri yapıştırın!", "warning");
      return;
    }

    const lines = raw.split('\n');
    let addedCount = 0;

    lines.forEach((line, index) => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const code = parts[0].toUpperCase();
        const name = parts[1];
        const defaultCapacity = parts[2] ? (parseInt(parts[2], 10) || 4) : 4;
        
        let targetGrades = ["9", "10", "11", "12"];
        if (parts[3]) {
          targetGrades = parts[3].split('-').map(g => g.trim());
        }

        const teacher = parts[4] || ''; // Opsiyonel öğretmen

        // Mevcut ders varsa güncelle, yoksa yeni ekle
        let existing = this.courses.find(c => c.code === code);
        if (existing) {
          existing.name = name;
          existing.defaultCapacity = defaultCapacity;
          existing.targetGrades = targetGrades;
          if (teacher) existing.teacher = teacher;
        } else {
          const id = 'c_' + Date.now() + '_' + index;
          this.courses.push({
            id,
            code,
            name,
            teacher,
            defaultCapacity,
            targetGrades,
            isActiveForProject: true
          });
        }
        addedCount++;
      }
    });

    if (addedCount > 0) {
      await window.dataService.saveCourses(this.courses);
      await this.reloadAllData();
      this.renderAdminView();
      this.closeModal('modalBulkCourseImport');
      document.getElementById('bulkCourseImportTextarea').value = '';
      this.showToast(`${addedCount} ders başarıyla sisteme aktarıldı!`, "success");
    } else {
      this.showToast("Geçerli formatta ders satırı bulunamadı.", "warning");
    }
  }

  openAddStudentModal() {
    const select = document.getElementById('newStudentClass');
    select.innerHTML = '';
    this.classes.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      select.appendChild(opt);
    });
    this.openModal('modalAddStudent');
  }

  async handleSaveNewStudent(e) {
    e.preventDefault();
    const number = document.getElementById('newStudentNumber').value.trim();
    const name = document.getElementById('newStudentName').value.trim();
    const classId = document.getElementById('newStudentClass').value;
    const pass = document.getElementById('newStudentPass').value.trim() || number;

    const existing = this.students.find(s => s.number === number);
    if (existing) {
      this.showToast("Bu okul numarasına sahip bir öğrenci zaten mevcut!", "warning");
      return;
    }

    const id = 's_' + Date.now();
    const newStudent = { id, number, name, classId, pass, choices: [], submitDate: null };

    this.students.push(newStudent);
    await window.dataService.saveStudents(this.students);
    await this.reloadAllData();
    this.renderAdminView();
    this.closeModal('modalAddStudent');
    this.showToast(`${name} başarıyla kaydedildi!`, "success");
  }

  openBulkImportModal() {
    this.openModal('modalBulkImport');
  }

  async processBulkImport() {
    const raw = document.getElementById('bulkImportTextarea').value.trim();
    if (!raw) {
      this.showToast("Lütfen içe aktarılacak satırları yapıştırın!", "warning");
      return;
    }

    const lines = raw.split('\n');
    let addedCount = 0;

    // Sınıf isimlerini map yap (9-A -> cls_9a gibi)
    const classNameToId = {};
    this.classes.forEach(c => {
      classNameToId[c.name.toLowerCase().trim()] = c.id;
    });

    lines.forEach((line, index) => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 3) {
        const number = parts[0];
        const name = parts[1];
        const className = parts[2].toLowerCase();
        const pass = parts[3] || number;

        const classId = classNameToId[className] || (this.classes[0] ? this.classes[0].id : 'cls_9a');

        if (!this.students.find(s => s.number === number)) {
          this.students.push({
            id: 's_bulk_' + Date.now() + '_' + index,
            number,
            name,
            classId,
            pass,
            choices: [],
            submitDate: null
          });
          addedCount++;
        }
      }
    });

    if (addedCount > 0) {
      await window.dataService.saveStudents(this.students);
      await this.reloadAllData();
      this.renderAdminView();
      this.closeModal('modalBulkImport');
      document.getElementById('bulkImportTextarea').value = '';
      this.showToast(`${addedCount} öğrenci başarıyla sisteme aktarıldı!`, "success");
    } else {
      this.showToast("Uygun formatta eklenecek yeni öğrenci bulunamadı.", "warning");
    }
  }

  // Yedek İndirme / Geri Yükleme
  downloadBackupJSON() {
    const jsonStr = window.dataService.exportFullBackup();
    this.downloadFile(jsonStr, `Proje_Odevi_Sistemi_Yedek_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    this.showToast("Tüm verilerin JSON yedeği indirildi.", "success");
  }

  async handleRestoreBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        await window.dataService.importFullBackup(event.target.result);
        await this.reloadAllData();
        this.renderAdminView();
        this.showToast("Yedek başarıyla geri yüklendi!", "success");
      } catch (err) {
        this.showToast("Yedek geri yüklenirken hata oluştu: " + err.message, "error");
      }
    };
    reader.readAsText(file);
  }

  async handleResetToDemo() {
    if (!confirm("Tüm değişiklikler sıfırlanıp hazır örnek demo verileri yüklenecektir. Onaylıyor musunuz?")) return;
    window.dataService.resetToDemoData();
    await this.reloadAllData();
    this.renderAdminView();
    this.showToast("Sistem hazır demo verilerine sıfırlandı!", "info");
  }

  // --- Yardımcı Araçlar ---
  showToast(message, type = 'info') {
    const now = Date.now();
    // 2 saniye içinde aynı mesajın tekrar gelmesini engelle
    if (this._lastToastMsg === message && (now - (this._lastToastTime || 0)) < 2000) {
      return;
    }
    this._lastToastMsg = message;
    this._lastToastTime = now;

    const container = document.getElementById('toast-container');
    if (!container) return;

    // Halihazırda gösterilmekte olan aynı metne sahip açık toast varsa ekleme
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

  downloadFile(content, fileName, contentType) {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // =========================================================================
  // RESMİ BELGE VE ÇİZELGE YAZDIRMA (MEB & OKUL360)
  // =========================================================================

  generateOfficialFormHTML(classObj, student, course, preferenceLevel) {
    const schoolName = this.settings.schoolName || "KIRAÇ BORSA İSTANBUL MESLEKİ VE TEKNİK ANADOLU LİSESİ";
    const termName = this.settings.termName || "2024-2025 EĞİTİM ÖĞRETİM YILI 2. DÖNEM";
    const classTeacher = classObj.teacherName || "Sınıf Rehber Öğretmeni";
    const courseTeacher = course.teacher || "Ders Öğretmeni";
    const courseName = course.name || "Ders";
    const today = new Date().toLocaleDateString('tr-TR');

    const courseMap = {};
    this.courses.forEach(c => courseMap[c.id] = c.name);

    const c1 = (student.choices && student.choices[0] && courseMap[student.choices[0]]) ? courseMap[student.choices[0]] : '...................................................';
    const c2 = (student.choices && student.choices[1] && courseMap[student.choices[1]]) ? courseMap[student.choices[1]] : '...................................................';
    const c3 = (student.choices && student.choices[2] && courseMap[student.choices[2]]) ? courseMap[student.choices[2]] : '...................................................';
    const c4 = (student.choices && student.choices[3] && courseMap[student.choices[3]]) ? courseMap[student.choices[3]] : '...................................................';
    const c5 = (student.choices && student.choices[4] && courseMap[student.choices[4]]) ? courseMap[student.choices[4]] : '...................................................';

    return `
      <div class="official-form-page">
        <!-- 1. Bölüm: Öğrenci Dilekçesi -->
        <div class="official-form-header">
          T.C.<br>
          ${schoolName.toUpperCase()} MÜDÜRLÜĞÜ
        </div>

        <div class="official-form-title">PROJE SEÇİM DİLEKÇESİ</div>
        <div class="official-form-subnote">(Bu bölümü öğrenci dolduracaktır.)</div>

        <div class="official-form-to">
          ${schoolName.toUpperCase()} MÜDÜRLÜĞÜNE
        </div>

        <div class="official-form-body">
          Okulunuz <strong>${classObj.name}</strong> sınıfı <strong>${student.number}</strong> numaralı öğrencisiyim. <strong>${termName}</strong> Eğitim-Öğretim yılında aşağıda belirttiğim tercih sırasına göre uygun görülen bir dersten proje ödevi almak istiyorum.
        </div>
        <div style="text-indent: 1.5rem; margin-bottom: 0.6rem;">
          Gereğini bilgilerinize arz ederim.
        </div>

        <div class="official-form-signatures">
          <div>
            <strong>DERS TERCİH SIRALAMASI:</strong>
            <div class="official-form-choices">
              1) ${c1}<br>
              2) ${c2}<br>
              3) ${c3}<br>
              4) ${c4}<br>
              5) ${c5}
            </div>
          </div>
          <div style="text-align: right; min-width: 220px; padding-top: 0.5rem;">
            Tarih: ${today}<br><br>
            Öğrencinin Adı Soyadı: <strong>${student.name}</strong><br>
            İmza: .......................................
          </div>
        </div>

        <div class="official-form-divider"></div>

        <!-- 2. Bölüm: Sınıf Rehber Öğretmeni -->
        <div class="official-form-subnote" style="margin-top: 0.3rem;">(Bu bölüm Sınıf Rehber Öğretmeni tarafından doldurulacaktır.)</div>
        <div class="official-form-title" style="font-size: 11pt; margin-top: 0.2rem;">PROJE TERCİH DEĞERLENDİRME KARARI</div>

        <div class="official-form-to" style="margin: 0.4rem 0;">
          ${courseName.toUpperCase()} DERSİ ÖĞRETMENLİĞİNE
        </div>

        <div class="official-form-body">
          Sınıfımdan <strong>${student.number}</strong> numaralı <strong>${student.name}</strong> isimli öğrencinin yapmış olduğu ders tercih sıralamasına göre gerçekleştirilen değerlendirme sonucunda <strong>${courseName}</strong> dersinden proje alması uygun görülmüştür.
        </div>
        <div style="text-indent: 1.5rem; margin-bottom: 0.5rem;">
          Gereğini bilgilerinize arz ve rica ederim.
        </div>

        <div class="official-form-signatures" style="margin-top: 0.3rem;">
          <div>
            Yerleşme Durumu: <strong>${typeof preferenceLevel === 'number' ? preferenceLevel + '. Tercihi' : (preferenceLevel || 'Algoritma Yerleştirmesi')}</strong>
          </div>
          <div style="text-align: right; min-width: 240px;">
            Tarih: ${today}<br><br>
            Sınıf Rehber Öğretmeni: <strong>${classTeacher}</strong><br>
            İmza: .......................................
          </div>
        </div>

        <div class="official-form-divider"></div>

        <!-- 3. Bölüm: Ders Öğretmeni -->
        <div class="official-form-subnote" style="margin-top: 0.3rem;">(Bu bölümü projenin alındığı dersin öğretmeni dolduracaktır.)</div>
        
        <div style="margin: 0.4rem 0; font-size: 10pt;">
          <strong>PROJENİN KONUSU:</strong><br>
          ................................................................................................................................................................................................................<br>
          ................................................................................................................................................................................................................<br>
          ................................................................................................................................................................................................................
        </div>

        <div class="official-form-signatures" style="margin-top: 0.6rem;">
          <div>
            Teslim Tarihi: ..... / ..... / 202...
          </div>
          <div style="text-align: right; min-width: 240px;">
            Ders Öğretmeni: <strong>${courseTeacher}</strong><br>
            İmza: .......................................
          </div>
        </div>

        <!-- Notlar -->
        <div class="official-notes-box">
          <strong>NOT:</strong><br>
          1) Bu dilekçede proje alınacak derslerin tercihi öğrenci tarafından yapılacaktır.<br>
          2) Sınıf Rehber Öğretmeni tercihleri değerlendirerek derslere göre dengeli bir dağıtım yapacaktır.<br>
          3) Öğrencinin proje alacağı ders belirlendikten sonra dilekçe ilgili ders öğretmenine verilecek, ders öğretmeni proje konusunu yazarak dilekçeyi sınıf öğretmenine iade edecektir.<br>
          4) Sınıf Rehber Öğretmenleri sınıf proje seçimleri sonuç listesini hazırlayarak dilekçelerle birlikte ilgili Müdür Yardımcısına teslim edeceklerdir.
        </div>
      </div>
    `;
  }

  generateClassResultsSheetHTML(classObj, assignedStudents, unassignedStudents) {
    const schoolName = this.settings.schoolName || "KIRAÇ BORSA İSTANBUL MESLEKİ VE TEKNİK ANADOLU LİSESİ";
    const termName = this.settings.termName || "2024-2025 EĞİTİM ÖĞRETİM YILI 2. DÖNEM";
    const classTeacher = classObj.teacherName || "Sınıf Rehber Öğretmeni";
    const today = new Date().toLocaleDateString('tr-TR');

    const sortedAssigned = [...assignedStudents].sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));

    let rowsHtml = '';
    sortedAssigned.forEach((s, idx) => {
      const courseName = s.assignedCourse ? s.assignedCourse.name : '-';
      const teacherName = s.assignedCourse ? (s.assignedCourse.teacher || '-') : '-';
      const reason = typeof s.preferenceLevel === 'number' ? `${s.preferenceLevel}. Tercihi` : (s.preferenceLevel || 'Yerleşti');
      rowsHtml += `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="text-align: center; font-weight: bold;">${s.number}</td>
          <td><strong>${s.name}</strong></td>
          <td>${courseName}</td>
          <td>${teacherName}</td>
          <td style="text-align: center;">${reason}</td>
          <td style="text-align: center;">.... / .... / 202...</td>
          <td></td>
        </tr>
      `;
    });

    let unassignedHtml = '';
    if (unassignedStudents && unassignedStudents.length > 0) {
      unassignedHtml = `
        <div style="margin-top: 1rem; padding: 0.5rem; background: #fff1f2; border: 1px solid #fecaca; font-size: 8.5pt;">
          <strong>⚠️ Kontenjan Yetersizliği Nedeniyle Yerleşemeyen Öğrenciler (${unassignedStudents.length}):</strong><br>
          ${unassignedStudents.map(u => `${u.number} - ${u.name}`).join(', ')}
        </div>
      `;
    }

    return `
      <div class="class-sheet-page">
        <div class="class-sheet-header">
          T.C.<br>
          ${schoolName.toUpperCase()}<br>
          ${termName.toUpperCase()}
        </div>
        <div class="class-sheet-title">
          ${classObj.name} SINIFI PROJE ÖDEVİ SEÇİM VE DAĞITIM SONUÇ ÇİZELGESİ
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 9pt; margin-bottom: 0.5rem; font-weight: bold;">
          <span>Sınıf: ${classObj.name} (${classObj.grade}. Sınıf)</span>
          <span>Sınıf Rehber Öğretmeni: ${classTeacher}</span>
          <span>Tarih: ${today}</span>
        </div>

        <table class="class-sheet-table">
          <thead>
            <tr>
              <th style="width: 35px;">Sıra</th>
              <th style="width: 60px;">Okul No</th>
              <th>Öğrenci Adı Soyadı</th>
              <th>Yerleştiği Proje Dersi</th>
              <th>Ders Öğretmeni</th>
              <th style="width: 95px;">Yerleşme Nedeni</th>
              <th style="width: 80px;">Teslim Tarihi</th>
              <th style="width: 80px;">Öğrenci İmza</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        ${unassignedHtml}

        <div class="class-sheet-signatures">
          <div style="text-align: center; min-width: 170px;">
            Sınıf Rehber Öğretmeni<br>
            <strong>${classTeacher}</strong><br><br><br>
            İmza: ........................
          </div>
          <div style="text-align: center; min-width: 170px;">
            İlgili Müdür Yardımcısı<br><br><br><br>
            İmza: ........................
          </div>
          <div style="text-align: center; min-width: 170px;">
            UYGUNDUR<br>
            <strong>Okul Müdürü</strong><br><br><br>
            İmza - Mühür
          </div>
        </div>
      </div>
    `;
  }

  printSingleOfficialForm(classId, studentId) {
    const classObj = this.classes.find(c => c.id === classId) || this.currentTeacherClass;
    const classResult = this.results[classId];
    if (!classResult || !classResult.assignedStudents) {
      this.showToast("Önce sınıfın proje dağıtımını gerçekleştirmeniz gerekmektedir!", "warning");
      return;
    }

    const assigned = classResult.assignedStudents.find(s => s.id === studentId);
    if (!assigned || !assigned.assignedCourse) {
      this.showToast("Bu öğrenci henüz bir derse yerleşmemiştir!", "warning");
      return;
    }

    const printContainer = document.getElementById('officialPrintContainer');
    if (!printContainer) return;

    printContainer.innerHTML = this.generateOfficialFormHTML(classObj, assigned, assigned.assignedCourse, assigned.preferenceLevel);

    document.body.classList.add('printing-official-forms');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-official-forms');
      printContainer.innerHTML = '';
    }, 1000);
  }

  printAllOfficialForms() {
    const classObj = this.currentTeacherClass;
    if (!classObj) {
      this.showToast("Lütfen bir sınıf seçiniz!", "warning");
      return;
    }

    const classResult = this.results[classObj.id];
    if (!classResult || !classResult.assignedStudents || classResult.assignedStudents.length === 0) {
      this.showToast("Yazdırılacak dağıtım sonucu bulunamadı! Lütfen önce dağıtımı gerçekleştiriniz.", "warning");
      return;
    }

    const printContainer = document.getElementById('officialPrintContainer');
    if (!printContainer) return;

    const sorted = [...classResult.assignedStudents].sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));

    let html = '';
    sorted.forEach(s => {
      html += this.generateOfficialFormHTML(classObj, s, s.assignedCourse, s.preferenceLevel);
    });

    printContainer.innerHTML = html;

    document.body.classList.add('printing-official-forms');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-official-forms');
      printContainer.innerHTML = '';
    }, 1000);
  }

  printClassResultsSheet(classId = null) {
    const cId = classId || (this.currentTeacherClass ? this.currentTeacherClass.id : null);
    if (!cId) {
      this.showToast("Lütfen önce bir sınıf seçiniz!", "warning");
      return;
    }

    const classObj = this.classes.find(c => c.id === cId) || this.currentTeacherClass;
    const classResult = this.results[cId];
    if (!classResult || !classResult.assignedStudents || classResult.assignedStudents.length === 0) {
      this.showToast("Yazdırılacak dağıtım sonucu bulunamadı! Lütfen önce dağıtımı gerçekleştiriniz.", "warning");
      return;
    }

    const printContainer = document.getElementById('officialPrintContainer');
    if (!printContainer) return;

    printContainer.innerHTML = this.generateClassResultsSheetHTML(
      classObj,
      classResult.assignedStudents,
      classResult.unassignedStudents || []
    );

    document.body.classList.add('printing-official-forms');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-official-forms');
      printContainer.innerHTML = '';
    }, 1000);
  }

  // =========================================================================
  // SINIF BAZLI DERS & KONTENJAN EŞLEŞTİRME VE KOPYALAMA
  // =========================================================================

  updateCourseCardState(courseId, value) {
    const val = parseInt(value, 10) || 0;
    const card = document.getElementById(`card_course_${courseId}`);
    const tag = document.getElementById(`tag_${courseId}`);
    if (card && tag) {
      if (val > 0) {
        card.style.background = "#f0fdf4";
        card.style.border = "1.5px solid #86efac";
        tag.textContent = "Açık";
        tag.style.background = "#dcfce7";
        tag.style.color = "#15803d";
      } else {
        card.style.background = "#f8fafc";
        card.style.border = "1px solid var(--border)";
        tag.textContent = "Kapalı";
        tag.style.background = "#f1f5f9";
        tag.style.color = "#64748b";
      }
    }
  }

  async handleCopyConstraintsFromClass() {
    const select = document.getElementById('teacherCopyClassSelect');
    if (!select || !select.value) {
      this.showToast("Lütfen derslerini kopyalamak istediğiniz kaynak sınıfı seçiniz!", "warning");
      return;
    }

    const sourceClassId = select.value;
    const sourceClass = this.classes.find(c => c.id === sourceClassId);
    const sourceConstraints = await window.dataService.getClassConstraints(sourceClassId);
    const sourceCaps = sourceConstraints.courseCapacities || {};

    let copiedCount = 0;
    document.querySelectorAll('.teacher-course-cap-input').forEach(inp => {
      const cId = inp.dataset.courseId;
      const cap = (sourceCaps[cId] !== undefined) ? sourceCaps[cId] : 0;
      inp.value = cap;
      this.updateCourseCardState(cId, cap);
      if (cap > 0) copiedCount++;
    });

    const sourceName = sourceClass ? sourceClass.name : sourceClassId;
    this.showToast(`✓ ${sourceName} sınıfından ${copiedCount} adet ders ve kontenjan aktarıldı! Onaylamak için 'Kaydet' butonuna basınız.`, "success");
  }

  handleQuickSetAllCapacities(val) {
    document.querySelectorAll('.teacher-course-cap-input').forEach(inp => {
      inp.value = val;
      this.updateCourseCardState(inp.dataset.courseId, val);
    });
    if (val > 0) {
      this.showToast(`Tüm derslerin kontenjanı ${val} olarak ayarlandı.`, "info");
    } else {
      this.showToast("Tüm dersler bu sınıfa kapatıldı (kontenjan 0).", "info");
    }
  }

  // =========================================================================
  // =========================================================================
  // =========================================================================
  // ADMİN PANELİ: SINIF-DERS EŞLEŞTİRME (KONTENJANSIZ - SADECE CHECKBOX)
  // =========================================================================

  async renderAdminClassCoursesTab(targetClassId = null) {
    const container = document.getElementById('adminClassCheckboxContainer');
    if (!container) return;

    if (this.classes.length === 0) {
      container.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">Henüz kayıtlı sınıf bulunmuyor. Önce sınıflar sekmesinden sınıf ekleyiniz.</span>';
      return;
    }

    const defaultSelectedId = targetClassId || (this.classes[0] ? this.classes[0].id : null);

    container.innerHTML = this.classes.map(c => `
      <label style="display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.45rem 0.85rem; background: #fff; border: 1.5px solid #cbd5e1; border-radius: 9999px; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s;" id="label_chk_${c.id}">
        <input type="checkbox" class="admin-class-checkbox" value="${c.id}" ${c.id === defaultSelectedId ? 'checked' : ''} onchange="app.updateSelectedClassesCount()">
        <span>${c.name}</span>
        <span style="color: var(--text-muted); font-size: 0.75rem; font-weight: 500;">(${c.teacherName || 'Öğretmen'})</span>
      </label>
    `).join('');

    // Kaynak sınıf seçimi: SADECE eşleşmesi olan sınıflar listelenir (Gereksinim 2)
    const allConstraints = await window.dataService.getAllClassConstraints();
    const copySelect = document.getElementById('adminCopyFromClassSelect');
    if (copySelect) {
      const matchedClasses = this.classes.filter(c => {
        const con = allConstraints[c.id];
        if (!con) return false;
        if (con.assignedCourseIds && con.assignedCourseIds.length > 0) return true;
        if (con.courseCapacities && Object.values(con.courseCapacities).some(v => v > 0)) return true;
        return false;
      });

      copySelect.innerHTML = '<option value="">Eşleşmesi Olan Sınıfı Seçiniz...</option>' + 
        matchedClasses.map(c => `<option value="${c.id}">${c.name} (${c.teacherName || 'Öğretmen'})</option>`).join('');
    }

    this.updateSelectedClassesCount();
    await this.renderAdminClassCoursesGrid(defaultSelectedId);
  }

  adminSelectAllClasses(select) {
    document.querySelectorAll('.admin-class-checkbox').forEach(cb => {
      cb.checked = select;
    });
    this.updateSelectedClassesCount();
  }

  updateSelectedClassesCount() {
    const checked = document.querySelectorAll('.admin-class-checkbox:checked');
    const badge = document.getElementById('adminSelectedClassCountBadge');
    if (badge) {
      badge.textContent = `${checked.length} Sınıf Seçili`;
      badge.className = checked.length > 0 ? "tag tag-primary" : "tag tag-secondary";
    }

    document.querySelectorAll('.admin-class-checkbox').forEach(cb => {
      const lbl = document.getElementById(`label_chk_${cb.value}`);
      if (lbl) {
        if (cb.checked) {
          lbl.style.borderColor = "var(--primary)";
          lbl.style.background = "#eef2ff";
        } else {
          lbl.style.borderColor = "#cbd5e1";
          lbl.style.background = "#fff";
        }
      }
    });
  }

  adminSelectAllCourses(select) {
    document.querySelectorAll('.admin-course-select-checkbox').forEach(cb => {
      cb.checked = select;
      this.updateAdminCourseCardState(cb.dataset.courseId, select);
    });
  }

  async handleAdminLoadClassTemplate(sourceClassId) {
    if (!sourceClassId) return;
    const sourceClass = this.classes.find(c => c.id === sourceClassId);
    const constraints = await window.dataService.getClassConstraints(sourceClassId);
    const assignedIds = constraints.assignedCourseIds || [];
    const caps = constraints.courseCapacities || {};

    let selectedCount = 0;
    document.querySelectorAll('.admin-course-select-checkbox').forEach(cb => {
      const cId = cb.dataset.courseId;
      const isSelected = assignedIds.includes(cId) || (caps[cId] !== undefined && caps[cId] > 0);
      cb.checked = isSelected;
      this.updateAdminCourseCardState(cId, isSelected);
      if (isSelected) selectedCount++;
    });

    const sourceName = sourceClass ? sourceClass.name : sourceClassId;
    this.showToast(`✓ ${sourceName} sınıfının eşleşen dersleri yüklendi (${selectedCount} ders). Seçili sınıflara kaydetmek için butona basınız.`, "info");
  }

  async renderAdminClassCoursesGrid(templateClassId = null) {
    const grid = document.getElementById('adminClassCoursesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (this.courses.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 2rem; text-align: center; color: var(--text-muted);">Okul Ders Havuzunda henüz ders bulunmuyor.</div>';
      return;
    }

    let assignedIds = [];
    let caps = {};
    if (templateClassId) {
      const constraints = await window.dataService.getClassConstraints(templateClassId);
      assignedIds = constraints.assignedCourseIds || [];
      caps = constraints.courseCapacities || {};
    }

    this.courses.forEach(c => {
      const isSelected = assignedIds.length > 0 
        ? assignedIds.includes(c.id) 
        : ((caps[c.id] !== undefined && caps[c.id] > 0) || c.isActiveForProject !== false);

      const div = document.createElement('div');
      div.className = "form-group";
      div.id = `admin_card_course_${c.id}`;
      div.style.background = isSelected ? "#f0fdf4" : "#f8fafc";
      div.style.padding = "0.75rem 0.85rem";
      div.style.borderRadius = "var(--radius-sm)";
      div.style.border = isSelected ? "1.5px solid #86efac" : "1px solid var(--border)";
      div.style.transition = "all 0.2s";

      div.innerHTML = `
        <label style="display: flex; align-items: flex-start; gap: 0.65rem; cursor: pointer; width: 100%; margin: 0;">
          <input type="checkbox" class="admin-course-select-checkbox" data-course-id="${c.id}" ${isSelected ? 'checked' : ''} 
                 onchange="app.updateAdminCourseCardState('${c.id}', this.checked)" style="width: 19px; height: 19px; margin-top: 3px; accent-color: #16a34a;">
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="font-size: 0.92rem; color: #1e1b4b;">${c.name}</strong>
              <span class="tag" id="admin_tag_${c.id}" style="font-size: 0.68rem; font-weight: 700; ${isSelected ? 'background:#dcfce7; color:#15803d;' : 'background:#f1f5f9; color:#64748b;'}">
                ${isSelected ? 'Seçildi' : 'Kapalı'}
              </span>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
              Kod: <strong>${c.code}</strong> | Öğrt: ${c.teacher || 'Belirtilmemiş'}
            </div>
          </div>
        </label>
      `;
      grid.appendChild(div);
    });
  }

  updateAdminCourseCardState(courseId, isChecked) {
    const card = document.getElementById(`admin_card_course_${courseId}`);
    const tag = document.getElementById(`admin_tag_${courseId}`);
    if (card && tag) {
      if (isChecked) {
        card.style.background = "#f0fdf4";
        card.style.border = "1.5px solid #86efac";
        tag.textContent = "Seçildi";
        tag.style.background = "#dcfce7";
        tag.style.color = "#15803d";
      } else {
        card.style.background = "#f8fafc";
        card.style.border = "1px solid var(--border)";
        tag.textContent = "Kapalı";
        tag.style.background = "#f1f5f9";
        tag.style.color = "#64748b";
      }
    }
  }

  adminGoToClassCourses(classId) {
    const tabBtns = document.querySelectorAll('#viewAdmin .tab-btn');
    let targetBtn = null;
    tabBtns.forEach(b => {
      if (b.getAttribute('onclick') && b.getAttribute('onclick').includes('tabAdminClassCourses')) {
        targetBtn = b;
      }
    });

    this.switchAdminTab('tabAdminClassCourses', targetBtn);

    document.querySelectorAll('.admin-class-checkbox').forEach(cb => {
      cb.checked = (cb.value === classId);
    });
    this.updateSelectedClassesCount();
    this.renderAdminClassCoursesGrid(classId);
  }

  async handleSaveAdminClassCourses(e) {
    e.preventDefault();
    const checkedCheckboxes = document.querySelectorAll('.admin-class-checkbox:checked');
    const selectedClassIds = Array.from(checkedCheckboxes).map(cb => cb.value);

    if (selectedClassIds.length === 0) {
      this.showToast("Lütfen işlem yapılacak en az bir sınıf seçiniz!", "warning");
      return;
    }

    const selectedCourseCheckboxes = document.querySelectorAll('.admin-course-select-checkbox:checked');
    const selectedCourseIds = Array.from(selectedCourseCheckboxes).map(cb => cb.dataset.courseId);

    if (selectedCourseIds.length === 0) {
      this.showToast("Lütfen bu sınıflara atanacak en az bir ders seçiniz!", "warning");
      return;
    }

    for (const classId of selectedClassIds) {
      const existingConstraints = await window.dataService.getClassConstraints(classId);
      const existingCaps = existingConstraints.courseCapacities || {};

      // Sadece seçilen dersler için kontenjanları koru, yeni seçilenlere varsayılan 5 ata
      const updatedCapacities = {};
      selectedCourseIds.forEach(cId => {
        updatedCapacities[cId] = (existingCaps[cId] && existingCaps[cId] > 0) ? existingCaps[cId] : 5;
      });

      const newConstraints = {
        ...existingConstraints,
        assignedCourseIds: selectedCourseIds,
        courseCapacities: updatedCapacities
      };
      await window.dataService.saveClassConstraints(classId, newConstraints);
    }

    const classNames = selectedClassIds.map(id => {
      const c = this.classes.find(cl => cl.id === id);
      return c ? c.name : id;
    }).join(', ');

    this.showToast(`✓ [${classNames}] sınıflarına ${selectedCourseIds.length} ders başarıyla atandı! Kontenjanları sınıf öğretmenleri belirleyebilir.`, "success");
    await this.renderAdminClassCoursesTab(selectedClassIds[0]);
  }

  // =========================================================================
  // ÖĞRETMEN HAVUZDAN DERS EKLEME & ÇIKARMA METOTLARI
  // =========================================================================

  async openTeacherAddCourseFromPoolModal() {
    if (!this.currentTeacherClass) return;
    const constraints = await window.dataService.getClassConstraints(this.currentTeacherClass.id);
    const assignedIds = constraints.assignedCourseIds || Object.keys(constraints.courseCapacities || {});

    // Henüz sınıfta olmayan havuz derslerini bul
    const remainingCourses = this.courses.filter(c => !assignedIds.includes(c.id));

    const select = document.getElementById('teacherPoolCourseSelect');
    if (!select) return;

    if (remainingCourses.length === 0) {
      this.showToast("Ders Havuzundaki tüm dersler zaten sınıfınızda ekli!", "info");
      return;
    }

    select.innerHTML = remainingCourses.map(c => `
      <option value="${c.id}">${c.name} [${c.code}] (${c.teacher || 'Öğretmen'})</option>
    `).join('');

    this.openModal('modalTeacherAddCourseFromPool');
  }

  async handleAddCourseFromPoolToCurrentClass() {
    if (!this.currentTeacherClass) return;
    const classId = this.currentTeacherClass.id;
    const select = document.getElementById('teacherPoolCourseSelect');
    const quotaInput = document.getElementById('teacherPoolCourseQuota');

    if (!select || !select.value) return;
    const courseId = select.value;
    const quota = parseInt(quotaInput.value, 10) || 5;

    const constraints = await window.dataService.getClassConstraints(classId);
    let assignedIds = constraints.assignedCourseIds || [];
    if (!assignedIds.includes(courseId)) {
      assignedIds.push(courseId);
    }

    const caps = constraints.courseCapacities || {};
    caps[courseId] = quota;

    const newConstraints = {
      ...constraints,
      assignedCourseIds: assignedIds,
      courseCapacities: caps
    };

    await window.dataService.saveClassConstraints(classId, newConstraints);
    this.closeModal('modalTeacherAddCourseFromPool');
    await this.renderTeacherConstraintsForm(this.currentTeacherClass);

    const courseObj = this.courses.find(c => c.id === courseId);
    const cName = courseObj ? courseObj.name : 'Ders';
    this.showToast(`✓ "${cName}" dersi ${quota} kontenjanla sınıfınıza eklendi!`, "success");
  }

  async handleRemoveCourseFromCurrentClass(courseId) {
    if (!this.currentTeacherClass) return;
    const courseObj = this.courses.find(c => c.id === courseId);
    const cName = courseObj ? courseObj.name : 'Ders';

    if (!confirm(`"${cName}" dersini bu sınıftan çıkarmak istediğinize emin misiniz?`)) return;

    const classId = this.currentTeacherClass.id;
    const constraints = await window.dataService.getClassConstraints(classId);

    let assignedIds = (constraints.assignedCourseIds || []).filter(id => id !== courseId);
    const caps = { ...(constraints.courseCapacities || {}) };
    delete caps[courseId];

    const newConstraints = {
      ...constraints,
      assignedCourseIds: assignedIds,
      courseCapacities: caps
    };

    await window.dataService.saveClassConstraints(classId, newConstraints);
    await this.renderTeacherConstraintsForm(this.currentTeacherClass);
    this.showToast(`"${cName}" dersi sınıfınızdan çıkarıldı.`, "info");
  }

  // =========================================================================
  // ÖĞRETMEN: DAĞITIMI İPTAL ET (SIFIRLA - TERCİHLERİ KORU)
  // =========================================================================

  async handleCancelDistribution() {
    if (!this.currentTeacherClass) return;
    const classId = this.currentTeacherClass.id;

    const confirmed = confirm(
      `DİKKAT: ${this.currentTeacherClass.name} sınıfının proje dağıtım sonucunu iptal etmek üzeresiniz!

` +
      `✓ Öğrencilerin yapmış olduğu ders tercihleri (1-5 tercih) KESİNLİKLE SİLİNMEZ, korunur.
` +
      `✓ Yalnızca ders yerleştirmesi ve dağıtım sonucu sıfırlanır.

` +
      `Dağıtımı iptal etmek istediğinizi onaylıyor musunuz?`
    );
    if (!confirmed) return;

    // Sonuçlardan bu sınıfı kaldır
    delete this.results[classId];
    await window.dataService.saveResults(this.results);

    if (window.dataService.isFirebaseReady) {
      try {
        await window.dataService.db.collection('results').doc(classId).delete();
      } catch (e) {}
    }

    await this.reloadAllData();
    await this.showTeacherView(this.currentTeacherClass, false);
    this.showToast("✓ Dağıtım iptal edildi! Öğrenci tercihleri korundu, dilediğiniz zaman yeniden dağıtım yapabilirsiniz.", "success");
  }

  // =========================================================================
  // CSV İLE TOPLU SINIF-DERS EŞLEŞTİRME VE DIŞA AKTARMA
  // =========================================================================

  openBulkClassCourseModal() {
    this.openModal('modalBulkClassCourseImport');
  }

  fillBulkClassCourseSample() {
    const textarea = document.getElementById('bulkClassCourseTextarea');
    if (!textarea) return;

    let sampleLines = [];
    const sampleClasses = this.classes.slice(0, 3);
    const sampleCourses = this.courses.slice(0, 5);

    sampleClasses.forEach(cl => {
      sampleCourses.forEach(co => {
        sampleLines.push(`${cl.name}, ${co.code}`);
      });
    });

    textarea.value = sampleLines.join('\n');
    this.showToast("Örnek şablon metin kutusuna dolduruldu.", "info");
  }

  async processBulkClassCourseImport() {
    const textarea = document.getElementById('bulkClassCourseTextarea');
    if (!textarea || !textarea.value.trim()) {
      this.showToast("Lütfen içe aktarılacak satırları yapıştırın!", "warning");
      return;
    }

    const raw = textarea.value.trim();
    const lines = raw.split('\n');

    const classMap = {};
    this.classes.forEach(c => {
      classMap[c.name.toLowerCase().trim()] = c.id;
      classMap[c.id.toLowerCase().trim()] = c.id;
    });

    const courseMap = {};
    this.courses.forEach(c => {
      courseMap[c.code.toLowerCase().trim()] = c.id;
      courseMap[c.name.toLowerCase().trim()] = c.id;
      courseMap[c.id.toLowerCase().trim()] = c.id;
    });

    const multiMap = {}; // { classId: [ courseId ] }
    let matchedLines = 0;

    lines.forEach(line => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const classNameRaw = parts[0].toLowerCase();
        const courseKeyRaw = parts[1].toLowerCase();

        const classId = classMap[classNameRaw];
        const courseId = courseMap[courseKeyRaw];

        if (classId && courseId) {
          if (!multiMap[classId]) multiMap[classId] = [];
          if (!multiMap[classId].includes(courseId)) {
            multiMap[classId].push(courseId);
            matchedLines++;
          }
        }
      }
    });

    const affectedClassIds = Object.keys(multiMap);
    if (affectedClassIds.length === 0) {
      this.showToast("Geçerli formatta eşleşen satır bulunamadı. Lütfen sınıf ve ders kodlarını kontrol ediniz.", "error");
      return;
    }

    for (const classId of affectedClassIds) {
      const existing = await window.dataService.getClassConstraints(classId);
      const newAssignedIds = Array.from(new Set([...(existing.assignedCourseIds || []), ...multiMap[classId]]));
      
      const newCaps = { ...(existing.courseCapacities || {}) };
      newAssignedIds.forEach(id => {
        if (!newCaps[id]) newCaps[id] = 5;
      });

      const newConstraints = {
        ...existing,
        assignedCourseIds: newAssignedIds,
        courseCapacities: newCaps
      };
      await window.dataService.saveClassConstraints(classId, newConstraints);
    }

    this.closeModal('modalBulkClassCourseImport');
    textarea.value = '';
    await this.renderAdminClassCoursesTab(affectedClassIds[0]);
    this.showToast(`✓ ${affectedClassIds.length} sınıf için ${matchedLines} adet ders eşleştirmesi başarıyla kaydedildi!`, "success");
  }

  async exportClassCoursesToCSV() {
    if (this.classes.length === 0 || this.courses.length === 0) {
      this.showToast("Dışa aktarılacak sınıf veya ders bulunamadı.", "warning");
      return;
    }

    let csv = "Sınıf,Ders Kodu,Ders Adı\n";

    for (const cl of this.classes) {
      const constraints = await window.dataService.getClassConstraints(cl.id);
      const assignedIds = constraints.assignedCourseIds || Object.keys(constraints.courseCapacities || {});

      this.courses.forEach(c => {
        if (assignedIds.includes(c.id)) {
          csv += `"${cl.name}","${c.code}","${c.name}"
`;
        }
      });
    }

    this.downloadFile(csv, `Sinif_Ders_Eslestirmeleri_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    this.showToast("Tüm sınıf-ders eşleştirmeleri CSV olarak indirildi.", "success");
  }

}

// Uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
  window.app.init();
});
