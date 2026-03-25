---
description: "Build a DIY smart pet scale with Arduino, ESP32, or ESP8266 and log your cat or dog's weight automatically via REST API. Complete wiring guide, HX711 load cell setup, and copy-paste firmware included."
head:
  - - meta
    - name: keywords
      content: "DIY pet scale, Arduino cat scale, ESP32 pet weight tracker, smart pet scale, HX711 pet scale, automated cat weight logging, IoT pet health, dog weight monitor Arduino, ESP8266 pet scale, open source pet scale API"
---

# Build a DIY Smart Pet Scale with Arduino or ESP32

Log your cat's or dog's weight automatically using a microcontroller, a load cell, and a free REST API. No proprietary cloud, no subscription, no app lock-in.

This guide walks you through connecting a DIY smart pet scale — built with **Arduino**, **ESP32**, **ESP8266**, or any WiFi-capable microcontroller — to [Meo Mai Moi](https://project.meo-mai-moi.com), an open-source pet care platform. Your scale sends weight data over HTTP; the platform stores it, charts it, and keeps a full history.

No SDK to install. No library to maintain. Just HTTP POST with JSON.

## How It Works

The integration is intentionally simple: your microcontroller reads the load cell, sends a `POST` request with the pet's weight and today's date, and goes back to sleep. The platform handles storage, visualization, and health history.

```
Load Cell → HX711 → ESP32 → WiFi → POST /api/pets/{pet}/weights → Weight Chart in App
```

The device is "dumb" — it only knows how to send one number. All the logic (which pet, who owns it, visualization, health trends) lives in the web app.

## What You Need

**Hardware:**
- ESP32, ESP8266, Arduino with WiFi shield, or any microcontroller with WiFi
- HX711 load cell amplifier + load cell (a cheap kitchen scale works — gut it for the sensor)
- USB power or battery

**Software / Account:**
- A free [Meo Mai Moi](https://project.meo-mai-moi.com) account with at least one pet profile
- The **pet ID** for the pet you want to log weight for (visible in the URL: `/pets/42` → pet ID is `42`)
- A Personal Access Token with `create` permission (generated in the web app)

## Step 1: Generate an API Token for Your Scale

1. Log in to Meo Mai Moi
2. Go to **Settings → API Tokens**
3. Click **Create Token**
4. Name it something descriptive (e.g. `kitchen-scale-esp32`)
5. Enable the **create** permission (minimum required for weight logging)
6. Copy the token — it's shown **only once**

The token looks like a long random string. You'll use it as a Bearer token in the `Authorization` header.

## Step 2: The Weight Logging API

### Endpoint

```
POST /api/pets/{pet_id}/weights
```

### Headers

| Header          | Value                          |
|-----------------|--------------------------------|
| `Authorization` | `Bearer YOUR_TOKEN`            |
| `Content-Type`  | `application/json`             |
| `Accept`        | `application/json`             |

### Request Body

```json
{
  "weight_kg": 4.5,
  "record_date": "2026-03-25"
}
```

| Field         | Type   | Required | Notes                              |
|---------------|--------|----------|------------------------------------|
| `weight_kg`   | float  | Yes      | Weight in kilograms, min: 0        |
| `record_date` | string | Yes      | ISO date (`YYYY-MM-DD`). One entry per date per pet. |

### Success Response (201)

```json
{
  "success": true,
  "data": {
    "id": 17,
    "pet_id": 42,
    "weight_kg": 4.5,
    "record_date": "2026-03-25T00:00:00.000000Z",
    "created_at": "2026-03-25T10:30:00.000000Z",
    "updated_at": "2026-03-25T10:30:00.000000Z"
  }
}
```

### Error Responses

| Code | Meaning                                                        |
|------|----------------------------------------------------------------|
| 401  | Missing or invalid token                                       |
| 403  | Token lacks `create` permission, or you don't have access to this pet |
| 422  | Validation error (e.g. duplicate `record_date` for this pet)  |
| 429  | Rate limited — max 15 weight entries per minute                |

### Duplicate Date Handling

Only one weight entry per pet per day is allowed. If your scale sends multiple readings on the same day, only the first will succeed — subsequent attempts return a 422 error. To update an existing record, use `PUT /api/pets/{pet_id}/weights/{weight_id}` (requires `update` permission).

**Tip for firmware**: Check the HTTP status code. If you get `422`, the day's reading is already logged — no need to retry.

## Step 3: Test with cURL Before Wiring Anything

Before touching hardware, verify your token and pet ID work:

```bash
curl -X POST https://your-instance.com/api/pets/42/weights \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"weight_kg": 4.5, "record_date": "2026-03-25"}'
```

## Step 4: ESP32 Firmware — Complete Sketch

Below is a minimal, copy-paste ready example for ESP32. Adapt pin numbers and load cell library to your hardware setup.

### HTTPS / TLS on Microcontrollers

**TLS on microcontrollers is painful.** ESP32 supports it but requires pinning a Root CA certificate, which can expire or rotate. ESP8266 has even more limited TLS support with memory constraints.

**Recommended approaches:**

1. **Local reverse proxy (best for home use):** Run a tiny HTTP-to-HTTPS proxy on a Raspberry Pi or your home server (e.g. `socat`, a 3-line Nginx config, or `mitmproxy`). The MCU talks plain HTTP to `192.168.x.x`, the proxy forwards to the real HTTPS API. No certificate headaches on the MCU.

2. **Insecure client (prototyping only):** Use `client.setInsecure()` on ESP32/ESP8266 to skip certificate verification. Fine for a cat scale on your home WiFi, but understand the trade-off: you lose server identity verification.

3. **Full TLS with Root CA (production-grade):** Pin the ISRG Root X1 certificate (Let's Encrypt) in your firmware. Works but you'll need to update it if the CA chain changes.

The example below uses option 2 for simplicity. See the [Local Proxy Setup](#local-http-proxy-optional) section for option 1.

### Sketch

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ---- Configuration ----
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* API_HOST = "https://your-instance.com";
const int   PET_ID   = 42;
const char* API_TOKEN = "YOUR_PERSONAL_ACCESS_TOKEN";

// Build the endpoint URL at compile time
String apiUrl() {
  return String(API_HOST) + "/api/pets/" + String(PET_ID) + "/weights";
}

// ---- WiFi ----
void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nConnected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\nWiFi connection failed!");
  }
}

// ---- Send Weight ----
// Returns HTTP status code, or negative value on connection error
int sendWeight(float weightKg) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping.");
    return -1;
  }

  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();  // Skip TLS verification — see note above

  http.begin(client, apiUrl());
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Accept", "application/json");
  http.addHeader("Authorization", String("Bearer ") + API_TOKEN);

  // Build JSON payload
  JsonDocument doc;
  doc["weight_kg"] = weightKg;

  // Get today's date from NTP (set up in setup())
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    char dateBuf[11]; // YYYY-MM-DD\0
    strftime(dateBuf, sizeof(dateBuf), "%Y-%m-%d", &timeinfo);
    doc["record_date"] = dateBuf;
  } else {
    Serial.println("Failed to get time — cannot send without date.");
    http.end();
    return -2;
  }

  String body;
  serializeJson(doc, body);

  Serial.println("Sending: " + body);
  int httpCode = http.POST(body);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("HTTP " + String(httpCode) + ": " + response);

    if (httpCode == 422) {
      Serial.println("Already logged today — OK, nothing to do.");
    }
  } else {
    Serial.println("Connection error: " + String(httpCode));
  }

  http.end();
  return httpCode;
}

