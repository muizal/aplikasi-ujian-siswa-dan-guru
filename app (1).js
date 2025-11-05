// ============================================
// GLOBAL STATE - In-Memory Storage + IndexedDB
// ============================================
let appState = {
  // IndexedDB references
  db: null,
  dbReady: false,
  // Offline/Online state
  isOnline: navigator.onLine,
  syncQueue: [],
  // Mobile features
  wakeLock: null,
  orientationLocked: false,
  // Swipe gesture state
  touchStartX: 0,
  touchEndX: 0,
  touchStartY: 0,
  touchEndY: 0,
  swipeThreshold: 50,
  // Answer backup (in-memory replacement for sessionStorage)
  answerBackup: {},
  currentUser: null,
  currentRole: 'student',
  quizzes: [],
  results: [],
  currentQuiz: null,
  currentQuizSession: null,
  violationCount: 0,
  faceViolationCount: 0,
  timerInterval: null,
  fullscreenActive: false,
  // Face detection state
  faceDetector: null,
  videoStream: null,
  faceDetectionInterval: null,
  lastFaceDetectedTime: null,
  noFaceDuration: 0,
  multipleFacesDuration: 0,
  lowConfidenceDuration: 0,
  faceDetectionActive: false,
  facePreviewCollapsed: false,
  faceStabilityTimer: null,
  faceStableCount: 0,
  // Face detection modes
  faceDetectionMode: null, // 'REAL_CAMERA', 'DEMO_MODE', 'NO_FACE_DETECTION'
  demoModeInterval: null,
  cameraPermissionAttempts: 0
};

// Demo Users Database (In-Memory)
const DEMO_USERS = {
  admin: {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    name: 'Admin Sekolah'
  },
  guru1: {
    username: 'guru1',
    password: 'guru123',
    role: 'guru',
    name: 'Pak Ahmad',
    subject: 'Matematika'
  },
  guru2: {
    username: 'guru2',
    password: 'guru123',
    role: 'guru',
    name: 'Bu Sarah',
    subject: 'Bahasa Inggris'
  },
  siswa1: {
    username: 'siswa1',
    password: 'siswa123',
    role: 'siswa',
    name: 'Andi Wijaya',
    class: 'XII.1'
  },
  siswa2: {
    username: 'siswa2',
    password: 'siswa123',
    role: 'siswa',
    name: 'Siti Nurhaliza',
    class: 'XII.1'
  }
};

// Backward compatibility
const sampleUsers = {
  admin: [DEMO_USERS.admin],
  teachers: [DEMO_USERS.guru1, DEMO_USERS.guru2, { username: 'guru3', password: 'guru123', name: 'Bu Siti', subject: 'Fisika' }],
  students: [
    DEMO_USERS.siswa1,
    DEMO_USERS.siswa2,
    { username: 'siswa3', password: 'siswa123', name: 'Budi Santoso', class: 'XII.1' },
    { username: 'siswa4', password: 'siswa123', name: 'Rina Wijaya', class: 'XII.2' },
    { username: 'siswa5', password: 'siswa123', name: 'Doni Pratama', class: 'XII.2' }
  ]
};

// Admin Data
let adminData = {
  subjects: [
    { id: 1, name: 'Matematika', class: 'X', guru: 'Pak Ahmad', totalSoal: 15, activeSoal: 15, status: 'SUDAH_INPUT', lastUpdated: '2025-11-04 14:30' },
    { id: 2, name: 'Fisika', class: 'X', guru: 'Bu Siti', totalSoal: 0, activeSoal: 0, status: 'BELUM_INPUT', lastUpdated: null },
    { id: 3, name: 'Bahasa Inggris', class: 'XI', guru: 'Bu Sarah', totalSoal: 8, activeSoal: 8, status: 'SUDAH_INPUT', lastUpdated: '2025-11-05 10:15' },
    { id: 4, name: 'Kimia', class: 'XII', guru: 'Bu Siti', totalSoal: 0, activeSoal: 0, status: 'BELUM_INPUT', lastUpdated: null }
  ],
  currentExams: [],
  settings: {
    faceDetectionRequired: true,
    maxFaceViolations: 5,
    maxTabViolations: 5,
    autoRefreshInterval: 3,
    enableDemoMode: true
  },
  autoRefreshEnabled: true,
  autoRefreshInterval: null
};

const sampleQuizzes = [
  {
    id: 1,
    title: 'Quiz Matematika - Integral',
    subject: 'Matematika',
    type: 'multiple_choice',
    duration: 30,
    active: true,
    multimedia: {
      videoUrl: '',
      audioUrl: '',
      documentUrl: ''
    },
    questions: [
      {
        question: 'Berapakah hasil dari ∫(2x + 3)dx?',
        options: {
          A: 'x² + 3x + C',
          B: '2x² + 3x + C',
          C: 'x² + x + C',
          D: '2x + C',
          E: 'x² + 2x + C'
        },
        correct: 'A'
      },
      {
        question: 'Turunan dari f(x) = 3x² + 2x - 1 adalah?',
        options: {
          A: '6x + 2',
          B: '3x + 2',
          C: '6x - 1',
          D: '3x² + 2',
          E: '6x + 1'
        },
        correct: 'A'
      }
    ]
  },
  {
    id: 2,
    title: 'Reading Comprehension - English',
    subject: 'Bahasa Inggris',
    type: 'multiple_choice',
    duration: 45,
    active: true,
    multimedia: {
      videoUrl: '',
      audioUrl: '',
      documentUrl: ''
    },
    questions: [
      {
        question: 'What is the main idea of the passage?',
        options: {
          A: 'Climate change effects',
          B: 'Educational systems',
          C: 'Technology advancement',
          D: 'Social media impact',
          E: 'Economic development'
        },
        correct: 'D'
      }
    ]
  }
];

// Initialize app with sample data
appState.quizzes = [...sampleQuizzes];

// ============================================
// INDEXEDDB - OFFLINE STORAGE
// ============================================
function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ExamDB', 1);
    
    request.onerror = () => {
      console.error('IndexedDB failed to open');
      reject(request.error);
    };
    
    request.onsuccess = () => {
      appState.db = request.result;
      appState.dbReady = true;
      console.log('✓ IndexedDB ready');
      resolve(appState.db);
    };
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      
      // Create object stores
      if (!db.objectStoreNames.contains('exams')) {
        db.createObjectStore('exams', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('questions')) {
        db.createObjectStore('questions', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('answers')) {
        const answerStore = db.createObjectStore('answers', { keyPath: 'id', autoIncrement: true });
        answerStore.createIndex('examId', 'examId', { unique: false });
        answerStore.createIndex('synced', 'synced', { unique: false });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }
      
      console.log('✓ IndexedDB structure created');
    };
  });
}

// Save answer to IndexedDB
async function saveAnswerToIndexedDB(examId, questionId, answer) {
  if (!appState.dbReady) {
    console.warn('IndexedDB not ready, answer saved to memory only');
    return;
  }
  
  try {
    const transaction = appState.db.transaction(['answers'], 'readwrite');
    const store = transaction.objectStore('answers');
    
    const answerData = {
      examId: examId,
      questionId: questionId,
      answer: answer,
      timestamp: Date.now(),
      synced: false
    };
    
    store.add(answerData);
    
    // Also backup to in-memory state
    if (!appState.answerBackup) {
      appState.answerBackup = {};
    }
    if (!appState.answerBackup[examId]) {
      appState.answerBackup[examId] = [];
    }
    appState.answerBackup[examId][questionId] = answer;
    
    console.log('✓ Answer saved to IndexedDB and sessionStorage');
  } catch (error) {
    console.error('Failed to save to IndexedDB:', error);
  }
}

// Load answers from IndexedDB (offline recovery)
async function loadAnswersFromIndexedDB(examId) {
  if (!appState.dbReady) return [];
  
  return new Promise((resolve, reject) => {
    const transaction = appState.db.transaction(['answers'], 'readonly');
    const store = transaction.objectStore('answers');
    const index = store.index('examId');
    const request = index.getAll(examId);
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Sync answers to server when online
async function syncAnswersToServer() {
  if (!appState.isOnline || !appState.dbReady) {
    console.log('Cannot sync: offline or DB not ready');
    return;
  }
  
  try {
    const transaction = appState.db.transaction(['answers'], 'readonly');
    const store = transaction.objectStore('answers');
    const index = store.index('synced');
    const request = index.getAll(false); // Get unsynced answers
    
    request.onsuccess = async () => {
      const unsyncedAnswers = request.result;
      
      if (unsyncedAnswers.length === 0) {
        console.log('✓ All answers already synced');
        return;
      }
      
      console.log(`Syncing ${unsyncedAnswers.length} answers...`);
      
      for (const answer of unsyncedAnswers) {
        try {
          // Simulate API call (replace with real endpoint)
          // await fetch('/api/sync/answer', { method: 'POST', body: JSON.stringify(answer) });
          
          // Mark as synced
          const updateTx = appState.db.transaction(['answers'], 'readwrite');
          const updateStore = updateTx.objectStore('answers');
          answer.synced = true;
          updateStore.put(answer);
          
          console.log('✓ Answer synced:', answer.id);
        } catch (error) {
          console.error('Failed to sync answer:', answer.id, error);
        }
      }
      
      showToast('✓ Jawaban berhasil disinkronkan ke server', 'success');
    };
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// ============================================
// NETWORK STATUS MONITORING
// ============================================
function initNetworkMonitoring() {
  const indicator = document.getElementById('networkIndicator');
  
  function updateNetworkStatus() {
    appState.isOnline = navigator.onLine;
    
    if (appState.isOnline) {
      indicator.textContent = '✓ Kembali online — sinkronisasi data...';
      indicator.className = 'offline-indicator online-indicator';
      indicator.style.display = 'block';
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        indicator.style.display = 'none';
      }, 3000);
      
      // Sync data
      syncAnswersToServer();
    } else {
      indicator.textContent = 'Anda sedang offline — jawaban akan disimpan secara lokal dan disinkronkan saat online.';
      indicator.className = 'offline-indicator';
      indicator.style.display = 'block';
    }
  }
  
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  
  // Initial check
  if (!appState.isOnline) {
    updateNetworkStatus();
  }
}

// ============================================
// MOBILE ORIENTATION & WAKE LOCK
// ============================================
async function lockPortraitOrientation() {
  try {
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock('portrait-primary');
      appState.orientationLocked = true;
      console.log('✓ Orientation locked to portrait');
    } else {
      console.warn('Screen orientation lock not supported');
    }
  } catch (error) {
    console.warn('Failed to lock orientation:', error);
  }
}

function unlockOrientation() {
  try {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
      appState.orientationLocked = false;
      console.log('✓ Orientation unlocked');
    }
  } catch (error) {
    console.warn('Failed to unlock orientation:', error);
  }
}

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      appState.wakeLock = await navigator.wakeLock.request('screen');
      console.log('✓ Wake lock active - screen will stay on');
      
      appState.wakeLock.addEventListener('release', () => {
        console.log('Wake lock released');
      });
    } else {
      console.warn('Wake Lock API not supported');
    }
  } catch (error) {
    console.error('Wake lock failed:', error);
  }
}

function releaseWakeLock() {
  if (appState.wakeLock) {
    appState.wakeLock.release();
    appState.wakeLock = null;
    console.log('✓ Wake lock released');
  }
}

// Check orientation and show message if landscape
function checkOrientation() {
  const portraitLock = document.getElementById('portraitLock');
  
  if (window.matchMedia('(orientation: landscape)').matches && window.innerWidth < 1024) {
    portraitLock.style.display = 'flex';
  } else {
    portraitLock.style.display = 'none';
  }
}

// ============================================
// SWIPE GESTURE NAVIGATION
// ============================================
function initSwipeGestures() {
  const quizInterface = document.getElementById('quizInterface');
  if (!quizInterface) return;
  
  quizInterface.addEventListener('touchstart', (e) => {
    appState.touchStartX = e.changedTouches[0].screenX;
    appState.touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });
  
  quizInterface.addEventListener('touchend', (e) => {
    appState.touchEndX = e.changedTouches[0].screenX;
    appState.touchEndY = e.changedTouches[0].screenY;
    
    handleSwipe();
  }, { passive: true });
}

function handleSwipe() {
  const swipeDistanceX = appState.touchStartX - appState.touchEndX;
  const swipeDistanceY = Math.abs(appState.touchStartY - appState.touchEndY);
  
  // Only trigger if horizontal swipe is dominant
  if (Math.abs(swipeDistanceX) < appState.swipeThreshold) return;
  if (swipeDistanceY > Math.abs(swipeDistanceX)) return; // Vertical scroll
  
  if (swipeDistanceX > 0) {
    // Swipe left: next question
    showSwipeIndicator('left');
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn && nextBtn.style.display !== 'none') {
      navigateQuestion(1);
    }
  } else {
    // Swipe right: previous question
    showSwipeIndicator('right');
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn && prevBtn.style.display !== 'none') {
      navigateQuestion(-1);
    }
  }
}

function showSwipeIndicator(direction) {
  let indicator = document.querySelector(`.swipe-indicator.${direction}`);
  
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = `swipe-indicator ${direction}`;
    indicator.textContent = direction === 'left' ? '→' : '←';
    document.body.appendChild(indicator);
  }
  
  indicator.classList.add('active');
  
  setTimeout(() => {
    indicator.classList.remove('active');
  }, 300);
}

// ============================================
// MOBILE SECURITY - APP SWITCH DETECTION
// ============================================
function detectAppSwitch() {
  // Enhanced for mobile - detect home button, recent apps, etc.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && appState.currentQuizSession) {
      console.warn('⚠️ App switched (visibility change)');
      handleViolation();
    }
  });
  
  // Detect focus loss (Android multitasking)
  window.addEventListener('blur', () => {
    if (appState.currentQuizSession && !document.hidden) {
      console.warn('⚠️ Window blur detected');
      // Only count if truly switched (not just keyboard focus)
      setTimeout(() => {
        if (!document.hasFocus() && appState.currentQuizSession) {
          handleViolation();
        }
      }, 100);
    }
  });
  
  // Prevent back button on Android (within exam)
  window.addEventListener('popstate', (e) => {
    if (appState.currentQuizSession) {
      e.preventDefault();
      history.pushState(null, '', location.href);
      showToast('⚠️ Tombol back dinonaktifkan saat ujian', 'warning');
      recordViolation('BACK_BUTTON_PRESSED');
    }
  });
}

function recordViolation(type) {
  console.log('Violation recorded:', type);
  
  const exam = adminData.currentExams.find(e => e.examId === appState.currentQuizSession?.adminExamId);
  if (exam) {
    exam.violationHistory.push({
      time: new Date().toLocaleTimeString('id-ID'),
      type: type,
      message: `Mobile violation: ${type}`
    });
  }
}

// ============================================
// ADMIN USER GENERATOR
// ============================================
let userGenState = {
  generatedGurus: [],
  generatedSiswa: [],
  csvImportData: [],
  nextGuruNumber: 4, // Start after existing guru1, guru2, guru3
  nextSiswaNumber: 6  // Start after existing siswa1-5
};

