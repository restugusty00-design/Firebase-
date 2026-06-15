// script.js
import { auth, db, provider } from './firebase-config.js';
import { updateChart } from './chart.jsx';
import { 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "firebase/auth";
import { ref, onValue, set, update } from "firebase/database";

/* ========================================================
   DOM ELEMENTS SELECTION
   ======================================================== */
// Views
const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');

// Auth inputs/buttons
const emailInput = document.getElementById('login-email');
const passInput = document.getElementById('login-pass');
const btnLogin = document.getElementById('btn-login');
const btnGoogle = document.getElementById('btn-google');
const btnLogout = document.getElementById('btn-logout');

// Metrics & Terminal
const clockEl = document.getElementById('realtime-clock');
const terminalLog = document.getElementById('terminal-log');
const connectionStatusText = document.getElementById('connection-text');
const connectionStatusDot = document.querySelector('.status-dot');

// Sensors
const valTemp = document.getElementById('val-temp');
const valHumidity = document.getElementById('val-humidity');

// Voice
const btnVoice = document.getElementById('btn-voice');
const voiceTranscript = document.getElementById('voice-transcript');

/* ========================================================
   UTILITY FUNCTIONS & VARIABLES
   ======================================================== */
let patternInterval = null;

/**
 * Hentikan pola yang sedang berjalan
 */
function stopPattern() {
    if (patternInterval) {
        clearInterval(patternInterval);
        patternInterval = null;
        logActivity('Pola berulang dinonaktifkan', 'info');
    }
}

/**
 * Fungsi TTS (Text to Speech)
 */
function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Hentikan suara yang sedang berjalan jika ada
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}

/**
 * Fungsi untuk memformat waktu 2 digit (misal: 09, 12)
 */
function padZero(num) {
    return num.toString().padStart(2, '0');
}

/**
 * Menjalankan jam digital secara realtime di UI
 */
setInterval(() => {
    const now = new Date();
    clockEl.innerText = `${padZero(now.getHours())}:${padZero(now.getMinutes())}:${padZero(now.getSeconds())}`;
}, 1000);

/**
 * Fungsi untuk mencatat aktivitas ke Terminal/Console Log UI
 * @param {string} msg Isi pesan
 * @param {string} type Tipe pesan ('info', 'success', 'error')
 */
function logActivity(msg, type = 'info') {
    const now = new Date();
    const timeStr = `${padZero(now.getHours())}:${padZero(now.getMinutes())}:${padZero(now.getSeconds())}`;
    
    const div = document.createElement('div');
    div.className = 'log-line';
    
    let colorClass = '';
    if(type === 'error') colorClass = 'error';
    if(type === 'success') colorClass = 'success';
    
    div.innerHTML = `<span class="log-time">[${timeStr}]</span> <span class="log-msg ${colorClass}">${msg}</span>`;
    
    terminalLog.appendChild(div);
    
    // Auto-scroll ke paling bawah
    terminalLog.scrollTop = terminalLog.scrollHeight;
}

/**
 * Mengubah indikator online/offline UI
 */
function setConnectionStatus(isOnline) {
    if(isOnline) {
        connectionStatusText.innerText = "Online";
        connectionStatusDot.classList.remove('offline');
        connectionStatusDot.classList.add('online');
    } else {
        connectionStatusText.innerText = "Offline";
        connectionStatusDot.classList.remove('online');
        connectionStatusDot.classList.add('offline');
        logActivity("Koneksi Firebase terputus/offline", "error");
    }
}


/* ========================================================
   FIREBASE AUTHENTICATION LOGIC
   ======================================================== */
   
// Login via Email & Password
btnLogin.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passInput.value;
    
    if(!email || !password) {
        alert("Mohon isi Email dan Password!");
        return;
    }
    
    signInWithEmailAndPassword(auth, email, password)
        .catch(error => alert(`Gagal Login: ${error.message}`));
});

// Login via Google Popup
btnGoogle.addEventListener('click', () => {
    signInWithPopup(auth, provider)
        .catch(error => {
            // Pada iframe/sandbox yang ketat, popup mungkin diblokir
            alert(`Google Sign-In Error: ${error.message}\n\nTIP: Jika diblokir oleh browser, gunakan mode tab baru, atau gunakan Email/Password sementara.`);
        });
});