// ---- Setup ----
void setup() {
  Serial.begin(115200);
  connectWiFi();

  // Sync time via NTP (needed for record_date)
  configTime(7 * 3600, 0, "pool.ntp.org");  // UTC+7 for Vietnam, adjust for your timezone
  Serial.println("Waiting for NTP sync...");
  delay(2000);
}

// ---- Main Loop ----
void loop() {
  // Replace this with your actual scale reading logic:
  // float weight = scale.get_units(10);
  float weight = 4.35;  // placeholder

  if (weight > 0.1) {  // ignore noise / empty scale
    int result = sendWeight(weight);
    if (result == 201 || result == 422) {
      // Success or already logged — sleep until tomorrow
      Serial.println("Done for today. Sleeping 12 hours...");
      esp_deep_sleep(12ULL * 3600ULL * 1000000ULL);
    }
  }

  delay(30000);  // retry every 30s if not yet logged
}
```

### What This Does

1. Connects to WiFi, syncs clock via NTP
2. Reads weight from your load cell (replace the placeholder)
3. POSTs to the API with today's date
4. On success (201) or "already logged" (422), enters deep sleep for 12 hours
5. On failure, retries every 30 seconds

### Adapting for ESP8266 / NodeMCU

Replace `WiFiClientSecure` with the ESP8266 equivalent and note the reduced TLS buffer (16 KB vs 32 KB on ESP32). The `setInsecure()` call works the same way. Use `ESP.deepSleep()` instead of `esp_deep_sleep()`. The rest of the sketch is identical — the HTTP and JSON code is portable.

### Wiring the HX711 Load Cell

```cpp
#include "HX711.h"