function showUserTab(tabId) {
  // Update tab buttons
  document.querySelectorAll('.user-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-usertab="${tabId}"]`)?.classList.add('active');
  
  // Update tab content
  document.querySelectorAll('.user-tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(tabId)?.classList.add('active');
  
  // Load data if needed
  if (tabId === 'all-users') {
    renderAllUsers();
  }
}

// Generate random password
function generatePassword(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Handle Generate Guru
function handleGenerateGuru(e) {
  e.preventDefault();
  
  const count = parseInt(document.getElementById('guruCount').value);
  
  if (!count || count < 1) {
    showToast('Masukkan jumlah guru yang valid', 'error');
    return;
  }
  
  userGenState.generatedGurus = [];
  
  for (let i = 0; i < count; i++) {
    const username = `guru${userGenState.nextGuruNumber + i}`;
    const password = generatePassword();
    const name = `Guru ${userGenState.nextGuruNumber + i}`;
    
    userGenState.generatedGurus.push({
      username: username,
      password: password,
      role: 'guru',
      name: name,
      subject: null,
      createdAt: new Date().toLocaleString('id-ID')
    });
  }
  
  renderGuruResults();
  showToast(`✓ ${count} guru berhasil di-generate!`, 'success');
}

function renderGuruResults() {
  const container = document.getElementById('guruResults');
  const tbody = document.getElementById('guruResultsBody');
  
  tbody.innerHTML = '';
  
  userGenState.generatedGurus.forEach((guru, index) => {
    const row = `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${guru.username}</strong></td>
        <td><code>${guru.password}</code></td>
        <td>${guru.name}</td>
        <td>
          <button class="btn-edit-inline" onclick="editGeneratedUser('guru', ${index})">Edit</button>
          <button class="btn-delete-inline" onclick="deleteGeneratedUser('guru', ${index})">Del</button>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', row);
  });
  
  container.style.display = 'block';
}

function copyAllGuru() {
  let text = 'DAFTAR AKUN GURU:\n\n';
  userGenState.generatedGurus.forEach((guru, i) => {
    text += `${i + 1}. Username: ${guru.username} | Password: ${guru.password} | Nama: ${guru.name}\n`;
  });
  
  navigator.clipboard.writeText(text).then(() => {
    showToast('✓ Berhasil di-copy ke clipboard!', 'success');
  }).catch(() => {
    showToast('Gagal copy. Gunakan browser modern.', 'error');
  });
}

function exportGuruCSV() {
  let csv = 'No,Username,Password,Nama,Dibuat\n';
  userGenState.generatedGurus.forEach((guru, i) => {
    csv += `${i + 1},${guru.username},${guru.password},${guru.name},${guru.createdAt}\n`;
  });
  
  downloadCSV(csv, `guru_accounts_${Date.now()}.csv`);
  showToast('✓ File CSV berhasil di-download!', 'success');
}

function saveAllGuru() {
  if (userGenState.generatedGurus.length === 0) {
    showToast('Tidak ada guru untuk disimpan', 'error');
    return;
  }
  
  let duplicateCount = 0;
  let savedCount = 0;
  
  userGenState.generatedGurus.forEach(guru => {
    // Check duplicate
    if (DEMO_USERS[guru.username] || sampleUsers.teachers.find(t => t.username === guru.username)) {
      duplicateCount++;
      return;
    }
    
    // Save to DEMO_USERS
    DEMO_USERS[guru.username] = guru;
    
    // Save to sampleUsers
    sampleUsers.teachers.push(guru);
    
    savedCount++;
  });
  
  if (duplicateCount > 0) {
    showToast(`⚠️ ${duplicateCount} username sudah ada, ${savedCount} guru berhasil disimpan`, 'warning');
  } else {
    showToast(`✓ ${savedCount} guru berhasil ditambahkan ke database!`, 'success');
  }
  
  // Update next number
  userGenState.nextGuruNumber += savedCount;
  
  // Clear generated data
  userGenState.generatedGurus = [];
  document.getElementById('guruResults').style.display = 'none';
  document.getElementById('generateGuruForm').reset();
}

// Handle Generate Siswa
function handleGenerateSiswa(e) {
  e.preventDefault();
  
  const count = parseInt(document.getElementById('siswaCount').value);
  const classValue = document.getElementById('siswaClass').value;
  const passwordType = document.getElementById('passwordType').value;
  
  if (!classValue) {
    showToast('Pilih kelas terlebih dahulu', 'error');
    return;
  }
  
  userGenState.generatedSiswa = [];
  
  for (let i = 0; i < count; i++) {
    const username = `siswa${userGenState.nextSiswaNumber + i}`;
    const password = passwordType === 'random' ? generatePassword() : `${classValue.replace(/\s/g, '')}${i + 1}`;
    const name = `Siswa ${userGenState.nextSiswaNumber + i}`;
    
    userGenState.generatedSiswa.push({
      username: username,
      password: password,
      role: 'siswa',
      name: name,
      class: classValue,
      createdAt: new Date().toLocaleString('id-ID')
    });
  }
  
  renderSiswaResults();
  showToast(`✓ ${count} siswa berhasil di-generate!`, 'success');
}

function renderSiswaResults() {
  const container = document.getElementById('siswaResults');
  const tbody = document.getElementById('siswaResultsBody');
  
  tbody.innerHTML = '';
  
  userGenState.generatedSiswa.forEach((siswa, index) => {
    const row = `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${siswa.username}</strong></td>
        <td><code>${siswa.password}</code></td>
        <td>${siswa.name}</td>
        <td>${siswa.class}</td>
        <td>
          <button class="btn-edit-inline" onclick="editGeneratedUser('siswa', ${index})">Edit</button>
          <button class="btn-delete-inline" onclick="deleteGeneratedUser('siswa', ${index})">Del</button>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', row);
  });
  
  container.style.display = 'block';
}

function copyAllSiswa() {
  let text = 'DAFTAR AKUN SISWA:\n\n';
  userGenState.generatedSiswa.forEach((siswa, i) => {
    text += `${i + 1}. Username: ${siswa.username} | Password: ${siswa.password} | Kelas: ${siswa.class}\n`;
  });
  
  navigator.clipboard.writeText(text).then(() => {
    showToast('✓ Berhasil di-copy ke clipboard!', 'success');
  }).catch(() => {
    showToast('Gagal copy. Gunakan browser modern.', 'error');
  });
}

function exportSiswaCSV() {
  let csv = 'No,Username,Password,Nama,Kelas,Dibuat\n';
  userGenState.generatedSiswa.forEach((siswa, i) => {
    csv += `${i + 1},${siswa.username},${siswa.password},${siswa.name},${siswa.class},${siswa.createdAt}\n`;
  });
  
  downloadCSV(csv, `siswa_accounts_${Date.now()}.csv`);
  showToast('✓ File CSV berhasil di-download!', 'success');
}

function saveAllSiswa() {
  if (userGenState.generatedSiswa.length === 0) {
    showToast('Tidak ada siswa untuk disimpan', 'error');
    return;
  }
  
  let duplicateCount = 0;
  let savedCount = 0;
  
  userGenState.generatedSiswa.forEach(siswa => {
    // Check duplicate
    if (DEMO_USERS[siswa.username] || sampleUsers.students.find(s => s.username === siswa.username)) {
      duplicateCount++;
      return;
    }
    
    // Save to DEMO_USERS
    DEMO_USERS[siswa.username] = siswa;
    
    // Save to sampleUsers
    sampleUsers.students.push(siswa);
    
    savedCount++;
  });
  
  if (duplicateCount > 0) {
    showToast(`⚠️ ${duplicateCount} username sudah ada, ${savedCount} siswa berhasil disimpan`, 'warning');
  } else {
    showToast(`✓ ${savedCount} siswa berhasil ditambahkan ke database!`, 'success');
  }
  
  // Update next number
  userGenState.nextSiswaNumber += savedCount;
  
  // Clear generated data
  userGenState.generatedSiswa = [];
  document.getElementById('siswaResults').style.display = 'none';
  document.getElementById('generateSiswaForm').reset();
}

// Edit/Delete Generated Users
function editGeneratedUser(type, index) {
  const users = type === 'guru' ? userGenState.generatedGurus : userGenState.generatedSiswa;
  const user = users[index];
  
  const newUsername = prompt('Edit Username:', user.username);
  if (newUsername && newUsername.trim()) {
    user.username = newUsername.trim();
  }
  
  const newPassword = prompt('Edit Password:', user.password);
  if (newPassword && newPassword.trim()) {
    user.password = newPassword.trim();
  }
  
  if (type === 'guru') {
    renderGuruResults();
  } else {
    renderSiswaResults();
  }
  
  showToast('✓ User berhasil diedit', 'success');
}

function deleteGeneratedUser(type, index) {
  if (!confirm('Yakin ingin menghapus user ini?')) return;
  
  if (type === 'guru') {
    userGenState.generatedGurus.splice(index, 1);
    renderGuruResults();
    if (userGenState.generatedGurus.length === 0) {
      document.getElementById('guruResults').style.display = 'none';
    }
  } else {
    userGenState.generatedSiswa.splice(index, 1);
    renderSiswaResults();
    if (userGenState.generatedSiswa.length === 0) {
      document.getElementById('siswaResults').style.display = 'none';
    }
  }
  
  showToast('✓ User berhasil dihapus', 'success');
}

// CSV Import
function handleUserCsvSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (!file.name.endsWith('.csv')) {
    showToast('File harus berformat CSV', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    parseUserCsv(content);
  };
  reader.readAsText(file);
}

function parseUserCsv(csvContent) {
  const lines = csvContent.split('\n').filter(l => l.trim());
  
  if (lines.length === 0) {
    showToast('File CSV kosong', 'error');
    return;
  }
  
  userGenState.csvImportData = [];
  
  // Skip header if exists
  const startIndex = lines[0].toLowerCase().includes('username') ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim());
    
    if (parts.length < 5) continue;
    
    const [username, name, role, subjectOrClass, password] = parts;
    
    if (!username || !role) continue;
    
    userGenState.csvImportData.push({
      username: username,
      name: name || username,
      role: role.toLowerCase(),
      subjectOrClass: subjectOrClass || '',
      password: password || generatePassword()
    });
  }
  
  renderCsvImportPreview();
  showToast(`✓ ${userGenState.csvImportData.length} user terdeteksi dari CSV`, 'success');
}

function renderCsvImportPreview() {
  const container = document.getElementById('csvImportResults');
  const tbody = document.getElementById('csvImportBody');
  
  tbody.innerHTML = '';
  
  userGenState.csvImportData.forEach((user) => {
    const row = `
      <tr>
        <td><strong>${user.username}</strong></td>
        <td>${user.name}</td>
        <td><span class="status-badge ${user.role === 'guru' ? 'status-active' : ''}">${user.role.toUpperCase()}</span></td>
        <td>${user.subjectOrClass}</td>
        <td><code>${user.password}</code></td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', row);
  });
  
  container.style.display = 'block';
}

function importCsvUsers() {
  if (userGenState.csvImportData.length === 0) {
    showToast('Tidak ada data untuk diimport', 'error');
    return;
  }
  
  let savedCount = 0;
  let duplicateCount = 0;
  
  userGenState.csvImportData.forEach(user => {
    // Check duplicate
    if (DEMO_USERS[user.username]) {
      duplicateCount++;
      return;
    }
    
    const newUser = {
      username: user.username,
      password: user.password,
      role: user.role,
      name: user.name,
      createdAt: new Date().toLocaleString('id-ID')
    };
    
    if (user.role === 'guru') {
      newUser.subject = user.subjectOrClass;
      sampleUsers.teachers.push(newUser);
    } else if (user.role === 'siswa') {
      newUser.class = user.subjectOrClass;
      sampleUsers.students.push(newUser);
    }
    
    DEMO_USERS[user.username] = newUser;
    savedCount++;
  });
  
  if (duplicateCount > 0) {
    showToast(`⚠️ ${duplicateCount} username sudah ada, ${savedCount} user berhasil diimport`, 'warning');
  } else {
    showToast(`✓ ${savedCount} user berhasil diimport!`, 'success');
  }
  
  // Clear
  userGenState.csvImportData = [];
  document.getElementById('csvImportResults').style.display = 'none';
  document.getElementById('userCsvInput').value = '';
}

// Manual Add User
function toggleManualFields() {
  const role = document.getElementById('manualRole').value;
  const subjectGroup = document.getElementById('manualSubjectGroup');
  const classGroup = document.getElementById('manualClassGroup');
  
  subjectGroup.style.display = role === 'guru' ? 'block' : 'none';
  classGroup.style.display = role === 'siswa' ? 'block' : 'none';
}

function handleAddManualUser(e) {
  e.preventDefault();
  
  const username = document.getElementById('manualUsername').value.trim();
  const password = document.getElementById('manualPassword').value;
  const role = document.getElementById('manualRole').value;
  const name = document.getElementById('manualName').value.trim();
  const subject = document.getElementById('manualSubject').value.trim();
  const classValue = document.getElementById('manualClass').value.trim();
  
  // Check duplicate
  if (DEMO_USERS[username]) {
    showToast('Username sudah ada!', 'error');
    return;
  }
  
  const newUser = {
    username: username,
    password: password,
    role: role,
    name: name,
    createdAt: new Date().toLocaleString('id-ID')
  };
  
  if (role === 'guru') {
    newUser.subject = subject;
    sampleUsers.teachers.push(newUser);
  } else if (role === 'siswa') {
    newUser.class = classValue;
    sampleUsers.students.push(newUser);
  }
  
  DEMO_USERS[username] = newUser;
  
  showToast(`✓ User ${username} berhasil ditambahkan!`, 'success');
  resetManualForm();
}

function resetManualForm() {
  document.getElementById('addManualUserForm').reset();
  document.getElementById('manualSubjectGroup').style.display = 'none';
  document.getElementById('manualClassGroup').style.display = 'none';
}

// View All Users
function renderAllUsers() {
  const tbody = document.getElementById('allUsersBody');
  tbody.innerHTML = '';
  
  const roleFilter = document.getElementById('userRoleFilter')?.value || '';
  const searchTerm = document.getElementById('userSearchFilter')?.value.toLowerCase() || '';
  
  let allUsers = [];
  
  // Collect all users
  Object.values(DEMO_USERS).forEach(user => {
    allUsers.push(user);
  });
  
  // Apply filters
  if (roleFilter) {
    allUsers = allUsers.filter(u => u.role === roleFilter);
  }
  
  if (searchTerm) {
    allUsers = allUsers.filter(u => 
      u.username.toLowerCase().includes(searchTerm) || 
      u.name.toLowerCase().includes(searchTerm)
    );
  }
  
  if (allUsers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">Tidak ada user ditemukan</td></tr>';
    return;
  }
  
  allUsers.forEach((user, index) => {
    const subjectOrClass = user.role === 'guru' ? user.subject || '-' : 
                          user.role === 'siswa' ? user.class || '-' : '-';
    
    const roleColor = user.role === 'admin' ? '#EF4444' : 
                     user.role === 'guru' ? '#3B82F6' : '#10B981';
    
    const row = `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${user.username}</strong></td>
        <td><span style="color: ${roleColor}; font-weight: 600;">${user.role.toUpperCase()}</span></td>
        <td>${user.name}</td>
        <td>${subjectOrClass}</td>
        <td><span class="status-badge status-active">Active</span></td>
        <td>
          <button class="btn-edit-inline" onclick="editExistingUser('${user.username}')">Edit</button>
          ${user.username !== 'admin' ? `<button class="btn-delete-inline" onclick="deleteExistingUser('${user.username}')">Del</button>` : ''}
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', row);
  });
}

function filterAllUsers() {
  renderAllUsers();
}

function editExistingUser(username) {
  const user = DEMO_USERS[username];
  if (!user) return;
  
  const newPassword = prompt(`Edit Password untuk ${username}:`, user.password);
  if (newPassword && newPassword.trim()) {
    user.password = newPassword.trim();
    
    // Update in sampleUsers as well
    if (user.role === 'guru') {
      const teacher = sampleUsers.teachers.find(t => t.username === username);
      if (teacher) teacher.password = newPassword.trim();
    } else if (user.role === 'siswa') {
      const student = sampleUsers.students.find(s => s.username === username);
      if (student) student.password = newPassword.trim();
    }
    
    renderAllUsers();
    showToast('✓ Password berhasil diupdate', 'success');
  }
}

function deleteExistingUser(username) {
  if (username === 'admin') {
    showToast('Admin tidak dapat dihapus!', 'error');
    return;
  }
  
  if (!confirm(`Yakin ingin menghapus user ${username}?`)) return;
  
  const user = DEMO_USERS[username];
  if (!user) return;
  
  // Delete from DEMO_USERS
  delete DEMO_USERS[username];
  
  // Delete from sampleUsers
  if (user.role === 'guru') {
    const index = sampleUsers.teachers.findIndex(t => t.username === username);
    if (index !== -1) sampleUsers.teachers.splice(index, 1);
  } else if (user.role === 'siswa') {
    const index = sampleUsers.students.findIndex(s => s.username === username);
    if (index !== -1) sampleUsers.students.splice(index, 1);
  }
  
  renderAllUsers();
  showToast(`✓ User ${username} berhasil dihapus`, 'success');
}

// ============================================
// TEMPLATE IMPORT FEATURE
// ============================================
let templateImportState = {
  uploadedData: [],
  processedUsers: []
};

// Download Template Guru
function downloadTemplateGuru() {
  console.log('📥 Starting Template Guru download...');
  
  // Generate CSV content with proper format
  const csvContent = [
    ['no', 'nama_lengkap', 'nip', 'username'],
    ['1', 'Contoh: Pak Ahmad Malik', '1234567', ''],
    ['2', 'Contoh: Bu Sarah Dewi', '1234568', ''],
    ['3', 'Contoh: Pak Budi Santoso', '1234569', ''],
    ['4', '', '', ''],
    ['5', '', '', ''],
    ['6', '', '', ''],
    ['7', '', '', ''],
    ['8', '', '', ''],
    ['9', '', '', ''],
    ['10', '', '', '']
  ];
  
  // Convert to CSV string
  let csvString = csvContent.map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');
  
  console.log('✓ CSV content generated:', csvString.substring(0, 100) + '...');
  
  // Create Blob
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  console.log('✓ Blob created. Size:', blob.size, 'bytes');
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'Template_Guru.csv');
  link.style.visibility = 'hidden';
  
  // Trigger download
  document.body.appendChild(link);
  console.log('✓ Download link created and appended');
  
  link.click();
  console.log('✓ Download triggered');
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log('✓ Cleanup complete');
  }, 100);
  
  showToast('✓ Template Guru berhasil didownload!', 'success');
  console.log('✓ Template Guru download complete');
}

// Download Template Siswa
function downloadTemplateSiswa() {
  console.log('📥 Starting Template Siswa download...');
  
  // Generate CSV content with proper format
  const csvContent = [
    ['no', 'nama_lengkap', 'nis', 'kelas', 'username'],
    ['1', 'Contoh: Andi Wijaya', '2024001', 'X.1', ''],
    ['2', 'Contoh: Siti Nurhaliza', '2024002', 'X.1', ''],
    ['3', 'Contoh: Budi Hermawan', '2024003', 'XI.1', ''],
    ['4', '', '', '', ''],
    ['5', '', '', '', ''],
    ['6', '', '', '', ''],
    ['7', '', '', '', ''],
    ['8', '', '', '', ''],
    ['9', '', '', '', ''],
    ['10', '', '', '', ''],
    ['11', '', '', '', ''],
    ['12', '', '', '', ''],
    ['13', '', '', '', ''],
    ['14', '', '', '', ''],
    ['15', '', '', '', '']
  ];
  
  // Convert to CSV string
  let csvString = csvContent.map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');
  
  console.log('✓ CSV content generated:', csvString.substring(0, 100) + '...');
  
  // Create Blob
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  console.log('✓ Blob created. Size:', blob.size, 'bytes');
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'Template_Siswa.csv');
  link.style.visibility = 'hidden';
  
  // Trigger download
  document.body.appendChild(link);
  console.log('✓ Download link created and appended');
  
  link.click();
  console.log('✓ Download triggered');
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log('✓ Cleanup complete');
  }, 100);
  
  showToast('✓ Template Siswa berhasil didownload!', 'success');
  console.log('✓ Template Siswa download complete');
}

// Handle Template File Selection
function handleTemplateFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (!file.name.endsWith('.csv')) {
    showToast('File harus berformat CSV', 'error');
    return;
  }
  
  showToast('File terpilih: ' + file.name, 'success');
}

// Process Template Upload
function processTemplateUpload() {
  const fileInput = document.getElementById('templateFileInput');
  const file = fileInput.files[0];
  const role = document.getElementById('templateRoleSelect').value;
  
  if (!file) {
    showToast('Pilih file template terlebih dahulu', 'error');
    return;
  }
  
  showToast('⚡ Memproses template...', 'info');
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const csvText = e.target.result;
    parseAndGenerateFromTemplate(csvText, role);
  };
  reader.readAsText(file);
}

// Parse CSV and Auto-Generate Usernames & Passwords
function parseAndGenerateFromTemplate(csvText, role) {
  const lines = csvText.split('\n').filter(l => l.trim());
  
  if (lines.length === 0) {
    showToast('File CSV kosong', 'error');
    return;
  }
  
  // Skip header row
  const startIndex = 1;
  const processedUsers = [];
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',').map(p => p.trim());
    
    if (role === 'guru') {
      // Format: no,nama_lengkap,nip,username
      if (parts.length < 2) continue;
      
      const no = parts[0];
      const namaLengkap = parts[1];
      const nip = parts[2] || '';
      
      if (!namaLengkap) continue;
      
      // Auto-generate username from name
      const username = generateUsernameFromName(namaLengkap, 'guru');
      
      // Auto-generate password
      const password = generatePassword(8);
      
      processedUsers.push({
        no: processedUsers.length + 1,
        namaLengkap: namaLengkap,
        username: username,
        password: password,
        role: 'guru',
        nip: nip,
        kelasMapel: nip ? `NIP: ${nip}` : '-',
        status: 'Ready'
      });
    } else if (role === 'siswa') {
      // Format: no,nama_lengkap,nis,kelas,username
      if (parts.length < 4) continue;
      
      const no = parts[0];
      const namaLengkap = parts[1];
      const nis = parts[2] || '';
      const kelas = parts[3] || '';
      
      if (!namaLengkap || !kelas) continue;
      
      // Auto-generate username from name
      const username = generateUsernameFromName(namaLengkap, 'siswa');
      
      // Auto-generate password
      const password = generatePassword(8);
      
      processedUsers.push({
        no: processedUsers.length + 1,
        namaLengkap: namaLengkap,
        username: username,
        password: password,
        role: 'siswa',
        nis: nis,
        kelas: kelas,
        kelasMapel: kelas,
        status: 'Ready'
      });
    }
  }
  
  if (processedUsers.length === 0) {
    showToast('Tidak ada data valid yang terdeteksi', 'error');
    return;
  }
  
  // Store processed users
  templateImportState.processedUsers = processedUsers;
  
  // Show preview
  showTemplatePreview(processedUsers, role);
  
  showToast(`✓ ${processedUsers.length} user berhasil diproses!`, 'success');
}

// Generate Username from Name
function generateUsernameFromName(namaLengkap, role) {
  // Remove titles and clean name
  let cleanName = namaLengkap
    .toLowerCase()
    .replace(/^(pak|bu|bapak|ibu|dr|drs|prof)\s+/i, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 15);
  
  // Add role prefix
  let baseUsername = `${role}_${cleanName}`;
  
  // Check for duplicates and add number if needed
  let username = baseUsername;
  let counter = 1;
  
  while (DEMO_USERS[username] || sampleUsers.teachers.find(t => t.username === username) || sampleUsers.students.find(s => s.username === username)) {
    username = `${baseUsername}_${counter}`;
    counter++;
  }
  
  return username;
}