// Logout
btnLogout.addEventListener('click', () => {
    signOut(auth).catch(err => logActivity("Gagal logout: " + err.message, "error"));
});

// Observer Status Autentikasi
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User telah login
        authView.classList.remove('active');
        authView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        dashboardView.classList.add('active');
        
        logActivity(`Otentikasi berhasil. Selamat datang, ${user.displayName || user.email}`, 'success');
        
        // Memulai pembacaan database ketika user login
        initFirebaseDatabase();
    } else {
        // User telah logout / belum login
        dashboardView.classList.remove('active');
        dashboardView.classList.add('hidden');
        authView.classList.remove('hidden');
        authView.classList.add('active');
    }
});


/* ========================================================
   FIREBASE REALTIME DATABASE LOGIC
   ======================================================== */
function initFirebaseDatabase() {
    logActivity("Menyambungkan ke Sistem Sensor & Relay...");
    
    // 1. Memantau Status Koneksi Firebase itu sendiri
    const connectedRef = ref(db, ".info/connected");
    onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            setConnectionStatus(true);
            logActivity("Terhubung ke Firebase Realtime Database secara realtime.", "success");
        } else {
            setConnectionStatus(false);
        }
    });

    // 2. Membaca Sensor (Temperature & Humidity)
    const sensorRef = ref(db, 'sensor');
    onValue(sensorRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Animasi transisi angka jika ada perubahan
            if(valTemp.innerText !== data.temperature) {
                valTemp.innerText = data.temperature;
            }
            if(valHumidity.innerText !== data.humidity) {
                valHumidity.innerText = data.humidity;
            }

            // Update Grafik Recharts
            try {
                updateChart('recharts-container', data);
            } catch (e) {
                console.error("Gagal update grafik", e);
            }
        }
    }, (error) => {
        logActivity("Error reset sensor data: " + error.message, "error");
    });

    // 3. Membaca Status ke-4 Relay
    const relayRef = ref(db, 'relay');
    onValue(relayRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            updateRelayUI('relay1', data.relay1);
            updateRelayUI('relay2', data.relay2);
            updateRelayUI('relay3', data.relay3);
            updateRelayUI('relay4', data.relay4);
        }
    }, (error) => {
        logActivity("Error baca relay: " + error.message, "error");
    });
}

/**
 * Mengupdate tampilan UI pada 1 card relay
 * @param {string} id ID/Nama atribut relay (contoh: 'relay1')
 * @param {number} status 1 (ON) atau 0 (OFF)
 */
function updateRelayUI(id, status) {
    const iconEl = document.getElementById(`icon-${id}`);
    const statusEl = document.getElementById(`status-${id}`);
    
    if(!iconEl || !statusEl) return;

    if (status === 1) {
        iconEl.classList.add('active');
        statusEl.innerText = "ON";
        statusEl.className = "relay-status badge-on";
    } else {
        iconEl.classList.remove('active');
        statusEl.innerText = "OFF";
        statusEl.className = "relay-status badge-off";
    }
}

/**
 * Dipanggil dari File HTML untuk kontrol ON/OFF button UI
 * Fungsi ditaruh di object window agar bisa diakses onclick di HTML
 */
window.setRelay = function(id, state) {
    stopPattern(); // Pastikan menghentikan pola jika kontrol manual digunakan
    const nodeRef = ref(db, `relay/${id}`);
    set(nodeRef, state)
        .then(() => {
            logActivity(`Perintah eksekusi: ${id.toUpperCase()} -> ${state === 1 ? 'ON' : 'OFF'}`, 'success');
        })
        .catch(error => {
            logActivity(`Gagal mengontrol ${id}: ${error.message}`, 'error');
        });
};

/**
 * Dipanggil dari File HTML untuk kontrol POLA button UI
 */
