# 🎓 Okul Proje Ödevi Seçim ve Akıllı Dağıtım Portalı

Bu web uygulaması, okullarda öğrencilerin **5 ders tercihi** yaparak proje ödevi seçebilmesini, sınıf rehber öğretmenlerinin kendi sınıflarına özel **kontenjan ve kısıtlamalar** belirleyerek tek tıkla **akıllı algoritmayla dağıtım** yapabilmesini ve okul idaresinin tüm süreci kontrol edebilmesini sağlar.

Proje, **GitHub Pages** üzerinde %100 ücretsiz olarak çalışmak üzere tasarlanmıştır. Hiçbir sunucu kiralama veya derleme (build) gerektirmez. Veritabanı olarak ücretsiz **Google Firebase Firestore** ile tam entegre çalışır; ayrıca Firebase yapılandırılmasa bile **Yerel Depolama (LocalStorage)** ile anında çalışmaya hazırdır!

---

## 🚀 Öne Çıkan Özellikler

### 1. 🎓 Öğrenci Portalı
- **Basit Giriş:** Yalnızca **Okul Numarası** ve **Şifre** ile giriş yapılır.
- **Sınıfa Özel Dersler:** Öğrencinin kademesine (9, 10, 11, 12. sınıf) tanımlı dersler listelenir.
- **5 Öncelikli Tercih:** 1. tercihten 5. tercihe kadar sıralı seçim yapılır. Aynı dersin mükerrer seçilmesini engelleyen anlık denetim vardır.
- **Sonuç Ekranı:** Dağıtım tamamlanıp öğretmen onay verdiğinde, öğrenci atandığı dersi, ders öğretmenini ve yerleşme nedenini görür.

### 2. 👨‍🏫 Sınıf Rehber Öğretmeni Portalı
- **Sınıf Bazlı İzolasyon:** Her sınıf öğretmeni yalnızca kendi sınıfındaki öğrencileri ve tercihlerini görür.
- **Sınıfa Özel Kısıtlamalar & Ayarlar:**
  - Ders bazında maksimum öğrenci kontenjanı (Örn: Matematik max 4, Fizik max 3).
  - Öncelik / Sıralama Kriteri:
    - 🎲 **Rastgele Kura** (Tamamen adil şans dağıtımı)
    - ⏱️ **Başvuru Zamanı** (Önce tercih yapan öğrenci öncelikli)
  - Açıkta kalanları kontenjanı boş derslere otomatik dengeli dağıtma seçeneği.
- **Akıllı Dağıtımı Başlat (Dağıt):** Algoritma 1. tercihten başlayarak ders kontenjanlarına göre yerleştirir. Canlı simülasyon konsolunda her adım gösterilir.
- **Manuel Müdahale:** İhtiyaç halinde öğretmen öğrencinin atandığı dersi elle değiştirebilir.
- **Dışa Aktarma & Yazdırma:** Excel / CSV çıktısı ve tek tıkla resmi çıktı (PDF / Yazdır).
- **Öğrencilere İlan Etme:** Sonuçları tek tıkla öğrencilerin görünümüne açma/kapatma.

### 3. 🛡️ Okul İdaresi (Yönetici) Portalı
- Sınıfları, sınıf rehber öğretmenlerini ve giriş şifrelerini oluşturma/yönetme.
- **Ders Yönetimi:** Proje derslerini düzenleme (Ders Adı, Kodu, Kontenjanı, Seçebilecek Sınıf Kademeleri).
- **Toplu Ders Yükleme (CSV):** Tüm okulun ders müfredatını tek tıkla kopyala-yapıştır ile içeri aktarma.
- **Opsiyonel Öğretmen Adı:** Ders öğretmeni adı zorunlu değildir, boş bırakılabilir.
- **Toplu Öğrenci Yükleme:** Öğrencileri tek tek veya **CSV / Excel'den toplu olarak** içe aktarma.
- **Sıfırdan Başlama:** Tek tıkla veritabanını temizleyip kendi okulunuza özel temiz bir başlangıç yapma.
- Tek tıkla tüm sistemin **JSON Yedeğini İndirme ve Geri Yükleme**.