// Show Template Preview
function showTemplatePreview(users, role) {
  const previewSection = document.getElementById('templatePreviewSection');
  const tbody = document.getElementById('templatePreviewBody');
  const successMessage = document.getElementById('templateSuccessMessage');
  
  successMessage.textContent = `${users.length} ${role} siap disimpan ke database`;
  
  tbody.innerHTML = '';
  
  users.forEach((user, index) => {
    const row = `
      <tr>
        <td>${user.no}</td>
        <td><strong>${user.namaLengkap}</strong></td>
        <td><code>${user.username}</code></td>
        <td><code style="background: #FEF3C7; color: #78350F; font-weight: 600;">${user.password}</code></td>
        <td>${user.kelasMapel}</td>
        <td><span style="color: #10B981; font-weight: 600;">✓ ${user.status}</span></td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', row);
  });
  
  previewSection.style.display = 'block';
  
  // Scroll to preview
  previewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Copy All Template Results
function copyAllTemplateResults() {
  if (templateImportState.processedUsers.length === 0) {
    showToast('Tidak ada data untuk di-copy', 'error');
    return;
  }
  
  const role = templateImportState.processedUsers[0].role;
  let text = `HASIL IMPORT ${role.toUpperCase()}:\n\n`;
  
  templateImportState.processedUsers.forEach((user, i) => {
    text += `${i + 1}. ${user.namaLengkap}\n`;
    text += `   Username: ${user.username}\n`;
    text += `   Password: ${user.password}\n`;
    if (role === 'siswa') {
      text += `   Kelas: ${user.kelas}\n`;
    }
    text += `\n`;
  });
  
  navigator.clipboard.writeText(text).then(() => {
    showToast('✓ Berhasil di-copy ke clipboard!', 'success');
  }).catch(() => {
    showToast('Gagal copy. Gunakan browser modern.', 'error');
  });
}

// Export Template Results as CSV
function exportTemplateResultsCSV() {
  if (templateImportState.processedUsers.length === 0) {
    showToast('Tidak ada data untuk di-export', 'error');
    return;
  }
  
  const role = templateImportState.processedUsers[0].role;
  let csv = role === 'guru' 
    ? 'No,Nama Lengkap,Username,Password,NIP\n'
    : 'No,Nama Lengkap,Username,Password,NIS,Kelas\n';
  
  templateImportState.processedUsers.forEach((user) => {
    if (role === 'guru') {
      csv += `${user.no},${user.namaLengkap},${user.username},${user.password},${user.nip || ''}\n`;
    } else {
      csv += `${user.no},${user.namaLengkap},${user.username},${user.password},${user.nis || ''},${user.kelas}\n`;
    }
  });
  
  const filename = `Import_${role}_${Date.now()}.csv`;
  downloadCSV(csv, filename);
  showToast('✓ File CSV berhasil di-download!', 'success');
}

// Save Template Results to Database
function saveTemplateResults() {
  if (templateImportState.processedUsers.length === 0) {
    showToast('Tidak ada data untuk disimpan', 'error');
    return;
  }
  
  let savedCount = 0;
  let duplicateCount = 0;
  
  templateImportState.processedUsers.forEach(user => {
    // Check duplicate
    if (DEMO_USERS[user.username]) {
      duplicateCount++;
      return;
    }
    
    const newUser = {
      username: user.username,
      password: user.password,
      role: user.role,
      name: user.namaLengkap,
      createdAt: new Date().toLocaleString('id-ID')
    };
    
    if (user.role === 'guru') {
      newUser.subject = user.nip ? `NIP: ${user.nip}` : null;
      sampleUsers.teachers.push(newUser);
    } else if (user.role === 'siswa') {
      newUser.class = user.kelas;
      sampleUsers.students.push(newUser);
    }
    
    DEMO_USERS[user.username] = newUser;
    savedCount++;
  });
  
  if (duplicateCount > 0) {
    showToast(`⚠️ ${duplicateCount} username sudah ada, ${savedCount} user berhasil disimpan`, 'warning');
  } else {
    showToast(`✓ ${savedCount} user berhasil ditambahkan ke database!`, 'success');
  }
  
  // Clear state and UI
  templateImportState.processedUsers = [];
  document.getElementById('templateFileInput').value = '';
  document.getElementById('templatePreviewSection').style.display = 'none';
  
  // Refresh all users view if it's active
  const allUsersTab = document.getElementById('all-users');
  if (allUsersTab && allUsersTab.classList.contains('active')) {
    renderAllUsers();
  }
}

// Sync subjects with quizzes
function syncSubjectsWithQuizzes() {
  adminData.subjects.forEach(subject => {
    const quizCount = appState.quizzes.filter(q => 
      q.subject === subject.name && q.active
    ).length;
    
    const totalQuestions = appState.quizzes
      .filter(q => q.subject === subject.name && q.active)
      .reduce((sum, q) => sum + q.questions.length, 0);
    
    subject.activeSoal = totalQuestions;
    subject.totalSoal = totalQuestions;
    subject.status = totalQuestions > 0 ? 'SUDAH_INPUT' : 'BELUM_INPUT';
    
    if (totalQuestions > 0 && !subject.lastUpdated) {
      subject.lastUpdated = new Date().toLocaleString('id-ID');
    }
  });
}

// Call sync on app load
setTimeout(syncSubjectsWithQuizzes, 100);

// Demo: Add some sample current exams for testing
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  setTimeout(() => {
    // Add demo exam data
    adminData.currentExams.push({
      examId: 9001,
      studentId: 'siswa1',
      studentName: 'Andi Wijaya',
      studentClass: 'XII.1',
      examName: 'Quiz Matematika - Integral',
      subject: 'Matematika',
      startTime: new Date().toLocaleString('id-ID'),
      duration: 30,
      remainingTime: 18.5,
      status: 'ongoing',
      faceDetectionMode: 'REAL_CAMERA',
      fullscreenActive: true,
      violations: {
        tabSwitch: 0,
        faceDetection: 0,
        total: 0
      },
      violationHistory: [],
      lastUpdated: new Date().toLocaleString('id-ID')
    });
    
    adminData.currentExams.push({
      examId: 9002,
      studentId: 'siswa2',
      studentName: 'Siti Nurhaliza',
      studentClass: 'XII.1',
      examName: 'Reading Comprehension - English',
      subject: 'Bahasa Inggris',
      startTime: new Date().toLocaleString('id-ID'),
      duration: 45,
      remainingTime: 28.3,
      status: 'ongoing',
      faceDetectionMode: 'DEMO_MODE',
      fullscreenActive: true,
      violations: {
        tabSwitch: 1,
        faceDetection: 1,
        total: 2
      },
      violationHistory: [
        {
          time: new Date(Date.now() - 300000).toLocaleTimeString('id-ID'),
          type: 'tab_switch',
          message: 'Tab switching detected'
        },
        {
          time: new Date(Date.now() - 120000).toLocaleTimeString('id-ID'),
          type: 'face_detection',
          subtype: 'NO_FACE',
          message: 'No face detected for 5s'
        }
      ],
      lastUpdated: new Date().toLocaleString('id-ID')
    });
    
    adminData.currentExams.push({
      examId: 9003,
      studentId: 'siswa3',
      studentName: 'Budi Santoso',
      studentClass: 'XII.1',
      examName: 'Quiz Matematika - Integral',
      subject: 'Matematika',
      startTime: new Date().toLocaleString('id-ID'),
      duration: 30,
      remainingTime: 0,
      status: 'ended',
      faceDetectionMode: 'REAL_CAMERA',
      fullscreenActive: false,
      violations: {
        tabSwitch: 3,
        faceDetection: 0,
        total: 3
      },
      violationHistory: [
        {
          time: new Date(Date.now() - 600000).toLocaleTimeString('id-ID'),
          type: 'tab_switch',
          message: 'Tab switching detected'
        },
        {
          time: new Date(Date.now() - 400000).toLocaleTimeString('id-ID'),
          type: 'tab_switch',
          message: 'Tab switching detected'
        },
        {
          time: new Date(Date.now() - 200000).toLocaleTimeString('id-ID'),
          type: 'tab_switch',
          message: 'Tab switching detected - Exam ended'
        }
      ],
      lastUpdated: new Date().toLocaleString('id-ID')
    });
  }, 500);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  document.getElementById(pageId).classList.add('active');
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function showTab(tabId) {
  const parent = document.querySelector(`[data-tab="${tabId}"]`).closest('.dashboard-container');
  parent.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  parent.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

// ============================================
// MEDIAPIPE FACE DETECTION
// ============================================
// Mock Face Detector (Fallback)
class MockFaceDetector {
  async detectForVideo(video, timestamp) {
    // Simple mock: randomly detect 0-2 faces for demo
    const random = Math.random();
    
    if (random > 0.8) {
      // No face (20%)
      return { detections: [] };
    } else if (random > 0.95) {
      // Multiple faces (5%)
      return {
        detections: [
          {
            boundingBox: { originX: 50, originY: 50, width: 100, height: 120 },
            categories: [{ score: 0.9 }]
          },
          {
            boundingBox: { originX: 200, originY: 50, width: 100, height: 120 },
            categories: [{ score: 0.85 }]
          }
        ]
      };
    } else {
      // One face (75%)
      const vw = video.videoWidth || 320;
      const vh = video.videoHeight || 240;
      const w = Math.floor(vw * 0.4);
      const h = Math.floor(vh * 0.5);
      const x = Math.floor((vw - w) / 2);
      const y = Math.floor((vh - h) / 2);
      
      return {
        detections: [
          {
            boundingBox: { originX: x, originY: y, width: w, height: h },
            categories: [{ score: 0.85 + Math.random() * 0.15 }]
          }
        ]
      };
    }
  }
}

async function initializeFaceDetector() {
  try {
    // Check if MediaPipe is available
    if (typeof window.FaceDetector === 'undefined') {
      console.warn('MediaPipe not loaded, using mock detector');
      appState.faceDetector = new MockFaceDetector();
      showToast('Menggunakan demo face detection (MediaPipe tidak tersedia)', 'warning');
      return true;
    }
    
    const { FaceDetector, FilesetResolver } = window;
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    
    const faceDetector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      minDetectionConfidence: 0.5
    });
    
    appState.faceDetector = faceDetector;
    return true;
  } catch (error) {
    console.error('Face detector initialization failed, using mock:', error);
    appState.faceDetector = new MockFaceDetector();
    showToast('Menggunakan demo face detection (MediaPipe gagal dimuat)', 'warning');
    return true;
  }
}

async function requestCameraPermission() {
  appState.cameraPermissionAttempts++;
  
  try {
    // Step 1: Feature Detection
    console.log('🎥 CAMERA: Starting camera access request...');
    
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('getUserMedia not supported');
    }
    
    // Check secure context
    const isSecureContext = window.isSecureContext || 
      location.hostname === 'localhost' || 
      location.hostname === '127.0.0.1';
    
    if (!isSecureContext) {
      const secError = new Error('Application must run from localhost or HTTPS');
      secError.name = 'SecurityError';
      throw secError;
    }
    
    // Update UI - Requesting
    updateCameraStatus('⏳ Meminta izin akses kamera...', 'warning');
    showToast('Tekan "Izinkan" saat browser minta izin kamera', 'info');
    
    // Step 2: Request Camera with Simple Constraints
    const constraints = {
      audio: false,
      video: {
        width: { ideal: 320 },
        height: { ideal: 240 },
        facingMode: 'user'
      }
    };
    
    console.log('🎥 CAMERA: Requesting getUserMedia with constraints:', constraints);
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    console.log('✓ CAMERA: Stream received', stream);
    console.log('✓ CAMERA: Video tracks:', stream.getVideoTracks());
    
    appState.videoStream = stream;
    appState.faceDetectionMode = 'REAL_CAMERA';
    
    // Step 3: Attach Stream to Video Element
    const video = document.getElementById('faceVerificationVideo');
    video.srcObject = stream;
    
    // Hide permission section, show preview
    document.getElementById('cameraPermissionSection').style.display = 'none';
    document.getElementById('cameraPreviewSection').style.display = 'block';
    
    // Step 4: Wait for Video to Actually Load and Play
    let videoReady = false;
    
    video.onloadedmetadata = async () => {
      console.log('🎥 CAMERA: Video metadata loaded');
      console.log('🎥 CAMERA: Video dimensions:', video.videoWidth, 'x', video.videoHeight);
      
      try {
        await video.play();
        console.log('🎥 CAMERA: Video play() called successfully');
      } catch (playError) {
        console.error('❌ CAMERA: Video play error:', playError);
        throw playError;
      }
      
      // Wait for actual video data
      const checkVideoReady = () => {
        console.log('🎥 CAMERA: Checking readyState:', video.readyState);
        
        if (video.readyState >= 2) { // HAVE_CURRENT_DATA or better
          videoReady = true;
          
          // Get video track info
          const videoTrack = stream.getVideoTracks()[0];
          const settings = videoTrack.getSettings();
          const label = videoTrack.label || 'Default Camera';
          
          console.log('✓ CAMERA: Video is READY and PLAYING');
          console.log('✓ CAMERA: Resolution:', settings.width, 'x', settings.height);
          console.log('✓ CAMERA: Camera label:', label);
          console.log('✓ CAMERA: Frame rate:', settings.frameRate);
          
          // Update UI with success
          updateCameraStatus('✓ KAMERA AKTIF dan siap digunakan', 'success');
          updateCameraDetails(
            `Resolution: ${settings.width}x${settings.height}`,
            `Kamera: ${label}`,
            settings.frameRate ? `FPS: ${settings.frameRate}` : ''
          );
          
          // Initialize face detector
          initializeFaceDetector().then(() => {
            startFaceVerification();
          });
        } else {
          // Check again in 100ms
          setTimeout(checkVideoReady, 100);
        }
      };
      
      checkVideoReady();
    };
    
    // Timeout if video doesn't start playing
    setTimeout(() => {
      if (!videoReady) {
        console.error('❌ CAMERA: Video timeout - not playing after 3 seconds');
        const timeoutError = new Error('Video tidak mulai bermain setelah 3 detik');
        timeoutError.name = 'TimeoutError';
        handleCameraError(timeoutError);
        
        // Stop stream
        if (appState.videoStream) {
          appState.videoStream.getTracks().forEach(track => track.stop());
          appState.videoStream = null;
        }
      }
    }, 3000);
    
  } catch (error) {
    console.error('❌ CAMERA: Permission error:', error.name, error.message);
    handleCameraError(error);
  }
}

function handleCameraError(error) {
  console.log('❌ CAMERA: Error Details:', {
    name: error.name,
    message: error.message,
    toString: error.toString()
  });
  
  let errorMessage = '';
  let errorSolution = '';
  let errorType = '';
  
  if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
    errorType = 'PERMISSION_DENIED';
    errorMessage = '❌ Izin Kamera Ditolak';
    errorSolution = 'Klik icon camera di address bar → pilih \'Allow\' → Refresh halaman';
  } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
    errorType = 'CAMERA_NOT_FOUND';
    errorMessage = '❌ Kamera Tidak Ditemukan';
    errorSolution = 'Pastikan kamera terhubung ke perangkat atau gunakan Mode Demo';
  } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
    errorType = 'CAMERA_IN_USE';
    errorMessage = '❌ Kamera Sedang Digunakan Aplikasi Lain';
    errorSolution = 'Tutup aplikasi lain yang menggunakan kamera (Zoom, Teams, dll) → Coba Lagi';
  } else if (error.name === 'SecurityError' || error.name === 'InvalidStateError' || 
             error.message.includes('Invalid security origin') || 
             error.message.includes('secure origin') ||
             error.message.includes('localhost') ||
             error.toString().includes('SecurityError')) {
    errorType = 'SECURITY_ERROR';
    errorMessage = '❌ Batasan Keamanan Browser';
    
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    if (protocol === 'file:') {
      errorSolution = 'Jalankan dari http://localhost:8000 (bukan file://). Gunakan: python -m http.server 8000';
    } else if (protocol === 'http:' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      errorSolution = 'Aplikasi harus dijalankan dari http://localhost atau menggunakan HTTPS';
    } else {
      errorSolution = 'Jalankan dari http://localhost:8000 atau gunakan HTTPS';
    }
  } else if (error.name === 'TimeoutError') {
    errorType = 'TIMEOUT_ERROR';
    errorMessage = '❌ Kamera Tidak Merespons';
    errorSolution = 'Coba refresh halaman atau cabut dan pasang ulang camera device';
  } else if (error.name === 'TypeError' || error.message.includes('getUserMedia')) {
    errorType = 'UNSUPPORTED';
    errorMessage = '❌ Browser Tidak Mendukung Camera';
    errorSolution = 'Gunakan Chrome, Firefox, atau Safari versi terbaru';
  } else {
    errorType = 'UNKNOWN_ERROR';
    errorMessage = '❌ Error: ' + error.name;
    errorSolution = error.message || 'Coba refresh halaman atau gunakan browser lain';
  }
  
  console.warn('⚠️ CAMERA: Error Type:', errorType);
  
  // Update UI with error
  updateCameraStatus(errorMessage, 'error');
  updateCameraDetails(errorSolution, '', '');
  
  showCameraErrorWithOptions(errorMessage, errorSolution, errorType);
}

function showCameraErrorWithOptions(message, solution, errorType) {
  const modal = document.getElementById('cameraErrorModal');
  const messageEl = document.getElementById('cameraErrorMessage');
  const solutionsEl = document.getElementById('errorSolutions');
  
  messageEl.textContent = message;
  
  // Update solutions box
  solutionsEl.innerHTML = `
    <p style="font-weight: 600; margin-bottom: 8px;">💡 Solusi:</p>
    <p style="margin-left: 20px; color: #78350F;">${solution}</p>
  `;
  
  modal.classList.add('active');
}

function startFaceVerification() {
  const video = document.getElementById('faceVerificationVideo');
  const canvas = document.getElementById('faceVerificationCanvas');
  const ctx = canvas.getContext('2d');
  const indicator = document.getElementById('faceStatusIndicator');
  const stabilityMsg = document.getElementById('stabilityMessage');
  const proceedBtn = document.getElementById('proceedToExamBtn');
  
  console.log('🎥 CAMERA: Starting face verification');
  console.log('🎥 CAMERA: Video state - paused:', video.paused, 'ended:', video.ended, 'readyState:', video.readyState);
  
  // Ensure video is visible for real camera
  video.style.display = 'block';
  canvas.style.display = 'block';
  
  // Set canvas size
  canvas.width = video.videoWidth || 320;
  canvas.height = video.videoHeight || 240;
  
  console.log('🎥 CAMERA: Canvas size set to', canvas.width, 'x', canvas.height);
  
  let lastVideoTime = -1;
  appState.faceStableCount = 0;
  
  const detectFace = async () => {
    if (!appState.faceDetector || video.paused || video.ended) return;
    
    const currentTime = video.currentTime;
    if (currentTime !== lastVideoTime) {
      lastVideoTime = currentTime;
      
      try {
        const timestamp = performance.now ? performance.now() : Date.now();
        const detections = await appState.faceDetector.detectForVideo(video, timestamp);
        
        // Log frame capture occasionally
        if (Math.random() < 0.05) {
          console.log('🎥 CAMERA: Frame captured for detection. Detections:', detections.detections?.length || 0);
        }
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (detections.detections && detections.detections.length === 1) {
          // Exactly 1 face detected - Good!
          const detection = detections.detections[0];
          const bbox = detection.boundingBox;
          
          // Draw green bounding box
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 3;
          ctx.strokeRect(bbox.originX, bbox.originY, bbox.width, bbox.height);
          
          indicator.textContent = '✓ Wajah Terdeteksi';
          indicator.className = 'face-status-indicator detected';
          
          appState.faceStableCount++;
          const secondsStable = Math.floor(appState.faceStableCount / 2.5); // ~2.5 fps
          
          if (secondsStable >= 2) {
            stabilityMsg.textContent = '✓ Wajah stabil! Anda dapat melanjutkan.';
            stabilityMsg.style.color = '#10B981';
            proceedBtn.disabled = false;
          } else {
            stabilityMsg.textContent = `Menunggu wajah stabil... (${secondsStable}/2 detik)`;
            stabilityMsg.style.color = '#F59E0B';
          }
        } else if (detections.detections && detections.detections.length > 1) {
          // Multiple faces
          indicator.textContent = '✗ Lebih dari 1 wajah terdeteksi';
          indicator.className = 'face-status-indicator not-detected';
          stabilityMsg.textContent = 'Pastikan hanya wajah Anda yang terlihat';
          stabilityMsg.style.color = '#EF4444';
          appState.faceStableCount = 0;
          proceedBtn.disabled = true;
        } else {
          // No face
          indicator.textContent = '✗ Wajah tidak terdeteksi';
          indicator.className = 'face-status-indicator not-detected';
          stabilityMsg.textContent = 'Posisikan wajah Anda di dalam frame';
          stabilityMsg.style.color = '#EF4444';
          appState.faceStableCount = 0;
          proceedBtn.disabled = true;
        }
      } catch (error) {
        console.error('Face detection error:', error);
      }
    }
    
    requestAnimationFrame(detectFace);
  };
  
  detectFace();
}

async function proceedToExam() {
  console.log('🎯 Starting exam with mode:', appState.faceDetectionMode);
  
  // Update admin monitoring with face detection mode
  const exam = adminData.currentExams.find(e => e.examId === appState.currentQuizSession.adminExamId);
  if (exam) {
    exam.faceDetectionMode = appState.faceDetectionMode;
    exam.fullscreenActive = true;
  }
  
  // Verify camera is truly active before proceeding (for REAL_CAMERA mode)
  if (appState.faceDetectionMode === 'REAL_CAMERA') {
    const isActive = verifyCameraIsActive();
    if (!isActive) {
      showToast('⚠️ Kamera belum siap. Tunggu sebentar...', 'warning');
      return;
    }
  }
  
  // Stop verification video
  const video = document.getElementById('faceVerificationVideo');
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
    console.log('🎥 CAMERA: Verification stream stopped');
  }
  
  // Clear demo mode interval if exists
  if (appState.demoModeInterval) {
    clearInterval(appState.demoModeInterval);
    appState.demoModeInterval = null;
  }
  
  // Hide face verification page
  document.getElementById('faceVerificationPage').style.display = 'none';
  
  // Show quiz interface
  document.getElementById('quizInterface').style.display = 'block';
  
  // Enter MOBILE EXAM MODE (fullscreen + orientation lock + wake lock)
  await enterMobileExamMode();
  
  // Initialize quiz interface
  initQuizInterface();
  
  // Start anti-cheat monitoring
  startAntiCheatMonitoring();
  
  // Start face monitoring during exam based on mode
  setTimeout(() => {
    if (appState.faceDetectionMode === 'REAL_CAMERA') {
      startExamFaceMonitoring();
    } else if (appState.faceDetectionMode === 'DEMO_MODE') {
      startDemoFaceMonitoring();
    }
    // NO_FACE_DETECTION mode doesn't need face monitoring
  }, 1000);
}

async function startExamFaceMonitoring() {
  try {
    console.log('🎥 CAMERA: Starting exam face monitoring...');
    
    // Request camera for exam
    const constraints = {
      audio: false,
      video: {
        width: { ideal: 320 },
        height: { ideal: 240 },
        facingMode: 'user'
      }
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('✓ CAMERA: Exam stream received', stream);
    
    appState.videoStream = stream;
    const video = document.getElementById('examFaceVideo');
    video.srcObject = stream;
    video.style.display = 'block';
    video.muted = true;
    video.playsInline = true;
    
    video.onloadedmetadata = async () => {
      console.log('🎥 CAMERA: Exam video metadata loaded');
      
      try {
        await video.play();
        console.log('✓ CAMERA: Exam video playing');
        
        // Wait for video to be ready
        const waitForVideo = () => {
          if (video.readyState >= 2) {
            const canvas = document.getElementById('examFaceCanvas');
            canvas.style.display = 'block';
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            console.log('✓ CAMERA: Exam video ready. Resolution:', video.videoWidth, 'x', video.videoHeight);
            
            appState.faceDetectionActive = true;
            appState.lastFaceDetectedTime = Date.now();
            
            // Initialize face detector for exam if needed
            if (!appState.faceDetector) {
              initializeFaceDetector();
            }
            
            // Start periodic face detection (every 400ms)
            appState.faceDetectionInterval = setInterval(() => {
              detectFaceDuringExam();
            }, 400);
            
            updateFaceMonitorStatus('✓ Wajah Terdeteksi');
            console.log('✓ CAMERA: Face monitoring ACTIVE during exam');
          } else {
            setTimeout(waitForVideo, 100);
          }
        };
        
        waitForVideo();
      } catch (playError) {
        console.error('❌ CAMERA: Exam video play error:', playError);
        throw playError;
      }
    };
    
    // Timeout fallback
    setTimeout(() => {
      if (!appState.faceDetectionActive) {
        console.warn('⚠️ CAMERA: Exam monitoring timeout, falling back to tab-switch only');
        showToast('Face monitoring timeout. Ujian berlanjut dengan tab-switch detection.', 'warning');
        document.getElementById('faceMonitoringPreview').style.display = 'none';
      }
    }, 5000);
    
  } catch (error) {
    console.error('❌ CAMERA: Exam face monitoring error:', error.name, error.message);
    showToast('Face monitoring tidak dapat dimulai. Ujian berlanjut dengan tab-switch detection.', 'warning');
    document.getElementById('faceMonitoringPreview').style.display = 'none';
  }
}

function startDemoFaceMonitoring() {
  const video = document.getElementById('examFaceVideo');
  const canvas = document.getElementById('examFaceCanvas');
  const ctx = canvas.getContext('2d');
  
  // Hide video, show canvas for demo
  video.style.display = 'none';
  canvas.style.display = 'block';
  canvas.width = 200;
  canvas.height = 150;
  
  appState.faceDetectionActive = true;
  appState.lastFaceDetectedTime = Date.now();
  
  let demoFrame = 0;
  let demoViolationActive = false;
  
  // Draw demo frame
  const drawDemoExamFrame = () => {
    if (!appState.faceDetectionActive) return;
    
    demoFrame++;
    
    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (!demoViolationActive) {
      // Normal: draw green box
      const boxWidth = 80;
      const boxHeight = 100;
      const boxX = (canvas.width - boxWidth) / 2;
      const boxY = (canvas.height - boxHeight) / 2;
      
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2;
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
      
      updateFaceMonitorStatus('✓ Wajah Terdeteksi (Demo)');
      appState.lastFaceDetectedTime = Date.now();
      appState.noFaceDuration = 0;
      appState.multipleFacesDuration = 0;
    }
    
    // Demo mode label
    ctx.fillStyle = '#10B981';
    ctx.font = '10px Arial';
    ctx.fillText('DEMO', 5, 12);
  };
  
  appState.faceDetectionInterval = setInterval(drawDemoExamFrame, 40);
  
  // Setup keyboard shortcuts for demo mode
  setupDemoKeyboardShortcuts();
  
  showToast('🎭 Mode Demo Aktif - Gunakan Alt+1/2/3 untuk testing', 'success');
}

function setupDemoKeyboardShortcuts() {
  const demoKeyHandler = (e) => {
    if (!appState.faceDetectionActive || appState.faceDetectionMode !== 'DEMO_MODE') return;
    
    if (e.altKey) {
      if (e.key === '1') {
        e.preventDefault();
        handleFaceViolation('NO_FACE');
        showToast('Demo: NO_FACE violation triggered', 'warning');
      } else if (e.key === '2') {
        e.preventDefault();
        handleFaceViolation('MULTIPLE_FACES');
        showToast('Demo: MULTIPLE_FACES violation triggered', 'warning');
      } else if (e.key === '3') {
        e.preventDefault();
        handleFaceViolation('LOW_CONFIDENCE');
        showToast('Demo: LOW_CONFIDENCE violation triggered', 'warning');
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        appState.faceViolationCount = 0;
        appState.noFaceDuration = 0;
        appState.multipleFacesDuration = 0;
        appState.lowConfidenceDuration = 0;
        updateViolationsDisplay();
        showToast('Demo: Violations cleared', 'success');
      }
    }
  };
  
  document.addEventListener('keydown', demoKeyHandler);
}

function updateFaceMonitorStatus(text) {
  const statusEl = document.getElementById('faceMonitorStatus');
  if (statusEl) {
    statusEl.textContent = text;
  }
}

async function detectFaceDuringExam() {
  if (!appState.faceDetector || !appState.faceDetectionActive) return;
  
  const video = document.getElementById('examFaceVideo');
  const canvas = document.getElementById('examFaceCanvas');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('faceMonitorStatus');
  
  if (video.paused || video.ended) return;
  
  try {
    const currentTime = video.currentTime;
    const timestamp = performance.now ? performance.now() : Date.now();
    const detections = await appState.faceDetector.detectForVideo(video, timestamp);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const now = Date.now();
    
    if (detections.detections && detections.detections.length === 1) {
      // Exactly 1 face - Perfect!
      const detection = detections.detections[0];
      const bbox = detection.boundingBox;
      const confidence = detection.categories[0]?.score || 0;
      
      // Draw green bounding box
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2;
      ctx.strokeRect(bbox.originX, bbox.originY, bbox.width, bbox.height);
      
      statusEl.textContent = '✓ Wajah Terdeteksi';
      statusEl.className = 'face-monitor-status detected';
      
      appState.lastFaceDetectedTime = now;
      appState.noFaceDuration = 0;
      appState.multipleFacesDuration = 0;
      
      // Check confidence
      if (confidence < 0.3) {
        appState.lowConfidenceDuration += 0.4;
        if (appState.lowConfidenceDuration >= 5) {
          handleFaceViolation('LOW_CONFIDENCE');
          appState.lowConfidenceDuration = 0;
        }
      } else {
        appState.lowConfidenceDuration = 0;
      }
    } else if (detections.detections && detections.detections.length > 1) {
      // Multiple faces detected
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      detections.detections.forEach(det => {
        const bbox = det.boundingBox;
        ctx.strokeRect(bbox.originX, bbox.originY, bbox.width, bbox.height);
      });
      
      statusEl.textContent = '✗ Beberapa Wajah Terdeteksi';
      statusEl.className = 'face-monitor-status not-detected';
      
      appState.multipleFacesDuration += 0.4;
      appState.noFaceDuration = 0;
      appState.lowConfidenceDuration = 0;
      
      if (appState.multipleFacesDuration >= 3) {
        handleFaceViolation('MULTIPLE_FACES');
        appState.multipleFacesDuration = 0;
      }
    } else {
      // No face detected
      statusEl.textContent = '✗ Wajah Tidak Terdeteksi';
      statusEl.className = 'face-monitor-status not-detected';
      
      appState.noFaceDuration += 0.4;
      appState.multipleFacesDuration = 0;
      appState.lowConfidenceDuration = 0;
      
      if (appState.noFaceDuration >= 5) {
        handleFaceViolation('NO_FACE');
        appState.noFaceDuration = 0;
      }
    }
  } catch (error) {
    console.error('Face detection error:', error);
  }
}

function handleFaceViolation(violationType) {
  appState.faceViolationCount++;
  
  // Update admin monitoring
  const exam = adminData.currentExams.find(e => e.examId === appState.currentQuizSession?.adminExamId);
  if (exam) {
    exam.violations.faceDetection++;
    exam.violations.total++;
    exam.violationHistory.push({
      time: new Date().toLocaleTimeString('id-ID'),
      type: 'face_detection',
      subtype: violationType,
      message: violationType === 'NO_FACE' ? 'No face detected for 5s' : 
               violationType === 'MULTIPLE_FACES' ? 'Multiple faces detected' :
               'Low confidence detection'
    });
    exam.lastUpdated = new Date().toLocaleString('id-ID');
  }
  
  // Update violations display
  updateViolationsDisplay();
  
  const violationMessages = {
    'NO_FACE': 'Wajah tidak terdeteksi dalam 5 detik',
    'MULTIPLE_FACES': 'Lebih dari 1 wajah terdeteksi',
    'LOW_CONFIDENCE': 'Wajah terdeteksi tapi kualitas rendah (cahaya/blur)'
  };
  
  if (appState.faceViolationCount === 1 || appState.faceViolationCount === 2) {
    showFaceViolationModal(
      '⚠️ PERINGATAN DETEKSI WAJAH!',
      `Sistem mendeteksi: ${violationMessages[violationType]}. Pelanggaran ke-1 dari 3. Pastikan wajah Anda terlihat jelas dalam frame. Jangan ada orang lain di dalam ruangan!`
    );
    // Play alert sound
    playAlertSound();
  } else if (appState.faceViolationCount === 3 || appState.faceViolationCount === 4) {
    showFaceViolationModal(
      '⚠️⚠️ PERINGATAN TERAKHIR!',
      `Pelanggaran ke-${appState.faceViolationCount} dari 5. Jika melakukan pelanggaran lagi, ujian akan otomatis BERAKHIR dan Anda harus login ulang. FOKUS pada ujian dan pastikan wajah selalu terlihat!`
    );
    playAlertSound();
  } else if (appState.faceViolationCount >= 5) {
    // End exam due to face violations
    endExamDueToViolation('face_detection', violationMessages[violationType]);
  }
}

function showFaceViolationModal(title, message) {
  const modal = document.getElementById('faceViolationModal');
  document.getElementById('faceViolationTitle').textContent = title;
  document.getElementById('faceViolationMessage').textContent = message;
  modal.classList.add('active');
  
  // Auto-close after 5 seconds
  setTimeout(() => {
    if (modal.classList.contains('active')) {
      closeFaceViolationModal();
    }
  }, 5000);
}

function closeFaceViolationModal() {
  document.getElementById('faceViolationModal').classList.remove('active');
}

function showCameraError(message) {
  const modal = document.getElementById('cameraErrorModal');
  document.getElementById('cameraErrorMessage').textContent = message;
  modal.classList.add('active');
}

function closeCameraErrorModal() {
  document.getElementById('cameraErrorModal').classList.remove('active');
}

function verifyCameraIsActive() {
  const video = document.getElementById('faceVerificationVideo');
  
  if (!video || !video.srcObject) {
    console.warn('⚠️ CAMERA: Video element has no srcObject');
    return false;
  }
  
  const tracks = video.srcObject.getVideoTracks();
  if (tracks.length === 0) {
    console.warn('⚠️ CAMERA: No video tracks found');
    return false;
  }
  
  const track = tracks[0];
  if (track.readyState !== 'live') {
    console.warn('⚠️ CAMERA: Video track not live. State:', track.readyState);
    return false;
  }
  
  if (video.readyState < 2) {
    console.warn('⚠️ CAMERA: Video readyState insufficient:', video.readyState);
    return false;
  }
  
  console.log('✓ CAMERA: Verification passed. Camera is ACTIVE');
  return true;
}

function retryCamera() {
  closeCameraErrorModal();
  if (appState.cameraPermissionAttempts < 3) {
    requestCameraPermission();
  } else {
    showToast('Terlalu banyak percobaan. Gunakan mode demo atau lanjut tanpa face detection.', 'warning');
  }
}

function useDemoMode() {
  closeCameraErrorModal();
  appState.faceDetectionMode = 'DEMO_MODE';
  
  // Show info modal
  document.getElementById('demoModeInfoModal').classList.add('active');
}

function closeDemoModeInfo() {
  document.getElementById('demoModeInfoModal').classList.remove('active');
  
  // Hide permission section, show preview with demo
  document.getElementById('cameraPermissionSection').style.display = 'none';
  document.getElementById('cameraPreviewSection').style.display = 'block';
  
  // Initialize demo mode
  initDemoModeVerification();
}

function skipFaceDetection() {
  closeCameraErrorModal();
  appState.faceDetectionMode = 'NO_FACE_DETECTION';
  
  showToast('⚠️ Face detection DISABLED. Tab-switch protection tetap aktif.', 'warning');
  
  // Skip directly to exam
  document.getElementById('faceVerificationPage').style.display = 'none';
  document.getElementById('quizInterface').style.display = 'block';
  
  enterFullscreen();
  initQuizInterface();
  startAntiCheatMonitoring();
  
  // Hide face monitoring preview since no camera
  document.getElementById('faceMonitoringPreview').style.display = 'none';
}

function initDemoModeVerification() {
  const video = document.getElementById('faceVerificationVideo');
  const canvas = document.getElementById('faceVerificationCanvas');
  const ctx = canvas.getContext('2d');
  const indicator = document.getElementById('faceStatusIndicator');
  const stabilityMsg = document.getElementById('stabilityMessage');
  const proceedBtn = document.getElementById('proceedToExamBtn');
  
  // Configure for demo mode
  video.style.display = 'none';
  canvas.style.display = 'block';
  canvas.style.position = 'relative';
  canvas.width = 320;
  canvas.height = 240;
  
  // Draw simulated face detection
  let frameCount = 0;
  const drawDemoFrame = () => {
    frameCount++;
    
    // Draw background (simulated camera feed)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw simulated face box
    const boxWidth = 140;
    const boxHeight = 180;
    const boxX = (canvas.width - boxWidth) / 2;
    const boxY = (canvas.height - boxHeight) / 2;
    
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    
    // Draw text
    ctx.fillStyle = '#10B981';
    ctx.font = '14px Arial';
    ctx.fillText('DEMO MODE', canvas.width / 2 - 45, 20);
    ctx.fillText('Simulated Face', canvas.width / 2 - 50, canvas.height - 10);
    
    indicator.textContent = '✓ Wajah Terdeteksi (Demo)';
    indicator.className = 'face-status-indicator detected';
    
    if (frameCount > 50) { // ~2 seconds
      stabilityMsg.textContent = '✓ Wajah stabil! Anda dapat melanjutkan.';
      stabilityMsg.style.color = '#10B981';
      proceedBtn.disabled = false;
    } else {
      stabilityMsg.textContent = `Menunggu wajah stabil... (${Math.floor(frameCount / 25)}/2 detik)`;
      stabilityMsg.style.color = '#F59E0B';
    }
  };
  
  appState.demoModeInterval = setInterval(drawDemoFrame, 40);
}

function toggleFacePreview() {
  const preview = document.getElementById('faceMonitoringPreview');
  const btn = preview.querySelector('.btn-collapse');
  
  appState.facePreviewCollapsed = !appState.facePreviewCollapsed;
  
  if (appState.facePreviewCollapsed) {
    preview.classList.add('collapsed');
    btn.textContent = '+';
  } else {
    preview.classList.remove('collapsed');
    btn.textContent = '−';
  }
}

function stopFaceMonitoring() {
  appState.faceDetectionActive = false;
  
  if (appState.faceDetectionInterval) {
    clearInterval(appState.faceDetectionInterval);
    appState.faceDetectionInterval = null;
  }
  
  if (appState.demoModeInterval) {
    clearInterval(appState.demoModeInterval);
    appState.demoModeInterval = null;
  }
  
  if (appState.videoStream) {
    appState.videoStream.getTracks().forEach(track => track.stop());
    appState.videoStream = null;
  }
  
  // Reset counters
  appState.noFaceDuration = 0;
  appState.multipleFacesDuration = 0;
  appState.lowConfidenceDuration = 0;
}

function updateCameraStatus(message, type) {
  const statusEl = document.getElementById('faceStatusIndicator');
  const container = document.querySelector('.camera-preview-container');
  
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = 'face-status-indicator';
    
    if (type === 'success') {
      statusEl.classList.add('detected');
      if (container) {
        container.classList.remove('camera-error');
        container.classList.add('camera-active');
      }
    } else if (type === 'error') {
      statusEl.classList.add('not-detected');
      if (container) {
        container.classList.remove('camera-active');
        container.classList.add('camera-error');
      }
    } else if (type === 'warning') {
      statusEl.classList.add('warning');
      if (container) {
        container.classList.remove('camera-active', 'camera-error');
      }
    }
  }
  
  console.log(`📸 CAMERA STATUS: ${message} (${type})`);
}

function updateCameraDetails(detail1, detail2, detail3) {
  const instructionsDiv = document.querySelector('.verification-instructions');
  if (instructionsDiv && detail1) {
    // Update or add detail elements
    let detailsContainer = instructionsDiv.querySelector('.camera-details');
    
    if (!detailsContainer) {
      detailsContainer = document.createElement('div');
      detailsContainer.className = 'camera-details';
      detailsContainer.style.cssText = 'background: #D1FAE5; padding: 12px; border-radius: 8px; margin: 12px 0; border: 2px solid #10B981;';
      instructionsDiv.insertBefore(detailsContainer, instructionsDiv.firstChild);
    }
    
    detailsContainer.innerHTML = `
      <p style="margin: 4px 0; color: #065F46; font-weight: 600;">${detail1}</p>
      ${detail2 ? `<p style="margin: 4px 0; color: #065F46; font-size: 13px;">${detail2}</p>` : ''}
      ${detail3 ? `<p style="margin: 4px 0; color: #065F46; font-size: 13px;">${detail3}</p>` : ''}
    `;
  }
}

function playAlertSound() {
  // Create a simple beep sound
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.log('Audio not supported');
  }
}

function updateViolationsDisplay() {
  const violationsEl = document.getElementById('violations');
  violationsEl.textContent = `Tab: ${appState.violationCount}/5 | Wajah: ${appState.faceViolationCount}/5`;
}

// Keyboard shortcut for toggling face preview (Alt+F)
document.addEventListener('keydown', (e) => {
  if (e.altKey && e.key === 'f' && appState.currentQuizSession) {
    e.preventDefault();
    toggleFacePreview();
  }
});

// ============================================
// AUTHENTICATION
// ============================================
function initLogin() {
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  
  // Auto-focus username on desktop
  if (window.innerWidth > 768) {
    document.getElementById('username').focus();
  }
  
  console.log('✓ Login form initialized (Role auto-detection enabled)');
  console.log('📋 Demo Users Available (Role Auto-Detected):');
  console.table(DEMO_USERS);
}

function handleLogin(e) {
  e.preventDefault();
  
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorMsg = document.getElementById('loginError');
  const successMsg = document.getElementById('loginSuccess');
  const loginBtn = document.getElementById('loginBtn');
  
  // Clear messages
  errorMsg.style.display = 'none';
  successMsg.style.display = 'none';
  
  // Validation
  if (!username || !password) {
    showLoginError('Username dan password tidak boleh kosong');
    return;
  }
  
  // Disable button
  loginBtn.disabled = true;
  loginBtn.textContent = 'Memproses...';
  
  // Simulate small delay for UX
  setTimeout(() => {
    authenticateUser(username, password);
    loginBtn.disabled = false;
    loginBtn.textContent = 'LOGIN';
  }, 300);
}

function authenticateUser(username, password) {
  console.log('🔐 Login attempt:', { username });
  
  // Find user in DEMO_USERS by username
  const user = Object.values(DEMO_USERS).find(u => u.username === username);
  
  if (!user) {
    showLoginError('Username tidak ditemukan');
    console.error('❌ Username not found:', username);
    return;
  }
  
  // Check password
  if (user.password !== password) {
    showLoginError('Password salah');
    console.error('❌ Wrong password for user:', username);
    return;
  }
  
  // LOGIN SUCCESSFUL - Role auto-detected from user data
  console.log('✅ Login successful. Role auto-detected:', user.role);
  console.log('✓ User data:', user);
  
  // Set app state
  appState.currentUser = { ...user };
  appState.currentRole = user.role;
  
  // Show success message with detected role
  showLoginSuccess(`✓ Login berhasil! Selamat datang, ${user.name} (${user.role})`);
  
  console.log('✓ Role terdeteksi otomatis:', user.role);
  
  // Redirect after delay
  setTimeout(() => {
    redirectToDashboard(user.role);
  }, 500);
}

function redirectToDashboard(role) {
  console.log('🚀 Redirecting to dashboard:', role);
  
  if (role === 'admin') {
    showAdminDashboard();
  } else if (role === 'guru') {
    showTeacherDashboard();
  } else if (role === 'siswa') {
    showStudentDashboard();
  }
}

function showLoginError(message) {
  const errorMsg = document.getElementById('loginError');
  errorMsg.textContent = '✗ ' + message;
  errorMsg.style.display = 'block';
  console.error('Login error:', message);
  showToast(message, 'error');
}

function showLoginSuccess(message) {
  const successMsg = document.getElementById('loginSuccess');
  successMsg.textContent = message;
  successMsg.style.display = 'block';
  console.log('Login success:', message);
}

function logout() {
  // Stop admin auto-refresh if active
  if (adminData.autoRefreshInterval) {
    clearInterval(adminData.autoRefreshInterval);
    adminData.autoRefreshInterval = null;
  }
  
  appState.currentUser = null;
  appState.currentQuiz = null;
  appState.currentQuizSession = null;
  document.getElementById('loginForm').reset();
  showPage('loginPage');
  showToast('Berhasil logout', 'success');
}

function forceLogout() {
  stopFaceMonitoring();
  exitFullscreen();
  
  // Reset violation counts
  appState.violationCount = 0;
  appState.faceViolationCount = 0;
  appState.faceDetectionMode = null;
  
  // Close modal
  document.getElementById('violationModal').classList.remove('active');
  
  logout();
  showToast('Anda telah dikeluarkan karena pelanggaran', 'error');
}

// ============================================
// ADMIN DASHBOARD
// ============================================
function showAdminDashboard() {
  showPage('adminDashboard');
  document.getElementById('adminName').textContent = appState.currentUser.name;
  
  // Show overview page by default
  showAdminPage('overview');
}

function showAdminPage(pageId) {
  // Update navigation
  document.querySelectorAll('.admin-nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-admin-page="${pageId}"]`).classList.add('active');
  
  // Update page content
  document.querySelectorAll('.admin-page').forEach(page => {
    page.classList.remove('active');
  });
  
  if (pageId === 'overview') {
    document.getElementById('adminOverview').classList.add('active');
    renderAdminOverview();
  } else if (pageId === 'subjects') {
    document.getElementById('adminSubjects').classList.add('active');
    renderSubjectsRecap();
  } else if (pageId === 'monitoring') {
    document.getElementById('adminMonitoring').classList.add('active');
    renderMonitoring();
    startAutoRefresh();
  } else if (pageId === 'manage') {
    document.getElementById('adminManage').classList.add('active');
    renderManagementTable();
  } else if (pageId === 'settings') {
    document.getElementById('adminSettings').classList.add('active');
    loadSettings();
  } else if (pageId === 'reports') {
    document.getElementById('adminReports').classList.add('active');
    renderReports();
  } else if (pageId === 'usergen') {
    document.getElementById('adminUsergen').classList.add('active');
    showUserTab('generate-guru');
  } else if (pageId === 'passwords') {
    document.getElementById('adminPasswords').classList.add('active');
    renderAdminPasswordManagement();
  } else if (pageId === 'admin-settings') {
    document.getElementById('adminAccountSettings').classList.add('active');
    loadAdminAccountSettings();
  } else if (pageId === 'qr-codes') {
    document.getElementById('adminQRCodes').classList.add('active');
    // Generate all QR codes when page is shown
    setTimeout(() => generateAllQRCodes(), 100);
  } else if (pageId === 'download-center') {
    document.getElementById('adminDownloadCenter').classList.add('active');
    populateDownloadFilters();
  }
  
  // Stop auto-refresh when leaving monitoring page
  if (pageId !== 'monitoring' && adminData.autoRefreshInterval) {
    clearInterval(adminData.autoRefreshInterval);
    adminData.autoRefreshInterval = null;
  }
}

function renderAdminOverview() {
  // Calculate stats
  const totalGuru = sampleUsers.teachers.length;
  const totalSiswa = sampleUsers.students.length;
  const ujianAktif = adminData.currentExams.filter(e => e.status === 'ongoing').length;
  const ujianSelesai = appState.results.filter(r => {
    const today = new Date().toLocaleDateString('id-ID');
    return r.submittedAt && r.submittedAt.startsWith(today.split('/').reverse().join('-'));
  }).length;
  
  document.getElementById('totalGuru').textContent = totalGuru;
  document.getElementById('totalSiswa').textContent = totalSiswa;
  document.getElementById('ujianAktif').textContent = ujianAktif;
  document.getElementById('ujianSelesai').textContent = ujianSelesai;
  
  // Mapel belum input
  const mapelBelumInput = adminData.subjects.filter(s => s.status === 'BELUM_INPUT');
  const mapelContainer = document.getElementById('mapelBelumInput');
  
  if (mapelBelumInput.length > 0) {
    mapelContainer.innerHTML = `
      <p style="font-weight: 600; margin-bottom: 8px;">Mata pelajaran berikut belum memasukkan soal:</p>
      <ul>
        ${mapelBelumInput.map(m => `<li>${m.name} (Kelas ${m.class}) - Guru: ${m.guru}</li>`).join('')}
      </ul>
    `;
  } else {
    mapelContainer.innerHTML = '<p style="color: #10B981; font-weight: 600;">✓ Semua mata pelajaran sudah memasukkan soal!</p>';
  }
  
  // Siswa sedang ujian
  const siswaUjian = adminData.currentExams.filter(e => e.status === 'ongoing');
  const siswaContainer = document.getElementById('siswaUjian');
  
  if (siswaUjian.length > 0) {
    siswaContainer.innerHTML = `
      <ul>
        ${siswaUjian.map(e => `<li>${e.studentName} (${e.studentClass}) - ${e.examName} - ${e.remainingTime} menit tersisa</li>`).join('')}
      </ul>
    `;
  } else {
    siswaContainer.innerHTML = '<p style="color: #6B7280;">Tidak ada siswa yang sedang ujian saat ini.</p>';
  }
}

function renderSubjectsRecap() {
  const tbody = document.getElementById('subjectsTableBody');
  tbody.innerHTML = '';
  
  let filteredSubjects = [...adminData.subjects];
  
  // Apply filters
  const searchTerm = document.getElementById('subjectSearch')?.value.toLowerCase() || '';
  const classFilter = document.getElementById('classFilter')?.value || '';
  const statusFilter = document.getElementById('statusFilter')?.value || '';
  
  if (searchTerm) {
    filteredSubjects = filteredSubjects.filter(s => s.name.toLowerCase().includes(searchTerm));
  }
  if (classFilter) {
    filteredSubjects = filteredSubjects.filter(s => s.class === classFilter);
  }
  if (statusFilter) {
    filteredSubjects = filteredSubjects.filter(s => s.status === statusFilter);
  }
  
  filteredSubjects.forEach((subject, index) => {
    const statusBadge = subject.status === 'SUDAH_INPUT' 
      ? '<span class="badge-success">✓ Sudah Input</span>' 
      : '<span class="badge-danger">❌ Belum Input</span>';
    
    const lastUpdate = subject.lastUpdated || '-';
    
    const row = `
      <tr>
        <td>${index + 1}</td>
        <td>${subject.name}</td>
        <td>${subject.class}</td>
        <td>${subject.guru}</td>
        <td>${subject.activeSoal}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-sm btn-icon" onclick="viewSubjectDetail(${subject.id})">View</button>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', row);
  });
}

function filterSubjects() {
  renderSubjectsRecap();
}

function viewSubjectDetail(subjectId) {
  const subject = adminData.subjects.find(s => s.id === subjectId);
  if (subject) {
    showToast(`Detail: ${subject.name} - ${subject.activeSoal} soal aktif`, 'success');
  }
}

function renderMonitoring() {
  updateMonitoringDisplay();
}

function updateMonitoringDisplay() {
  const selectedClass = document.getElementById('monitoringClassFilter').value;
  
  let exams = adminData.currentExams.filter(e => e.status === 'ongoing');
  if (selectedClass) {
    exams = exams.filter(e => e.studentClass === selectedClass);
  }
  
  // Update status
  const statusEl = document.getElementById('monitoringStatus');
  const totalOnline = exams.length;
  const violations = exams.reduce((sum, e) => sum + e.violations.total, 0);
  
  statusEl.textContent = `📌 Status: ${totalOnline} siswa online, ${exams.length} sedang ujian, ${violations} total violations`;
  
  // Render student cards
  const grid = document.getElementById('studentsGrid');
  grid.innerHTML = '';
  
  if (exams.length === 0) {
    grid.innerHTML = '<p style="text-align: center; padding: 40px; color: #6B7280; grid-column: 1/-1;">Tidak ada siswa yang sedang ujian.</p>';
    return;
  }
  
  exams.forEach(exam => {
    const status = getExamStatus(exam);
    const statusIcon = getStatusIcon(status);
    
    const card = document.createElement('div');
    card.className = `student-card status-${status}`;
    card.onclick = () => showStudentDetail(exam.examId);
    
    card.innerHTML = `
      <div class="student-header">
        <div class="student-name">${exam.studentName}</div>
        <div class="student-status">${statusIcon}</div>
      </div>
      <div class="student-info">
        <span>🏫 ${exam.studentClass}</span>
        <span>📝 ${exam.subject}</span>
        <span>⚠️ Tab: ${exam.violations.tabSwitch}/3 | Face: ${exam.violations.faceDetection}/3</span>
        <span>🎥 ${getFaceDetectionModeDisplay(exam.faceDetectionMode)}</span>
      </div>
      <div class="student-timer">${formatTime(exam.remainingTime)}</div>
    `;
    
    grid.appendChild(card);
  });
}

function getExamStatus(exam) {
  if (exam.violations.total >= 3) return 'ended';
  if (exam.violations.total > 0) return 'warning';
  return 'ok';
}

function getStatusIcon(status) {
  switch(status) {
    case 'ok': return '✓';
    case 'warning': return '⚠️';
    case 'ended': return '✗';
    default: return '○';
  }
}

function formatTime(minutes) {
  if (minutes <= 0) return 'Selesai';
  const mins = Math.floor(minutes);
  const secs = Math.floor((minutes - mins) * 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function filterMonitoringClass() {
  updateMonitoringDisplay();
}

function toggleAutoRefresh() {
  adminData.autoRefreshEnabled = document.getElementById('autoRefreshToggle').checked;
  if (adminData.autoRefreshEnabled) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
}

function startAutoRefresh() {
  if (adminData.autoRefreshInterval) {
    clearInterval(adminData.autoRefreshInterval);
  }
  
  if (adminData.autoRefreshEnabled) {
    adminData.autoRefreshInterval = setInterval(() => {
      updateMonitoringDisplay();
      // Update remaining time for all exams
      adminData.currentExams.forEach(exam => {
        if (exam.status === 'ongoing') {
          exam.remainingTime -= adminData.settings.autoRefreshInterval / 60;
          if (exam.remainingTime <= 0) {
            exam.status = 'ended';
          }
        }
      });
    }, adminData.settings.autoRefreshInterval * 1000);
  }
}

function stopAutoRefresh() {
  if (adminData.autoRefreshInterval) {
    clearInterval(adminData.autoRefreshInterval);
    adminData.autoRefreshInterval = null;
  }
}

function refreshMonitoring() {
  updateMonitoringDisplay();
  showToast('Monitoring direfresh', 'success');
}

function showStudentDetail(examId) {
  const exam = adminData.currentExams.find(e => e.examId === examId);
  if (!exam) return;
  
  const modal = document.getElementById('studentDetailModal');
  const content = document.getElementById('studentDetailContent');
  
  const violationHistoryHTML = exam.violationHistory.length > 0 
    ? exam.violationHistory.map(v => `<li>[${v.time}] ${v.type.toUpperCase()}: ${v.message}</li>`).join('')
    : '<li>Tidak ada pelanggaran</li>';
  
  content.innerHTML = `
    <div style="text-align: left;">
      <p><strong>Nama:</strong> ${exam.studentName}</p>
      <p><strong>Kelas:</strong> ${exam.studentClass}</p>
      <p><strong>Ujian:</strong> ${exam.examName}</p>
      <p><strong>Mata Pelajaran:</strong> ${exam.subject}</p>
      <p><strong>Waktu Tersisa:</strong> ${formatTime(exam.remainingTime)}</p>
      <p><strong>Mode Face Detection:</strong> ${getFaceDetectionModeDisplay(exam.faceDetectionMode)}</p>
      <p><strong>Fullscreen:</strong> ${exam.fullscreenActive ? '✓ Aktif' : '✗ Tidak Aktif'}</p>
      <p><strong>Violations:</strong></p>
      <ul style="margin-left: 20px;">
        <li>Tab-Switch: ${exam.violations.tabSwitch}/3</li>
        <li>Face Detection: ${exam.violations.faceDetection}/3</li>
        <li>Total: ${exam.violations.total}/3</li>
      </ul>
      <p><strong>Riwayat Pelanggaran:</strong></p>
      <ul style="margin-left: 20px; max-height: 200px; overflow-y: auto;">
        ${violationHistoryHTML}
      </ul>
    </div>
  `;
  
  // Store current exam ID for force end
  modal.dataset.examId = examId;
  modal.classList.add('active');
}

function closeStudentDetail() {
  document.getElementById('studentDetailModal').classList.remove('active');
}

function forceEndExam() {
  const modal = document.getElementById('studentDetailModal');
  const examId = parseInt(modal.dataset.examId);
  
  if (!confirm('Yakin ingin mengakhiri ujian siswa ini secara paksa?')) return;
  
  const exam = adminData.currentExams.find(e => e.examId === examId);
  if (exam) {
    exam.status = 'ended';
    exam.endReason = 'admin_force_end';
    
    showToast('Ujian telah diakhiri', 'success');
    closeStudentDetail();
    updateMonitoringDisplay();
  }
}

function renderManagementTable() {
  const tbody = document.getElementById('manageTableBody');
  tbody.innerHTML = '';
  
  // Create assignment data from subjects
  adminData.subjects.forEach(subject => {
    const row = `
      <tr>
        <td>${subject.guru}</td>
        <td>${subject.class}</td>
        <td>${subject.name}</td>
        <td>${subject.activeSoal}</td>
        <td>
          <button class="btn btn-sm btn-icon">Edit</button>
          <button class="btn btn-danger btn-sm btn-icon">Remove</button>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', row);
  });
}

function loadSettings() {
  document.getElementById('faceDetectionRequired').checked = adminData.settings.faceDetectionRequired;
  document.getElementById('maxFaceViolations').value = adminData.settings.maxFaceViolations;
  document.getElementById('maxTabViolations').value = adminData.settings.maxTabViolations;
  document.getElementById('autoRefreshInterval').value = adminData.settings.autoRefreshInterval;
  document.getElementById('enableDemoMode').checked = adminData.settings.enableDemoMode;
}

function saveSettings() {
  adminData.settings.faceDetectionRequired = document.getElementById('faceDetectionRequired').checked;
  adminData.settings.maxFaceViolations = parseInt(document.getElementById('maxFaceViolations').value);
  adminData.settings.maxTabViolations = parseInt(document.getElementById('maxTabViolations').value);
  adminData.settings.autoRefreshInterval = parseInt(document.getElementById('autoRefreshInterval').value);
  adminData.settings.enableDemoMode = document.getElementById('enableDemoMode').checked;
  
  showToast('Pengaturan berhasil disimpan', 'success');
  
  // Restart auto-refresh with new interval
  if (adminData.autoRefreshEnabled && adminData.autoRefreshInterval) {
    stopAutoRefresh();
    startAutoRefresh();
  }
}

function renderReports() {
  const tbody = document.getElementById('reportsTableBody');
  tbody.innerHTML = '';
  
  // Get all results with violations
  const violationResults = appState.results.filter(r => r.violations > 0 || r.faceViolations > 0);
  
  if (violationResults.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">Tidak ada pelanggaran tercatat</td></tr>';
    return;
  }
  
  violationResults.forEach(result => {
    const violationType = [];
    if (result.tabSwitchViolations > 0) violationType.push(`Tab-Switch: ${result.tabSwitchViolations}`);
    if (result.faceViolations > 0) violationType.push(`Face: ${result.faceViolations}`);
    
    const row = `
      <tr>
        <td>${result.studentName}</td>
        <td>${result.studentClass}</td>
        <td>${result.quizTitle}</td>
        <td>${violationType.join(', ')}</td>
        <td>${result.submittedAt}</td>
        <td>${result.endReason || 'normal_submit'}</td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', row);
  });
}

function exportViolations() {
  const violationResults = appState.results.filter(r => r.violations > 0 || r.faceViolations > 0);
  
  let csv = 'Nama,Kelas,Soal,Tab-Switch,Face Detection,Waktu,Action Taken\n';
  violationResults.forEach(r => {
    csv += `${r.studentName},${r.studentClass},${r.quizTitle},${r.tabSwitchViolations || 0},${r.faceViolations || 0},${r.submittedAt},${r.endReason || 'normal_submit'}\n`;
  });
  
  downloadCSV(csv, 'laporan_pelanggaran.csv');
  showToast('Laporan pelanggaran diexport', 'success');
}

function exportSubjects() {
  let csv = 'No,Mata Pelajaran,Kelas,Guru,Jumlah Soal,Status,Last Updated\n';
  adminData.subjects.forEach((s, i) => {
    csv += `${i+1},${s.name},${s.class},${s.guru},${s.activeSoal},${s.status},${s.lastUpdated || '-'}\n`;
  });
  
  downloadCSV(csv, 'rekap_mata_pelajaran.csv');
  showToast('Rekap mata pelajaran diexport', 'success');
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// ============================================
// PASSWORD MANAGEMENT FUNCTIONS
// ============================================

// Admin Password Management
function renderAdminPasswordManagement() {
  const tbody = document.getElementById('adminPasswordTableBody');
  tbody.innerHTML = '';
  
  const roleFilter = document.getElementById('passwordRoleFilter')?.value || '';
  const searchTerm = document.getElementById('passwordSearchFilter')?.value.toLowerCase() || '';
  
  let allUsers = [];
  
  // Collect all guru and siswa
  Object.values(DEMO_USERS).forEach(user => {
    if (user.role === 'guru' || user.role === 'siswa') {
      allUsers.push(user);
    }
  });
  
  // Apply filters
  if (roleFilter) {
    allUsers = allUsers.filter(u => u.role === roleFilter);
  }
  
  if (searchTerm) {
    allUsers = allUsers.filter(u => 
      u.username.toLowerCase().includes(searchTerm) || 
      u.name.toLowerCase().includes(searchTerm)
    );
  }
  
  if (allUsers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">Tidak ada user ditemukan</td></tr>';
    return;
  }
  
  allUsers.forEach((user, index) => {
    const roleColor = user.role === 'guru' ? '#3B82F6' : '#10B981';
    const passwordId = `pwd_${user.username}`;
    
    const row = `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${user.username}</strong></td>
        <td>${user.name}</td>
        <td><span style="color: ${roleColor}; font-weight: 600;">${user.role.toUpperCase()}</span></td>
        <td>
          <code id="${passwordId}" style="background: #F3F4F6; padding: 6px 12px; border-radius: 4px; font-family: 'Courier New', monospace; letter-spacing: 2px;">••••••••</code>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-sm btn-icon" onclick="toggleShowPassword('${user.username}', '${passwordId}')" id="btn_${passwordId}" style="background: #3B82F6; color: white;">👁️ Show</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="adminResetPassword('${user.username}')">🔄 Reset</button>
          </div>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', row);
  });
}

function filterPasswordUsers() {
  renderAdminPasswordManagement();
}

function toggleShowPassword(username, passwordId) {
  const user = DEMO_USERS[username];
  if (!user) return;
  
  const passwordEl = document.getElementById(passwordId);
  const btnEl = document.getElementById(`btn_${passwordId}`);
  
  if (passwordEl.textContent === '••••••••') {
    passwordEl.textContent = user.password;
    btnEl.innerHTML = '👁️ Hide';
  } else {
    passwordEl.textContent = '••••••••';
    btnEl.innerHTML = '👁️ Show';
  }
}

function adminResetPassword(username) {
  const user = DEMO_USERS[username];
  if (!user) return;
  
  if (!confirm(`Reset password untuk ${user.name} (${username})?`)) return;
  
  // Generate new random password
  const newPassword = generatePassword(8);
  
  // Update password
  user.password = newPassword;
  
  // Update in sampleUsers as well
  if (user.role === 'guru') {
    const teacher = sampleUsers.teachers.find(t => t.username === username);
    if (teacher) teacher.password = newPassword;
  } else if (user.role === 'siswa') {
    const student = sampleUsers.students.find(s => s.username === username);
    if (student) student.password = newPassword;
  }
  
  showToast(`✓ Password berhasil direset!\nPassword baru: ${newPassword}`, 'success');
  
  // Show password automatically
  const passwordId = `pwd_${username}`;
  const passwordEl = document.getElementById(passwordId);
  const btnEl = document.getElementById(`btn_${passwordId}`);
  
  if (passwordEl) {
    passwordEl.textContent = newPassword;
    if (btnEl) btnEl.innerHTML = '👁️ Hide';
  }
}

function resetAllPasswordsConfirm() {
  if (!confirm('⚠️ PERINGATAN!\n\nReset SEMUA password untuk guru dan siswa?\nAction ini tidak bisa dibatalkan!')) return;
  
  if (!confirm('Yakin? Semua password akan direset ke password random baru.')) return;
  
  let resetCount = 0;
  
  Object.values(DEMO_USERS).forEach(user => {
    if (user.role === 'guru' || user.role === 'siswa') {
      const newPassword = generatePassword(8);
      user.password = newPassword;
      
      // Update in sampleUsers
      if (user.role === 'guru') {
        const teacher = sampleUsers.teachers.find(t => t.username === user.username);
        if (teacher) teacher.password = newPassword;
      } else if (user.role === 'siswa') {
        const student = sampleUsers.students.find(s => s.username === user.username);
        if (student) student.password = newPassword;
      }
      
      resetCount++;
    }
  });
  
  renderAdminPasswordManagement();
  showToast(`✓ ${resetCount} password berhasil direset!`, 'success');
}

// Teacher Password Management
function openTeacherSettings() {
  const modal = document.getElementById('teacherSettingsModal');
  document.getElementById('teacherSettingsName').textContent = appState.currentUser.name;
  document.getElementById('teacherSettingsUsername').textContent = appState.currentUser.username;
  modal.classList.add('active');
}

function closeTeacherSettings() {
  document.getElementById('teacherSettingsModal').classList.remove('active');
  document.getElementById('teacherChangePasswordForm').reset();
}

function handleTeacherChangePassword(e) {
  e.preventDefault();
  
  const currentPassword = document.getElementById('teacherCurrentPassword').value;
  const newPassword = document.getElementById('teacherNewPassword').value;
  const confirmPassword = document.getElementById('teacherConfirmPassword').value;
  
  // Validation
  if (newPassword !== confirmPassword) {
    showToast('Password baru tidak cocok!', 'error');
    return;
  }
  
  if (newPassword.length < 6) {
    showToast('Password minimal 6 karakter!', 'error');
    return;
  }
  
  // Verify current password
  const user = DEMO_USERS[appState.currentUser.username];
  if (!user || user.password !== currentPassword) {
    showToast('Password saat ini salah!', 'error');
    return;
  }
  
  // Update password
  user.password = newPassword;
  appState.currentUser.password = newPassword;
  
  // Update in sampleUsers
  const teacher = sampleUsers.teachers.find(t => t.username === user.username);
  if (teacher) teacher.password = newPassword;
  
  showToast('✓ Password berhasil diubah!', 'success');
  closeTeacherSettings();
}

// Student Password Management
function openStudentSettings() {
  const modal = document.getElementById('studentSettingsModal');
  document.getElementById('studentSettingsName').textContent = appState.currentUser.name;
  document.getElementById('studentSettingsUsername').textContent = appState.currentUser.username;
  document.getElementById('studentSettingsClass').textContent = appState.currentUser.class || '-';
  modal.classList.add('active');
}

function closeStudentSettings() {
  document.getElementById('studentSettingsModal').classList.remove('active');
  document.getElementById('studentChangePasswordForm').reset();
}

function handleStudentChangePassword(e) {
  e.preventDefault();
  
  const currentPassword = document.getElementById('studentCurrentPassword').value;
  const newPassword = document.getElementById('studentNewPassword').value;
  const confirmPassword = document.getElementById('studentConfirmPassword').value;
  
  // Validation
  if (newPassword !== confirmPassword) {
    showToast('Password baru tidak cocok!', 'error');
    return;
  }
  
  if (newPassword.length < 6) {
    showToast('Password minimal 6 karakter!', 'error');
    return;
  }
  
  // Verify current password
  const user = DEMO_USERS[appState.currentUser.username];
  if (!user || user.password !== currentPassword) {
    showToast('Password saat ini salah!', 'error');
    return;
  }
  
  // Update password
  user.password = newPassword;
  appState.currentUser.password = newPassword;
  
  // Update in sampleUsers
  const student = sampleUsers.students.find(s => s.username === user.username);
  if (student) student.password = newPassword;
  
  showToast('✓ Password berhasil diubah!', 'success');
  closeStudentSettings();
}

// Toggle password visibility
function togglePasswordField(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  
  const btn = event.target;
  
  if (field.type === 'password') {
    field.type = 'text';
    btn.textContent = '🙈 Hide';
  } else {
    field.type = 'password';
    btn.textContent = '👁️ Show';
  }
}

// Load Admin Account Settings
function loadAdminAccountSettings() {
  const currentUser = appState.currentUser;
  if (!currentUser) return;
  
  document.getElementById('adminSettingsName').textContent = currentUser.name;
  document.getElementById('adminSettingsUsername').textContent = currentUser.username;
}

// Handle Admin Change Password
function handleAdminChangePassword(e) {
  e.preventDefault();
  
  const currentPassword = document.getElementById('adminCurrentPassword').value;
  const newPassword = document.getElementById('adminNewPassword').value;
  const confirmPassword = document.getElementById('adminConfirmPassword').value;
  
  const successMsg = document.getElementById('adminPasswordSuccessMessage');
  const errorMsg = document.getElementById('adminPasswordErrorMessage');
  
  // Hide previous messages
  successMsg.style.display = 'none';
  errorMsg.style.display = 'none';
  
  // Validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    errorMsg.textContent = '✗ Semua field harus diisi!';
    errorMsg.style.display = 'block';
    return;
  }
  
  if (newPassword !== confirmPassword) {
    errorMsg.textContent = '✗ Password baru tidak cocok!';
    errorMsg.style.display = 'block';
    return;
  }
  
  if (newPassword.length < 6) {
    errorMsg.textContent = '✗ Password minimal 6 karakter!';
    errorMsg.style.display = 'block';
    return;
  }
  
  // Get current admin user
  const adminUser = DEMO_USERS['admin'];
  
  if (!adminUser || adminUser.password !== currentPassword) {
    errorMsg.textContent = '✗ Password saat ini salah!';
    errorMsg.style.display = 'block';
    return;
  }
  
  // Update password
  adminUser.password = newPassword;
  appState.currentUser.password = newPassword;
  
  // Update in sampleUsers if exists
  if (sampleUsers.admin && sampleUsers.admin[0]) {
    sampleUsers.admin[0].password = newPassword;
  }
  
  // Show success
  successMsg.textContent = '✓ Password admin berhasil diubah! Gunakan password baru saat login berikutnya.';
  successMsg.style.display = 'block';
  
  // Reset form
  document.getElementById('adminChangePasswordForm').reset();
  
  showToast('✓ Password admin berhasil diubah!', 'success');
  
  console.log('✓ Admin password changed successfully');
}

