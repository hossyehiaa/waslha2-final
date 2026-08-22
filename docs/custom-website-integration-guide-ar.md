# ربط أي موقع مبرمج يدوياً مع Wslahali

## الفكرة

إذا كان موقع العميل مكتوباً بشكل مخصص وليس Shopify، يتم الربط من خلال **Wslahali Partner API**. هذا المسار مناسب لمواقع PHP وLaravel وNode.js وPython وأي Backend يستطيع إرسال HTTPS requests.

> **ممنوع وضع Wslahali API Key داخل HTML أو JavaScript الظاهر للزائر.** يجب أن يبقى المفتاح داخل Backend أو Serverless Function فقط، لأن وضعه في Frontend يسمح لأي شخص بسرقته وإنشاء شحنات على حساب العميل.

## ما الذي يفعله التكامل؟

يستطيع Backend الخاص بالعميل أن:

| الوظيفة | الواجهة |
|---|---|
| جلب المدن المتاحة | `GET /cities` |
| إنشاء شحنة | `POST /shipments` |
| عرض شحنات العميل | `GET /shipments` |
| تتبع شحنة | `GET /shipments/{trackingNumber}` |
| إنشاء شحنات متعددة | `POST /shipments/bulk` |
| استقبال تحديثات الحالة | Webhook من Wslahali إلى Backend العميل |

يتم احتساب تكلفة الشحن وCOD داخل Wslahali. لا يرسل العميل `shippingCost` من موقعه.

## ما الذي نحتاجه من العميل؟

يحتاج العميل إلى:

1. رابط موقعه أو Backend الخاص به يعمل عبر HTTPS.
2. لغة أو إطار العمل المستخدم، مثل PHP أو Laravel أو Node.js.
3. Endpoint يستقبل Webhooks لتحديث حالة الشحنات داخل نظامه.
4. بيانات الشحن الافتراضية: اسم المرسل، الهاتف، العنوان، ومدينة الاستلام.
5. اختبار طلب واحد قبل تشغيل الطلبات الحقيقية.

لا يحتاج العميل إلى Shopify، ولا إلى Shopify Partner، ولا إلى Make أو Zapier.

## ما الذي يفعله فريق Wslahali؟

يقوم فريق Wslahali بإنشاء **API Key منفصل لهذا العميل فقط** مع الصلاحيات المطلوبة، ثم ينشئ Webhook Endpoint إذا كان العميل يريد استقبال تحديثات الحالة داخل موقعه. يجب حفظ المفتاح والـ webhook secret في مدير أسرار أو متغيرات بيئة، وعدم وضعهما في Git أو Frontend أو رسائل عامة.

## بيانات الربط

**Base URL:**

```text
https://wsalhali.vercel.app/api/integrations/v1
```

**Authentication:**

```http
Authorization: Bearer wsl_REPLACE_WITH_CLIENT_KEY
```

يجب أن يكون لكل عميل مفتاح مستقل. لا يستخدم العميل مفتاح عميل آخر، ولا يستخدم المفتاح داخل المتصفح.

## الخطوة 1: جلب المدن

يجب حفظ `code` الذي يرجعه Wslahali، مثل `CAI` أو `ALX`، واستخدامه عند إنشاء الشحنة. لا تعتمد على أسماء المدن أو Internal IDs.

```bash
curl "https://wsalhali.vercel.app/api/integrations/v1/cities" \
  -H "Authorization: Bearer $WSLAHALI_API_KEY"
```

## الخطوة 2: إنشاء شحنة من Backend الموقع

```json
{
  "sender": {
    "name": "Brand Warehouse",
    "phone": "01000000000",
    "address": "Nasr City, Cairo",
    "cityCode": "CAI"
  },
  "recipient": {
    "name": "Ahmed Ali",
    "phone": "01111111111",
    "address": "Smouha, Alexandria",
    "cityCode": "ALX"
  },
  "serviceType": "STANDARD",
  "priority": "NORMAL",
  "weight": 1,
  "pieces": 1,
  "description": "Order 10001",
  "codAmount": 750
}
```

أرسل الطلب من السيرفر فقط، مع `Idempotency-Key` ثابت وفريد للطلب الأصلي. استخدم رقم الطلب الداخلي لدى العميل، مثل `order-10001`. إذا أعاد الموقع الطلب بسبب timeout، استخدم نفس المفتاح حتى لا تُنشأ شحنتان.

```bash
curl -X POST "https://wsalhali.vercel.app/api/integrations/v1/shipments" \
  -H "Authorization: Bearer $WSLAHALI_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: order-10001" \
  --data '{
    "sender":{"name":"Brand Warehouse","phone":"01000000000","address":"Nasr City, Cairo","cityCode":"CAI"},
    "recipient":{"name":"Ahmed Ali","phone":"01111111111","address":"Smouha, Alexandria","cityCode":"ALX"},
    "serviceType":"STANDARD","priority":"NORMAL","weight":1,"pieces":1,"codAmount":750
  }'
```

سيكون الرد الناجح بالشكل التالي:

```json
{
  "data": {
    "id": "shipment-id",
    "trackingNumber": "WSL...",
    "status": "PENDING",
    "totalCost": 40,
    "createdAt": "2026-08-20T12:00:00.000Z"
  }
}
```

يجب حفظ `trackingNumber` داخل طلب العميل وعرضه للمستخدم النهائي.

## مثال PHP آمن

ضع المفتاح في Environment Variable باسم `WSLAHALI_API_KEY`، وليس في ملف Frontend أو Git.

