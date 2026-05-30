// Mode de page par défaut ou dynamique via URL query params
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');
  
  const token = getToken();
  const user = getUser();
  
  if (token && user) {
    if (user.cniStatus !== 'Verified') {
      showCniScreen();
    } else {
      window.location.href = '/index.html';
    }
  } else if (mode === 'register') {
    toggleMode('register');
  } else {
    toggleMode('login');
  }
});

// Basculer l'affichage Connexion / Inscription
let _currentMode = 'login';

function toggleMode(mode) {
  if (mode === _currentMode) return;
  const prev = _currentMode;
  _currentMode = mode;

  const loginBox    = document.getElementById('login-container');
  const registerBox = document.getElementById('register-container');
  const cniBox      = document.getElementById('cni-verification-container');
  const tabLogin    = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const pill        = document.getElementById('tab-pill');

  cniBox.style.display = 'none';

  // Déplacer la pill indicatrice
  if (pill) {
    pill.classList.toggle('right', mode === 'register');
  }

  // Mettre à jour les classes des onglets
  if (tabLogin)    tabLogin.classList.toggle('active', mode === 'login');
  if (tabRegister) tabRegister.classList.toggle('active', mode === 'register');

  const incoming = mode === 'register' ? registerBox : loginBox;
  const outgoing  = mode === 'register' ? loginBox    : registerBox;
  const inClass   = mode === 'register' ? 'slide-in-right' : 'slide-in-left';

  // Fade-out sortant
  outgoing.style.transition  = 'opacity 0.15s ease, transform 0.15s ease';
  outgoing.style.opacity     = '0';
  outgoing.style.transform   = mode === 'register' ? 'translateX(-16px)' : 'translateX(16px)';

  setTimeout(() => {
    outgoing.style.display    = 'none';
    outgoing.style.opacity    = '';
    outgoing.style.transform  = '';
    outgoing.style.transition = '';

    // Fade-in entrant avec classe CSS
    incoming.style.display = 'block';
    incoming.classList.remove('slide-in-left', 'slide-in-right');
    void incoming.offsetWidth; // force reflow
    incoming.classList.add(inClass);
  }, 150);
}

// Afficher l'écran de validation CNI
function showCniScreen() {
  document.getElementById('login-container').style.display = 'none';
  document.getElementById('register-container').style.display = 'none';
  document.getElementById('cni-verification-container').style.display = 'block';
}

// Formulaire de Connexion
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  try {
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    setAuth(data.token, data.user);
    showToast('Connexion réussie !', 'success');
    
    setTimeout(() => {
      if (data.user.cniStatus !== 'Verified') {
        showCniScreen();
      } else {
        window.location.href = '/index.html';
      }
    }, 1000);
  } catch (error) {
    showToast(error.message, 'error');
  }
});

// Formulaire d'Inscription
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const nom = document.getElementById('reg-nom').value;
  const prenom = document.getElementById('reg-prenom').value;
  const email = document.getElementById('reg-email').value;
  const telephone = document.getElementById('reg-tel').value;
  const type = document.getElementById('reg-type').value;
  const ville = document.getElementById('reg-ville').value;
  const quartier = document.getElementById('reg-quartier').value;
  const latitude = document.getElementById('reg-lat').value;
  const longitude = document.getElementById('reg-lng').value;
  const password = document.getElementById('reg-password').value;
  
  try {
    const data = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        nom, prenom, email, telephone, type,
        ville, quartier, latitude, longitude, password
      })
    });
    
    setAuth(data.token, data.user);
    showToast('Inscription réussie. Passez à la validation CNI.', 'success');
    
    setTimeout(() => {
      showCniScreen();
    }, 1200);
  } catch (error) {
    showToast(error.message, 'error');
  }
});

// --- LOGIQUE DE SCAN ET VÉRIFICATION CNI ---

let imagesBase64 = {
  cni: null,
  selfie: null
};

// Activer le clic de sélection d'image
function triggerUpload(id) {
  document.getElementById(id).click();
}

// Aperçu des images téléchargées et encodage base64
function previewImage(input, target) {
  const file = input.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const preview = document.getElementById(`${target}-preview`);
    const box = document.getElementById(`${target}-box`);
    
    preview.src = e.target.result;
    box.classList.add('has-image');
    imagesBase64[target] = e.target.result;
    checkAndAutoVerify();
  };
  
  reader.readAsDataURL(file);
}