// ============================================
// DOCUMENT UPLOAD & PARSING
// ============================================
let uploadState = {
  selectedFile: null,
  parsedQuestions: [],
  currentEditingIndex: null
};

// Setup drag and drop
function setupDragAndDrop() {
  const dropzone = document.getElementById('uploadDropzone');
  if (!dropzone) return;
  
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });
  
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });
  
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    handleFile(file);
  }
}

function handleFile(file) {
  // Validate file type
  const validTypes = ['.pdf', '.docx', '.txt', '.csv'];
  const fileExt = '.' + file.name.split('.').pop().toLowerCase();
  
  if (!validTypes.includes(fileExt)) {
    showToast('Format file tidak didukung. Gunakan PDF, DOCX, TXT, atau CSV', 'error');
    return;
  }
  
  // Validate file size (50MB)
  if (file.size > 50 * 1024 * 1024) {
    showToast('File terlalu besar. Maksimal 50MB', 'error');
    return;
  }
  
  uploadState.selectedFile = file;
  document.getElementById('selectedFileName').textContent = `📄 File terpilih: ${file.name}`;
  document.getElementById('uploadFormSection').style.display = 'block';
  
  showToast('File berhasil dipilih. Isi form dan klik PROSES', 'success');
}

function processDocument() {
  const title = document.getElementById('uploadQuizTitle').value;
  const subject = document.getElementById('uploadQuizSubject').value;
  const duration = document.getElementById('uploadQuizDuration').value;
  
  if (!title || !subject || !duration) {
    showToast('Mohon isi semua field', 'error');
    return;
  }
  
  if (!uploadState.selectedFile) {
    showToast('Mohon pilih file terlebih dahulu', 'error');
    return;
  }
  
  showToast('Memproses dokumen...', 'info');
  
  const reader = new FileReader();
  const fileExt = '.' + uploadState.selectedFile.name.split('.').pop().toLowerCase();
  
  reader.onload = (e) => {
    const content = e.target.result;
    
    try {
      let text = '';
      
      if (fileExt === '.txt') {
        text = content;
      } else if (fileExt === '.csv') {
        text = content;
      } else if (fileExt === '.docx') {
        // For demo, treat as text (in production would use Mammoth.js)
        text = content;
        showToast('⚠️ DOCX parsing basic - untuk hasil terbaik gunakan TXT atau CSV', 'warning');
      } else if (fileExt === '.pdf') {
        // For demo, show message
        showToast('⚠️ PDF parsing memerlukan PDF.js library. Gunakan TXT atau CSV untuk demo', 'warning');
        text = 'Demo PDF content';
      }
      
      // Parse the text
      const parseResult = parseDocumentText(text, fileExt);
      
      if (parseResult.questions.length === 0) {
        showToast('Tidak ada soal yang terdeteksi. Periksa format dokumen', 'error');
        return;
      }
      
      uploadState.parsedQuestions = parseResult.questions;
      
      // Store quiz metadata
      uploadState.quizMetadata = {
        title: title,
        subject: subject,
        duration: parseInt(duration),
        source: 'document_upload',
        fileName: uploadState.selectedFile.name
      };
      
      // Show preview
      showPreview(parseResult);
      showToast(`Berhasil! ${parseResult.questions.length} soal terdeteksi`, 'success');
      
    } catch (error) {
      console.error('Parse error:', error);
      showToast('Gagal memproses dokumen: ' + error.message, 'error');
    }
  };
  
  if (fileExt === '.txt' || fileExt === '.csv') {
    reader.readAsText(uploadState.selectedFile);
  } else {
    reader.readAsText(uploadState.selectedFile); // For demo purposes
  }
}

