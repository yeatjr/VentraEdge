# Ventra Edge  
### AI-Based Zone-Level Energy Management System  
**Sense the waves. Cool the people. Save the watts.**

---

> 🚀 **Try the live demo to experience real-time AI-driven HVAC control.**

## 🌐 Live Demo
👉 https://yeatjr.github.io/VentraEdge/index.html

---

## 📌 Overview
Ventra Edge is an AI-powered energy management system designed for Small and Medium Offices (SMOs).  
It replaces inefficient timer-based HVAC control with a **real-time, intelligent, and decentralised system** that optimises energy usage based on actual occupancy.

The system leverages **Wi-Fi Channel State Information (CSI)** and **edge AI (ESP32)** to detect occupancy without cameras, ensuring both **privacy and efficiency**.

---

## 🚀 Key Features

### 📡 Privacy-First Occupancy Detection
- Uses Wi-Fi CSI instead of cameras  
- Detects real human presence and movement  
- Fully privacy-preserving and non-intrusive  

### ⚡ Edge AI Processing
- Lightweight ML models run directly on ESP32  
- No dependency on cloud for real-time decisions  
- Works even during network disruptions  

### 🌬 Intelligent HVAC Control
- Controls:
  - VAV dampers (airflow)
  - VFD fans (fan speed)  
- Dynamically adjusts based on occupancy and environment  

### 🔍 Real-Time Monitoring Dashboard
- Zone-level monitoring  
- Environmental sensing (temperature, humidity, airflow)  
- AI decision transparency  

### 🚨 Smart Alert & Fault Detection
- Detects anomalies using ML patterns  
- Automatically activates fallback mechanisms  
- Generates maintenance tickets for real-world action  

### 📊 Energy Analytics & Insights
- Tracks energy savings vs traditional systems  
- Identifies inefficient usage patterns  
- Provides actionable AI recommendations  

---

## 🏗 System Architecture

Sensors (CSI + Environmental) → ESP32 Edge AI Processing  →

HVAC Control (VAV + VFD) → Cloud Dashboard (Monitoring & Analytics)


---

## 🖥 Platform Modules

- **Dashboard** → Real-time facility monitoring  
- **Zone View** → Node-level control & sensing  
- **Alerts Hub** → Incident detection & management  
- **Maintenance System** → Ticket generation & tracking  
- **Profile Settings** → Admin assignment & notifications  

---

## 🧠 How It Works

1. Detect occupancy using Wi-Fi CSI  
2. Process data locally via Edge AI  
3. Adjust airflow dynamically  
4. Detect faults and activate fallback control  
5. Notify admins and generate maintenance tickets  
6. Analyse long-term energy usage patterns  

---

## 📈 Impact

- ⚡ Up to **40%+ energy savings**  
- 🔒 100% privacy (no cameras)  
- ⚙️ Low-cost and scalable solution  
- 📉 Reduced HVAC inefficiency  
- 🧠 Intelligent, self-optimising system  

---

## 🎯 Target Users

- Small & Medium Offices (SMOs)  
- Campuses & institutions  
- Commercial buildings without BMS  

---

## 🛠 Tech Stack

- **Hardware:** ESP32, BME280, DS18B20  
- **AI:** TinyML / Edge AI  
- **Communication:** MQTT, Wi-Fi  
- **Frontend:** Web Dashboard  
- **Backend:** Optional cloud integration  

---

## 🔐 Privacy & Security

- No cameras used  
- No personal data collection  
- Edge processing ensures data stays local  

---

## 📦 Installation (Local Demo)

```bash
git clone https://github.com/your-repo/ventra-edge.git
cd ventra-edge
npm install
npm run dev