// Déclenchement automatique quand CNI + selfie sont prêts
function checkAndAutoVerify() {
  if (imagesBase64.cni && imagesBase64.selfie) {
    setTimeout(() => startBiometricVerification(), 600);
  }
}
// Fonction de simulation biométrique avec logs animés
function startBiometricVerification() {
  if (!imagesBase64.cni || !imagesBase64.selfie) {
    showToast('Veuillez uploader les deux photos avant de lancer la vérification.', 'error');
    return;
  }
  
  const logsBox = document.getElementById('step-logs');
  logsBox.style.display = 'flex';
  
  // Activer l'animation laser sur les deux images
  document.getElementById('cni-box').classList.add('scanning');
  document.getElementById('selfie-box').classList.add('scanning');
  
  const logs = [
    { id: 'log-1', delay: 0, text: '⚙️ Connexion aux serveurs de la DGSN Cameroun...' },
    { id: 'log-2', delay: 1200, text: '🔍 OCR : Extraction textuelle de la carte d\'identité...' },
    { id: 'log-3', delay: 2400, text: '🛡️ Analyse des filigranes et de la signature...' },
    { id: 'log-4', delay: 3500, text: '🧬 Biométrie : Calcul de la carte faciale (selfie vs photo CNI)...' },
    { id: 'log-5', delay: 4500, text: '📈 Comparaison en temps réel et validation finale...' }
  ];
  
  logs.forEach(log => {
    setTimeout(() => {
      const el = document.getElementById(log.id);
      el.className = 'step-log-item active';
      el.innerHTML = `<span>⏳</span> ${log.text}`;
      
      // Mettre le précédent en vert (Terminé)
      const prevIndex = logs.findIndex(l => l.id === log.id) - 1;
      if (prevIndex >= 0) {
        const prevEl = document.getElementById(logs[prevIndex].id);
        prevEl.className = 'step-log-item done';
        prevEl.innerHTML = `<span>✅</span> ${logs[prevIndex].text.substring(3)}`;
      }
    }, log.delay);
  });
  
  // Lancer l'appel backend à la fin de l'animation de simulation
  setTimeout(async () => {
    try {
      const data = await apiCall('/auth/verify-cni', {
        method: 'POST',
        body: JSON.stringify({
          cniPhoto: imagesBase64.cni,
          selfiePhoto: imagesBase64.selfie
        })
      });
      
      // Stopper le scan laser
      document.getElementById('cni-box').classList.remove('scanning');
      document.getElementById('selfie-box').classList.remove('scanning');
      
      // Mettre le dernier log en succès
      const finalEl = document.getElementById('log-5');
      finalEl.className = 'step-log-item done';
      finalEl.innerHTML = `<span>✅</span> Similarité faciale confirmée !`;
      
      // Afficher les résultats extraits
      document.getElementById('res-cni').innerText = data.extractedData.cniNumber;
      document.getElementById('res-nom').innerText = `${data.extractedData.prenomExtrait} ${data.extractedData.nomExtrait}`;
      document.getElementById('res-score').innerText = `${data.extractedData.faceMatchScore}%`;
      
      // Mettre à jour l'utilisateur localement
      const currentUser = getUser();
      currentUser.cniStatus = 'Verified';
      localStorage.setItem('user', JSON.stringify(currentUser));
      
      document.getElementById('verify-results').style.display = 'block';
      animateDgsnStatus();
      showToast('Identité validée à 100% avec succès !', 'success');
      
    } catch (err) {
      document.getElementById('cni-box').classList.remove('scanning');
      document.getElementById('selfie-box').classList.remove('scanning');
      showToast(err.message, 'error');
    }
  }, 6000);
}

// Terminer le flux d'inscription et rediriger
function finishVerificationFlow() {
  window.location.href = '/index.html';
}

// --- SYSTEME DE GEOLOCALISATION AUTO & REVERSE GEOCODING ---

function enableManualLocationInput() {
  const villeInput = document.getElementById('reg-ville');
  const quartierInput = document.getElementById('reg-quartier');
  
  villeInput.removeAttribute('readonly');
  villeInput.style.cursor = 'text';
  villeInput.style.background = 'transparent';
  
  quartierInput.removeAttribute('readonly');
  quartierInput.style.cursor = 'text';
  quartierInput.style.background = 'transparent';
  
  showToast('Saisie manuelle activée.', 'success');
}

async function detectUserLocation() {
  const loader = document.getElementById('geoloc-loader');
  const status = document.getElementById('geoloc-status');
  
  if (!loader || !status) return;

  loader.style.display = 'flex';
  status.innerText = 'Détermination des coordonnées GPS...';

  // Options GPS
  const options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
  };

  if (!navigator.geolocation) {
    status.innerText = 'Géolocalisation non supportée par votre navigateur.';
    loader.style.display = 'none';
    enableManualLocationInput();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      document.getElementById('reg-lat').value = lat;
      document.getElementById('reg-lng').value = lng;
      
      status.innerText = `GPS trouvé (${lat.toFixed(4)}, ${lng.toFixed(4)}). Recherche de la ville au Cameroun...`;

      try {
        // Reverse geocoding via OpenStreetMap Nominatim
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'fr' // Obtenir les noms en français
            }
          }
        );
        
        if (!response.ok) throw new Error('Erreur Nominatim');
        
        const data = await response.json();
        const addr = data.address || {};
        
        // Déterminer la ville
        const ville = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state || 'Douala';
        // Déterminer le quartier
        const quartier = addr.suburb || addr.neighbourhood || addr.quarter || addr.residential || addr.city_district || 'Akwa';
        
        document.getElementById('reg-ville').value = ville;
        document.getElementById('reg-quartier').value = quartier;
        
        status.innerHTML = `✅ Localisation réussie : <strong>${quartier}, ${ville}</strong>`;
        showToast(`Position détectée : ${quartier}, ${ville}`, 'success');
      } catch (err) {
        console.error('Erreur reverse geocoding:', err.message);
        status.innerText = 'Coordonnées GPS obtenues, mais impossible de décoder l\'adresse. Saisie manuelle requise.';
        enableManualLocationInput();
      } finally {
        loader.style.display = 'none';
      }
    },
    (error) => {
      console.warn('Erreur GPS code:', error.code, error.message);
      status.innerText = 'Accès GPS refusé ou indisponible. Veuillez renseigner manuellement.';
      loader.style.display = 'none';
      
      // Fallbacks par défaut (Yaoundé / Douala)
      document.getElementById('reg-lat').value = '4.0511';
      document.getElementById('reg-lng').value = '9.7679';
      document.getElementById('reg-ville').value = 'Douala';
      document.getElementById('reg-quartier').value = 'Akwa';
      
      enableManualLocationInput();
    },
    options
  );
}