function parseDocumentText(text, fileType) {
  if (fileType === '.csv') {
    return parseCSVFormat(text);
  } else {
    return parseTextFormat(text);
  }
}

function parseCSVFormat(csvText) {
  const questions = [];
  const lines = csvText.split('\n').filter(l => l.trim());
  
  // Skip header if exists
  let startIndex = 0;
  if (lines[0].toLowerCase().includes('question') || lines[0].toLowerCase().includes('pertanyaan')) {
    startIndex = 1;
  }
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    // Simple CSV parsing (handle quoted values)
    const parts = line.match(/(?:"[^"]*"|[^,])+/g)?.map(p => p.trim().replace(/^"|"$/g, ''));
    
    if (!parts || parts.length < 3) continue;
    
    const questionText = parts[0];
    const options = {};
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    
    let answerIndex = parts.length - 1;
    let optionCount = 0;
    
    // Detect if true/false
    const isTrueFalse = parts.some(p => 
      p.toLowerCase() === 'true' || p.toLowerCase() === 'false' ||
      p.toLowerCase() === 'benar' || p.toLowerCase() === 'salah'
    );
    
    if (isTrueFalse) {
      questions.push({
        question: questionText,
        type: 'BENAR_SALAH',
        options: { A: 'Benar', B: 'Salah' },
        correct: parts[answerIndex].toLowerCase().includes('benar') || parts[answerIndex].toLowerCase().includes('true') ? 'A' : 'B',
        confidence: 0.92
      });
    } else {
      // Multiple choice
      for (let j = 1; j < parts.length - 1 && optionCount < 6; j++) {
        if (parts[j] && parts[j].length > 0) {
          options[letters[optionCount]] = parts[j];
          optionCount++;
        }
      }
      
      if (optionCount >= 2) {
        let correctAnswer = parts[answerIndex].toUpperCase();
        if (correctAnswer.length === 1 && /[A-F]/.test(correctAnswer)) {
          // Already a letter
        } else {
          // Try to match with options
          correctAnswer = 'A'; // default
        }
        
        questions.push({
          question: questionText,
          type: optionCount === 2 ? 'BENAR_SALAH' : 'PILIHAN_GANDA',
          options: options,
          correct: correctAnswer,
          confidence: 0.90
        });
      }
    }
  }
  
  return {
    questions: questions,
    totalQuestions: questions.length
  };
}