window.setPola = function(tipe, fromVoice = false) {
    stopPattern();
    let stateToggle = true;

    if (tipe === 1) {
        logActivity('Memulai Pola 1 (Silang Berulang)', 'info');
        if (fromVoice) speak('Menjalankan pola silang berulang');

        // Eksekusi segera lalu looping
        const applyPola1 = () => {
            let updates = {
                'relay/relay1': stateToggle ? 1 : 0,
                'relay/relay2': stateToggle ? 0 : 1,
                'relay/relay3': stateToggle ? 1 : 0,
                'relay/relay4': stateToggle ? 0 : 1
            };
            stateToggle = !stateToggle;
            update(ref(db), updates).catch(e => logActivity("Gagal pola 1: " + e.message, "error"));
        };
        
        applyPola1();
        patternInterval = setInterval(applyPola1, 1000);

    } else if (tipe === 2) {
        logActivity('Memulai Pola 2 (Bebas Berulang)', 'info');
        if (fromVoice) speak('Menjalankan pola bebas berulang');

        const applyPola2 = () => {
            let updates = {
                'relay/relay1': Math.random() > 0.5 ? 1 : 0,
                'relay/relay2': Math.random() > 0.5 ? 1 : 0,
                'relay/relay3': Math.random() > 0.5 ? 1 : 0,
                'relay/relay4': Math.random() > 0.5 ? 1 : 0
            };
            update(ref(db), updates).catch(e => logActivity("Gagal pola 2: " + e.message, "error"));
        };
        
        applyPola2();
        patternInterval = setInterval(applyPola2, 800);
    }
};

/**
 * Dipanggil dari File HTML untuk kontrol BERHENTIKAN POLA button UI
 */
window.hentikanPola = function() {
    stopPattern();
    update(ref(db), {
        'relay/relay1': 0, 'relay/relay2': 0, 'relay/relay3': 0, 'relay/relay4': 0
    }).then(() => speak('Pola dihentikan dan lampu dimatikan'));
};

/**
 * Shut down all relays globally (Emergency Switch)
 */
window.emergencyShutdown = function() {
    stopPattern();
    update(ref(db), {
        'relay/relay1': 0, 'relay/relay2': 0, 'relay/relay3': 0, 'relay/relay4': 0
    }).then(() => {
        logActivity('EMERGENCY SHUTDOWN DIAKTIFKAN', 'error');
        speak('Sistem darurat diaktifkan. Semua lampu dimatikan.');
    });
};


/* ========================================================
   WEB SPEECH API (VOICE COMMAND)
   ======================================================== */
// Cross-browser prefix
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID'; // Menggunakan Bahasa Indonesia
    recognition.continuous = false; // Berhenti otomatis setelah bicara selesai
    recognition.interimResults = false;

    // Saat mic ditekan
    btnVoice.addEventListener('click', () => {
        try {
            recognition.start();
            btnVoice.classList.add('listening');
            voiceTranscript.innerText = "Mendengarkan... Bicaralah sekarang.";
            logActivity("Mic aktif, menunggu suara...");
        } catch(e) {
            logActivity("Mic sudah aktif, silakan bicara", "info");
        }
    });

    // Saat proses suara berhasil ditebak teksnya
    recognition.onresult = (event) => {
        btnVoice.classList.remove('listening');
        const commandText = event.results[0][0].transcript.toLowerCase();
        
        voiceTranscript.innerHTML = `Terdeteksi: <strong>"${commandText}"</strong>`;
        logActivity(`Input suara ditangkap: "${commandText}"`);
        
        processVoiceCommand(commandText);
    };

    // Saat audio berhenti tertangkap
    recognition.onspeechend = () => {
        btnVoice.classList.remove('listening');
        recognition.stop();
    };

    // Saat error (misalnya tidak ada izin mic)
    recognition.onerror = (event) => {
        btnVoice.classList.remove('listening');
        voiceTranscript.innerText = "Gagal menangkap suara/Izin ditolak.";
        logActivity("Error Voice Control: " + event.error, "error");
    };

} else {
    // Fallsbacks jika browser tidak mendukung
    btnVoice.disabled = true;
    voiceTranscript.innerText = "Browser tidak mendukung Web Speech API.";
    logActivity("Web Speech API tidak didukung pada browser ini.", "error");
}

/**
 * Filter teks dan konversi ke perintah Firebase (NLP Sederhana)
 */