HX711 scale;
const int LOADCELL_DOUT_PIN = 16;
const int LOADCELL_SCK_PIN  = 4;

void setup() {
  // ... WiFi and NTP setup ...
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(420.0);  // calibration factor — adjust for your load cell
  scale.tare();
}

void loop() {
  float weight = scale.get_units(10) / 1000.0;  // grams → kg
  if (weight > 0.1) {
    sendWeight(weight);
  }
  // ...
}
```

## Skip TLS: Local HTTP Proxy for Microcontrollers

If TLS on the MCU is too annoying (expired certs, memory issues, slow handshakes), run a simple reverse proxy on your LAN. The MCU talks plain HTTP to a Raspberry Pi or any Linux box; the proxy handles HTTPS to the real API. This is the most reliable approach for a home pet scale.

### Nginx (on Raspberry Pi or any Linux box)

```nginx
# /etc/nginx/sites-enabled/meo-scale-proxy
server {
    listen 8080;

    location /api/ {
        proxy_pass https://your-instance.com/api/;
        proxy_set_header Host your-instance.com;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
}
```

Then point your MCU at `http://192.168.x.x:8080` instead of the HTTPS URL. Change `API_HOST` in the sketch to the proxy's LAN IP.

**Security note:** This proxy should only be accessible on your local network. Don't expose port 8080 to the internet.

## Rate Limits

- **15 requests per minute** on the weight creation endpoint
- **300 requests per minute** global authenticated limit
- The "one entry per pet per day" constraint is the real throttle for a scale — the rate limit just prevents runaway bugs

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `401 Unauthenticated` | Check your token is valid and has `Bearer ` prefix (with space) |
| `403 Forbidden` | Token needs `create` permission, or you don't own/edit this pet |
| `422 record_date already taken` | Already logged today — this is fine, not an error |
| `429 Too Many Requests` | Slow down. 15/min is the limit |
| Connection refused / timeout | Check WiFi, check URL. If using HTTPS directly, check TLS setup |
| Wrong date in payload | NTP not syncing — check `configTime()` timezone offset |
| Weight shows 0 or negative | Calibrate your load cell (`scale.set_scale()` factor) |
| HX711 reads are unstable | Secure the load cell mounting, add `scale.get_units(20)` for more averaging |

## FAQ

**Can I use this for dogs too?**
Yes. The API tracks weight for any pet type that has weight tracking enabled — cats, dogs, rabbits, whatever you've added to the platform.

**Does the scale need to be always on?**
No. The example firmware uses deep sleep — the ESP32 wakes up, weighs the pet, sends the data, and sleeps for 12 hours. Battery life measured in weeks.

**Can I log more than once a day?**
The API allows one weight entry per pet per day. If you need intra-day tracking, you'd update the existing record with a `PUT` request (requires `update` token permission).

**What if I self-host Meo Mai Moi?**
Same API, just point `API_HOST` to your own server. If it's on your LAN, you don't even need TLS.

**Can I use a Raspberry Pi Pico W or other boards?**
Anything that can make an HTTP POST with JSON works. The API doesn't care what sends the request.

## Community Projects

Built a pet scale? We'd love to feature your project. Open an issue or PR on [GitHub](https://github.com/troioi-vn/meo-mai-moi) with photos and your wiring diagram.

## Further Reading

- [Meo Mai Moi](https://project.meo-mai-moi.com) — The pet care platform (free, open source)
- [API Docs](https://your-instance.com/api/documentation) — Full Swagger/OpenAPI spec
- [HX711 Library](https://github.com/bogde/HX711) — Load cell amplifier driver for Arduino
- [ArduinoJson](https://arduinojson.org/) — JSON serialization for embedded platforms
- [ESP32 Deep Sleep Guide](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/system/sleep_modes.html) — Battery optimization
