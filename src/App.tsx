import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink, 
  Terminal, 
  Cpu, 
  Radio, 
  Clock, 
  Layers, 
  RefreshCw,
  Sliders,
  ChevronRight,
  Maximize2,
  Battery,
  BatteryCharging,
  BarChart3,
  TrendingUp,
  Bell,
  BookOpen,
  ShieldAlert,
  Info
} from 'lucide-react';
import hardwareConceptImg from './assets/images/smartwatch_hardware_concept_1791091206381.jpg';

// Alert priority levels
export type AlertLevel = 'emergency' | 'normal' | 'casual';

// Preset messages categorized by priority tier
const LEVEL_PRESETS: Record<AlertLevel, Array<{ text: string; label: string }>> = {
  emergency: [
    { text: "Emergency alert. Please contact the HLC", label: "HLC Emergency" },
    { text: "Evacuate Science Block immediately via East Exit", label: "Evacuation" },
    { text: "Severe weather alert: Seek indoor shelter now", label: "Severe Weather" }
  ],
  normal: [
    { text: "Class has started in Lecture Hall 3", label: "Class Started" },
    { text: "Exam starts at 10 AM in Main Auditorium", label: "Exam Notice" },
    { text: "Faculty meeting rescheduled to 3:30 PM", label: "Faculty Notice" }
  ],
  casual: [
    { text: "Annual Tech Fest booth setup open at Student Center", label: "Tech Fest" },
    { text: "Cafeteria special lunch menu is now available", label: "Cafeteria" },
    { text: "Inter-department football match begins at 5 PM", label: "Sports Match" }
  ]
};