function processVoiceCommand(cmd) {
    let updates = {};
    let isCommandFound = false;

    // 1. Cek Pertanyaan Sensor (Suhu / Kelembapan)
    const isBahasSuhu = /(suhu|temperatur)/.test(cmd);
    const isBahasLembab = /(kelembapan|kelembaban|humid)/.test(cmd);
    const isTanya = /(berapa|cek|baca|info|status)/.test(cmd);

    if (isTanya && (isBahasSuhu || isBahasLembab || cmd.includes("sensor"))) {
        let respon = "";
        let t = document.getElementById('val-temp').innerText;
        let h = document.getElementById('val-humidity').innerText;
        
        if (isBahasSuhu && !isBahasLembab) {
            respon = `Suhu ruangan saat ini adalah ${t} derajat selsius.`;
        } else if (isBahasLembab && !isBahasSuhu) {
            respon = `Kelembapan ruangan saat ini adalah ${h} persen.`;
        } else {
            respon = `Suhu ruangan ${t} derajat selsius, dan kelembapan ${h} persen.`;
        }
        speak(respon);
        logActivity("Membacakan status sensor", "success");
        return;
    }

    // 2. Daftar kata kunci regex untuk variasi bahasa
    const isWantsOn = /(nyalakan|hidupkan|aktifkan|on|hidup)/.test(cmd);
    const isWantsOff = /(matikan|padamkan|nonaktifkan|off|mati|stop|hentikan)/.test(cmd);
    
    // Target aksi
    const isAll = /(semua|seluruh)/.test(cmd);
    const isL1 = /(satu|1)/.test(cmd) && cmd.includes("lampu");
    const isL2 = /(dua|2)/.test(cmd) && cmd.includes("lampu");
    const isL3 = /(tiga|3)/.test(cmd) && cmd.includes("lampu");
    const isL4 = /(empat|4)/.test(cmd) && cmd.includes("lampu");

    // Perintah pola
    const isPolaSilang = /(pola silang|silang|pola satu|pola 1)/.test(cmd);
    const isPolaBebas = /(pola bebas|bebas|acak|pola dua|pola 2)/.test(cmd);
    const isPola = /(pola)/.test(cmd);

    if (isWantsOff && isPola) {
        window.hentikanPola();
        return;
    }

    if (isPolaSilang) {
        window.setPola(1, true);
        isCommandFound = true;
        return;
    }
    
    if (isPolaBebas) {
        window.setPola(2, true);
        isCommandFound = true;
        return;
    }

    if (isWantsOn || isWantsOff) {
        stopPattern(); // Menghentikan pola jika pengguna merubah relay manual via suara
    }

    if (isWantsOn) {
        if (isAll) {
            updates['relay/relay1'] = 1;
            updates['relay/relay2'] = 1;
            updates['relay/relay3'] = 1;
            updates['relay/relay4'] = 1;
            isCommandFound = true;
        } else {
            if (isL1) { updates['relay/relay1'] = 1; isCommandFound = true; }
            if (isL2) { updates['relay/relay2'] = 1; isCommandFound = true; }
            if (isL3) { updates['relay/relay3'] = 1; isCommandFound = true; }
            if (isL4) { updates['relay/relay4'] = 1; isCommandFound = true; }
        }
    } else if (isWantsOff) {
        if (isAll) {
            updates['relay/relay1'] = 0;
            updates['relay/relay2'] = 0;
            updates['relay/relay3'] = 0;
            updates['relay/relay4'] = 0;
            isCommandFound = true;
        } else {
            if (isL1) { updates['relay/relay1'] = 0; isCommandFound = true; }
            if (isL2) { updates['relay/relay2'] = 0; isCommandFound = true; }
            if (isL3) { updates['relay/relay3'] = 0; isCommandFound = true; }
            if (isL4) { updates['relay/relay4'] = 0; isCommandFound = true; }
        }
    }

    if (Object.keys(updates).length > 0) {
        update(ref(db), updates)
            .then(() => {
                logActivity("Mengeksekusi perintah suara berhasil.", "success");
                let responSuara = "Perintah dilaksanakan";
                if (isAll && isWantsOn) responSuara = "Menyalakan semua lampu";
                else if (isAll && isWantsOff) responSuara = "Mematikan semua lampu";
                else if (isWantsOn) responSuara = "Menyalakan lampu sesuai perintah";
                else if (isWantsOff) responSuara = "Mematikan lampu sesuai perintah";
                speak(responSuara);
            })
            .catch((e) => logActivity("Gagal mengubah relay: " + e.message, "error"));
    } else {
        if (!isCommandFound) {
            logActivity("Perintah tidak dikenali sistem.", "error");
            speak("Perintah tidak dikenali, silakan ulangi");
        }
    }
}