// ── CAMÉRA FRONTALE SELFIE ────────────────────────────────────────────────
let selfieStream = null;

async function openFrontCamera() {
  const btn = document.getElementById('btn-open-camera');
  const captureBtn = document.getElementById('btn-capture-selfie');
  const cameraView = document.getElementById('selfie-camera-view');
  const video = document.getElementById('selfie-video');

  btn.disabled = true;
  btn.classList.add('btn-loading');

  try {
    selfieStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    });
    video.srcObject = selfieStream;
    cameraView.style.display = 'block';
    btn.style.display = 'none';
    btn.classList.remove('btn-loading');
    captureBtn.style.display = 'flex';
    showToast('Caméra frontale activée !', 'success');
  } catch (err) {
    btn.disabled = false;
    btn.classList.remove('btn-loading');
    showToast('Accès caméra refusé. Vérifiez les permissions.', 'error');
  }
}

function captureSelfie() {
  const video    = document.getElementById('selfie-video');
  const canvas   = document.getElementById('selfie-canvas');
  const preview  = document.getElementById('selfie-preview');
  const cameraView  = document.getElementById('selfie-camera-view');
  const selfieBox   = document.getElementById('selfie-box');
  const captureBtn  = document.getElementById('btn-capture-selfie');
  const retakeBtn   = document.getElementById('btn-retake-selfie');

  // Flash blanc
  const flash = document.createElement('div');
  flash.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0.8;z-index:9999;pointer-events:none;transition:opacity 0.3s';
  document.body.appendChild(flash);
  setTimeout(() => { flash.style.opacity = '0'; setTimeout(() => flash.remove(), 300); }, 80);

  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  imagesBase64.selfie = dataUrl;

  if (selfieStream) { selfieStream.getTracks().forEach(t => t.stop()); selfieStream = null; }

  preview.src = dataUrl;
  cameraView.style.display = 'none';
  selfieBox.style.display  = 'block';
  selfieBox.classList.add('has-image');
  captureBtn.style.display = 'none';
  retakeBtn.style.display  = 'block';

  showToast('Selfie capturé !', 'success');
  checkAndAutoVerify();
}

function retakeSelfie() {
  imagesBase64.selfie = null;
  document.getElementById('selfie-box').style.display   = 'none';
  document.getElementById('selfie-box').classList.remove('has-image');
  document.getElementById('btn-retake-selfie').style.display = 'none';
  const openBtn = document.getElementById('btn-open-camera');
  openBtn.style.display = 'flex';
  openBtn.disabled = false;
}

// ── STATUT DGSN ANIMÉ ─────────────────────────────────────────────────────
function animateDgsnStatus() {
  const pulse = document.getElementById('dgsn-pulse');
  const text  = document.getElementById('dgsn-status-text');
  const badge = document.getElementById('dgsn-status-badge');
  if (!text) return;

  const steps = [
    { label: 'CONNEXION...',      color: '#eab308', pulseColor: '#eab308' },
    { label: 'AUTHENTIFICATION...', color: '#eab308', pulseColor: '#eab308' },
    { label: 'VÉRIFICATION...',   color: '#60a5fa', pulseColor: '#60a5fa' },
    { label: 'VALIDATION...',     color: '#a78bfa', pulseColor: '#a78bfa' },
    { label: '✔ VERIFIED',        color: 'var(--primary)', pulseColor: '#22c55e', final: true },
  ];

  let i = 0;
  const iv = setInterval(() => {
    if (i >= steps.length) { clearInterval(iv); return; }
    const s = steps[i];
    text.style.color = s.color;
    text.innerText   = s.label;
    if (pulse) { pulse.style.background = s.pulseColor; }
    if (s.final) {
      clearInterval(iv);
      if (pulse) pulse.style.animation = 'none';
      if (badge) badge.style.animation = 'dgsn-verified-pop 0.45s cubic-bezier(0.22,1,0.36,1) forwards';
      text.style.fontWeight   = '900';
      text.style.letterSpacing = '2px';
    }
    i++;
  }, 520);
}