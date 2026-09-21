# Elastic / Kibana Workflows API & Şema Referans Notları (Adım 0)

> Bu doküman, resmi Elastic Workflows dokümantasyonu (`https://www.elastic.co/docs/explore-analyze/workflows`) ve Kibana OpenAPI referansları taranarak derlenmiştir.

---

## 1. Kibana Workflows REST API Endpoint'leri

Tüm endpoint'ler opsiyonel olarak Kibana Space önekini destekler:
- Varsayılan / Ana Space: `/api/workflows/...`
- Özel Space: `/s/{space_id}/api/workflows/...`

### Yetkilendirme & Başlıklar (Headers)
- `Authorization: ApiKey <base64-encoded-api-key>`
- `kbn-xsrf: true` (CSRF koruması için zorunlu)
- `Content-Type: application/json`

### Endpoint Listesi ve RBAC İzinleri

| HTTP Metodu | Endpoint Yolu | Gerekli Yetki (Privilege) | Açıklama |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/workflows` | `workflowsManagement:read` | Kayıtlı workflow'ların sayfalanmış listesini ve filtreleme sonuçlarını döner. |
| **POST** | `/api/workflows/workflow` | `workflowsManagement:create` | Yeni bir workflow oluşturur. Body: `{ "yaml": "...", "id"?: "..." }`. ID kısıtlaması: `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`, 3–255 karakter. YAML boyutu max 1 MB. |
| **GET** | `/api/workflows/workflow/{id}` | `workflowsManagement:read` | Belirtilen ID'ye sahip tekil workflow detayını ve YAML içeriğini döner. |
| **PUT** | `/api/workflows/workflow/{id}` | `workflowsManagement:update` | Mevcut bir workflow'u kısmi veya tam olarak günceller (`name`, `description`, `enabled`, `tags`, `yaml`). |
| **DELETE** | `/api/workflows/workflow/{id}` | `workflowsManagement:delete` | Belirtilen workflow'u siler. |
| **POST** | `/api/workflows/workflow/{id}/run` | `workflowsManagement:execute` | Workflow'u manuel olarak tetikler. Parametre veya input gönderilebilir. |
| **POST** | `/api/workflows/workflow/{id}/clone` | `workflowsManagement:create` | Mevcut bir workflow'u klonlar. |
| **POST** | `/api/workflows?overwrite=false` | `workflowsManagement:create` | Toplu (batch) workflow oluşturma. |
| **DELETE** | `/api/workflows` | `workflowsManagement:delete` | Toplu workflow silme. |
| **GET** | `/api/workflows/schema` | `workflowsManagement:read` | Kibana'nın o sürümde desteklediği Workflow JSON şemasını döner. |
| **POST** | `/api/workflows/test` | `workflowsManagement:execute` | Kaydetmeden önce workflow'un kuru çalışmasını (dry-run / simülasyon) yapar. |
| **POST** | `/api/workflows/step/test` | `workflowsManagement:execute` | Tek bir adımı test eder. |
| **GET** | `/api/workflows/workflow/{workflowId}/executions` | `workflowsManagement:readExecution` | Belirli bir workflow'un geçmiş çalıştırma listesini getirir. |
| **GET** | `/api/workflows/executions/{executionId}` | `workflowsManagement:readExecution` | Tekil bir çalıştırmanın durumunu (running, success, failed) döner. |
| **POST** | `/api/workflows/executions/{executionId}/cancel` | `workflowsManagement:execute` | Devam eden bir workflow çalıştırmasını iptal eder. |
| **GET** | `/api/workflows/executions/{executionId}/logs` | `workflowsManagement:readExecution` | Çalıştırmaya ait log ve adım çıktılarını getirir. |

---

## 2. YAML Şeması ve Temel Alanlar

Resmi şemada **11 adet üst düzey alan** tanımlıdır:

```yaml
name: slo-breach-response             # [Zorunlu] Benzersiz workflow adı / tanıtıcısı
description: Detaylı açıklama        # [Opsiyonel] UI ve dokümantasyon açıklaması
enabled: true                         # [Opsiyonel, varsayılan: true] Aktif/pasif durumu
tags:                                 # [Opsiyonel] Etiketler (string[])
  - observability
  - production
version: "1"                          # [Opsiyonel, varsayılan: "1"] Şema sürümü

triggers:                             # [Zorunlu, en az 1] Tetikleyiciler
  - type: manual
    inputs:                           # Elastic 9.5+ sürümünde inputs trigger altında da tanımlanabilir
      - name: target_host
        type: string
        required: true

inputs:                               # [Opsiyonel] Workflow genel girdi parametreleri (Stack <= 9.4)
  - name: dryRun
    type: boolean
    default: true

consts:                               # [Opsiyonel] Sabitler ({{ consts.threshold }} olarak kullanılır)
  threshold: 80
  default_index: "kibana-sample-data-logs"

outputs:                              # [Opsiyonel] Bileşik (composition) çağrılar için çıktı şeması
  - name: summary
    type: string

settings:                             # [Opsiyonel] Zaman aşımı, eşzamanlılık ve hata politikaları
  timeout: "5m"
  concurrency:
    strategy: drop                    # drop | queue

steps:                                # [Zorunlu, en az 1] Sıralı yürütülecek adımlar
  - name: search_logs
    type: elasticsearch.search
    with:
      index: "{{ consts.default_index }}"
      query:
        match_all: {}
