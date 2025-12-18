# MQTT Broker Installation and Usage Guide

## 📋 Overview

The MQTT Broker system is integrated into the CEC-DocifyCode project using **Mosquitto** - a popular open-source MQTT broker. MQTT allows backend and frontend services to communicate using the **publish/subscribe** (pub/sub) model.

### Directory Structure

```
CEC-DocifyCode/
├── mqtt/                      # MQTT module (same level as app/)
│   ├── __init__.py           # Package init
│   ├── mqtt_client.py        # MQTT Client class
│   ├── api_routes.py         # FastAPI routes for MQTT
│   ├── config/               # Mosquitto configuration
│   │   └── mosquitto.conf
│   ├── data/                 # Persistence data
│   ├── log/                  # Log files
│   └── examples/             # Code examples
│       ├── publisher_example.py
│       └── subscriber_example.py
├── app/                       # Application code
├── docker-compose.yml         # Docker config
└── .env.example              # Environment variables
```

---

## 🚀 Step 1: Installation

### 1.1. Check Directory Structure

Ensure the `mqtt/` folder has been created with all subdirectories:

```bash
ls -la mqtt/
# Expected output: config/ data/ log/ examples/ __init__.py mqtt_client.py api_routes.py
```

### 1.2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Open the `.env` file and check the MQTT variables:

```bash
# ==== MQTT Broker Configuration ====
# When running with Docker, use: MQTT_BROKER_HOST=mosquitto
# When running locally, use: MQTT_BROKER_HOST=localhost
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=1883
MQTT_WEBSOCKET_PORT=9001
MQTT_KEEPALIVE=60
MQTT_QOS=2

# MQTT Authentication (leave empty for anonymous access)
MQTT_USERNAME=
MQTT_PASSWORD=
```

> **Note:** 
> - When running the application in Docker, change `MQTT_BROKER_HOST=mosquitto`
> - When running the application locally (development), use `MQTT_BROKER_HOST=localhost`

### 1.3. Install Python Libraries

```bash
pip install paho-mqtt>=1.6.1
```

Or install all dependencies:

```bash
pip install -r requirements.txt
```

---

## 🐳 Step 2: Start MQTT Broker with Docker

### 2.1. Start Containers

```bash
docker compose up -d
```

This command will start 3 containers:
- `app` - Backend API (CEC-DocifyCode)
- `mongodb` - MongoDB database
- `mqtt_broker` - Mosquitto MQTT Broker

### 2.2. Check Logs

```bash
# Check MQTT broker logs
docker logs mqtt_broker

# Expected output:
# mosquitto version X.X.X running
```

### 2.3. Check Running Containers

```bash
docker ps

# Expected output:
# CONTAINER ID   IMAGE                    PORTS                              NAMES
# ...            eclipse-mosquitto        0.0.0.0:1883->1883/tcp, ...        mqtt_broker
```

---

## 🧪 Step 3: Test Pub/Sub via Terminal

### 3.1. Test SUBSCRIBE

Open the first terminal and subscribe to a topic:

```bash
docker exec -it mqtt_broker mosquitto_sub -t test/topic -v
```

This terminal will wait and display received messages.

### 3.2. Test PUBLISH

Open a second terminal and publish a message:

```bash
docker exec -it mqtt_broker mosquitto_pub -t test/topic -m "Hello MQTT"
```

**Result:** The subscribe terminal (step 3.1) will display:
```
test/topic Hello MQTT
```

### 3.3. Test with JSON Data

```bash
docker exec -it mqtt_broker mosquitto_pub -t test/json -m '{"sensor":"temp","value":25.5}'
```

---

## 🌐 Step 4: Test WebSocket via UI

### 4.1. Access HiveMQ WebSocket Client

Open your browser and go to: **http://www.hivemq.com/demos/websocket-client/**

### 4.2. Configure Connection

- **Host:** `localhost`
- **Port:** `9001`
- **Protocol:** `ws://` (WebSocket)
- **Client ID:** (leave empty or set as desired)

Click **Connect**

### 4.3. Subscribe to Topic

In the **Subscriptions** section:
- **Topic:** `test/topic`
- Click **Subscribe**

### 4.4. Publish Message

In the **Publish** section:
- **Topic:** `test/topic`
- **Message:** `Hello from WebSocket UI`
- Click **Publish**

**Result:** The message will appear in the **Messages** section below.

---

## 🐍 Step 5: Using MQTT in Python

### 5.1. Import MQTTClient

```python
from common.mqtt import MQTTClient
```

### 5.2. Publisher Example

```python
from common.mqtt import MQTTClient

# Initialize client
client = MQTTClient(client_id="my_publisher")

# Connect
client.connect()

# Publish text message
client.publish("sensors/temperature", "25.5")

# Publish JSON data
data = {"sensor": "temperature", "value": 25.5, "unit": "celsius"}
client.publish("sensors/data", data)

# Disconnect
client.disconnect()
```

### 5.3. Subscriber Example