function parseTextFormat(text) {
  const questions = [];
  
  // Split into blocks (separated by double newlines)
  const blocks = text.split(/\n\s*\n+/).filter(b => b.trim());
  
  blocks.forEach(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return;
    
    // Check if first line has question number
    const firstLine = lines[0];
    const numberMatch = firstLine.match(/^(\d+[\.):]|Question\s*\d+:|T\/F\s*\d+:)\s*(.+)/i);
    
    if (!numberMatch && !firstLine.match(/^[A-D][\.)]/i)) {
      // Not a numbered question, skip
      return;
    }
    
    let questionText = '';
    const options = {};
    let correctAnswer = null;
    let questionType = null;
    const optionLines = [];
    const answerLines = [];
    
    // Extract question text
    if (numberMatch) {
      questionText = numberMatch[2];
    } else {
      questionText = firstLine;
    }
    
    // Parse remaining lines
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for answer line
      if (/^(jawaban|answer|correct|key|kunci|solusi)[:=]?\s*/i.test(line)) {
        answerLines.push(line);
        const answerMatch = line.match(/^(?:jawaban|answer|correct|key|kunci|solusi)[:=]?\s*(.+)/i);
        if (answerMatch) {
          correctAnswer = answerMatch[1].trim();
        }
      }
      // Check for options (A-D or a-d)
      else if (/^[A-Da-d][\.)\s]/.test(line)) {
        const optionMatch = line.match(/^([A-Da-d])[\.)\s]+(.+)/);
        if (optionMatch) {
          const letter = optionMatch[1].toUpperCase();
          const text = optionMatch[2].trim();
          options[letter] = text;
          optionLines.push(line);
        }
      }
      // Check for dash options
      else if (/^[-•]\s+/.test(line)) {
        const optionText = line.replace(/^[-•]\s+/, '').trim();
        const letter = String.fromCharCode(65 + Object.keys(options).length); // A, B, C...
        options[letter] = optionText;
        optionLines.push(line);
      }
      // Otherwise, it's part of question text
      else if (!answerLines.length && !optionLines.length) {
        questionText += ' ' + line;
      }
    }
    
    // Determine question type
    const optionCount = Object.keys(options).length;
    
    if (optionCount === 0) {
      // Essay question
      questionType = 'ESSAY';
    } else if (optionCount === 2) {
      // Check if true/false
      const optionValues = Object.values(options).map(v => v.toLowerCase());
      const isTrueFalse = optionValues.includes('benar') || optionValues.includes('salah') ||
                          optionValues.includes('true') || optionValues.includes('false');
      
      if (isTrueFalse) {
        questionType = 'BENAR_SALAH';
        // Standardize options
        options.A = 'Benar';
        options.B = 'Salah';
        
        // Standardize answer
        if (correctAnswer) {
          const ans = correctAnswer.toLowerCase();
          if (ans.includes('benar') || ans.includes('true') || ans === 'a') {
            correctAnswer = 'A';
          } else {
            correctAnswer = 'B';
          }
        }
      } else {
        questionType = 'PILIHAN_GANDA';
      }
    } else if (optionCount >= 3 && optionCount <= 6) {
      questionType = 'PILIHAN_GANDA';
    } else {
      // Invalid, skip
      return;
    }
    
    // Standardize correct answer
    if (correctAnswer && questionType !== 'ESSAY') {
      const ans = correctAnswer.trim().toUpperCase();
      if (ans.length === 1 && /[A-F]/.test(ans)) {
        correctAnswer = ans;
      } else if (ans.match(/^option\s*([a-f])/i)) {
        correctAnswer = ans.match(/^option\s*([a-f])/i)[1].toUpperCase();
      } else {
        // Try to match with option text
        correctAnswer = 'A'; // default
      }
    }
    
    // Calculate confidence
    let confidence = 0.85;
    if (questionText && optionCount >= 2 && correctAnswer) {
      confidence = 0.95;
    } else if (questionText && optionCount === 0) {
      confidence = 0.80;
    } else if (!correctAnswer) {
      confidence = 0.70;
    }
    
    // Add question
    questions.push({
      question: questionText.trim(),
      type: questionType,
      options: Object.keys(options).length > 0 ? options : null,
      correct: correctAnswer || '',
      confidence: confidence
    });
  });
  
  return {
    questions: questions,
    totalQuestions: questions.length
  };
}

function showPreview(parseResult) {
  // Hide upload section
  document.querySelector('.upload-section').style.display = 'none';
  
  // Show preview section
  const previewSection = document.getElementById('previewSection');
  previewSection.style.display = 'block';
  
  // Update statistics
  const mcqCount = parseResult.questions.filter(q => q.type === 'PILIHAN_GANDA').length;
  const tfCount = parseResult.questions.filter(q => q.type === 'BENAR_SALAH').length;
  const essayCount = parseResult.questions.filter(q => q.type === 'ESSAY').length;
  const avgConfidence = Math.round(
    parseResult.questions.reduce((sum, q) => sum + q.confidence, 0) / parseResult.questions.length * 100
  );
  
  document.getElementById('statTotalQuestions').textContent = parseResult.questions.length;
  document.getElementById('statMCQ').textContent = mcqCount;
  document.getElementById('statTrueFalse').textContent = tfCount;
  document.getElementById('statEssay').textContent = essayCount;
  document.getElementById('statConfidence').textContent = avgConfidence;
  
  // Render questions
  renderPreviewQuestions();
  
  // Scroll to preview
  previewSection.scrollIntoView({ behavior: 'smooth' });
}

function renderPreviewQuestions() {
  const container = document.getElementById('previewQuestions');
  container.innerHTML = '';
  
  const filterType = document.getElementById('filterQuestionType')?.value || '';
  
  let filteredQuestions = uploadState.parsedQuestions;
  if (filterType) {
    filteredQuestions = uploadState.parsedQuestions.filter(q => q.type === filterType);
  }
  
  if (filteredQuestions.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #6B7280; padding: 40px;">Tidak ada soal yang sesuai filter</p>';
    return;
  }
  
  filteredQuestions.forEach((question, index) => {
    const actualIndex = uploadState.parsedQuestions.indexOf(question);
    const isLowConfidence = question.confidence < 0.8;
    
    let optionsHTML = '';
    if (question.options) {
      optionsHTML = '<div class="question-options">';
      Object.entries(question.options).forEach(([key, value]) => {
        const isCorrect = key === question.correct;
        optionsHTML += `<div>${key}) ${value} ${isCorrect ? '<strong style="color: #10B981;">(Jawaban)</strong>' : ''}</div>`;
      });
      optionsHTML += '</div>';
    } else if (question.correct) {
      optionsHTML = `<div class="question-answer"><strong>Kunci Jawaban:</strong> ${question.correct}</div>`;
    }
    
    const typeBadge = question.type === 'PILIHAN_GANDA' ? 'badge-mcq' :
                     question.type === 'BENAR_SALAH' ? 'badge-truefalse' : 'badge-essay';
    const typeLabel = question.type === 'PILIHAN_GANDA' ? 'Pilihan Ganda' :
                     question.type === 'BENAR_SALAH' ? 'Benar/Salah' : 'Essay';
    
    const confidenceClass = question.confidence >= 0.8 ? 'confidence-high' : 'confidence-low';
    const confidencePercent = Math.round(question.confidence * 100);
    
    const card = document.createElement('div');
    card.className = `question-preview-card ${isLowConfidence ? 'low-confidence' : ''}`;
    card.innerHTML = `
      <div class="question-header">
        <div class="question-number">${actualIndex + 1}. ${question.question}</div>
        <div class="question-type-badge ${typeBadge}">${typeLabel}</div>
      </div>
      ${optionsHTML}
      <div class="question-confidence ${confidenceClass}">
        Confidence: ${confidencePercent}% ${isLowConfidence ? '⚠️' : '✓'}
      </div>
      <div class="question-actions">
        <button class="btn-edit" onclick="editQuestion(${actualIndex})">✏️ EDIT</button>
        <button class="btn-delete" onclick="deleteQuestion(${actualIndex})">🗑️ HAPUS</button>
      </div>
    `;
    
    container.appendChild(card);
  });
}

function filterPreviewQuestions() {
  renderPreviewQuestions();
}

function editQuestion(index) {
  uploadState.currentEditingIndex = index;
  const question = uploadState.parsedQuestions[index];
  
  // Populate modal
  document.getElementById('editQuestionText').value = question.question;
  document.getElementById('editCorrectAnswer').value = question.correct || '';
  
  // Show modal
  document.getElementById('editQuestionModal').classList.add('active');
}

function closeEditModal() {
  document.getElementById('editQuestionModal').classList.remove('active');
  uploadState.currentEditingIndex = null;
}

function saveEditedQuestion() {
  if (uploadState.currentEditingIndex === null) return;
  
  const question = uploadState.parsedQuestions[uploadState.currentEditingIndex];
  const newText = document.getElementById('editQuestionText').value.trim();
  const newAnswer = document.getElementById('editCorrectAnswer').value.trim();
  
  if (!newText) {
    showToast('Pertanyaan tidak boleh kosong', 'error');
    return;
  }
  
  question.question = newText;
  if (newAnswer) {
    question.correct = newAnswer.toUpperCase();
  }
  
  closeEditModal();
  renderPreviewQuestions();
  showToast('Pertanyaan berhasil diedit', 'success');
}

function deleteQuestion(index) {
  if (!confirm('Yakin ingin menghapus soal ini?')) return;
  
  uploadState.parsedQuestions.splice(index, 1);
  
  // Update statistics
  const mcqCount = uploadState.parsedQuestions.filter(q => q.type === 'PILIHAN_GANDA').length;
  const tfCount = uploadState.parsedQuestions.filter(q => q.type === 'BENAR_SALAH').length;
  const essayCount = uploadState.parsedQuestions.filter(q => q.type === 'ESSAY').length;
  const avgConfidence = uploadState.parsedQuestions.length > 0 ? 
    Math.round(uploadState.parsedQuestions.reduce((sum, q) => sum + q.confidence, 0) / uploadState.parsedQuestions.length * 100) : 0;
  
  document.getElementById('statTotalQuestions').textContent = uploadState.parsedQuestions.length;
  document.getElementById('statMCQ').textContent = mcqCount;
  document.getElementById('statTrueFalse').textContent = tfCount;
  document.getElementById('statEssay').textContent = essayCount;
  document.getElementById('statConfidence').textContent = avgConfidence;
  
  renderPreviewQuestions();
  showToast('Soal berhasil dihapus', 'success');
}

function saveAllQuestions() {
  if (uploadState.parsedQuestions.length === 0) {
    showToast('Tidak ada soal untuk disimpan', 'error');
    return;
  }
  
  // Convert parsed questions to quiz format
  const questions = uploadState.parsedQuestions.map(q => {
    const question = {
      question: q.question,
      correct: q.correct
    };
    
    if (q.options) {
      question.options = q.options;
    }
    
    return question;
  });
  
  // Determine quiz type (use most common type)
  const mcqCount = uploadState.parsedQuestions.filter(q => q.type === 'PILIHAN_GANDA').length;
  const tfCount = uploadState.parsedQuestions.filter(q => q.type === 'BENAR_SALAH').length;
  const essayCount = uploadState.parsedQuestions.filter(q => q.type === 'ESSAY').length;
  
  let quizType = 'multiple_choice';
  if (essayCount > mcqCount && essayCount > tfCount) {
    quizType = 'essay';
  } else if (tfCount > mcqCount && tfCount > essayCount) {
    quizType = 'true_false';
  }
  
  const quiz = {
    id: Date.now(),
    title: uploadState.quizMetadata.title,
    subject: uploadState.quizMetadata.subject,
    type: quizType,
    duration: uploadState.quizMetadata.duration,
    active: true,
    multimedia: {
      videoUrl: '',
      audioUrl: '',
      documentUrl: ''
    },
    questions: questions,
    createdBy: appState.currentUser.username,
    source: 'document_upload',
    sourceFile: uploadState.quizMetadata.fileName,
    uploadedAt: new Date().toLocaleString('id-ID')
  };
  
  appState.quizzes.push(quiz);
  
  // Update admin subjects
  syncSubjectsWithQuizzes();
  
  showToast(`✓ ${questions.length} soal berhasil tersimpan ke quiz "${quiz.title}"`, 'success');
  
  // Reset and go back to quiz list
  setTimeout(() => {
    cancelUpload();
    showTab('quizList');
    renderQuizList();
  }, 1500);
}

function cancelUpload() {
  // Reset state
  uploadState = {
    selectedFile: null,
    parsedQuestions: [],
    currentEditingIndex: null
  };
  
  // Reset UI
  document.getElementById('fileInput').value = '';
  document.getElementById('uploadQuizTitle').value = '';
  document.getElementById('uploadQuizSubject').value = '';
  document.getElementById('uploadQuizDuration').value = '';
  document.getElementById('uploadFormSection').style.display = 'none';
  document.getElementById('previewSection').style.display = 'none';
  document.querySelector('.upload-section').style.display = 'block';
  document.getElementById('filterQuestionType').value = '';
  
  showToast('Upload dibatalkan', 'info');
}

// ============================================
// TEACHER DASHBOARD
// ============================================
function showTeacherDashboard() {
  showPage('teacherDashboard');
  document.getElementById('teacherName').textContent = appState.currentUser.name;
  
  // Setup tabs
  document.querySelectorAll('#teacherDashboard .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showTab(btn.dataset.tab);
      if (btn.dataset.tab === 'quizList') {
        renderQuizList();
      } else if (btn.dataset.tab === 'uploadDocument') {
        // Setup drag and drop when tab is opened
        setTimeout(() => setupDragAndDrop(), 100);
      } else if (btn.dataset.tab === 'studentResults') {
        renderStudentResults();
      }
    });
  });
  
  // Initialize create quiz form
  initCreateQuizForm();
  addQuestion(); // Add first question by default
}

function initCreateQuizForm() {
  document.getElementById('createQuizForm').addEventListener('submit', handleCreateQuiz);
}

let questionCounter = 0;

function addQuestion() {
  questionCounter++;
  const container = document.getElementById('questionsContainer');
  const questionType = document.getElementById('questionType').value;
  
  let optionsHTML = '';
  if (questionType === 'multiple_choice') {
    optionsHTML = `
      <div class="options-grid">
        <div class="form-group">
          <label>Pilihan A</label>
          <input type="text" class="form-control option-input" data-option="A" required>
        </div>
        <div class="form-group">
          <label>Pilihan B</label>
          <input type="text" class="form-control option-input" data-option="B" required>
        </div>
        <div class="form-group">
          <label>Pilihan C</label>
          <input type="text" class="form-control option-input" data-option="C" required>
        </div>
        <div class="form-group">
          <label>Pilihan D</label>
          <input type="text" class="form-control option-input" data-option="D" required>
        </div>
        <div class="form-group">
          <label>Pilihan E</label>
          <input type="text" class="form-control option-input" data-option="E" required>
        </div>
      </div>
      <div class="form-group">
        <label>Jawaban Benar</label>
        <select class="form-control correct-answer" required>
          <option value="">Pilih jawaban benar</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
          <option value="E">E</option>
        </select>
      </div>
    `;
  } else if (questionType === 'true_false') {
    optionsHTML = `
      <div class="form-group">
        <label>Jawaban Benar</label>
        <select class="form-control correct-answer" required>
          <option value="">Pilih jawaban benar</option>
          <option value="true">Benar</option>
          <option value="false">Salah</option>
        </select>
      </div>
    `;
  } else {
    optionsHTML = `
      <div class="form-group">
        <label>Kata Kunci Jawaban (untuk penilaian)</label>
        <input type="text" class="form-control correct-answer" placeholder="Pisahkan dengan koma">
      </div>
    `;
  }
  
  const questionHTML = `
    <div class="question-item" data-question-id="${questionCounter}">
      <h4>Pertanyaan ${questionCounter}</h4>
      <div class="form-group">
        <label>Pertanyaan</label>
        <textarea class="form-control question-text" rows="3" required></textarea>
      </div>
      ${optionsHTML}
      <button type="button" class="btn btn-danger btn-sm" onclick="removeQuestion(${questionCounter})">Hapus Pertanyaan</button>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', questionHTML);
}

function removeQuestion(id) {
  const question = document.querySelector(`[data-question-id="${id}"]`);
  if (question) {
    question.remove();
  }
}

function handleCreateQuiz(e) {
  e.preventDefault();
  
  const title = document.getElementById('quizTitle').value;
  const subject = document.getElementById('quizSubject').value;
  const duration = parseInt(document.getElementById('quizDuration').value);
  const type = document.getElementById('questionType').value;
  
  const multimedia = {
    videoUrl: document.getElementById('videoUrl').value,
    audioUrl: document.getElementById('audioUrl').value,
    documentUrl: document.getElementById('documentUrl').value
  };
  
  const questions = [];
  document.querySelectorAll('.question-item').forEach(item => {
    const questionText = item.querySelector('.question-text').value;
    const correctAnswer = item.querySelector('.correct-answer').value;
    
    const question = {
      question: questionText,
      correct: correctAnswer
    };
    
    if (type === 'multiple_choice') {
      question.options = {};
      item.querySelectorAll('.option-input').forEach(input => {
        question.options[input.dataset.option] = input.value;
      });
    }
    
    questions.push(question);
  });
  
  const quiz = {
    id: Date.now(),
    title,
    subject,
    type,
    duration,
    active: true,
    multimedia,
    questions,
    createdBy: appState.currentUser.username
  };
  
  appState.quizzes.push(quiz);
  showToast('Soal berhasil dibuat!', 'success');
  document.getElementById('createQuizForm').reset();
  document.getElementById('questionsContainer').innerHTML = '';
  questionCounter = 0;
  addQuestion();
}

function renderQuizList() {
  const tbody = document.getElementById('quizListBody');
  tbody.innerHTML = '';
  
  // Add download button for teacher
  const tabContent = document.getElementById('quizList');
  let downloadSection = tabContent.querySelector('.teacher-download-section');
  
  if (!downloadSection) {
    downloadSection = document.createElement('div');
    downloadSection.className = 'teacher-download-section';
    downloadSection.style.cssText = 'margin-bottom: 20px; padding: 16px; background: var(--color-bg-1); border-radius: 8px;';
    downloadSection.innerHTML = `
      <h3 style="margin-bottom: 12px;">📥 Download Soal Saya</h3>
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="downloadTeacherQuestionsPDF()">📄 Download PDF</button>
        <button class="btn btn-secondary" onclick="downloadTeacherQuestionsExcel()">📊 Download Excel</button>
      </div>
    `;
    tabContent.insertBefore(downloadSection, tabContent.querySelector('.table-container'));
  }
  
  appState.quizzes.forEach((quiz, index) => {
    const sourceLabel = quiz.source === 'document_upload' ? 
      ' <span style="background: #EEF2FF; color: #4F46E5; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">[Dari Dokumen]</span>' : '';
    
    const row = `
      <tr>
        <td>${index + 1}</td>
        <td>${quiz.title}${sourceLabel}</td>
        <td>${quiz.subject}</td>
        <td>${quiz.duration} menit</td>
        <td>${quiz.questions.length}</td>
        <td><span class="status-badge ${quiz.active ? 'status-active' : 'status-inactive'}">${quiz.active ? 'Aktif' : 'Nonaktif'}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-sm btn-icon" onclick="toggleQuizStatus(${quiz.id})">${quiz.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="deleteQuiz(${quiz.id})">Hapus</button>
          </div>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', row);
  });
}

function toggleQuizStatus(id) {
  const quiz = appState.quizzes.find(q => q.id === id);
  if (quiz) {
    quiz.active = !quiz.active;
    renderQuizList();
    showToast(`Soal ${quiz.active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
  }
}

function deleteQuiz(id) {
  if (confirm('Yakin ingin menghapus soal ini?')) {
    appState.quizzes = appState.quizzes.filter(q => q.id !== id);
    renderQuizList();
    showToast('Soal berhasil dihapus', 'success');
  }
}

function renderStudentResults() {
  const tbody = document.getElementById('resultsBody');
  tbody.innerHTML = '';
  
  // Add download button for teacher
  const tabContent = document.getElementById('studentResults');
  let downloadSection = tabContent.querySelector('.teacher-results-download-section');
  
  if (!downloadSection) {
    downloadSection = document.createElement('div');
    downloadSection.className = 'teacher-results-download-section';
    downloadSection.style.cssText = 'margin-bottom: 20px; padding: 16px; background: var(--color-bg-1); border-radius: 8px;';
    downloadSection.innerHTML = `
      <h3 style="margin-bottom: 12px;">📥 Download Rekapan Nilai</h3>
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="downloadTeacherGradesExcel()">📊 Download Excel</button>
        <button class="btn btn-secondary" onclick="downloadTeacherGradesCSV()">📄 Download CSV</button>
      </div>
    `;
    tabContent.insertBefore(downloadSection, tabContent.querySelector('.table-container'));
  }
  
  if (appState.results.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">Belum ada hasil pengerjaan</td></tr>';
    return;
  }
  
  appState.results.forEach((result, index) => {
    const proctoringStatusColor = getProctoringStatusColor(result.proctoringStatus || '✓ Lulus');
    const modeDisplay = getFaceDetectionModeDisplay(result.faceDetectionMode);
    const row = `
      <tr>
        <td>${index + 1}</td>
        <td>${result.studentName}</td>
        <td>${result.studentClass}</td>
        <td>${result.quizTitle}</td>
        <td><strong>${result.score}</strong></td>
        <td>${result.timeSpent}</td>
        <td>Tab: ${result.tabSwitchViolations || result.violations || 0}/3<br>Wajah: ${result.faceViolations || 0}/3</td>
        <td>
          <div style="color: ${proctoringStatusColor}; font-weight: 600;">${result.proctoringStatus || '✓ Lulus'}</div>
          <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">${modeDisplay}</div>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', row);
  });
}

// ============================================
// STUDENT DASHBOARD
// ============================================
function showStudentDashboard() {
  showPage('studentDashboard');
  document.getElementById('studentName').textContent = appState.currentUser.name;
  
  // Setup tabs
  document.querySelectorAll('#studentDashboard .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showTab(btn.dataset.tab);
      if (btn.dataset.tab === 'quizHistory') {
        renderQuizHistory();
      }
    });
  });
  
  renderAvailableQuizzes();
}

function renderAvailableQuizzes() {
  const container = document.getElementById('quizzesGrid');
  container.innerHTML = '';
  
  const activeQuizzes = appState.quizzes.filter(q => q.active);
  
  if (activeQuizzes.length === 0) {
    container.innerHTML = '<p style="text-align: center; padding: 40px; color: #6B7280;">Tidak ada soal yang tersedia saat ini</p>';
    return;
  }
  
  activeQuizzes.forEach(quiz => {
    const alreadyTaken = appState.results.some(r => 
      r.quizId === quiz.id && r.studentUsername === appState.currentUser.username
    );
    
    const card = `
      <div class="quiz-card">
        <h3>${quiz.title}</h3>
        <div class="quiz-meta">
          <span>📚 ${quiz.subject}</span>
          <span>⏱️ ${quiz.duration} menit</span>
          <span>📝 ${quiz.questions.length} soal</span>
          ${alreadyTaken ? '<span style="color: var(--color-secondary); font-weight: 600;">✓ Sudah dikerjakan</span>' : ''}
        </div>
        <button class="btn ${alreadyTaken ? 'btn-secondary' : 'btn-primary'} btn-full" onclick="startQuiz(${quiz.id})">
          ${alreadyTaken ? 'Kerjakan Lagi' : 'Mulai Mengerjakan'}
        </button>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', card);
  });
}

function renderQuizHistory() {
  const container = document.getElementById('historyContainer');
  container.innerHTML = '';
  
  const userResults = appState.results.filter(r => r.studentUsername === appState.currentUser.username);
  
  if (userResults.length === 0) {
    container.innerHTML = '<p style="text-align: center; padding: 40px; color: #6B7280;">Belum ada riwayat pengerjaan</p>';
    return;
  }
  
  userResults.forEach(result => {
    const proctoringColor = getProctoringStatusColor(result.proctoringStatus || '✓ Lulus');
    const modeDisplay = getFaceDetectionModeDisplay(result.faceDetectionMode);
    const item = `
      <div class="history-item">
        <div class="history-info">
          <h4>${result.quizTitle}</h4>
          <p>Waktu: ${result.timeSpent}</p>
          <p>Mode: ${modeDisplay}</p>
          <p>Tab: ${result.tabSwitchViolations || 0}/3 | Wajah: ${result.faceViolations || 0}/3</p>
          <p style="color: ${proctoringColor}; font-weight: 600;">${result.proctoringStatus || '✓ Lulus'}</p>
        </div>
        <div class="history-score">${result.score}</div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', item);
  });
}