```

---

## 3. Tetikleyiciler (Triggers)

1. **`manual`**: UI veya API üzerinden tetiklenir. Kullanıcıdan input alabilir.
   ```yaml
   triggers:
     - type: manual
   ```
2. **`scheduled`**: Zaman bazlı tetikleme. Periyodik (`every: 5m`, `every: 1d`) veya RRule cron ifadesi ile çalışır.
   ```yaml
   triggers:
     - type: scheduled
       with:
         every: "15m"
   ```
3. **`alert`**: Elastic Detection / Alerting kuralı tetiklendiğinde otomatik çalışır. Gelen uyarı context'ini (`event.alerts`) taşır.
   ```yaml
   triggers:
     - type: alert
   ```
4. **`event`**: Webhook veya harici olay akışından tetiklenir.

---

## 4. Kontrol Akışı Adımları (Flow Control Steps)

### A. Koşullu Dallanma (`if`)
```yaml
- name: check_severity
  type: if
  condition: "event.alerts[0].kibana.alert.risk_score >= 70"
  steps:
    - name: escalate_slack
      type: console
      with:
        message: "Yüksek riskli vaka tespit edildi!"
  else:
    - name: log_normal
      type: console
      with:
        message: "Rutin vaka, kaydedildi."
```

### B. Döngü (`foreach`)
```yaml
- name: iterate_alerts
  type: foreach
  foreach: "${{ event.alerts }}"
  max-iterations:
    limit: 50
    on-limit: fail # fail | continue
  iteration-timeout: "30s"
  steps:
    - name: print_alert
      type: console
      with:
        message: "[{{ foreach.index }}] Uyarı ID: {{ foreach.item._id }}"
```

### C. Çoklu Seçim (`switch`)
```yaml
- name: route_by_category
  type: switch
  expression: "{{ steps.classify.output.category }}"
  cases:
    - match: "malware"
      steps:
        - name: isolate_host
          type: console
          with:
            message: "Malware izolasyonu başlatıldı"
    - match: "phishing"
      steps:
        - name: block_sender
          type: console
          with:
            message: "Gönderici engellendi"
  default:
    - name: fallback_log
      type: console
      with:
        message: "Kategori eşleşmedi"
```

### D. Bekleme (`wait`) & Diğerleri
- `wait`: `with: { duration: "10s" }`
- `while`: `condition: "..."`, `steps: [...]`
- `parallel`: Eşzamanlı dallar (`branches: [...]` veya `foreach: [...]`)

---

## 5. Başlıca İşlem Adımları (Action Steps) ve `with` Parametreleri

### 1. `console`
Terminal/çalıştırma loguna mesaj basar:
```yaml
type: console
with:
  message: "Bulunan kayıt sayısı: {{ steps.search_logs.output.hits.total.value }}"
```

### 2. `elasticsearch.search`
Elasticsearch üzerinde arama sorgusu çalıştırır:
```yaml
type: elasticsearch.search
with:
  index: "filebeat-*"
  query:
    term:
      user.id: "kimchy"
  size: 10
```

### 3. `elasticsearch.index`
Yeni bir doküman indeksler:
```yaml
type: elasticsearch.index
with:
  index: "workflow-audit-logs"
  document:
    timestamp: "{{ execution.started_at }}"
    status: "PROCESSED"
```

### 4. `elasticsearch.update`
Mevcut bir dokümanı günceller:
```yaml
type: elasticsearch.update
with:
  index: "workflow-audit-logs"
  id: "{{ steps.create_doc.output._id }}"
  doc:
    completed: true
```

### 5. `elasticsearch.esql` (veya `elasticsearch.esql.query`)
ES|QL sorgusu yürütür:
```yaml
type: elasticsearch.esql.query
with:
  query: "FROM logs-* | STATS count = count(*) BY host.name | SORT count DESC | LIMIT 5"
```

### 6. `elasticsearch.request` (Generic REST Escape Hatch)
Herhangi bir Elasticsearch REST API çağrısı:
```yaml
type: elasticsearch.request
with:
  method: "GET" # GET | POST | PUT | DELETE
  path: "/_cat/indices?format=json"
  body: {}
```

### 7. `kibana.SetAlertsStatus`
Kibana Security / Observability uyarılarının durumunu değiştirir:
```yaml
type: kibana.SetAlertsStatus
with:
  alerts: ["{{ event.alerts[0]._id }}"]
  status: "acknowledged" # open | acknowledged | closed
```

### 8. `http.request`
Harici bir HTTP servisine istek atar:
```yaml
type: http.request
with:
  method: "POST"
  url: "https://api.incident-response.internal/webhook"
  headers:
    Content-Type: "application/json"
  body:
    alert_count: 5
```

### 9. Yapay Zeka Adımları (`ai.prompt`, `ai.classify`, `ai.summarize`)
GenAI bağlayıcıları üzerinden özetleme ve sınıflandırma yapar:
```yaml
type: ai.classify
with:
  input: "{{ event.alerts[0].message }}"
  categories: ["network", "auth", "malware", "system"]
```

---

## 6. Doğrulama ve Karşılaştırma Notları

1. **Space Desteği**: `/s/{space_id}/api/workflows` doğrulanmıştır. `space_id` verilmediğinde `/api/workflows` olarak kullanılır.
2. **Kısmi Güncelleme**: `PUT /api/workflows/workflow/{id}` doğrudan kısmi alan güncellemelerini (`name`, `description`, `enabled`, `tags`, `yaml`) destekler.
3. **ID Formatı**: `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$` doğrulanmıştır.
4. **Header'lar**: `kbn-xsrf: true` zorunludur.
5. **Round-Trip & Yorum Korunumu**: Elastic şeması 11 temel alanın yanı sıra custom yorumlar ve genişletilmiş alanlar barındırabildiğinden, `eemeli/yaml` `Document` API'si ile çalışarak modelde parse edilmeyen her türlü düğüm ve açıklama satırının geri yazılırken eksiksiz korunması gerekmektedir.