```php
<?php
$baseUrl = 'https://wsalhali.vercel.app/api/integrations/v1';
$apiKey = getenv('WSLAHALI_API_KEY');
$orderId = '10001';

$shipment = [
    'sender' => [
        'name' => 'Brand Warehouse',
        'phone' => '01000000000',
        'address' => 'Nasr City, Cairo',
        'cityCode' => 'CAI',
    ],
    'recipient' => [
        'name' => 'Ahmed Ali',
        'phone' => '01111111111',
        'address' => 'Smouha, Alexandria',
        'cityCode' => 'ALX',
    ],
    'serviceType' => 'STANDARD',
    'priority' => 'NORMAL',
    'weight' => 1,
    'pieces' => 1,
    'codAmount' => 750,
];

$ch = curl_init($baseUrl . '/shipments');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json',
        'Idempotency-Key: order-' . $orderId,
    ],
    CURLOPT_POSTFIELDS => json_encode($shipment, JSON_THROW_ON_ERROR),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 20,
]);

$raw = curl_exec($ch);
if ($raw === false) {
    throw new RuntimeException(curl_error($ch));
}
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$result = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
if ($status < 200 || $status >= 300) {
    throw new RuntimeException($result['error']['message'] ?? 'Wslahali request failed');
}

$trackingNumber = $result['data']['trackingNumber'];
```

## مثال Node.js آمن

```js
const baseUrl = 'https://wsalhali.vercel.app/api/integrations/v1';
const apiKey = process.env.WSLAHALI_API_KEY;

const response = await fetch(`${baseUrl}/shipments`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': `order-${order.id}`,
  },
  body: JSON.stringify(shipment),
});

const result = await response.json();
if (!response.ok) {
  throw new Error(result.error?.message || 'Wslahali request failed');
}

await orders.saveShippingTracking(order.id, result.data.trackingNumber);
```

## الخطوة 3: التتبع

```bash
curl "https://wsalhali.vercel.app/api/integrations/v1/shipments/WSL123456" \
  -H "Authorization: Bearer $WSLAHALI_API_KEY"
```

التتبع يعرض الشحنة الخاصة بالعميل صاحب المفتاح فقط. لا يستطيع المفتاح قراءة شحنات عميل آخر.

## الخطوة 4: استقبال Webhooks للحالات

ينشئ فريق Wslahali Webhook Endpoint إلى رابط HTTPS يحدده العميل، مثل:

```text
https://client-domain.com/api/wslahali/webhook
```

الأحداث الأساسية:

```text
shipment.created
shipment.status_changed
shipment.picked_up
shipment.in_transit
shipment.out_for_delivery
shipment.delivered
shipment.failed
shipment.returned
shipment.cancelled
```

يجب على Backend العميل أن:

1. يقرأ الـ raw request body كما وصل، قبل تحويله إلى JSON.
2. يتحقق من timestamp وأنه ليس أقدم من خمس دقائق.
3. يحسب HMAC-SHA256 على الصيغة `timestamp + "." + rawBody` باستخدام webhook secret.
4. يقارن التوقيع باستخدام constant-time comparison.
5. يسجل `X-Wslahali-Delivery-ID` ويرفض معالجة نفس الـ Delivery ID مرتين.
6. يعيد HTTP `2xx` بسرعة بعد التحقق والتسجيل، ثم ينفذ التحديث في queue أو job داخل نظامه إذا كانت المعالجة طويلة.

Headers المرسلة من Wslahali:

```text
X-Wslahali-Event
X-Wslahali-Delivery-ID
X-Wslahali-Timestamp
X-Wslahali-Signature
```

## اختبار القبول قبل التشغيل الحقيقي

لا يبدأ العميل الطلبات الحقيقية قبل نجاح الاختبارات التالية:

| الاختبار | النتيجة المطلوبة |
|---|---|
| جلب المدن | يرجع المدن النشطة فقط |
| إنشاء شحنة | يظهر tracking number في نظام العميل وWslahali |
| إعادة نفس الطلب بنفس Idempotency-Key | لا تنشئ شحنة ثانية |
| إعادة نفس المفتاح مع بيانات مختلفة | يرجع `409 IDEMPOTENCY_CONFLICT` |
| إرسال `shippingCost` من الموقع | يتم رفض الطلب لأن السعر يحسبه Wslahali |
| تتبع شحنة العميل | يرجع بيانات شحنته فقط |
| webhook صحيح | يقبل الطلب مرة واحدة |
| webhook بتوقيع خطأ | يرفض الطلب |
| webhook مكرر | لا يكرر تحديث الطلب أو الرصيد |
| تغيير الحالة | يصل تحديث الحالة إلى نظام العميل |

## تعليمات أمنية نهائية

لا تضع API Key أو webhook secret في JavaScript العام أو HTML أو تطبيق الهاتف غير المحمي. لا تسجل المفاتيح في logs، ولا ترسلها عبر WhatsApp أو البريد، ولا تضعها في GitHub. إذا تم تسريب المفتاح، يجب إيقافه وإنشاء مفتاح جديد فوراً من فريق Wslahali.

## رسالة قصيرة للعميل

> موقعك لا يعمل على Shopify، لذلك سيتم ربطه مع Wslahali مباشرة من خلال Partner API. فريقنا سينشئ لك API Key خاصاً بحسابك فقط، وسيقوم مطور موقعك بإضافة استدعاء إنشاء الشحنة داخل Backend الموقع، وليس داخل Frontend. بعد إنشاء الشحنة سيحصل الموقع على رقم تتبع Wslahali، وسنرسل له تحديثات الحالة من خلال Webhook آمن. نحتاج من المطور رابط Backend يعمل بـ HTTPS ولغة البرمجة المستخدمة، ثم سنجري اختباراً على طلب تجريبي قبل تشغيل الطلبات الحقيقية.

**Base URL:** `https://wsalhali.vercel.app/api/integrations/v1`