```python
from common.mqtt import MQTTClient
import time

def on_message(topic, payload):
    print(f"Received on {topic}: {payload}")

# Initialize client
client = MQTTClient(client_id="my_subscriber")

# Connect
client.connect()

# Subscribe with callback
client.subscribe("sensors/#", callback=on_message)

# Keep program running
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    client.disconnect()
```

### 5.4. Run Available Examples

**Publisher example:**

```bash
cd mqtt/examples
python publisher_example.py
```

**Subscriber example (in another terminal):**

```bash
cd mqtt/examples
python subscriber_example.py
```

---

## 🔌 Step 6: Integrate MQTT API into FastAPI

### 6.1. Add Routes to main.py

Open the `main.py` file and add MQTT routes:

```python
from common.mqtt.api_routes import router as mqtt_router

# ... existing code ...

# Add MQTT router
app.include_router(mqtt_router)
```

### 6.2. Test API Endpoints

**Check status:**

```bash
curl http://localhost:8000/api/mqtt/status
```

**Publish message via API:**

```bash
curl -X POST http://localhost:8000/api/mqtt/publish \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "api/test",
    "message": "Hello from API",
    "qos": 2,
    "retain": false
  }'
```

### 6.3. Swagger UI

Access: **http://localhost:8000/docs**

Find the **MQTT** section to test endpoints directly on the UI.

---

## 📝 Step 7: Environment Variables Details

| Variable | Description | Default Value | Notes |
|----------|-------------|---------------|-------|
| `MQTT_BROKER_HOST` | MQTT broker address | `localhost` | Use `mosquitto` when running in Docker |
| `MQTT_BROKER_PORT` | Standard MQTT port | `1883` | Standard TCP port |
| `MQTT_WEBSOCKET_PORT` | WebSocket port | `9001` | For browser clients |
| `MQTT_KEEPALIVE` | Keepalive interval (seconds) | `60` | Connection keepalive time |
| `MQTT_QOS` | Default Quality of Service | `2` | 0=At most once, 1=At least once, 2=Exactly once |
| `MQTT_USERNAME` | Username (optional) | `` | Leave empty for anonymous |
| `MQTT_PASSWORD` | Password (optional) | `` | Leave empty for anonymous |

---

## 🔧 Step 8: Useful Docker Commands

### Container Management

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart MQTT broker
docker compose restart mosquitto

# View realtime logs
docker logs -f mqtt_broker

# Access MQTT container shell
docker exec -it mqtt_broker sh
```

### Connection Testing

```bash
# Subscribe to multiple topics with wildcard
docker exec -it mqtt_broker mosquitto_sub -t '#' -v

# Publish with QoS level
docker exec -it mqtt_broker mosquitto_pub -t test/qos2 -m "Test" -q 2

# Publish retained message
docker exec -it mqtt_broker mosquitto_pub -t test/retain -m "Retained" -r
```

---

## 🔍 Step 9: Troubleshooting

### Issue: Connection Refused

**Cause:** MQTT broker has not started or port is blocked.

**Solution:**
```bash
# Check if broker is running
docker ps | grep mqtt_broker

# Check logs
docker logs mqtt_broker

# Check port
netstat -an | grep 1883
```

### Issue: Permission Denied When Mounting Volumes

**Cause:** Docker does not have permission to access the `mqtt/` directory.

**Solution:**
```bash
# Grant permissions to directory
chmod -R 755 mqtt/
```

### Issue: Python Import Error

**Cause:** The `common` module (Git submodule) has not been checked out or Python cannot find the package.

**Solution:**
```bash
# Ensure submodule is initialized and updated
git submodule update --init --recursive
```

```python
# Import MQTT from common package
from common.mqtt import MQTTClient
```

### Issue: MQTT Client Cannot Connect

**Cause:** Incorrect `MQTT_BROKER_HOST`.

**Solution:**
- When running backend **in Docker**: `MQTT_BROKER_HOST=mosquitto`
- When running backend **outside Docker**: `MQTT_BROKER_HOST=localhost`

---

## 📚 References

- **MQTT Protocol:** https://mqtt.org/
- **Eclipse Mosquitto:** https://mosquitto.org/
- **Paho MQTT Python:** https://www.eclipse.org/paho/index.php?page=clients/python/
- **HiveMQ WebSocket Client:** http://www.hivemq.com/demos/websocket-client/

---

## ✅ Complete Checklist

- [ ] Created `mqtt/` directory with complete structure
- [ ] Configured `.env` with MQTT variables
- [ ] Installed `paho-mqtt` library
- [ ] Successfully started Docker containers
- [ ] Tested pub/sub via terminal
- [ ] Tested WebSocket via HiveMQ UI
- [ ] Successfully ran publisher/subscriber examples
- [ ] Integrated MQTT API routes into FastAPI
- [ ] Tested API endpoints via Swagger UI

---

**🎉 Congratulations! You have completed the MQTT Broker installation.**
