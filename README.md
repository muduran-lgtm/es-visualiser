# Elastic Workflows Visual Editor (Görsel İş Akışı Editörü — PROTOTİP)

Kibana Workflows özelliği için harici, bağımsız, modern ve iki yönlü (bi-directional) çalışan görsel (sürükle-bırak) iş akışı editörü.

---

## 🚀 Özellikler

- **Görsel Graf Editörü (React Flow):**
  - Tetikleyiciler (Manual, Scheduled, Alert, Event) ve adımların görsel düğüm akışı.
  - Sürükle-bırak düğüm paleti (Elasticsearch, Kibana, Console, HTTP, Flow Control, AI).
  - `@dagrejs/dagre` tabanlı otomatik yerleşim (`layoutGraph()`) ve `Ctrl+D` kısayolu (ileride `elkjs`'e geçiş için soyutlanmış).
  - Düğüm bazlı görsel doğrulama rozetleri (zorunlu alanlar eksikse anlık kırmızı rozet uyarısı).
- **CodeMirror 6 YAML Editörü:**
  - Gerçek zamanlı YAML syntax renklendirme ve hata denetimi (linting).
  - **İki yönlü akıllı senkronizasyon:** Kaynak etiketleme (`origin: 'canvas'` vs `'yaml'`) ve ~300 ms debounce ile sonsuz döngüsüz (loop-free) senkron.
  - Geçersiz YAML girildiğinde grafiği bozmaz, hata satırını gösterir.
- **Kayıpsız Round-Trip (eemeli/yaml Document API):**
  - Editörün tanımadığı özel alanlar, yorum satırları (`#`), format ve üst düzey meta veriler (`consts`, `inputs`, `outputs`, `settings`) silinmez, eksiksiz korunur.
  - Bilinmeyen/özel adımlar canvas'ta "Generic" düğüm olarak görüntülenir ve korunur.
- **Çoklu Kibana Entegrasyonu & Hamburger Menü:**
  - Üst bar hamburger menüsü (☰) üzerinden birden fazla Kibana kümesi (Dev, Staging, Prod) ve Mock ortamı tanımlama/seçme.
  - API anahtarları asla tarayıcıda açık tutulmaz; Fastify backend proxy üzerinde güvenle maskelenir ve yönetilir.
  - Tek tıkla canlı bağlantı sınama (test ping).
- **Güvenli Kaydetme & Diff Önizleme:**
  - `Ctrl+S` ile hızlı kaydetme.
  - **Farkı Gör (Diff Preview):** Kibana'daki orijinal sürüm ile mevcut değişiklikleri Git tarzı renklendirilmiş modalda kıyaslama.
  - **Eşzamanlı Düzenleme Kontrolü:** Başka bir kullanıcı/oturum workflow'u güncellediyse `updatedAt` kontrolü ile 409 çakışma uyarısı.
  - Sunucu tarafında kaydetmeden önce YAML syntax doğrulaması.
- **Mock Modu:**
  - Kibana olmadan test edebilmek için 3 hazır gerçekçi senaryo (Basit Manuel Log, Güvenlik Zenginleştirme, Koşullu Yönlendirme & Döngü).
- **Kibana Koyu Tema Uyumu:**
  - Kibana EUI tasarım diline uygun koyu tema arayüzü.

---

## 📁 Proje Klasör Yapısı

```text
elastic-workflows-editor/
├── package.json               # Root scripts & npm workspaces (concurrently)
├── .env.example / .env        # Ortam değişkenleri
├── docs/
│   └── api-notes.md           # Adım 0: Kibana Workflows API ve YAML şeması araştırma notları
├── server/                    # Fastify Backend Proxy
│   ├── package.json
│   ├── tsconfig.json
│   ├── data/
│   │   └── connections.json   # Çoklu Kibana profilleri saklama alanı
│   └── src/
│       ├── index.ts           # Fastify sunucusu, CORS, REST rotaları
│       ├── types.ts           # Veri tipleri
│       ├── connectionsStore.ts# Kibana profilleri yöneticisi
│       ├── mockData.ts        # 3 örnek mock workflow
│       └── kibanaClient.ts    # Kibana API istemcisi, Space & Insecure TLS desteği
└── frontend/                  # React + TypeScript + Vite
    ├── package.json
    ├── vite.config.ts         # Vite yapılandırması & /api proxy
    └── src/
        ├── App.tsx            # Ana uygulama & senkronizasyon orkestratörü
        ├── components/
        │   ├── TopBar.tsx     # Üst bar, workflow seçici, kaydet, hamburger menü
        │   ├── Palette.tsx    # Sürükle-bırak adım/tetikleyici paleti
        │   ├── Canvas.tsx     # React Flow canvas, minimap, bağlantılar
        │   ├── Properties.tsx # Seçili düğüm parametre düzenleyicisi
        │   ├── YamlEditor.tsx # CodeMirror 6 YAML editörü ve linter
        │   ├── DiffModal.tsx  # Kaydetme öncesi diff önizleme penceresi
        │   └── SettingsDrawer.tsx # Hamburger Kibana entegrasyon çekmecesi
        ├── flow/
        │   ├── layout.ts      # layoutGraph() dagre soyutlaması
        │   └── nodes/         # Trigger, Step, If, Foreach, Generic düğümleri
        └── services/
            ├── api.ts         # Backend proxy istemcisi
            └── yamlSync.ts    # eemeli/yaml Document API kayıpsız dönüştürücü
```

---

## ⚙️ Kurulum ve Çalıştırma

### 1. Gereksinimler
- Node.js (v20 veya v22 LTS)
- npm (v9 veya üzeri)

### 2. Ortam Değişkenleri (.env)
Kök dizindeki `.env` dosyasını yapılandırın:
```bash
# Örnek:
cp .env.example .env
```

`.env` içeriği:
```env
# Kibana Bağlantı Ayarları (Canlı Kibana kullanacaksanız)
KIBANA_URL=https://kibana.mycompany.com:5601
KIBANA_API_KEY=your_base64_api_key_here
KIBANA_SPACE=default
KIBANA_INSECURE_TLS=false

# Mock Modu (Kibana olmadan çalışmak için true yapın)
MOCK_MODE=true

# Portlar
PORT=3001
HOST=0.0.0.0
```

> **İpucu:** Arayüzün sol üst köşesindeki **Hamburger Menüye (☰)** tıklayarak istediğiniz zaman yeni Kibana bağlantıları ekleyebilir ve `.env` dosyasını değiştirmeden canlı ve mock modları arasında geçiş yapabilirsiniz.

### 3. Geliştirme Ortamını Başlatma
Hem Fastify sunucusunu (`3001`) hem de Vite frontend uygulamasını (`5173`) tek komutla ayağa kaldırın:

```bash
npm run dev
```

Tarayıcınızda açın:
```text
http://localhost:5173
```

### 4. Testleri Çalıştırma
YAML ↔ Graf çift yönlü kayıpsız dönüştürücü birim testlerini çalıştırmak için:
```bash
npm run test
```

---

## ⌨️ Klavye Kısayolları

| Kısayol | İşlem |
| :--- | :--- |
| **`Ctrl + S`** / **`Cmd + S`** | Workflow'u kaydet (Kibana veya Mock) |
| **`Ctrl + D`** / **`Cmd + D`** | Grafiği otomatik düzenle (`layoutGraph`) |
| **`Delete`** / **`Backspace`** | Seçili adımı veya bağlantıyı sil |

---

## 🔍 Bilinen Sınırlamalar (Bu Prototip İçin)

1. **Karmaşık İç İçe Akışlar:** Prototip doğrusal akışları, `if (then/else)` dallanmalarını ve `foreach` döngü bloklarını doğrudan görselleştirir. Çok derin iç içe `switch` ve `parallel` blokları için alt paneldeki tam özellikli YAML editörü devreye girer.
2. **Kibana Sürüm Farklılıkları:** Elastic 9.5+ sürümlerinde `inputs` manual trigger altına taşınabilirken, 9.4 ve öncesinde kök seviyede tanımlanır. Editör her iki formatı da `eemeli/yaml` Document API sayesinde olduğu gibi korur.
3. **Execution İzleme:** Bu tur prototip kapsamındadır; çalıştırma geçmişi ve logları sonraki fazlarda eklenecektir.

---

## 🛣️ Sonraki Adımlar

- [ ] **Execution Dashboard:** Çalışan workflow'ların durumunu ve adım çıktılarını canlı izleme.
- [ ] **JSON Schema Tabanlı Doğrulama:** `/api/workflows/schema` endpoint'inden dinamik şema çekip CodeMirror içinde otomatik tamamlama.
- [ ] **Elkjs Entegrasyonu:** `layoutGraph()` soyutlaması kullanılarak daha gelişmiş graf yerleşim motoruna geçiş.
- [ ] **Undo / Redo Geçmişi:** Canvas ve YAML geçmiş adımları için geri/ileri alma desteği.