// Preset messages specified in Master Prompt (flattened for compatibility)
const PRESET_MESSAGES = [
  "Class has started in Lecture Hall 3",
  "Exam starts at 10 AM in Main Auditorium",
  "Emergency alert. Please contact the HLC",
  "Annual Tech Fest booth setup open at Student Center"
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'simulator' | 'hardware' | 'deployment' | 'code'>('home');
  const [serverUrl, setServerUrl] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.origin) {
      return window.location.origin;
    }
    return 'http://127.0.0.1:8000';
  });

  // Network / Server simulation state
  const [serverOnline, setServerOnline] = useState(true);
  const [networkLatencyMs, setNetworkLatencyMs] = useState(0); // 0 = instant, 300 = slow LAN
  const [simulatedDisconnect, setSimulatedDisconnect] = useState(false);

  // Time & Date state
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  // Alert Priority Level state: emergency | normal | casual
  const [selectedLevel, setSelectedLevel] = useState<AlertLevel>('normal');
  const [currentAlertLevel, setCurrentAlertLevel] = useState<AlertLevel>('normal');
  const [levelCounts, setLevelCounts] = useState<{
    emergency: number;
    normal: number;
    casual: number;
  }>({
    emergency: 5,
    normal: 58,
    casual: 26
  });

  // Admin Watch State
  const [adminInput, setAdminInput] = useState('Class has started in Lecture Hall 3');
  const [adminStatus, setAdminStatus] = useState<{ text: string; type: 'success' | 'error' | 'info' | 'ready' }>({
    text: 'Ready',
    type: 'ready'
  });
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Admin Watch Battery State (visual icon in top-right, decreases color intensity from green to red)
  const [batteryLevel, setBatteryLevel] = useState<number>(92);
  const [batteryAutoDrain, setBatteryAutoDrain] = useState<boolean>(true);

  // 24-Hour Alert Frequency State for Bar Chart
  const [alertCounts, setAlertCounts] = useState<{
    class: number;
    exam: number;
    event: number;
    emergency: number;
    admin: number;
  }>({
    class: 34,
    exam: 21,
    event: 16,
    emergency: 5,
    admin: 13
  });
  const [chartViewMode, setChartViewMode] = useState<'columns' | 'bars'>('columns');
  const [activeChartHover, setActiveChartHover] = useState<string | null>(null);

  // Categorize alert payload for frequency tracking
  const categorizeAlert = (text: string): 'class' | 'exam' | 'event' | 'emergency' | 'admin' => {
    const t = text.toLowerCase();
    if (t.includes('class') || t.includes('lecture') || t.includes('started') || t.includes('lab') || t.includes('faculty')) return 'class';
    if (t.includes('exam') || t.includes('test') || t.includes('10 am') || t.includes('hall') || t.includes('quiz')) return 'exam';
    if (t.includes('event') || t.includes('college') || t.includes('fest') || t.includes('seminar') || t.includes('auditorium') || t.includes('football') || t.includes('sports')) return 'event';
    if (t.includes('emergency') || t.includes('hlc') || t.includes('urgent') || t.includes('evacuat') || t.includes('danger') || t.includes('contact') || t.includes('shelter')) return 'emergency';
    return 'admin';
  };

  // Resolve alert priority tier (emergency | normal | casual)
  const resolveAlertLevel = (text: string, explicitLevel?: string): AlertLevel => {
    if (explicitLevel === 'emergency' || explicitLevel === 'normal' || explicitLevel === 'casual') {
      return explicitLevel;
    }
    const t = text.toLowerCase();
    if (t.includes('emergency') || t.includes('danger') || t.includes('evacuat') || t.includes('urgent') || t.includes('shelter') || t.includes('hlc')) {
      return 'emergency';
    }
    if (t.includes('fest') || t.includes('cafeteria') || t.includes('lunch') || t.includes('football') || t.includes('match') || t.includes('casual') || t.includes('booth') || t.includes('club')) {
      return 'casual';
    }
    return 'normal';
  };

  // Battery color resolver: Black & White / Monochrome Palette
  const getBatteryColor = (level: number) => {
    if (level >= 75) return '#ffffff'; // Pure white (high charge)
    if (level >= 40) return '#d4d4d4'; // Light silver/gray
    if (level >= 18) return '#a3a3a3'; // Medium gray
    return '#737373'; // Dim gray (low charge)
  };

  // Student Watch State
  const [studentMessage, setStudentMessage] = useState('Class has started in Lecture Hall 3');
  const [studentConnected, setStudentConnected] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [isVibrating, setIsVibrating] = useState(false);
  const [isAlertHighlight, setIsAlertHighlight] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [alertHistory, setAlertHistory] = useState<Array<{ text: string; time: string; level: AlertLevel }>>([
    { text: "Class has started in Lecture Hall 3", time: "Initial", level: 'normal' }
  ]);

  // Code Viewer State
  const [selectedCodeFile, setSelectedCodeFile] = useState<'main_py' | 'requirements_txt' | 'admin_html' | 'student_html'>('main_py');
  const [copiedFile, setCopiedFile] = useState(false);

  // Audio Context Ref
  const audioCtxRef = useRef<AudioContext | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const lastKnownMessageRef = useRef<string>('Class has started');
  const isInitialLoadRef = useRef(true);

  // 1. Live Clock & Date update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      setCurrentTime(`${hours}:${minutes} ${ampm}`);

      const day = String(now.getDate()).padStart(2, '0');
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthStr = months[now.getMonth()];
      const year = now.getFullYear();
      setCurrentDate(`${day} ${monthStr} ${year}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulated Battery Drain: decreases charge level gradually
  useEffect(() => {
    if (!batteryAutoDrain) return;
    const drainTimer = setInterval(() => {
      setBatteryLevel((prev) => {
        const next = prev - 1;
        return next < 5 ? 100 : next;
      });
    }, 9000);
    return () => clearInterval(drainTimer);
  }, [batteryAutoDrain]);

  // 2. Web Audio API Alert Chime (customized for Emergency, Normal, and Casual levels)
  const playAlertSound = (level: AlertLevel = 'normal') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      if (level === 'emergency') {
        // Emergency: Rapid urgent multi-tone siren burst (960Hz / 1440Hz staccato alarm)
        [0, 0.12, 0.24, 0.36].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(960, now + offset);
          osc.frequency.linearRampToValueAtTime(1440, now + offset + 0.08);
          gain.gain.setValueAtTime(0.28, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.1);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.1);
        });
      } else if (level === 'casual') {
        // Casual: Soft gentle melodic double-bell blip (523Hz C5 -> 659Hz E5)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now);
        gain1.gain.setValueAtTime(0.12, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.15);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, now + 0.1);
        gain2.gain.setValueAtTime(0.12, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.28);
      } else {
        // Normal: Standard crisp dual campus chime (880Hz A5 -> 1320Hz E6)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);
        gain1.gain.setValueAtTime(0.18, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.12);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1320, now + 0.08);
        gain2.gain.setValueAtTime(0.2, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.32);
      }
    } catch (err) {
      console.warn("Audio playback issue:", err);
    }
  };

  // 3. Web Speech Recognition (en-IN)
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setAdminStatus({ text: 'Speech recognition unsupported', type: 'error' });
      return;
    }

    if (isListening) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsListening(false);
      setAdminStatus({ text: 'Ready', type: 'ready' });
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-IN'; // Master prompt requirement: en-IN
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
          setIsListening(true);
          setAdminStatus({ text: '🎙 Listening...', type: 'info' });
        };

        recognition.onresult = (e: any) => {
          const transcript = e.results[0][0].transcript;
          if (transcript) {
            setAdminInput(transcript);
            const detectedLevel = resolveAlertLevel(transcript);
            setSelectedLevel(detectedLevel);
            setAdminStatus({ text: `Voice transcribed (${detectedLevel.toUpperCase()}). Press SEND.`, type: 'info' });
          }
        };

        recognition.onerror = (e: any) => {
          setIsListening(false);
          if (e.error === 'not-allowed') {
            setAdminStatus({ text: 'Mic permission denied', type: 'error' });
          } else if (e.error === 'no-speech') {
            setAdminStatus({ text: 'No speech detected', type: 'info' });
          } else {
            setAdminStatus({ text: `Mic error: ${e.error}`, type: 'error' });
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        speechRecognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error("Mic start failed", err);
        setAdminStatus({ text: 'Could not start microphone', type: 'error' });
        setIsListening(false);
      }
    }
  };

  // 4. Send Message from Admin Watch (POST /admin-message with level)
  const handleSendMessage = async () => {
    const trimmed = adminInput.trim();
    if (!trimmed) {
      setAdminStatus({ text: 'Enter a message first', type: 'error' });
      return;
    }

    if (simulatedDisconnect) {
      setAdminStatus({ text: '✕ Server error', type: 'error' });
      return;
    }

    setIsSending(true);
    setAdminStatus({ text: `Sending ${selectedLevel} alert...`, type: 'info' });

    try {
      if (networkLatencyMs > 0) {
        await new Promise((r) => setTimeout(r, networkLatencyMs));
      }

      const response = await fetch(`${serverUrl}/admin-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, level: selectedLevel })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setAdminStatus({ text: `✓ ${selectedLevel.toUpperCase()} alert sent`, type: 'success' });

      // Automatically increment 24-hour frequency count for this alert type and level
      const cat = categorizeAlert(trimmed);
      setAlertCounts((prev) => ({
        ...prev,
        [cat]: (prev[cat] || 0) + 1
      }));
      setLevelCounts((prev) => ({
        ...prev,
        [selectedLevel]: (prev[selectedLevel] || 0) + 1
      }));

      // Reset status to Ready after 3.5s
      setTimeout(() => {
        setAdminStatus((prev) => (prev.text.startsWith('✓') ? { text: 'Ready', type: 'ready' } : prev));
      }, 3500);
    } catch (err) {
      console.error("Send message error:", err);
      setAdminStatus({ text: '✕ Server error', type: 'error' });
      setTimeout(() => {
        setAdminStatus((prev) => (prev.text === '✕ Server error' ? { text: 'Ready', type: 'ready' } : prev));
      }, 3500);
    } finally {
      setIsSending(false);
    }
  };

  // Helper: Direct alert dispatch (supports explicit level)
  const sendDirectAlert = async (text: string, level?: AlertLevel) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const targetLevel = level || resolveAlertLevel(trimmed);
    try {
      await fetch(`${serverUrl}/admin-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, level: targetLevel })
      });
      const cat = categorizeAlert(trimmed);
      setAlertCounts((prev) => ({
        ...prev,
        [cat]: (prev[cat] || 0) + 1
      }));
      setLevelCounts((prev) => ({
        ...prev,
        [targetLevel]: (prev[targetLevel] || 0) + 1
      }));
    } catch (err) {
      console.error("Direct alert send failed:", err);
    }
  };

  // 5. Polling Loop for Student Watch (GET /admin-message approx every 1s)
  useEffect(() => {
    let isMounted = true;

    const poll = async () => {
      if (simulatedDisconnect) {
        if (isMounted) {
          setStudentConnected(false);
          setServerOnline(false);
        }
        return;
      }

      try {
        const response = await fetch(`${serverUrl}/admin-message`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const incoming = data.message || '';
        const incomingLevel: AlertLevel = resolveAlertLevel(incoming, data.level);

        if (!isMounted) return;

        setStudentConnected(true);
        setServerOnline(true);
        const now = new Date();
        setLastSyncTime(`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`);

        // New alert arrival check
        if (incoming !== lastKnownMessageRef.current) {
          lastKnownMessageRef.current = incoming;
          setCurrentAlertLevel(incomingLevel);

          if (isInitialLoadRef.current) {
            setStudentMessage(incoming);
            isInitialLoadRef.current = false;
          } else {
            // Trigger New Alert Sequence
            setStudentMessage(incoming);
            setAlertHistory((prev) => [
              { text: incoming, time: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`, level: incomingLevel },
              ...prev.slice(0, 7)
            ]);

            // Web Audio Chime tailored to priority level
            playAlertSound(incomingLevel);

            // Device Vibration tailored to priority level
            if ('vibrate' in navigator) {
              try {
                if (incomingLevel === 'emergency') {
                  navigator.vibrate([250, 80, 250, 80, 250]);
                } else if (incomingLevel === 'casual') {
                  navigator.vibrate([120]);
                } else {
                  navigator.vibrate([200, 100, 200]);
                }
              } catch (e) {
                // ignore
              }
            }
            // Visual vibration shake
            setIsVibrating(true);
            setTimeout(() => setIsVibrating(false), incomingLevel === 'emergency' ? 800 : 450);

            // Temporarily highlight watch border
            setIsAlertHighlight(true);
            setTimeout(() => setIsAlertHighlight(false), incomingLevel === 'emergency' ? 2500 : 1800);
          }
        }
      } catch (err) {
        if (isMounted) {
          setStudentConnected(false);
          setServerOnline(false);
        }
      }
    };

    // Immediate poll then 1s interval
    poll();
    const interval = setInterval(poll, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [serverUrl, simulatedDisconnect, soundEnabled]);

  // Code files content strings
  const codeFiles = {
    main_py: `"""
Campus WiFi Watch System - FastAPI Server
Backend REST API for virtual smartwatch communication on local Wi-Fi / LAN.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Initialize FastAPI application
app = FastAPI(
    title="Campus WiFi Watch Server",
    description="Local LAN message broker linking Admin Watch and Student Watch prototypes",
    version="1.0.0"
)

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for the latest message
latest_data = {
    "message": "Class has started"
}

# Request schema for admin message
class AdminMessage(BaseModel):
    message: str


@app.get("/")
def get_root():
    return {
        "status": "online",
        "message": "Campus WiFi Watch Server is running"
    }


@app.post("/admin-message")
def post_admin_message(payload: AdminMessage):
    global latest_data
    latest_data["message"] = payload.message
    return {
        "status": "success",
        "from": "admin",
        "message": payload.message
    }


@app.get("/admin-message")
def get_admin_message():
    return {
        "message": latest_data["message"]
    }


if __name__ == "__main__":
    import uvicorn
    # Run server binding to all network interfaces on port 8000
    print("Starting Campus WiFi Watch Server on http://0.0.0.0:8000 ...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)`,

    requirements_txt: `fastapi
uvicorn
pydantic`,

    admin_html: `<!-- dashboard/index.html (Admin Watch) -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Admin Watch - Campus WiFi Watch System</title>
  <!-- Full standalone Apple-style 210x270 compact watch UI with Web Speech API -->
  <!-- View full code in dashboard/index.html -->
</head>
<body>
  <!-- Available directly at http://localhost:3000/dashboard/index.html -->
</body>
</html>`,

    student_html: `<!-- dashboard/watch.html (Student Watch) -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Student Watch - Campus WiFi Watch System</title>
  <!-- Full standalone 210x270 watch UI with 1s Polling, Web Audio chime, vibration -->
  <!-- View full code in dashboard/watch.html -->
</head>
<body>
  <!-- Available directly at http://localhost:3000/dashboard/watch.html -->
</body>
</html>`
  };

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans selection:bg-white selection:text-black">
      {/* Universal Top Navigation Bar — Clean, Modern, Minimalist */}
      <header className="h-14 border-b border-neutral-800 bg-black/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-50">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-white text-black flex items-center justify-center font-bold text-xs">
            <Radio className="w-3.5 h-3.5 text-black" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-white">Campus WiFi Watch</span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${serverOnline ? 'bg-white shadow-[0_0_6px_#ffffff]' : 'bg-neutral-600'}`}></span>
              {serverOnline ? 'LAN Active' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              activeTab === 'home'
                ? 'bg-white text-black font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              activeTab === 'simulator'
                ? 'bg-white text-black font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            Simulator
          </button>
          <button
            onClick={() => setActiveTab('hardware')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors hidden sm:block ${
              activeTab === 'hardware'
                ? 'bg-white text-black font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            Hardware
          </button>
          <button
            onClick={() => setActiveTab('deployment')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors hidden md:block ${
              activeTab === 'deployment'
                ? 'bg-white text-black font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            Deployment
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors hidden lg:block ${
              activeTab === 'code'
                ? 'bg-white text-black font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            Code
          </button>
        </nav>

        {/* Right: Quick Tools */}
        <div className="flex items-center gap-2">
          <a
            href="/dashboard/index.html"
            target="_blank"
            rel="noopener noreferrer"
            title="Open pure standalone Admin Watch HTML"
            className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-neutral-400 hover:text-white px-2 py-1 rounded transition-colors"
          >
            <span>Admin Watch</span>
            <ExternalLink className="w-3 h-3 text-neutral-500" />
          </a>
          <a
            href="/dashboard/watch.html"
            target="_blank"
            rel="noopener noreferrer"
            title="Open pure standalone Student Watch HTML"
            className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-neutral-400 hover:text-white px-2 py-1 rounded transition-colors"
          >
            <span>Student Watch</span>
            <ExternalLink className="w-3 h-3 text-neutral-500" />
          </a>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
            title={soundEnabled ? 'Chime sound active' : 'Sound muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-white" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* ========================================================= */}
        {/* TAB 1: HOME INTERFACE ("Time & Date, Recent Alerts")      */}
        {/* Clean, minimalist design strictly containing ONLY:        */}
        {/* 1. Time & Date                                            */}
        {/* 2. Recent Alerts                                          */}
        {/* ========================================================= */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-8 max-w-3xl mx-auto w-full py-2">
            
            {/* 1. TIME & DATE SECTION — Clean Architectural Clock */}
            <section className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-6 pb-3 border-b border-neutral-800">
                <span className="font-semibold uppercase tracking-widest text-neutral-300">
                  Campus Watch System
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-400">
                  <span className={`w-1.5 h-1.5 rounded-full ${serverOnline && !simulatedDisconnect ? 'bg-white shadow-[0_0_4px_#ffffff]' : 'bg-neutral-600'}`} />
                  {serverOnline && !simulatedDisconnect ? 'LAN Synchronized' : 'Offline'}
                </span>
              </div>

              {/* Prominent Large Digital Clock */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Current Time
                  </div>
                  <div className="text-5xl sm:text-6xl font-black text-white font-mono tracking-tight tabular-nums">
                    {currentTime || '10:45 AM'}
                  </div>
                </div>

                <div className="sm:text-right">
                  <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Date
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-neutral-200 font-mono tracking-tight">
                    {currentDate || '04 Oct 2026'}
                  </div>
                  <div className="text-xs text-neutral-400 mt-1 font-mono">
                    Local Campus Network Timezone
                  </div>
                </div>
              </div>
            </section>

            {/* 2. RECENT ALERTS SECTION — Clean High-Contrast Feed */}
            <section className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col gap-6">
              
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">Recent Alerts</h2>
                  <span className="text-xs text-neutral-400 font-mono">
                    ({alertHistory.length})
                  </span>
                </div>
                <span className="text-[11px] text-neutral-400 font-mono">
                  Live Broadcast Feed
                </span>
              </div>

              {/* Active / Latest Alert Banner */}
              <div
                className={`rounded-xl p-5 border transition-all ${
                  isAlertHighlight
                    ? currentAlertLevel === 'emergency'
                      ? 'bg-neutral-900 border-white shadow-[0_0_24px_rgba(255,255,255,0.7)] animate-pulse'
                      : 'bg-neutral-900 border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                    : 'bg-black border-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${currentAlertLevel === 'emergency' ? 'bg-white shadow-[0_0_8px_#ffffff] animate-ping' : currentAlertLevel === 'casual' ? 'bg-neutral-400' : 'bg-white animate-pulse'}`} />
                    Latest Broadcast • <span className={`font-mono ${currentAlertLevel === 'emergency' ? 'font-black underline underline-offset-2' : ''}`}>{currentAlertLevel.toUpperCase()} ALERT</span>
                  </span>
                  <span className="text-[11px] text-neutral-400 font-mono tabular-nums">
                    {lastSyncTime}
                  </span>
                </div>

                <div className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug py-1">
                  "{studentMessage || 'No alerts broadcast yet'}"
                </div>

                <div className="mt-3 pt-2 text-[11px] text-neutral-400 flex items-center justify-between font-mono">
                  <span>Source: Administrator Watch</span>
                  <span>Priority: <strong className="text-white uppercase font-bold">{currentAlertLevel}</strong></span>
                </div>
              </div>

              {/* Alert History Stream */}
              <div className="flex flex-col divide-y divide-neutral-900">
                {alertHistory.map((item, idx) => {
                  const level = item.level || resolveAlertLevel(item.text);

                  return (
                    <div
                      key={idx}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm hover:bg-white/[0.02] px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 w-24 ${
                          level === 'emergency'
                            ? 'text-white font-black underline underline-offset-2'
                            : level === 'casual'
                            ? 'text-neutral-500'
                            : 'text-neutral-300'
                        }`}>
                          [{level.toUpperCase()}]
                        </span>
                        <span className="text-white font-medium">
                          {item.text}
                        </span>
                      </div>

                      <div className="text-xs text-neutral-400 font-mono tabular-nums shrink-0 self-end sm:self-auto">
                        {item.time}
                      </div>
                    </div>
                  );
                })}
              </div>

            </section>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SIMULATOR ("Dual Smartwatch Units + 24-Hour Alert Frequency Chart") */}
        {/* ========================================================================= */}
        {activeTab === 'simulator' && (
          <div className="flex flex-col gap-6">
            
            {/* Top Simulator Hero Banner: Time & Date + Network Controls (Black & White) */}
            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center text-white">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-xl sm:text-2xl font-black text-white tracking-tight tabular-nums font-mono">
                      {currentTime || '10:45 AM'}
                    </span>
                    <span className="text-neutral-600 text-sm">·</span>
                    <span className="text-xs sm:text-sm font-bold text-neutral-300 uppercase tracking-wider font-mono tabular-nums">
                      {currentDate || '04 Oct 2026'}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1.5 text-white font-medium">
                      <span className={`w-1.5 h-1.5 rounded-full ${serverOnline && !simulatedDisconnect ? 'bg-white shadow-[0_0_6px_#ffffff] animate-pulse' : 'bg-neutral-600'}`} />
                      {serverOnline && !simulatedDisconnect ? 'Wi-Fi LAN Online' : 'Wi-Fi Disconnected'}
                    </span>
                    <span>·</span>
                    <span>Dual Smartwatch Simulation & 24h Telemetry</span>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => playAlertSound(selectedLevel)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 flex items-center gap-1.5 transition-colors font-mono"
                  title={`Test ${selectedLevel.toUpperCase()} chime sound`}
                >
                  <Volume2 className="w-3.5 h-3.5 text-white" />
                  <span>Test {selectedLevel.toUpperCase()} Chime</span>
                </button>
                <button
                  onClick={() => setSimulatedDisconnect(!simulatedDisconnect)}
                  className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-bold transition-colors ${
                    simulatedDisconnect
                      ? 'bg-white text-black border-white'
                      : 'bg-neutral-900 text-white border-neutral-700 hover:bg-neutral-800'
                  }`}
                  title="Simulate network drops to verify fallback behaviors"
                >
                  {simulatedDisconnect ? <WifiOff className="w-3.5 h-3.5 text-black" /> : <Wifi className="w-3.5 h-3.5 text-white" />}
                  <span>{simulatedDisconnect ? 'Restore Wi-Fi' : 'Simulate Wi-Fi Drop'}</span>
                </button>
              </div>
            </div>

            {/* Side-by-Side Dual Smartwatch Stage (Monochrome Precision) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start justify-items-center py-4">
              
              {/* -------------------------------------------------- */}
              {/* DEVICE 1: ADMIN WATCH (210 x 270 px active display) */}
              {/* -------------------------------------------------- */}
              <div className="flex flex-col items-center">
                <div className="text-center mb-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-white">Admin Watch Unit</div>
                  <div className="text-[11px] text-neutral-400">Wristband Control • Voice & Quick Presets</div>
                </div>

                {/* Outer Strap simulation */}
                <div className="w-28 h-5 bg-[#181818] rounded-t-md opacity-90 mb-[-6px] z-0 shadow-inner"></div>

                {/* Aerospace Aluminum Hardware Case (Black & Chrome) */}
                <div className="relative z-10 bg-gradient-to-br from-[#252525] via-[#141414] to-[#0a0a0a] p-[10px] rounded-[38px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_1px_rgba(255,255,255,0.3)]">
                  
                  {/* Digital Crown */}
                  <div className="absolute -right-2 top-11 w-2 h-9 bg-gradient-to-b from-neutral-400 via-neutral-200 to-neutral-500 rounded-r-sm shadow-md"></div>
                  {/* Side Button */}
                  <div className="absolute -right-1.5 top-24 w-1.5 h-7 bg-neutral-600 rounded-r-xs"></div>
                  {/* Mic Pinhole */}
                  <div className="absolute left-1 top-20 w-1 h-1 bg-black rounded-full shadow-inner"></div>

                  {/* Active 210 x 270 px OLED Screen */}
                  <div className="w-[210px] h-[270px] bg-black rounded-[28px] p-2.5 flex flex-col justify-between relative overflow-hidden border border-white/10 select-none shadow-inner">
                    
                    {/* Glass curved glare */}
                    <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-20"></div>

                    {/* Top Row: Time, Wi-Fi, and Visual Battery Level Icon (Top-Right) */}
                    <div>
                      <div className="flex justify-between items-center text-[9px] text-neutral-400 mb-0.5">
                        <span className="font-bold text-white tracking-tight tabular-nums text-[10px]">{currentTime || '10:45 AM'}</span>
                        
                        <div className="flex items-center gap-1.5">
                          {/* Wi-Fi Indicator */}
                          <div className="flex items-center gap-1 text-[8px] text-neutral-300 font-medium">
                            <span className={`w-1.5 h-1.5 rounded-full ${simulatedDisconnect ? 'bg-neutral-600' : 'bg-white shadow-[0_0_5px_#ffffff]'}`}></span>
                            <span>{simulatedDisconnect ? 'Offline' : 'Wi-Fi'}</span>
                          </div>

                          {/* Visual Battery Level Icon (Top-Right, Black & White) */}
                          <div
                            onClick={() => {
                              const presets = [100, 75, 55, 30, 14, 5];
                              const next = presets[(presets.indexOf(batteryLevel) + 1) % presets.length] || 100;
                              setBatteryLevel(next);
                            }}
                            title={`Battery: ${batteryLevel}% (Click to cycle charge)`}
                            className="flex items-center gap-1 cursor-pointer bg-white/5 hover:bg-white/10 px-1 py-0.5 rounded transition-all select-none"
                          >
                            <span
                              className="text-[7.5px] font-bold tabular-nums transition-colors"
                              style={{ color: getBatteryColor(batteryLevel) }}
                            >
                              {batteryLevel}%
                            </span>
                            <div className="relative w-3.5 h-[7.5px] border border-white/60 rounded-[1.5px] p-[0.5px] flex items-center bg-black/60">
                              <div
                                className={`h-full rounded-[0.5px] transition-all duration-300 ${batteryLevel < 18 ? 'animate-pulse' : ''}`}
                                style={{
                                  width: `${batteryLevel}%`,
                                  backgroundColor: getBatteryColor(batteryLevel),
                                  boxShadow: `0 0 4px ${getBatteryColor(batteryLevel)}`
                                }}
                              />
                              <div className="absolute -right-[2px] top-[1.5px] w-[1px] h-[3px] bg-white/60 rounded-r-xs" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Title & Role */}
                      <div className="flex justify-between items-baseline border-b border-neutral-800 pb-1 mb-1.5">
                        <span className="font-bold text-white text-[11px]">Campus Watch</span>
                        <span className="text-[8.5px] font-bold text-neutral-300 uppercase tracking-widest">Administrator</span>
                      </div>
                    </div>

                    {/* Scrollable Center: Level Selector, Input, Mic, Send, Tiered Presets */}
                    <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto pr-0.5">
                      
                      {/* Alert Priority Tier Selector: Emergency | Normal | Casual */}
                      <div className="flex items-center gap-1 bg-[#0a0a0a] border border-neutral-800 p-0.5 rounded-lg text-[8px] font-mono">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLevel('emergency');
                            if (!adminInput || adminInput === 'Class has started in Lecture Hall 3') {
                              setAdminInput(LEVEL_PRESETS.emergency[0].text);
                            }
                          }}
                          className={`flex-1 py-0.5 rounded font-bold tracking-tight transition-all ${
                            selectedLevel === 'emergency'
                              ? 'bg-white text-black font-black shadow-sm'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                          title="High priority emergency broadcast with siren chime & rapid pulse"
                        >
                          EMERGENCY
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLevel('normal');
                            if (!adminInput || adminInput.includes('Emergency')) {
                              setAdminInput(LEVEL_PRESETS.normal[0].text);
                            }
                          }}
                          className={`flex-1 py-0.5 rounded font-bold tracking-tight transition-all ${
                            selectedLevel === 'normal'
                              ? 'bg-white text-black font-black shadow-sm'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                          title="Standard campus announcement with dual chime"
                        >
                          NORMAL
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLevel('casual');
                            if (!adminInput || adminInput.includes('Emergency') || adminInput.includes('Class')) {
                              setAdminInput(LEVEL_PRESETS.casual[0].text);
                            }
                          }}
                          className={`flex-1 py-0.5 rounded font-bold tracking-tight transition-all ${
                            selectedLevel === 'casual'
                              ? 'bg-white text-black font-black shadow-sm'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                          title="Casual informational notice with gentle bell chime"
                        >
                          CASUAL
                        </button>
                      </div>

                      {/* Textarea */}
                      <div className="relative">
                        <textarea
                          value={adminInput}
                          onChange={(e) => setAdminInput(e.target.value)}
                          placeholder="Type or speak alert..."
                          rows={2}
                          className="w-full bg-[#111111] text-white text-[10px] rounded-lg p-1.5 border border-neutral-700 focus:border-white focus:outline-none resize-none placeholder:text-neutral-500 font-sans"
                        />
                      </div>

                      {/* Buttons: MIC + SEND (Black & White) */}
                      <div className="grid grid-cols-5 gap-1.5">
                        <button
                          type="button"
                          onClick={toggleSpeechRecognition}
                          className={`col-span-2 h-7 rounded-lg text-[9.5px] font-semibold flex items-center justify-center gap-1 border transition-all ${
                            isListening
                              ? 'bg-white border-white text-black font-bold animate-pulse'
                              : 'bg-neutral-900 border-neutral-700 text-neutral-200 hover:bg-neutral-800'
                          }`}
                          title="Speak alert (Web Speech API, en-IN)"
                        >
                          {isListening ? <MicOff className="w-3 h-3 text-black" /> : <Mic className="w-3 h-3 text-white" />}
                          <span>{isListening ? 'STOP' : 'MIC'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleSendMessage}
                          disabled={isSending}
                          className="col-span-3 h-7 bg-white hover:bg-neutral-200 text-black font-bold disabled:opacity-50 rounded-lg text-[9.5px] flex items-center justify-center gap-1 shadow-sm transition-all"
                        >
                          <Send className="w-3 h-3 text-black" />
                          <span>{isSending ? 'SENDING...' : `SEND ${selectedLevel.toUpperCase()}`}</span>
                        </button>
                      </div>

                      {/* Status Banner */}
                      <div
                        className={`text-[8.5px] font-semibold text-center py-0.5 px-1.5 rounded transition-all ${
                          adminStatus.type === 'success'
                            ? 'text-white bg-neutral-900 border border-white'
                            : adminStatus.type === 'error'
                            ? 'text-neutral-400 bg-neutral-900 border border-neutral-700'
                            : 'text-neutral-300 bg-neutral-900'
                        }`}
                      >
                        {adminStatus.text}
                      </div>

                      {/* Tiered Presets List (Matched to selected level) */}
                      <div className="mt-0.5">
                        <div className="text-[7.5px] uppercase font-bold text-neutral-400 tracking-wider mb-1 flex items-center justify-between">
                          <span>{selectedLevel.toUpperCase()} PRESETS</span>
                          <span className="text-[7px] text-neutral-500 font-mono">1-tap select</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          {LEVEL_PRESETS[selectedLevel].map((item, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setAdminInput(item.text);
                                setAdminStatus({ text: `${selectedLevel.toUpperCase()} loaded`, type: 'info' });
                              }}
                              className="text-left text-[8.5px] text-neutral-300 bg-[#121212] hover:bg-neutral-800 hover:text-white border border-neutral-800 px-1.5 py-1 rounded truncate transition-colors"
                              title={item.text}
                            >
                              {item.text}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Info */}
                    <div className="border-t border-neutral-800 pt-1 flex justify-between text-[8px] text-neutral-400 tabular-nums">
                      <span>{currentDate || '04 Oct 2026'}</span>
                      <span>LAN :8000</span>
                    </div>

                  </div>
                </div>

                {/* Bottom Strap simulation */}
                <div className="w-28 h-5 bg-[#181818] rounded-b-md opacity-90 mt-[-6px] z-0 shadow-inner"></div>

                {/* Admin Quick Action Pills */}
                <div className="mt-4 flex items-center gap-2">
                  <a
                    href="/dashboard/index.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg"
                  >
                    <span>Launch Standalone Admin Window</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>


              {/* -------------------------------------------------- */}
              {/* DEVICE 2: STUDENT WATCH (210 x 270 px active display) */}
              {/* -------------------------------------------------- */}
              <div className="flex flex-col items-center">
                <div className="text-center mb-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-white">Student Watch Unit</div>
                  <div className="text-[11px] text-neutral-400">Automatic 1s LAN Polling • Audio & Haptic Chime</div>
                </div>

                {/* Outer Strap simulation */}
                <div className="w-28 h-5 bg-[#181818] rounded-t-md opacity-90 mb-[-6px] z-0 shadow-inner"></div>

                {/* Aerospace Aluminum Hardware Case with Vibration Animation */}
                <div
                  className={`relative z-10 bg-gradient-to-br from-[#252525] via-[#141414] to-[#0a0a0a] p-[10px] rounded-[38px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_1px_rgba(255,255,255,0.3)] transition-transform ${
                    isVibrating ? 'animate-bounce' : ''
                  }`}
                >
                  
                  {/* Digital Crown */}
                  <div className="absolute -right-2 top-11 w-2 h-9 bg-gradient-to-b from-neutral-400 via-neutral-200 to-neutral-500 rounded-r-sm shadow-md"></div>
                  {/* Side Button */}
                  <div className="absolute -right-1.5 top-24 w-1.5 h-7 bg-neutral-600 rounded-r-xs"></div>
                  {/* CNC Speaker Grille */}
                  <div className="absolute left-1 top-18 flex flex-col gap-1">
                    <span className="w-1 h-1 bg-black rounded-full"></span>
                    <span className="w-1 h-1 bg-black rounded-full"></span>
                    <span className="w-1 h-1 bg-black rounded-full"></span>
                  </div>

                  {/* Active 210 x 270 px OLED Screen with Temporary Highlight Border */}
                  <div
                    className={`w-[210px] h-[270px] bg-black rounded-[28px] p-2.5 flex flex-col justify-between relative overflow-hidden select-none shadow-inner transition-all duration-300 ${
                      isAlertHighlight
                        ? currentAlertLevel === 'emergency'
                          ? 'border-2 border-white shadow-[0_0_24px_rgba(255,255,255,0.9),inset_0_0_20px_rgba(255,255,255,0.5)] animate-pulse'
                          : 'border-2 border-white shadow-[0_0_16px_rgba(255,255,255,0.6)]'
                        : 'border border-white/10'
                    }`}
                  >
                    
                    {/* Glass curved glare */}
                    <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-20"></div>

                    {/* 1. TIME & DATE (Clean Watch Home Interface) */}
                    <div className="text-center pb-2 border-b border-white/10 mb-2">
                      <div className="text-2xl font-extrabold text-white tracking-tight tabular-nums leading-none">
                        {currentTime || '10:45 AM'}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-semibold tracking-wider uppercase mt-1 tabular-nums">
                        {currentDate || '04 Oct 2026'}
                      </div>
                    </div>

                    {/* 2. RECENT ALERTS WITH PRIORITY BADGE */}
                    <div className="flex-1 flex flex-col justify-between overflow-hidden">
                      <div className="flex justify-between items-center px-0.5 mb-1.5">
                        <div className="flex items-center gap-1.5 text-[8.5px] font-extrabold tracking-wider uppercase">
                          <span className={`w-1.5 h-1.5 rounded-full ${currentAlertLevel === 'emergency' ? 'bg-white animate-ping' : 'bg-white animate-pulse'}`} />
                          <span className={currentAlertLevel === 'emergency' ? 'text-white font-black underline' : currentAlertLevel === 'casual' ? 'text-neutral-400' : 'text-white'}>
                            {currentAlertLevel.toUpperCase()} ALERT
                          </span>
                        </div>
                        <span className="text-[8px] font-semibold text-white font-mono">
                          {studentConnected ? '● Live' : '○ Offline'}
                        </span>
                      </div>

                      {/* Current Recent Alert Card */}
                      <div
                        className={`flex-1 rounded-xl p-2.5 flex flex-col justify-between border transition-all ${
                          isAlertHighlight
                            ? currentAlertLevel === 'emergency'
                              ? 'bg-neutral-900 border-white shadow-[0_0_16px_rgba(255,255,255,0.5)]'
                              : 'bg-[#181818] border-white shadow-[0_0_14px_rgba(255,255,255,0.4)]'
                            : 'bg-[#0e0e0e] border-neutral-800'
                        }`}
                      >
                        <div className="text-[11.5px] font-semibold text-white leading-snug break-words max-h-24 overflow-y-auto">
                          {studentMessage || 'Waiting for recent alerts...'}
                        </div>

                        <div className="flex justify-between items-center text-[8px] text-neutral-400 pt-1.5 border-t border-neutral-800 mt-1">
                          <span className="tabular-nums font-mono text-neutral-400">{lastSyncTime}</span>
                          <span className={`font-mono uppercase font-bold text-[8px] ${
                            currentAlertLevel === 'emergency' ? 'text-white bg-black px-1 rounded border border-white' : 'text-neutral-300'
                          }`}>
                            [{currentAlertLevel}]
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Bottom Strap simulation */}
                <div className="w-28 h-5 bg-[#181818] rounded-b-md opacity-90 mt-[-6px] z-0 shadow-inner"></div>

                {/* Student Quick Action Pills */}
                <div className="mt-4 flex items-center gap-2">
                  <a
                    href="/dashboard/watch.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg"
                  >
                    <span>Launch Standalone Student Window</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

            </div>

            {/* ========================================================= */}
            {/* 24-HOUR ALERT FREQUENCY BAR CHART SECTION (Black & White) */}
            {/* ========================================================= */}
            {(() => {
              const categories = [
                {
                  id: 'class',
                  name: 'Class Schedules',
                  shortName: 'Class',
                  icon: BookOpen,
                  count: alertCounts.class,
                  color: '#ffffff',
                  barGradient: 'from-white via-neutral-200 to-neutral-500',
                  bgAccent: 'bg-neutral-900',
                  borderAccent: 'border-neutral-700',
                  description: 'Start of lectures, lab relocations, faculty arrivals',
                  sample: 'Class has started'
                },
                {
                  id: 'exam',
                  name: 'Exam Alerts',
                  shortName: 'Exams',
                  icon: Bell,
                  count: alertCounts.exam,
                  color: '#e5e5e5',
                  barGradient: 'from-neutral-200 via-neutral-400 to-neutral-600',
                  bgAccent: 'bg-neutral-900',
                  borderAccent: 'border-neutral-700',
                  description: 'Exam hall schedules, seating rosters, and time reminders',
                  sample: 'Exam starts at 10 AM'
                },
                {
                  id: 'event',
                  name: 'Campus Events',
                  shortName: 'Events',
                  icon: TrendingUp,
                  count: alertCounts.event,
                  color: '#d4d4d4',
                  barGradient: 'from-neutral-300 via-neutral-500 to-neutral-700',
                  bgAccent: 'bg-neutral-900',
                  borderAccent: 'border-neutral-700',
                  description: 'College festivals, guest seminars, workshops, and sports',
                  sample: 'College event starting now'
                },
                {
                  id: 'emergency',
                  name: 'Emergency / Safety',
                  shortName: 'Emergency',
                  icon: ShieldAlert,
                  count: alertCounts.emergency,
                  color: '#ffffff',
                  barGradient: 'from-white via-neutral-100 to-neutral-400',
                  bgAccent: 'bg-neutral-900',
                  borderAccent: 'border-white',
                  description: 'Campus emergency broadcasts, evacuation notices, and health desk',
                  sample: 'Emergency alert. Please contact the HLC'
                },
                {
                  id: 'admin',
                  name: 'Admin Notices',
                  shortName: 'Admin',
                  icon: Info,
                  count: alertCounts.admin,
                  color: '#a3a3a3',
                  barGradient: 'from-neutral-400 via-neutral-600 to-neutral-800',
                  bgAccent: 'bg-neutral-900',
                  borderAccent: 'border-neutral-700',
                  description: 'Bus transit departures, library timings, and Wi-Fi system updates',
                  sample: 'Campus Wi-Fi speed optimization complete'
                }
              ];

              const total24h = categories.reduce((sum, c) => sum + c.count, 0);
              const maxCount = Math.max(...categories.map(c => c.count), 1);
              const topCategory = [...categories].sort((a, b) => b.count - a.count)[0];
              const gridMarks = [100, 75, 50, 25, 0];

              return (
                <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-5 shadow-2xl">
                  {/* Header Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-neutral-800/90 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center text-white">
                        <BarChart3 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white tracking-tight">Alert Frequency by Type (Last 24 Hours)</h3>
                          <span className="text-[10px] text-white bg-neutral-900 border border-neutral-700 px-2.5 py-0.5 rounded-full font-mono font-medium">
                            Live Wi-Fi Telemetry
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Visual distribution of broadcast categories sent from Admin Watch to campus wristbands
                        </p>
                      </div>
                    </div>

                    {/* View Controls & Quick Add Test Alert */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-black border border-neutral-800 rounded-lg p-0.5 text-xs">
                        <button
                          onClick={() => setChartViewMode('columns')}
                          className={`px-3 py-1 rounded-md transition-colors ${
                            chartViewMode === 'columns'
                              ? 'bg-white text-black font-bold shadow-sm'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          Column Chart
                        </button>
                        <button
                          onClick={() => setChartViewMode('bars')}
                          className={`px-3 py-1 rounded-md transition-colors ${
                            chartViewMode === 'bars'
                              ? 'bg-white text-black font-bold shadow-sm'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          Horizontal Bars
                        </button>
                      </div>

                      {/* Reset Baseline Button */}
                      <button
                        onClick={() => setAlertCounts({ class: 34, exam: 21, event: 16, emergency: 5, admin: 13 })}
                        className="text-xs px-2.5 py-1 text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-lg transition-colors"
                        title="Reset 24h baseline counts"
                      >
                        Reset Baseline
                      </button>
                    </div>
                  </div>

                  {/* Top Stats Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <div className="bg-[#111111] border border-neutral-800 rounded-lg p-3">
                      <div className="text-[11px] font-medium text-neutral-400 mb-1">Total Alerts (24h)</div>
                      <div className="text-xl font-bold text-white font-mono tabular-nums flex items-baseline gap-2">
                        {total24h}
                        <span className="text-[10px] text-neutral-400 font-sans font-normal">Active broadcasts</span>
                      </div>
                    </div>
                    <div className="bg-[#111111] border border-neutral-800 rounded-lg p-3">
                      <div className="text-[11px] font-medium text-neutral-400 mb-1">Most Frequent Type</div>
                      <div className="text-base font-bold text-white truncate flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_4px_#ffffff]" />
                        {topCategory.name}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono tabular-nums mt-0.5">
                        {topCategory.count} alerts ({Math.round((topCategory.count / total24h) * 100)}% share)
                      </div>
                    </div>
                    <div className="bg-[#111111] border border-neutral-800 rounded-lg p-3">
                      <div className="text-[11px] font-medium text-neutral-400 mb-1">Peak Broadcast Window</div>
                      <div className="text-base font-bold text-white font-mono">09:00 - 11:30 AM</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">Morning lecture start period</div>
                    </div>
                    <div className="bg-[#111111] border border-neutral-800 rounded-lg p-3">
                      <div className="text-[11px] font-medium text-neutral-400 mb-1">LAN Packet Latency</div>
                      <div className="text-base font-bold text-white font-mono">&lt; 85 ms</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">100% Student watch delivery</div>
                    </div>
                  </div>

                  {/* Priority Tier Distribution Breakdown (Emergency, Normal, Casual) */}
                  <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 mb-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Alert Priority Distribution
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {levelCounts.emergency + levelCounts.normal + levelCounts.casual} total severity-logged alerts
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-black border border-neutral-800 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            Emergency
                          </div>
                          <div className="text-2xl font-black text-white font-mono mt-0.5">{levelCounts.emergency}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-neutral-400 block">Siren Alarm</span>
                          <span className="text-[9px] font-mono text-neutral-500">Highest Priority</span>
                        </div>
                      </div>

                      <div className="bg-black border border-neutral-800 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-mono font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
                            Normal
                          </div>
                          <div className="text-2xl font-black text-neutral-200 font-mono mt-0.5">{levelCounts.normal}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-neutral-400 block">Standard Chime</span>
                          <span className="text-[9px] font-mono text-neutral-500">Class & Timetable</span>
                        </div>
                      </div>

                      <div className="bg-black border border-neutral-800 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                            Casual
                          </div>
                          <div className="text-2xl font-black text-neutral-300 font-mono mt-0.5">{levelCounts.casual}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-neutral-400 block">Gentle Bell</span>
                          <span className="text-[9px] font-mono text-neutral-500">Events & Reminders</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CHART VIEW 1: VERTICAL COLUMN BARS (Black & White) */}
                  {chartViewMode === 'columns' && (
                    <div className="space-y-4">
                      {/* Chart Canvas with Y-Axis and Gridlines */}
                      <div className="relative h-64 bg-black rounded-xl border border-neutral-800 p-4 pt-6 flex">
                        
                        {/* Y-Axis Labels */}
                        <div className="w-10 flex flex-col justify-between text-[10px] font-mono text-neutral-400 text-right pr-2 select-none">
                          {gridMarks.map((pct) => (
                            <span key={pct} className="tabular-nums">
                              {Math.round((maxCount * pct) / 100)}
                            </span>
                          ))}
                        </div>

                        {/* Chart Area with Gridlines & Columns */}
                        <div className="relative flex-1 flex items-end justify-around px-2 sm:px-6">
                          
                          {/* Horizontal Gridlines */}
                          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                            {gridMarks.map((pct) => (
                              <div key={pct} className="border-b border-neutral-800/60 w-full" />
                            ))}
                          </div>

                          {/* 5 Column Bars */}
                          {categories.map((cat) => {
                            const barHeightPercent = Math.max(12, Math.round((cat.count / maxCount) * 100));
                            const sharePercent = Math.round((cat.count / total24h) * 100);
                            const isHovered = activeChartHover === cat.id;

                            return (
                              <div
                                key={cat.id}
                                onMouseEnter={() => setActiveChartHover(cat.id)}
                                onMouseLeave={() => setActiveChartHover(null)}
                                className="relative flex flex-col items-center group w-14 sm:w-20 z-10"
                                style={{ height: '100%' }}
                              >
                                {/* Tooltip Popover on Hover */}
                                {isHovered && (
                                  <div className="absolute -top-20 z-30 bg-black text-white text-xs rounded-lg p-2.5 border border-neutral-700 shadow-2xl pointer-events-none whitespace-nowrap">
                                    <div className="font-bold flex items-center gap-1.5 text-white">
                                      <cat.icon className="w-3.5 h-3.5 text-white" />
                                      <span>{cat.name}</span>
                                    </div>
                                    <div className="font-mono text-[11px] text-neutral-300 mt-0.5">
                                      {cat.count} alerts dispatched ({sharePercent}% of total)
                                    </div>
                                    <div className="text-[10px] text-neutral-400 mt-0.5 max-w-[200px] truncate">
                                      Sample: "{cat.sample}"
                                    </div>
                                  </div>
                                )}

                                {/* Bar Column Container */}
                                <div className="w-full flex-1 flex items-end justify-center">
                                  <div
                                    className={`w-9 sm:w-12 rounded-t-lg bg-gradient-to-t ${cat.barGradient} transition-all duration-500 relative flex flex-col justify-between items-center p-1.5 cursor-pointer shadow-md ${
                                      isHovered ? 'scale-105 filter brightness-125' : 'opacity-90'
                                    }`}
                                    style={{
                                      height: `${barHeightPercent}%`,
                                      boxShadow: `0 0 14px rgba(255,255,255,0.2)`
                                    }}
                                    onClick={() => {
                                      setAlertCounts((prev) => ({
                                        ...prev,
                                        [cat.id]: (prev as any)[cat.id] + 1
                                      }));
                                    }}
                                    title="Click to simulate sending an alert for this category"
                                  >
                                    {/* Glowing Cap */}
                                    <div className="w-full h-1 bg-white rounded-full mb-1 shadow-[0_0_4px_#ffffff]" />

                                    {/* Inside Bar Value */}
                                    <span className="font-mono font-bold text-black text-xs drop-shadow-sm tabular-nums">
                                      {cat.count}
                                    </span>
                                  </div>
                                </div>

                                {/* X-Axis Category Name */}
                                <div className="mt-3 text-center">
                                  <div className="text-[11px] font-semibold text-neutral-200 truncate max-w-[70px] sm:max-w-none">
                                    {cat.shortName}
                                  </div>
                                  <div className="text-[10px] font-mono text-neutral-400 tabular-nums">
                                    {sharePercent}%
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                        </div>
                      </div>

                      {/* Chart Legend & Quick Interactive Increments (Monochrome) */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
                        <div className="flex flex-wrap items-center gap-3">
                          {categories.map((cat) => (
                            <div key={cat.id} className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: cat.color }} />
                              <span className="text-neutral-300">{cat.name}</span>
                              <span className="font-mono text-neutral-500 tabular-nums">({cat.count})</span>
                            </div>
                          ))}
                        </div>

                        {/* Interactive Click-to-Test buttons */}
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                          <span className="text-[10px] text-neutral-500 uppercase font-medium">Quick simulate:</span>
                          <button
                            onClick={() => setAlertCounts(p => ({ ...p, class: p.class + 1 }))}
                            className="px-2 py-0.5 bg-neutral-900 text-neutral-200 border border-neutral-700 rounded hover:bg-neutral-800 transition-colors"
                          >
                            +1 Class
                          </button>
                          <button
                            onClick={() => setAlertCounts(p => ({ ...p, exam: p.exam + 1 }))}
                            className="px-2 py-0.5 bg-neutral-900 text-neutral-200 border border-neutral-700 rounded hover:bg-neutral-800 transition-colors"
                          >
                            +1 Exam
                          </button>
                          <button
                            onClick={() => setAlertCounts(p => ({ ...p, event: p.event + 1 }))}
                            className="px-2 py-0.5 bg-neutral-900 text-neutral-200 border border-neutral-700 rounded hover:bg-neutral-800 transition-colors"
                          >
                            +1 Event
                          </button>
                          <button
                            onClick={() => setAlertCounts(p => ({ ...p, emergency: p.emergency + 1 }))}
                            className="px-2 py-0.5 bg-white text-black font-bold border border-white rounded hover:bg-neutral-200 transition-colors"
                          >
                            +1 Emergency
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CHART VIEW 2: HORIZONTAL PROGRESS BARS (Black & White) */}
                  {chartViewMode === 'bars' && (
                    <div className="space-y-3">
                      {categories.map((cat) => {
                        const sharePercent = Math.round((cat.count / total24h) * 100);

                        return (
                          <div
                            key={cat.id}
                            className="bg-[#0e0e0e] border border-neutral-800 rounded-lg p-3 hover:border-neutral-700 transition-colors"
                          >
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <div className="flex items-center gap-2">
                                <cat.icon className="w-3.5 h-3.5 text-white" />
                                <span className="font-semibold text-white">{cat.name}</span>
                                <span className="text-[11px] text-neutral-400 hidden sm:inline">— {cat.description}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-white tabular-nums">
                                  {cat.count} <span className="text-neutral-400 font-normal">alerts</span>
                                </span>
                                <span className="font-mono text-neutral-400 tabular-nums text-[11px] w-10 text-right">
                                  {sharePercent}%
                                </span>
                                <button
                                  onClick={() => setAlertCounts(prev => ({ ...prev, [cat.id]: (prev as any)[cat.id] + 1 }))}
                                  className="text-[10px] px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 transition-colors"
                                >
                                  +1 Test
                                </button>
                              </div>
                            </div>

                            {/* Horizontal Bar Fill */}
                            <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${cat.barGradient} transition-all duration-500`}
                                style={{
                                  width: `${Math.max(4, sharePercent)}%`,
                                  boxShadow: `0 0 8px rgba(255,255,255,0.3)`
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 24-Hour Timeline Distribution Sparkline Strip (Black & White) */}
                  <div className="mt-5 pt-4 border-t border-neutral-800">
                    <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                      <span className="font-medium text-neutral-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-white" />
                        24-Hour Broadcast Intensity Timeline
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500">
                        Campus Schedule Synchronization
                      </span>
                    </div>

                    {/* 24-hour hour blocks (00:00 to 23:00) */}
                    <div className="flex items-end gap-1 h-6 bg-black p-1.5 rounded-lg border border-neutral-800">
                      {[
                        0, 0, 0, 0, 0, 1, 2, 5, 12, 18, 14, 9, 7, 8, 13, 11, 8, 4, 3, 2, 1, 1, 0, 0
                      ].map((intensity, hour) => {
                        const hStr = String(hour).padStart(2, '0') + ':00';
                        const heightPct = Math.max(15, Math.round((intensity / 18) * 100));
                        const isPeak = intensity >= 12;

                        return (
                          <div
                            key={hour}
                            title={`${hStr}: ${intensity} alerts`}
                            className={`flex-1 rounded-xs transition-all cursor-pointer ${
                              isPeak
                                ? 'bg-white hover:bg-neutral-200 shadow-[0_0_4px_#ffffff]'
                                : intensity > 4
                                ? 'bg-neutral-400 hover:bg-neutral-300'
                                : 'bg-neutral-800 hover:bg-neutral-700'
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-neutral-400 mt-1.5">
                      <span>00:00 (Midnight)</span>
                      <span>06:00 AM</span>
                      <span className="text-white font-semibold">10:00 AM (Peak Lectures)</span>
                      <span className="text-white font-semibold">14:00 PM (Afternoon)</span>
                      <span>18:00 PM</span>
                      <span>23:00 PM</span>
                    </div>
                  </div>

                </div>
              );
            })()}

            {/* Bottom Alert Log Table (Black & White) */}
            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-4 mt-2 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-white" />
                  Live Alert Stream & Polling Audit
                </span>
                <span className="text-[11px] text-neutral-400 tabular-nums">
                  Polling endpoint: <code className="text-white">GET /admin-message</code> (1000ms)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 text-[11px]">
                      <th className="py-2 px-3 font-medium">Timestamp</th>
                      <th className="py-2 px-3 font-medium">Alert Payload</th>
                      <th className="py-2 px-3 font-medium">Recipient Devices</th>
                      <th className="py-2 px-3 font-medium">Haptic & Audio Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80 font-mono text-[11px]">
                    {alertHistory.map((item, idx) => (
                      <tr key={idx} className="hover:bg-neutral-900/60 transition-colors">
                        <td className="py-2 px-3 text-neutral-400 whitespace-nowrap">{item.time}</td>
                        <td className="py-2 px-3 text-white font-sans font-medium">{item.text}</td>
                        <td className="py-2 px-3 text-neutral-300 font-sans">All Student Watches</td>
                        <td className="py-2 px-3 text-white font-sans flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          <span>880Hz/1320Hz WebAudio + 200ms Vibe</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: PHYSICAL HARDWARE ARCHITECTURE (Black & White)     */}
        {/* ========================================================= */}
        {activeTab === 'hardware' && (
          <div className="flex flex-col gap-6">
            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-5 h-5 text-white" />
                <h2 className="text-base font-bold text-white tracking-wide">Physical Smartwatch Hardware Architecture (Section 15)</h2>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-3xl">
                The software prototype represents a future physical campus smartwatch device. Below is the precision engineering concept detailing the curved sapphire optics, high-definition OLED panel, ESP32 Wi-Fi mainboard, mid-frame chassis, and aerospace aluminum casing.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: High-Fidelity Technical Hardware Render */}
              <div className="lg:col-span-6 bg-[#0a0a0a] border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
                  <img
                    src={hardwareConceptImg}
                    alt="Campus WiFi Smartwatch Hardware Architecture"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 left-3 bg-black/90 backdrop-blur-md px-3 py-1 rounded-md text-[10px] font-mono text-neutral-200 border border-neutral-700">
                    Industrial Prototype Spec • Gen-1
                  </div>
                </div>
                <div className="p-4 border-t border-neutral-800">
                  <div className="text-xs font-bold text-white uppercase tracking-wider mb-1">Exploded Modular Stack</div>
                  <div className="text-[11px] text-neutral-400 leading-normal">
                    Precision layer-by-layer integration optimized for continuous 802.11 Wi-Fi packet listening, I2S emergency audio broadcasting, and haptic buzzer alerts.
                  </div>
                </div>
              </div>

              {/* Right Column: 5 Hardware Layers Breakdown */}
              <div className="lg:col-span-6 flex flex-col gap-3">
                
                {/* Layer 1: Top Optics */}
                <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-3.5 hover:border-neutral-700 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-mono font-bold border border-neutral-700">1</span>
                      Top Optics
                    </span>
                    <span className="text-[10px] font-mono text-neutral-300">Curved Glass Lens</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Crystal-clear curved glass lens with anti-fingerprint oleophobic coating and specular glare mitigation for outdoor readability on campus paths.
                  </p>
                </div>

                {/* Layer 2: Display */}
                <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-3.5 hover:border-neutral-700 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-mono font-bold border border-neutral-700">2</span>
                      Display Module
                    </span>
                    <span className="text-[10px] font-mono text-neutral-300">210 × 270 HD OLED</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    High-definition square/rounded color OLED with true blacks, 600-nit peak luminance, and power-saving deep sleep state when idle.
                  </p>
                </div>

                {/* Layer 3: Mainboard & Electronics */}
                <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-3.5 hover:border-neutral-700 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-mono font-bold border border-neutral-700">3</span>
                      Mainboard Electronics
                    </span>
                    <span className="text-[10px] font-mono text-white font-semibold">Embedded PCB</span>
                  </div>
                  <ul className="text-[11px] text-neutral-400 space-y-1 list-disc list-inside">
                    <li><strong className="text-neutral-200">ESP32 Wi-Fi Module:</strong> 2.4 GHz 802.11 b/g/n dual-core Xtensa MCU</li>
                    <li><strong className="text-neutral-200">I2S Audio DAC:</strong> Clean digital audio decoding for crisp emergency chimes</li>
                    <li><strong className="text-neutral-200">PAM8403 Amplifier:</strong> Miniature Class-D 3W audio amplifier circuit</li>
                    <li><strong className="text-neutral-200">LiPo Battery:</strong> High-density rechargeable 380mAh lithium polymer cell</li>
                  </ul>
                </div>

                {/* Layer 4: Mid-Frame */}
                <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-3.5 hover:border-neutral-700 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-mono font-bold border border-neutral-700">4</span>
                      Mid-Frame Chassis
                    </span>
                    <span className="text-[10px] font-mono text-neutral-300">CNC Precision Metal</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Precision-milled CNC chassis with side acoustic cutouts, digital crown encoder socket, and waterproof USB-C quick-charge port.
                  </p>
                </div>

                {/* Layer 5: Bottom Case */}
                <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-3.5 hover:border-neutral-700 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-mono font-bold border border-neutral-700">5</span>
                      Bottom Casing
                    </span>
                    <span className="text-[10px] font-mono text-neutral-300">Dark Aerospace Aluminum</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Matte black anodized housing with integrated 20mm strap lugs, micro CNC speaker grille, and coin-type ERM/LRA vibration motor for tactile wrist alerts.
                  </p>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: LAN DEPLOYMENT GUIDE (Black & White)              */}
        {/* ========================================================= */}
        {activeTab === 'deployment' && (
          <div className="flex flex-col gap-6">
            
            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Radio className="w-5 h-5 text-white" />
                <h2 className="text-base font-bold text-white tracking-wide">LAN Deployment & Multi-Laptop Setup Guide</h2>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-3xl">
                This system allows an Administrator laptop and Student laptop to exchange messages instantly across the same college Wi-Fi network without requiring internet access or cloud databases.
              </p>
            </div>

            {/* Network Topology Visualizer (Black & White) */}
            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-4">
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-3">Campus Wi-Fi Architecture</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-neutral-900/90 border border-neutral-700/80 p-3.5 rounded-xl">
                  <div className="text-xs font-bold text-white mb-1">LAPTOP 1: ADMIN WATCH</div>
                  <div className="text-[11px] text-neutral-300 font-mono mb-2">dashboard/index.html</div>
                  <div className="text-[10px] text-neutral-400">Sends alerts via POST /admin-message</div>
                </div>

                <div className="bg-white/[0.04] border border-neutral-600 p-3.5 rounded-xl flex flex-col items-center justify-center">
                  <div className="text-xs font-bold text-white mb-1">FASTAPI SERVER (Uvicorn)</div>
                  <div className="text-[11px] text-neutral-200 font-mono mb-2">0.0.0.0:8000 (In-Memory)</div>
                  <div className="text-[10px] text-neutral-400">Stores latest message & dispatches CORS</div>
                </div>

                <div className="bg-neutral-900/90 border border-neutral-700/80 p-3.5 rounded-xl">
                  <div className="text-xs font-bold text-white mb-1">LAPTOP 2: STUDENT WATCH</div>
                  <div className="text-[11px] text-neutral-300 font-mono mb-2">dashboard/watch.html</div>
                  <div className="text-[10px] text-neutral-400">Polls GET /admin-message every 1s</div>
                </div>
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Step 1: Python Server Setup */}
              <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-4">
                <div className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-white" />
                  <span>1. Start FastAPI Server (Server Laptop)</span>
                </div>
                <p className="text-[11px] text-neutral-400 mb-3">
                  Open terminal in the <code>CampusWiFiWatch</code> folder:
                </p>
                <div className="bg-black rounded-lg p-3 text-[11px] font-mono text-neutral-300 space-y-1 overflow-x-auto border border-neutral-800">
                  <div className="text-neutral-500"># 1. Create virtual environment</div>
                  <div className="text-white">python3 -m venv venv</div>
                  <div className="text-neutral-500">source venv/bin/activate  # (Windows: venv\Scripts\activate)</div>
                  <br />
                  <div className="text-neutral-500"># 2. Install requirements</div>
                  <div className="text-white">pip install -r server/requirements.txt</div>
                  <br />
                  <div className="text-neutral-500"># 3. Start server on 0.0.0.0:8000</div>
                  <div className="text-white">uvicorn server.main:app --host 0.0.0.0 --port 8000</div>
                </div>
              </div>

              {/* Step 2: Discovering LAN IP */}
              <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-4">
                <div className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-white" />
                  <span>2. Find Server Laptop Wi-Fi IP</span>
                </div>
                <p className="text-[11px] text-neutral-400 mb-3">
                  Run in terminal to discover your IPv4 address:
                </p>
                <div className="bg-black rounded-lg p-3 text-[11px] font-mono text-neutral-300 space-y-2 border border-neutral-800">
                  <div>
                    <span className="text-neutral-400"># Windows:</span>
                    <div className="text-white">ipconfig</div>
                    <span className="text-[10px] text-neutral-500">Look for "IPv4 Address" under Wi-Fi adapter (e.g. 192.168.1.105)</span>
                  </div>
                  <div>
                    <span className="text-neutral-400"># macOS / Linux:</span>
                    <div className="text-white">ipconfig getifaddr en0   # macOS</div>
                    <div className="text-white">hostname -I              # Linux</div>
                  </div>
                </div>
              </div>

              {/* Step 3: Test 1 Same Laptop */}
              <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-4">
                <div className="text-xs font-bold text-white mb-2">Test 1 — Same Laptop Setup</div>
                <ul className="text-[11px] text-neutral-400 space-y-1.5 list-decimal list-inside">
                  <li>Start Uvicorn server on port 8000.</li>
                  <li>Double-click <code className="text-neutral-300">dashboard/index.html</code> to open the Admin Watch.</li>
                  <li>Double-click <code className="text-neutral-300">dashboard/watch.html</code> in another browser window to open Student Watch.</li>
                  <li>Click <strong className="text-white">"Class has started"</strong> and click <strong className="text-white">SEND</strong>.</li>
                  <li>Watch the Student Watch receive the alert with audio chime and monochrome highlight!</li>
                </ul>
              </div>

              {/* Step 4: Test 2 Two Laptops */}
              <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-4">
                <div className="text-xs font-bold text-white mb-2">Test 2 — Two Laptops on Campus Wi-Fi</div>
                <ul className="text-[11px] text-neutral-400 space-y-1.5 list-decimal list-inside">
                  <li>Ensure both laptops connect to the same Wi-Fi/Hotspot.</li>
                  <li>Copy <code className="text-neutral-300">dashboard/watch.html</code> to Laptop 2.</li>
                  <li>In <code className="text-neutral-300">watch.html</code>, set the server IP to:
                    <div className="bg-black p-1.5 rounded mt-1 font-mono text-[10px] text-neutral-300 border border-neutral-800">
                      const SERVER_URL = "http://192.168.x.x:8000";
                    </div>
                  </li>
                  <li>Open <code className="text-neutral-300">watch.html</code> on Laptop 2. It will display <strong className="text-white">Connected</strong>.</li>
                  <li>Admin sends messages from Laptop 1; Laptop 2 sounds alert instantly!</li>
                </ul>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: SOURCE FILES & CODE INSPECTION (Black & White)      */}
        {/* ========================================================= */}
        {activeTab === 'code' && (
          <div className="flex flex-col gap-4">
            
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a0a0a] border border-neutral-800 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-white" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Project Files Directory (CampusWiFiWatch/)</span>
              </div>

              {/* File Selector Tabs (Black & White) */}
              <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-lg border border-neutral-800 text-xs">
                <button
                  onClick={() => setSelectedCodeFile('main_py')}
                  className={`px-3 py-1 rounded transition-colors ${
                    selectedCodeFile === 'main_py' ? 'bg-white text-black font-bold shadow-sm' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  server/main.py
                </button>
                <button
                  onClick={() => setSelectedCodeFile('requirements_txt')}
                  className={`px-3 py-1 rounded transition-colors ${
                    selectedCodeFile === 'requirements_txt' ? 'bg-white text-black font-bold shadow-sm' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  server/requirements.txt
                </button>
                <button
                  onClick={() => setSelectedCodeFile('admin_html')}
                  className={`px-3 py-1 rounded transition-colors ${
                    selectedCodeFile === 'admin_html' ? 'bg-white text-black font-bold shadow-sm' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  dashboard/index.html
                </button>
                <button
                  onClick={() => setSelectedCodeFile('student_html')}
                  className={`px-3 py-1 rounded transition-colors ${
                    selectedCodeFile === 'student_html' ? 'bg-white text-black font-bold shadow-sm' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  dashboard/watch.html
                </button>
              </div>

              {/* Copy Code button */}
              <button
                onClick={() => copyCode(codeFiles[selectedCodeFile])}
                className="text-xs px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 flex items-center gap-1.5 transition-colors"
              >
                {copiedFile ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-neutral-300" />}
                <span>{copiedFile ? 'Copied' : 'Copy File Content'}</span>
              </button>
            </div>

            {/* Code Box */}
            <div className="bg-black border border-neutral-800 rounded-xl overflow-hidden font-mono text-xs shadow-inner">
              <div className="bg-[#121212] px-4 py-2 border-b border-neutral-800 flex justify-between items-center text-neutral-400 text-[11px]">
                <span className="text-neutral-300 font-semibold">
                  {selectedCodeFile === 'main_py' && 'CampusWiFiWatch/server/main.py'}
                  {selectedCodeFile === 'requirements_txt' && 'CampusWiFiWatch/server/requirements.txt'}
                  {selectedCodeFile === 'admin_html' && 'CampusWiFiWatch/dashboard/index.html'}
                  {selectedCodeFile === 'student_html' && 'CampusWiFiWatch/dashboard/watch.html'}
                </span>
                <span className="text-[10px] text-neutral-500">Ready to execute locally</span>
              </div>
              <pre className="p-4 text-neutral-200 overflow-x-auto leading-relaxed">
                <code>{codeFiles[selectedCodeFile]}</code>
              </pre>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800 bg-black px-4 py-3 text-center text-xs text-neutral-500">
        Campus WiFi Watch System • Virtual Smartwatch Prototype • Connecting Administrators & Students via Local Wi-Fi
      </footer>
    </div>
  );
}