---

## 🧠 Dağıtım Algoritması Nasıl Çalışır?

Algoritma MEB proje dağıtım standartlarına uygun olarak tasarlanmıştır:
1. **1. Tercih Turu:** Tüm öğrencilerin 1. tercihleri havuzda toplanır. Kontenjanı aşmayan tercihler anında yerleştirilir. Kontenjanı aşan derslerde belirlenen öncelik kuralı (kura veya başvuru zamanı) işletilir.
2. **2, 3, 4 ve 5. Tercih Turları:** 1. tercihine yerleşemeyen öğrenciler sırasıyla 2., 3., 4. ve 5. tercihlerine aktarılır ve boş kalan kontenjanlar doldurulur.
3. **Otomatik Tamamlama:** 5 tercihine de yerleşemeyen öğrenciler varsa, en az öğrencisi olan ve kontenjanı müsait derslere dengeli biçimde yerleştirilir.

---

## 🌐 GitHub Pages'e Nasıl Yüklenir?

1. GitHub'da yeni bir repository (depo) oluşturun (Örn: `proje-secim`).
2. Bu klasördeki tüm dosyaları (`index.html`, `css/`, `js/`) deponuza yükleyin (push edin).
3. Repository sayfasında **Settings** -> **Pages** bölümüne gidin.
4. **Branch** kısmından `main` (veya `master`) seçin ve **/ (root)** seçili halde **Save** butonuna tıklayın.
5. 1-2 dakika içinde siteniz `https://kullaniciadiniz.github.io/proje-secim/` adresinde canlıya geçecektir!

---

## 🔥 Ücretsiz Firebase Firestore Kurulumu (Adım Adım)

Sistem Firebase olmadan da LocalStorage ile çalışabilir. Ancak farklı cihazlardan gerçek zamanlı eşzamanlama için Firebase'i 2 dakikada bağlayabilirsiniz:

1. [Google Firebase Console](https://console.firebase.google.com/) adresine gidin ve **Add project** (Proje Ekle) deyin.
2. Sol menüden **Build** -> **Firestore Database** bölümüne gelin ve **Create database** butonuna tıklayın.
3. Test modu seçeneğini seçin (veya Rules sekmesinde okuma/yazma izni verin: `allow read, write: if true;`).
4. **Project Settings** (Dişli çark) -> **General** bölümünün en altında **Web app** simgesine (`</>`) tıklayın.
5. Karşınıza gelen yapılandırma kodundaki `apiKey` ve `projectId` değerlerini kopyalayın.
6. Web sitemizin sağ üst köşesindeki **"⚙️ Veritabanı Ayarı"** butonuna tıklayıp bu bilgileri yapıştırın ve **Kaydet**'e basın.
7. Tebrikler! Tüm verileriniz artık Google Cloud üzerinde bulutta saklanacaktır.

---

## 🔑 Hazır Demo Hesapları (Test İçin)

Sistem ilk açıldığında hazır örnek sınıflar, öğrenciler ve derslerle gelir:

| Kullanıcı Türü | Giriş Bilgileri | Açıklama |
|---|---|---|
| **Öğrenci (9-A)** | No: `101`, Şifre: `101` | Alperen Demir (9-A) |
| **Öğrenci (9-A)** | No: `102`, Şifre: `102` | Buse Aktaş (9-A) |
| **Öğrenci (9-A)** | No: `115`, Şifre: `115` | Tercih yapmamış öğrenci |
| **Öğretmen (9-A)** | Sınıf: `9-A`, Şifre: `1234` | Ahmet Hoca (9-A Rehber Öğretmeni) |
| **Öğretmen (9-B)** | Sınıf: `9-B`, Şifre: `1234` | Zeynep Hoca (9-B Rehber Öğretmeni) |
| **İdare / Admin** | Kullanıcı: `admin`, Şifre: `admin123` | Okul Müdürü / Yönetici |

*(Tüm bu şifreler İdare Paneli'nden kolayca değiştirilebilir.)*