function backToStudentDashboard() {
  showStudentDashboard();
  renderAvailableQuizzes();
}

// ============================================
// QUIZ TAKING - MAIN FUNCTIONS
// ============================================
function startQuiz(quizId) {
  const quiz = appState.quizzes.find(q => q.id === quizId);
  if (!quiz) {
    showToast('Quiz tidak ditemukan', 'error');
    return;
  }
  
  appState.currentQuiz = quiz;
  appState.violationCount = 0;
  appState.faceViolationCount = 0;
  appState.faceDetectionMode = null;
  appState.cameraPermissionAttempts = 0;
  
  // Reset face detection state
  stopFaceMonitoring();
  
  // Show identity form
  showPage('quizTakingPage');
  document.getElementById('studentIdentityForm').style.display = 'flex';
  document.getElementById('quizInterface').style.display = 'none';
  document.getElementById('faceVerificationPage').style.display = 'none';
  
  // Reset face verification UI
  document.getElementById('cameraPermissionSection').style.display = 'block';
  document.getElementById('cameraPreviewSection').style.display = 'none';
  document.getElementById('proceedToExamBtn').disabled = true;
  
  // Show face monitoring preview (will be hidden if NO_FACE_DETECTION)
  document.getElementById('faceMonitoringPreview').style.display = 'block';
  
  // Setup identity form
  document.getElementById('identityForm').onsubmit = handleIdentitySubmit;
}

function handleIdentitySubmit(e) {
  e.preventDefault();
  
  const studentName = document.getElementById('studentNameInput').value;
  const studentClass = document.getElementById('studentClassInput').value;
  
  // Initialize quiz session
  appState.currentQuizSession = {
    quizId: appState.currentQuiz.id,
    quizTitle: appState.currentQuiz.title,
    studentName: studentName,
    studentClass: studentClass,
    studentUsername: appState.currentUser.username,
    startTime: Date.now(),
    answers: new Array(appState.currentQuiz.questions.length).fill(null),
    currentQuestion: 0,
    timeRemaining: appState.currentQuiz.duration * 60 // in seconds
  };
  
  // Add to admin monitoring (current exams)
  const examId = Date.now();
  adminData.currentExams.push({
    examId: examId,
    studentId: appState.currentUser.username,
    studentName: studentName,
    studentClass: studentClass,
    examName: appState.currentQuiz.title,
    subject: appState.currentQuiz.subject,
    startTime: new Date().toLocaleString('id-ID'),
    duration: appState.currentQuiz.duration,
    remainingTime: appState.currentQuiz.duration,
    status: 'ongoing',
    faceDetectionMode: null, // Will be set after face verification
    fullscreenActive: false,
    violations: {
      tabSwitch: 0,
      faceDetection: 0,
      total: 0
    },
    violationHistory: [],
    lastUpdated: new Date().toLocaleString('id-ID')
  });
  
  // Store exam ID in session
  appState.currentQuizSession.adminExamId = examId;
  
  // Hide identity form and show face verification
  document.getElementById('studentIdentityForm').style.display = 'none';
  document.getElementById('faceVerificationPage').style.display = 'flex';
}

function initQuizInterface() {
  document.getElementById('quizTitleDisplay').textContent = appState.currentQuiz.title;
  document.getElementById('studentInfo').textContent = 
    `${appState.currentQuizSession.studentName} - ${appState.currentQuizSession.studentClass}`;
  
  // Render multimedia if available
  renderMultimedia();
  
  // Render question navigation
  renderQuestionNavigation();
  
  // Display first question
  displayQuestion(0);
  
  // Start timer
  startTimer();
}

function renderMultimedia() {
  const container = document.getElementById('multimediaContent');
  container.innerHTML = '';
  
  const multimedia = appState.currentQuiz.multimedia;
  let hasContent = false;
  
  if (multimedia.videoUrl) {
    container.innerHTML += `
      <div style="margin-bottom: 16px;">
        <h4 style="margin-bottom: 8px;">Video Pembelajaran</h4>
        <video controls>
          <source src="${multimedia.videoUrl}" type="video/mp4">
          Browser Anda tidak mendukung video.
        </video>
      </div>
    `;
    hasContent = true;
  }
  
  if (multimedia.audioUrl) {
    container.innerHTML += `
      <div style="margin-bottom: 16px;">
        <h4 style="margin-bottom: 8px;">Audio</h4>
        <audio controls>
          <source src="${multimedia.audioUrl}" type="audio/mpeg">
          Browser Anda tidak mendukung audio.
        </audio>
      </div>
    `;
    hasContent = true;
  }
  
  if (multimedia.documentUrl) {
    container.innerHTML += `
      <div>
        <h4 style="margin-bottom: 8px;">Dokumen</h4>
        <a href="${multimedia.documentUrl}" target="_blank" class="btn btn-secondary">Lihat Dokumen</a>
      </div>
    `;
    hasContent = true;
  }
  
  if (!hasContent) {
    container.style.display = 'none';
  }
}

function renderQuestionNavigation() {
  const container = document.getElementById('questionNavigation');
  container.innerHTML = '';
  
  appState.currentQuiz.questions.forEach((_, index) => {
    const answered = appState.currentQuizSession.answers[index] !== null;
    const active = appState.currentQuizSession.currentQuestion === index;
    
    const btn = document.createElement('button');
    btn.className = `question-nav-btn ${active ? 'active' : ''} ${answered ? 'answered' : ''}`;
    btn.textContent = index + 1;
    btn.onclick = () => displayQuestion(index);
    container.appendChild(btn);
  });
}

function displayQuestion(index) {
  appState.currentQuizSession.currentQuestion = index;
  const question = appState.currentQuiz.questions[index];
  const container = document.getElementById('questionContainer');
  
  let answersHTML = '';
  
  if (appState.currentQuiz.type === 'multiple_choice') {
    answersHTML = '<div class="answer-options">';
    Object.entries(question.options).forEach(([key, value]) => {
      const checked = appState.currentQuizSession.answers[index] === key ? 'checked' : '';
      answersHTML += `
        <label class="answer-option ${checked ? 'selected' : ''}">
          <input type="radio" name="answer" value="${key}" ${checked} onchange="saveAnswer('${key}')">
          <span>${key}. ${value}</span>
        </label>
      `;
    });
    answersHTML += '</div>';
  } else if (appState.currentQuiz.type === 'true_false') {
    answersHTML = '<div class="answer-options">';
    ['true', 'false'].forEach(value => {
      const checked = appState.currentQuizSession.answers[index] === value ? 'checked' : '';
      const label = value === 'true' ? 'Benar' : 'Salah';
      answersHTML += `
        <label class="answer-option ${checked ? 'selected' : ''}">
          <input type="radio" name="answer" value="${value}" ${checked} onchange="saveAnswer('${value}')">
          <span>${label}</span>
        </label>
      `;
    });
    answersHTML += '</div>';
  } else {
    const value = appState.currentQuizSession.answers[index] || '';
    answersHTML = `
      <textarea class="form-control" rows="6" placeholder="Tulis jawaban Anda di sini..." onchange="saveAnswer(this.value)">${value}</textarea>
    `;
  }
  
  container.innerHTML = `
    <h3>Soal ${index + 1} dari ${appState.currentQuiz.questions.length}</h3>
    <p style="margin-bottom: 24px; font-size: 16px;">${question.question}</p>
    ${answersHTML}
  `;
  
  // Update navigation buttons
  document.getElementById('prevBtn').style.display = index === 0 ? 'none' : 'block';
  document.getElementById('nextBtn').style.display = index === appState.currentQuiz.questions.length - 1 ? 'none' : 'block';
  document.getElementById('submitBtn').style.display = index === appState.currentQuiz.questions.length - 1 ? 'block' : 'none';
  
  // Update navigation
  renderQuestionNavigation();
  
  // Update progress
  const answeredCount = appState.currentQuizSession.answers.filter(a => a !== null).length;
  const progress = (answeredCount / appState.currentQuiz.questions.length) * 100;
  document.getElementById('progressFill').style.width = progress + '%';
}

function saveAnswer(answer) {
  const index = appState.currentQuizSession.currentQuestion;
  appState.currentQuizSession.answers[index] = answer;
  
  // Save to IndexedDB for offline persistence
  if (appState.currentQuizSession) {
    saveAnswerToIndexedDB(
      appState.currentQuizSession.quizId,
      index,
      answer
    );
  }
  
  // Update navigation to show answered
  renderQuestionNavigation();
  
  // Update selected state for radio buttons
  document.querySelectorAll('.answer-option').forEach(option => {
    option.classList.remove('selected');
    if (option.querySelector('input').checked) {
      option.classList.add('selected');
    }
  });
}

function navigateQuestion(direction) {
  const newIndex = appState.currentQuizSession.currentQuestion + direction;
  if (newIndex >= 0 && newIndex < appState.currentQuiz.questions.length) {
    displayQuestion(newIndex);
  }
}

function startTimer() {
  updateTimerDisplay();
  
  appState.timerInterval = setInterval(() => {
    appState.currentQuizSession.timeRemaining--;
    
    if (appState.currentQuizSession.timeRemaining <= 0) {
      clearInterval(appState.timerInterval);
      autoSubmitQuiz();
      return;
    }
    
    updateTimerDisplay();
  }, 1000);
}

function updateTimerDisplay() {
  const minutes = Math.floor(appState.currentQuizSession.timeRemaining / 60);
  const seconds = appState.currentQuizSession.timeRemaining % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  const timerEl = document.getElementById('timer');
  timerEl.textContent = display;
  
  // Warning color when less than 5 minutes
  if (appState.currentQuizSession.timeRemaining <= 300) {
    timerEl.classList.add('warning');
  }
}

function submitQuiz() {
  if (!confirm('Yakin ingin mengumpulkan jawaban?')) {
    return;
  }
  
  processQuizSubmission();
}

function autoSubmitQuiz() {
  showToast('Waktu habis! Jawaban otomatis dikumpulkan.', 'warning');
  processQuizSubmission();
}

function processQuizSubmission() {
  clearInterval(appState.timerInterval);
  exitMobileExamMode();
  stopAntiCheatMonitoring();
  stopFaceMonitoring();
  
  // Remove from admin monitoring
  const examIndex = adminData.currentExams.findIndex(e => e.examId === appState.currentQuizSession?.adminExamId);
  if (examIndex !== -1) {
    adminData.currentExams[examIndex].status = 'submitted';
    adminData.currentExams[examIndex].remainingTime = 0;
    // Remove after 5 seconds
    setTimeout(() => {
      const idx = adminData.currentExams.findIndex(e => e.examId === appState.currentQuizSession?.adminExamId);
      if (idx !== -1) {
        adminData.currentExams.splice(idx, 1);
      }
    }, 5000);
  }
  
  // Calculate score
  let correctCount = 0;
  appState.currentQuiz.questions.forEach((question, index) => {
    const userAnswer = appState.currentQuizSession.answers[index];
    if (userAnswer === question.correct) {
      correctCount++;
    }
  });
  
  const score = Math.round((correctCount / appState.currentQuiz.questions.length) * 100);
  
  // Calculate time spent
  const timeSpent = appState.currentQuiz.duration * 60 - appState.currentQuizSession.timeRemaining;
  const timeSpentMinutes = Math.floor(timeSpent / 60);
  const timeSpentSeconds = timeSpent % 60;
  const timeSpentDisplay = `${timeSpentMinutes}m ${timeSpentSeconds}s`;
  
  // Save result
  const result = {
    quizId: appState.currentQuiz.id,
    quizTitle: appState.currentQuiz.title,
    studentName: appState.currentQuizSession.studentName,
    studentClass: appState.currentQuizSession.studentClass,
    studentUsername: appState.currentUser.username,
    score: score,
    correctCount: correctCount,
    totalQuestions: appState.currentQuiz.questions.length,
    timeSpent: timeSpentDisplay,
    violations: appState.violationCount,
    faceViolations: appState.faceViolationCount,
    tabSwitchViolations: appState.violationCount,
    faceDetectionMode: appState.faceDetectionMode,
    proctoringStatus: getProctoringStatus(),
    endReason: appState.currentQuizSession.endReason || 'normal_submit',
    submittedAt: new Date().toLocaleString('id-ID')
  };
  
  appState.results.push(result);
  
  // Show results
  showResults(result);
}

function showResults(result) {
  showPage('resultsPage');
  
  const modeDisplay = getFaceDetectionModeDisplay(result.faceDetectionMode);
  
  const content = document.getElementById('resultsContent');
  content.innerHTML = `
    <div class="score-display">${result.score}</div>
    <div class="results-stats">
      <div class="stat-item">
        <div class="label">Benar</div>
        <div class="value">${result.correctCount}</div>
      </div>
      <div class="stat-item">
        <div class="label">Salah</div>
        <div class="value">${result.totalQuestions - result.correctCount}</div>
      </div>
      <div class="stat-item">
        <div class="label">Total</div>
        <div class="value">${result.totalQuestions}</div>
      </div>
    </div>
    <div style="text-align: left; margin: 24px 0;">
      <p><strong>Waktu Pengerjaan:</strong> ${result.timeSpent}</p>
      <p><strong>Mode Face Detection:</strong> ${modeDisplay}</p>
      <p><strong>Pelanggaran Tab-Switch:</strong> ${result.tabSwitchViolations}/3</p>
      <p><strong>Pelanggaran Face Detection:</strong> ${result.faceViolations}/3</p>
      <p><strong>Status Proctoring:</strong> <span style="color: ${getProctoringStatusColor(result.proctoringStatus)};">${result.proctoringStatus}</span></p>
      <p><strong>Diselesaikan:</strong> ${result.submittedAt}</p>
    </div>
  `;
}

function getFaceDetectionModeDisplay(mode) {
  switch(mode) {
    case 'REAL_CAMERA':
      return '✓ Real Face Detection';
    case 'DEMO_MODE':
      return '✓ Demo Face Detection';
    case 'NO_FACE_DETECTION':
      return '⚠️ Tab-Switch Only';
    default:
      return '✓ Lulus';
  }
}

// ============================================
// ANTI-CHEAT SYSTEM
// ============================================
function enterFullscreen() {
  const elem = document.documentElement;
  if (elem.requestFullscreen) {
    elem.requestFullscreen().catch(err => {
      console.log('Fullscreen error:', err);
    });
  }
  appState.fullscreenActive = true;
}

function exitFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen().catch(err => {
      console.log('Exit fullscreen error:', err);
    });
  }
  appState.fullscreenActive = false;
}

function startAntiCheatMonitoring() {
  // Detect tab switching
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleWindowBlur);
  
  // Detect fullscreen exit
  document.addEventListener('fullscreenchange', handleFullscreenChange);
}

function stopAntiCheatMonitoring() {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('blur', handleWindowBlur);
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
}

function handleVisibilityChange() {
  if (document.hidden && appState.currentQuizSession) {
    handleViolation();
  }
}

function handleWindowBlur() {
  if (appState.currentQuizSession) {
    handleViolation();
  }
}

function handleFullscreenChange() {
  if (!document.fullscreenElement && appState.fullscreenActive && appState.currentQuizSession) {
    handleViolation();
  }
}

function handleViolation() {
  appState.violationCount++;
  
  // Update admin monitoring
  const exam = adminData.currentExams.find(e => e.examId === appState.currentQuizSession?.adminExamId);
  if (exam) {
    exam.violations.tabSwitch++;
    exam.violations.total++;
    exam.violationHistory.push({
      time: new Date().toLocaleTimeString('id-ID'),
      type: 'tab_switch',
      message: 'Tab switching detected'
    });
    exam.lastUpdated = new Date().toLocaleString('id-ID');
  }
  
  // Update violation display
  updateViolationsDisplay();
  
  const warningMessages = [
    'PERINGATAN! Pelanggaran ke-1 dari 5. Jangan berpindah aplikasi atau tab!',
    'PERINGATAN! Pelanggaran ke-2 dari 5. Masih ada kesempatan!',
    'PERINGATAN! Pelanggaran ke-3 dari 5. Fokus pada ujian!',
    'PERINGATAN! Pelanggaran ke-4 dari 5. Ini peringatan terakhir!',
    'UJIAN BERAKHIR! Anda telah melakukan 5 kali pelanggaran. Jawaban akan disubmit otomatis.'
  ];
  
  if (appState.violationCount < 5) {
    // Show warning modal
    showWarningModal(warningMessages[appState.violationCount - 1]);
    // Try to re-enter fullscreen
    setTimeout(() => {
      enterFullscreen();
    }, 1000);
  } else {
    // Force submit and logout
    endExamDueToViolation('tab_switching', 'Berpindah tab/aplikasi');
  }
}

function endExamDueToViolation(reason, reasonText) {
  clearInterval(appState.timerInterval);
  stopAntiCheatMonitoring();
  stopFaceMonitoring();
  
  // Mark the end reason
  if (appState.currentQuizSession) {
    appState.currentQuizSession.endReason = reason;
  }
  
  // Process submission
  processQuizSubmission();
  
  // Show violation modal
  const modal = document.getElementById('violationModal');
  const reasonEl = document.getElementById('violationEndReason');
  
  if (reason === 'tab_switching') {
    reasonEl.textContent = 'Ujian berakhir karena 3 kali pelanggaran TAB-SWITCHING. Jenis pelanggaran: ' + reasonText;
  } else if (reason === 'face_detection') {
    reasonEl.textContent = 'Ujian berakhir karena 3 kali pelanggaran DETEKSI WAJAH. Jenis pelanggaran terakhir: ' + reasonText;
  }
  
  modal.classList.add('active');
}

function getProctoringStatus() {
  if (appState.violationCount >= 3) {
    return '❌ Ended (Tab-Switch)';
  } else if (appState.faceViolationCount >= 3) {
    return '❌ Ended (Face Detection)';
  } else if (appState.violationCount > 0 || appState.faceViolationCount > 0) {
    return '⚠️ Warning';
  } else {
    return '✓ Lulus';
  }
}

function getProctoringStatusColor(status) {
  if (status.includes('Ended')) {
    return '#EF4444';
  } else if (status.includes('Warning')) {
    return '#F59E0B';
  } else {
    return '#10B981';
  }
}

function showWarningModal(message) {
  const modal = document.getElementById('warningModal');
  document.getElementById('warningMessage').textContent = message;
  modal.classList.add('active');
}

function closeWarningModal() {
  document.getElementById('warningModal').classList.remove('active');
  enterFullscreen();
}

function showViolationModal() {
  const modal = document.getElementById('violationModal');
  modal.classList.add('active');
}

// ============================================
// MOBILE RESPONSIVE FUNCTIONS
// ============================================
function toggleMobileSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('mobileOverlay');
  
  if (sidebar && overlay) {
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
  }
}

function toggleMobileMenu(type) {
  // For teacher/student dashboards - could implement mobile menu drawer
  showToast('Menu toggle - feature coming soon', 'info');
}

function setupResponsiveUI() {
  // Show/hide mobile elements based on screen size
  const updateResponsiveElements = () => {
    const isMobile = window.innerWidth < 768;
    
    // Admin mobile header
    const mobileAdminHeader = document.querySelector('.mobile-admin-header');
    if (mobileAdminHeader) {
      mobileAdminHeader.style.display = isMobile ? 'flex' : 'none';
    }
    
    // Teacher/Student hamburger menus
    const teacherHamburger = document.querySelector('#teacherDashboard .hamburger-menu');
    const studentHamburger = document.querySelector('#studentDashboard .hamburger-menu');
    
    if (teacherHamburger) {
      teacherHamburger.style.display = isMobile ? 'block' : 'none';
    }
    if (studentHamburger) {
      studentHamburger.style.display = isMobile ? 'block' : 'none';
    }
    
    // Close mobile sidebar when switching to desktop
    if (!isMobile) {
      const sidebar = document.getElementById('adminSidebar');
      const overlay = document.getElementById('mobileOverlay');
      if (sidebar) sidebar.classList.remove('mobile-open');
      if (overlay) overlay.classList.remove('active');
    }
  };
  
  // Initial check
  updateResponsiveElements();
  
  // Listen for window resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateResponsiveElements, 250);
  });
  
  // Listen for orientation change
  window.addEventListener('orientationchange', () => {
    setTimeout(updateResponsiveElements, 100);
  });
}

// ============================================
// MOBILE EXAM MODE - ENTER/EXIT
// ============================================
async function enterMobileExamMode() {
  console.log('📱 Entering Mobile Exam Mode...');
  
  // 1. Request fullscreen
  await enterFullscreen();
  
  // 2. Lock orientation to portrait
  await lockPortraitOrientation();
  
  // 3. Request wake lock
  await requestWakeLock();
  
  // 4. Initialize swipe gestures
  initSwipeGestures();
  
  // 5. Check orientation continuously
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);
  checkOrientation();
  
  // 6. Prevent copy/paste
  document.addEventListener('copy', (e) => {
    if (appState.currentQuizSession) {
      e.preventDefault();
      showToast('⚠️ Copy dinonaktifkan saat ujian', 'warning');
    }
  });
  
  document.addEventListener('paste', (e) => {
    if (appState.currentQuizSession) {
      e.preventDefault();
      showToast('⚠️ Paste dinonaktifkan saat ujian', 'warning');
    }
  });
  
  // 7. Prevent text selection
  document.body.style.userSelect = 'none';
  document.body.style.webkitUserSelect = 'none';
  
  console.log('✓ Mobile Exam Mode ACTIVE');
  showToast('📱 Mode Ujian Mobile Aktif', 'success');
}

function exitMobileExamMode() {
  console.log('Exiting Mobile Exam Mode...');
  
  exitFullscreen();
  unlockOrientation();
  releaseWakeLock();
  
  // Re-enable text selection
  document.body.style.userSelect = '';
  document.body.style.webkitUserSelect = '';
  
  console.log('✓ Mobile Exam Mode exited');
}

// ============================================
// QR CODE FUNCTIONS
// ============================================
let qrCodeInstances = {
  admin: null,
  guru: null,
  siswa: null
};

// Generate all QR codes on page load
function generateAllQRCodes() {
  console.log('🔐 Starting QR Code generation...');
  
  // Check if QRCode library is loaded
  if (typeof QRCode === 'undefined') {
    console.error('❌ QRCode library not loaded!');
    showToast('QR Code library not loaded. Please refresh the page.', 'error');
    return;
  }
  
  const roles = ['admin', 'guru', 'siswa'];
  const baseUrl = window.location.origin + window.location.pathname;
  
  roles.forEach(role => {
    const qrUrl = `${baseUrl}?role=${role}`;
    const containerId = `qr${role.charAt(0).toUpperCase() + role.slice(1)}Container`;
    const urlId = `url${role.charAt(0).toUpperCase() + role.slice(1)}`;
    
    console.log(`Generating QR for ${role}:`, qrUrl);
    
    // Set URL display
    const urlElement = document.getElementById(urlId);
    if (urlElement) {
      urlElement.textContent = qrUrl;
      console.log(`✓ URL set for ${role}`);
    } else {
      console.warn(`⚠️ URL element not found for ${role}`);
    }
    
    // Clear previous QR code
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`❌ Container not found for ${role}:`, containerId);
      return;
    }
    
    // Clear any existing content
    container.innerHTML = '';
    
    // Add loading indicator
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: #6B7280;">Generating QR Code...</div>';
    
    // Generate QR code with delay to ensure DOM is ready
    setTimeout(() => {
      try {
        // Clear loading indicator
        container.innerHTML = '';
        
        // Create new QR code instance
        qrCodeInstances[role] = new QRCode(container, {
          text: qrUrl,
          width: 240,
          height: 240,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
        
        console.log(`✓ QR Code generated successfully for ${role}`);
      } catch (error) {
        console.error(`❌ Failed to generate QR for ${role}:`, error);
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: #EF4444; font-size: 14px;">
          <p style="margin-bottom: 8px;">⚠️ Error generating QR Code</p>
          <p style="font-size: 12px;">${error.message}</p>
        </div>`;
      }
    }, 100 * (roles.indexOf(role) + 1)); // Stagger generation
  });
  
  showToast('✓ QR Codes generated successfully!', 'success');
  console.log('✓ All QR Codes generation initiated');
}

function downloadQRCode(role) {
  const containerId = `qr${role.charAt(0).toUpperCase() + role.slice(1)}Container`;
  const container = document.getElementById(containerId);
  
  if (!container) {
    showToast('Container tidak ditemukan', 'error');
    return;
  }
  
  const canvas = container.querySelector('canvas');
  if (!canvas) {
    showToast('QR Code belum selesai generate. Coba lagi.', 'error');
    return;
  }
  
  try {
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `QR_Login_${role.toUpperCase()}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`✓ QR Code ${role} berhasil didownload!`, 'success');
    console.log(`✓ QR Code ${role} downloaded`);
  } catch (error) {
    console.error('Download error:', error);
    showToast('Gagal download QR Code', 'error');
  }
}

function printQRCode(role) {
  const containerId = `qr${role.charAt(0).toUpperCase() + role.slice(1)}Container`;
  const container = document.getElementById(containerId);
  
  if (!container) {
    showToast('Container tidak ditemukan', 'error');
    return;
  }
  
  const canvas = container.querySelector('canvas');
  if (!canvas) {
    showToast('QR Code belum selesai generate. Coba lagi.', 'error');
    return;
  }
  
  try {
    const printWindow = window.open('', '', 'width=600,height=700');
    const imageUrl = canvas.toDataURL('image/png');
    const qrUrl = document.getElementById(`url${role.charAt(0).toUpperCase() + role.slice(1)}`).textContent;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code Login - ${role.toUpperCase()}</title>
          <style>
            body {
              text-align: center;
              font-family: Arial, sans-serif;
              padding: 40px;
              background: white;
            }
            h1 {
              color: #4F46E5;
              margin-bottom: 10px;
            }
            .subtitle {
              color: #6B7280;
              margin-bottom: 30px;
            }
            img {
              margin: 20px 0;
              border: 2px solid #E5E7EB;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            .info {
              margin: 20px auto;
              max-width: 500px;
              text-align: left;
              background: #F9FAFB;
              padding: 20px;
              border-radius: 8px;
              border: 1px solid #E5E7EB;
            }
            .info p {
              margin: 8px 0;
              line-height: 1.6;
            }
            .info strong {
              color: #1F2937;
            }
            .instructions {
              margin-top: 30px;
              text-align: left;
              max-width: 500px;
              margin-left: auto;
              margin-right: auto;
            }
            .instructions h3 {
              color: #1F2937;
              margin-bottom: 12px;
            }
            .instructions ol {
              line-height: 1.8;
              color: #4B5563;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <h1>QR Code Login - ${role.toUpperCase()}</h1>
          <p class="subtitle">Platform Soal Online</p>
          <img src="${imageUrl}" />
          <div class="info">
            <p><strong>Role:</strong> ${role}</p>
            <p><strong>URL:</strong> ${qrUrl}</p>
            <p><strong>Platform:</strong> ${window.location.origin}</p>
          </div>
          <div class="instructions">
            <h3>📱 Cara Menggunakan:</h3>
            <ol>
              <li>Buka aplikasi kamera di smartphone</li>
              <li>Arahkan kamera ke QR code di atas</li>
              <li>Browser akan otomatis membuka halaman login</li>
              <li>Role sudah ter-set otomatis</li>
              <li>Masukkan username dan password</li>
              <li>Login berhasil!</li>
            </ol>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
    
    showToast(`✓ QR Code ${role} dikirim ke printer`, 'success');
    console.log(`✓ QR Code ${role} sent to printer`);
  } catch (error) {
    console.error('Print error:', error);
    showToast('Gagal print QR Code', 'error');
  }
}

function copyURLToClipboard(role) {
  const urlId = `url${role.charAt(0).toUpperCase() + role.slice(1)}`;
  const urlElement = document.getElementById(urlId);
  
  if (!urlElement) {
    showToast('URL tidak ditemukan', 'error');
    return;
  }
  
  const url = urlElement.textContent;
  
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url)
      .then(() => {
        showToast(`✓ URL berhasil di-copy!\n\n${url}`, 'success');
        console.log(`✓ URL copied: ${url}`);
      })
      .catch(err => {
        console.error('Copy failed:', err);
        fallbackCopyToClipboard(url);
      });
  } else {
    fallbackCopyToClipboard(url);
  }
}

function fallbackCopyToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.select();
  
  try {
    document.execCommand('copy');
    showToast(`✓ URL berhasil di-copy!\n\n${text}`, 'success');
  } catch (err) {
    console.error('Fallback copy failed:', err);
    showToast('Gagal copy URL. Salin manual: ' + text, 'error');
  }
  
  document.body.removeChild(textArea);
}

function downloadAllQRCodes() {
  showToast('📥 Mendownload semua QR codes...', 'info');
  
  const roles = ['admin', 'guru', 'siswa'];
  let downloadCount = 0;
  
  roles.forEach((role, index) => {
    setTimeout(() => {
      downloadQRCode(role);
      downloadCount++;
      
      if (downloadCount === roles.length) {
        setTimeout(() => {
          showToast(`✓ ${downloadCount} QR codes berhasil didownload!`, 'success');
        }, 500);
      }
    }, index * 800);
  });
}

function printAllQRCodes() {
  const roles = ['admin', 'guru', 'siswa'];
  const printWindow = window.open('', '', 'width=800,height=1000');
  
  let html = `
    <html>
      <head>
        <title>QR Codes - Platform Login</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            background: white;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #4F46E5;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #4F46E5;
            margin-bottom: 5px;
          }
          .header p {
            color: #6B7280;
            margin: 5px 0;
          }
          .qr-item {
            page-break-inside: avoid;
            margin: 40px 0;
            padding: 30px;
            border: 2px solid #E5E7EB;
            border-radius: 12px;
            background: #F9FAFB;
          }
          .qr-item h2 {
            color: #1F2937;
            margin-bottom: 20px;
            text-align: center;
          }
          .qr-container {
            text-align: center;
            margin: 20px 0;
          }
          .qr-container img {
            border: 2px solid #E5E7EB;
            padding: 20px;
            background: white;
            border-radius: 8px;
          }
          .qr-info {
            margin-top: 20px;
            padding: 15px;
            background: white;
            border-radius: 8px;
            text-align: left;
          }
          .qr-info p {
            margin: 8px 0;
            line-height: 1.6;
            color: #4B5563;
          }
          .qr-info strong {
            color: #1F2937;
          }
          .divider {
            border-bottom: 2px dashed #D1D5DB;
            margin: 40px 0;
          }
          @media print {
            body { padding: 20px; }
            .qr-item { page-break-after: always; }
            .qr-item:last-child { page-break-after: auto; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Platform Soal Online</h1>
          <p>QR Code Login untuk Semua Role</p>
          <p style="font-size: 12px;">Generated: ${new Date().toLocaleString('id-ID')}</p>
        </div>
  `;
  
  roles.forEach((role, index) => {
    const containerId = `qr${role.charAt(0).toUpperCase() + role.slice(1)}Container`;
    const container = document.getElementById(containerId);
    const canvas = container?.querySelector('canvas');
    
    if (canvas) {
      const imageUrl = canvas.toDataURL('image/png');
      const qrUrl = document.getElementById(`url${role.charAt(0).toUpperCase() + role.slice(1)}`).textContent;
      
      html += `
        <div class="qr-item">
          <h2>🔐 QR Code - ${role.toUpperCase()}</h2>
          <div class="qr-container">
            <img src="${imageUrl}" alt="QR Code ${role}" />
          </div>
          <div class="qr-info">
            <p><strong>Role:</strong> ${role}</p>
            <p><strong>URL:</strong> ${qrUrl}</p>
            <p><strong>Instruksi:</strong> Scan QR code dengan smartphone untuk login ke platform</p>
          </div>
        </div>
        ${index < roles.length - 1 ? '<div class="divider"></div>' : ''}
      `;
    }
  });
  
  html += `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #E5E7EB; text-align: center; color: #9CA3AF; font-size: 12px;">
          <p>Platform Soal Online - QR Code Generator</p>
          <p>${window.location.origin}</p>
        </div>
      </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  setTimeout(() => {
    printWindow.print();
  }, 500);
  
  showToast('✓ Semua QR codes dikirim ke printer', 'success');
  console.log('✓ All QR codes sent to printer');
}

// ============================================
// DOWNLOAD FUNCTIONS
// ============================================
function downloadQuestionsPDF() {
  if (typeof jspdf === 'undefined') {
    showToast('PDF library not loaded', 'error');
    return;
  }
  
  const { jsPDF } = jspdf;
  const doc = new jsPDF();
  
  const subjectFilter = document.getElementById('downloadSubjectFilter')?.value || '';
  let questions = [];
  
  appState.quizzes.forEach(quiz => {
    if (!subjectFilter || quiz.subject === subjectFilter) {
      questions.push({
        subject: quiz.subject,
        title: quiz.title,
        questions: quiz.questions
      });
    }
  });
  
  if (questions.length === 0) {
    showToast('Tidak ada soal untuk didownload', 'error');
    return;
  }
  
  let yPos = 20;
  let questionNumber = 1;
  
  doc.setFontSize(16);
  doc.text('DAFTAR SOAL UJIAN', 105, yPos, { align: 'center' });
  yPos += 10;
  
  questions.forEach(quiz => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`${quiz.subject} - ${quiz.title}`, 10, yPos);
    yPos += 7;
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    
    quiz.questions.forEach(q => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      const questionText = doc.splitTextToSize(`${questionNumber}. ${q.question}`, 180);
      doc.text(questionText, 15, yPos);
      yPos += questionText.length * 5 + 2;
      
      if (q.options) {
        Object.entries(q.options).forEach(([key, value]) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          const optionText = doc.splitTextToSize(`${key}. ${value}`, 170);
          doc.text(optionText, 20, yPos);
          yPos += optionText.length * 5;
        });
      }
      
      yPos += 3;
      questionNumber++;
    });
    
    yPos += 5;
  });
  
  doc.save('Soal_Ujian.pdf');
  showToast('Soal berhasil didownload sebagai PDF!', 'success');
}

function downloadQuestionsExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('Excel library not loaded', 'error');
    return;
  }
  
  const subjectFilter = document.getElementById('downloadSubjectFilter')?.value || '';
  const data = [['No', 'Mata Pelajaran', 'Judul Quiz', 'Soal', 'A', 'B', 'C', 'D', 'E', 'Jawaban']];
  
  let rowNumber = 1;
  
  appState.quizzes.forEach(quiz => {
    if (!subjectFilter || quiz.subject === subjectFilter) {
      quiz.questions.forEach(q => {
        data.push([
          rowNumber,
          quiz.subject,
          quiz.title,
          q.question,
          q.options?.A || '',
          q.options?.B || '',
          q.options?.C || '',
          q.options?.D || '',
          q.options?.E || '',
          q.correct
        ]);
        rowNumber++;
      });
    }
  });
  
  if (data.length === 1) {
    showToast('Tidak ada soal untuk didownload', 'error');
    return;
  }
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Soal');
  XLSX.writeFile(wb, 'Soal_Ujian.xlsx');
  
  showToast('Soal berhasil didownload sebagai Excel!', 'success');
}

function downloadGradesExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('Excel library not loaded', 'error');
    return;
  }
  
  const examFilter = document.getElementById('downloadExamFilter')?.value || '';
  const classFilter = document.getElementById('downloadClassFilter')?.value || '';
  
  let filteredResults = appState.results;
  
  if (examFilter) {
    filteredResults = filteredResults.filter(r => r.quizTitle === examFilter);
  }
  
  if (classFilter) {
    filteredResults = filteredResults.filter(r => r.studentClass && r.studentClass.startsWith(classFilter));
  }
  
  if (filteredResults.length === 0) {
    showToast('Tidak ada nilai untuk didownload', 'error');
    return;
  }
  
  const data = [[
    'No', 'Nama Siswa', 'Kelas', 'Ujian', 'Nilai', 'Benar', 'Salah', 
    'Total Soal', 'Waktu', 'Pelanggaran Tab', 'Pelanggaran Wajah', 'Status', 'Tanggal'
  ]];
  
  filteredResults.forEach((result, index) => {
    const grade = result.score >= 75 ? 'LULUS' : 'TIDAK LULUS';
    data.push([
      index + 1,
      result.studentName,
      result.studentClass,
      result.quizTitle,
      result.score,
      result.correctCount,
      result.totalQuestions - result.correctCount,
      result.totalQuestions,
      result.timeSpent,
      result.tabSwitchViolations || 0,
      result.faceViolations || 0,
      grade,
      result.submittedAt
    ]);
  });
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Nilai');
  XLSX.writeFile(wb, `Rekapan_Nilai_${Date.now()}.xlsx`);
  
  showToast(`${filteredResults.length} nilai berhasil didownload!`, 'success');
}

function downloadGradesCSV() {
  const examFilter = document.getElementById('downloadExamFilter')?.value || '';
  const classFilter = document.getElementById('downloadClassFilter')?.value || '';
  
  let filteredResults = appState.results;
  
  if (examFilter) {
    filteredResults = filteredResults.filter(r => r.quizTitle === examFilter);
  }
  
  if (classFilter) {
    filteredResults = filteredResults.filter(r => r.studentClass && r.studentClass.startsWith(classFilter));
  }
  
  if (filteredResults.length === 0) {
    showToast('Tidak ada nilai untuk didownload', 'error');
    return;
  }
  
  let csv = 'No,Nama Siswa,Kelas,Ujian,Nilai,Benar,Salah,Total Soal,Waktu,Pelanggaran Tab,Pelanggaran Wajah,Status,Tanggal\n';
  
  filteredResults.forEach((result, index) => {
    const grade = result.score >= 75 ? 'LULUS' : 'TIDAK LULUS';
    csv += `${index + 1},${result.studentName},${result.studentClass},${result.quizTitle},${result.score},${result.correctCount},${result.totalQuestions - result.correctCount},${result.totalQuestions},${result.timeSpent},${result.tabSwitchViolations || 0},${result.faceViolations || 0},${grade},${result.submittedAt}\n`;
  });
  
  downloadCSV(csv, `Rekapan_Nilai_${Date.now()}.csv`);
  showToast(`${filteredResults.length} nilai berhasil didownload!`, 'success');
}

// ============================================
// INITIALIZE APP
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Initializing Platform Soal Online...');
  
  // Debug: Print available demo users
  console.log('📋 Demo Users Available:');
  console.table(DEMO_USERS);
  console.log('\n💡 Demo Credentials:\n' +
    '  Admin: admin / admin123\n' +
    '  Guru: guru1 / guru123\n' +
    '  Siswa: siswa1 / siswa123'
  );
  
  initLogin();
  showPage('loginPage');
  setupResponsiveUI();
  
  // Initialize IndexedDB for offline storage
  try {
    await initIndexedDB();
    console.log('✓ Offline storage ready');
  } catch (error) {
    console.error('IndexedDB init failed:', error);
  }
  
  // Initialize network monitoring
  initNetworkMonitoring();
  
  // Setup mobile security
  detectAppSwitch();
  
  // Check if running as PWA
  if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('✓ Running as PWA');
    document.body.classList.add('pwa-mode');
  }
  
  // Prevent default back button behavior globally
  history.pushState(null, '', location.href);
  
  console.log('✅ Platform initialized successfully');
  console.log('🔑 Ready for login with demo credentials');
  
  // Check for QR code role parameter
  const urlParams = new URLSearchParams(window.location.search);
  const role = urlParams.get('role');
  
  if (role) {
    console.log('📱 QR Code detected - Role:', role);
    showToast(`📱 QR Code Login - ${role.toUpperCase()}`, 'success');
    
    // Auto-focus username field
    setTimeout(() => {
      document.getElementById('username').focus();
    }, 500);
  }
  
  // Populate download filters
  populateDownloadFilters();
  
  // Pre-generate QR codes for faster admin access
  if (typeof QRCode !== 'undefined') {
    console.log('✓ QRCode library loaded and ready');
  } else {
    console.warn('⚠️ QRCode library not loaded - check CDN');
  }
});

// Teacher download functions
function downloadTeacherQuestionsPDF() {
  if (typeof jspdf === 'undefined') {
    showToast('PDF library not loaded', 'error');
    return;
  }
  
  const { jsPDF } = jspdf;
  const doc = new jsPDF();
  
  const teacherQuizzes = appState.quizzes.filter(q => q.createdBy === appState.currentUser.username);
  
  if (teacherQuizzes.length === 0) {
    showToast('Anda belum membuat soal', 'error');
    return;
  }
  
  let yPos = 20;
  let questionNumber = 1;
  
  doc.setFontSize(16);
  doc.text('SOAL UJIAN', 105, yPos, { align: 'center' });
  yPos += 5;
  doc.setFontSize(10);
  doc.text(`Dibuat oleh: ${appState.currentUser.name}`, 105, yPos, { align: 'center' });
  yPos += 10;
  
  teacherQuizzes.forEach(quiz => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`${quiz.subject} - ${quiz.title}`, 10, yPos);
    yPos += 7;
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    
    quiz.questions.forEach(q => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      const questionText = doc.splitTextToSize(`${questionNumber}. ${q.question}`, 180);
      doc.text(questionText, 15, yPos);
      yPos += questionText.length * 5 + 2;
      
      if (q.options) {
        Object.entries(q.options).forEach(([key, value]) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          const optionText = doc.splitTextToSize(`${key}. ${value}`, 170);
          doc.text(optionText, 20, yPos);
          yPos += optionText.length * 5;
        });
      }
      
      yPos += 3;
      questionNumber++;
    });
    
    yPos += 5;
  });
  
  doc.save(`Soal_${appState.currentUser.username}.pdf`);
  showToast('Soal berhasil didownload sebagai PDF!', 'success');
}

function downloadTeacherQuestionsExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('Excel library not loaded', 'error');
    return;
  }
  
  const teacherQuizzes = appState.quizzes.filter(q => q.createdBy === appState.currentUser.username);
  
  if (teacherQuizzes.length === 0) {
    showToast('Anda belum membuat soal', 'error');
    return;
  }
  
  const data = [['No', 'Mata Pelajaran', 'Judul Quiz', 'Soal', 'A', 'B', 'C', 'D', 'E', 'Jawaban']];
  
  let rowNumber = 1;
  
  teacherQuizzes.forEach(quiz => {
    quiz.questions.forEach(q => {
      data.push([
        rowNumber,
        quiz.subject,
        quiz.title,
        q.question,
        q.options?.A || '',
        q.options?.B || '',
        q.options?.C || '',
        q.options?.D || '',
        q.options?.E || '',
        q.correct
      ]);
      rowNumber++;
    });
  });
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Soal');
  XLSX.writeFile(wb, `Soal_${appState.currentUser.username}.xlsx`);
  
  showToast('Soal berhasil didownload sebagai Excel!', 'success');
}

function downloadTeacherGradesExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('Excel library not loaded', 'error');
    return;
  }
  
  const teacherQuizzes = appState.quizzes.filter(q => q.createdBy === appState.currentUser.username);
  const quizIds = teacherQuizzes.map(q => q.id);
  const teacherResults = appState.results.filter(r => quizIds.includes(r.quizId));
  
  if (teacherResults.length === 0) {
    showToast('Belum ada siswa yang mengerjakan soal Anda', 'error');
    return;
  }
  
  const data = [[
    'No', 'Nama Siswa', 'Kelas', 'Ujian', 'Nilai', 'Benar', 'Salah', 
    'Total Soal', 'Waktu', 'Pelanggaran Tab', 'Pelanggaran Wajah', 'Status', 'Tanggal'
  ]];
  
  teacherResults.forEach((result, index) => {
    const grade = result.score >= 75 ? 'LULUS' : 'TIDAK LULUS';
    data.push([
      index + 1,
      result.studentName,
      result.studentClass,
      result.quizTitle,
      result.score,
      result.correctCount,
      result.totalQuestions - result.correctCount,
      result.totalQuestions,
      result.timeSpent,
      result.tabSwitchViolations || 0,
      result.faceViolations || 0,
      grade,
      result.submittedAt
    ]);
  });
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Nilai');
  XLSX.writeFile(wb, `Nilai_${appState.currentUser.username}.xlsx`);
  
  showToast(`${teacherResults.length} nilai berhasil didownload!`, 'success');
}

function downloadTeacherGradesCSV() {
  const teacherQuizzes = appState.quizzes.filter(q => q.createdBy === appState.currentUser.username);
  const quizIds = teacherQuizzes.map(q => q.id);
  const teacherResults = appState.results.filter(r => quizIds.includes(r.quizId));
  
  if (teacherResults.length === 0) {
    showToast('Belum ada siswa yang mengerjakan soal Anda', 'error');
    return;
  }
  
  let csv = 'No,Nama Siswa,Kelas,Ujian,Nilai,Benar,Salah,Total Soal,Waktu,Pelanggaran Tab,Pelanggaran Wajah,Status,Tanggal\n';
  
  teacherResults.forEach((result, index) => {
    const grade = result.score >= 75 ? 'LULUS' : 'TIDAK LULUS';
    csv += `${index + 1},${result.studentName},${result.studentClass},${result.quizTitle},${result.score},${result.correctCount},${result.totalQuestions - result.correctCount},${result.totalQuestions},${result.timeSpent},${result.tabSwitchViolations || 0},${result.faceViolations || 0},${grade},${result.submittedAt}\n`;
  });
  
  downloadCSV(csv, `Nilai_${appState.currentUser.username}.csv`);
  showToast(`${teacherResults.length} nilai berhasil didownload!`, 'success');
}

function populateDownloadFilters() {
  // Populate subject filter
  const subjectSelect = document.getElementById('downloadSubjectFilter');
  if (subjectSelect) {
    const subjects = [...new Set(appState.quizzes.map(q => q.subject))];
    subjects.forEach(subject => {
      const option = document.createElement('option');
      option.value = subject;
      option.textContent = subject;
      subjectSelect.appendChild(option);
    });
  }
  
  // Populate exam filter
  const examSelect = document.getElementById('downloadExamFilter');
  if (examSelect) {
    const exams = [...new Set(appState.quizzes.map(q => q.title))];
    exams.forEach(exam => {
      const option = document.createElement('option');
      option.value = exam;
      option.textContent = exam;
      examSelect.appendChild(option);
    });
  }
}