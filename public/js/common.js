// Client utilities
const API_URL = window.location.origin;

// Récupérer le token depuis le stockage local
function getToken() {
  return localStorage.getItem('token');
}

// Récupérer les données de l'utilisateur stocké
function getUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

// Enregistrer le token et l'utilisateur
function setAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

// Supprimer la session d'authentification
function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// Fonction de requête API globale pour gérer automatiquement les en-têtes d'authentification
async function apiCall(endpoint, options = {}) {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config = {
    ...options,
    headers
  };
  
  const response = await fetch(`${API_URL}/api${endpoint}`, config);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Une erreur est survenue lors de l\'appel API');
  }
  
  return data;
}

// Notifications toast dynamiques
function showToast(message, type = 'success') {
  // Supprimer les anciens toasts si existants
  const oldToast = document.querySelector('.toast');
  if (oldToast) {
    oldToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✅' : '❌';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  
  document.body.appendChild(toast);
  
  // Faire disparaître après 4 secondes
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Mettre à jour la barre de navigation
function updateNavbar() {
  const user = getUser();
  const navLinks = document.getElementById('nav-links');
  
  if (!navLinks) return;

  if (user) {
    let dashboardLink = '';
    
    // Déterminer les accès selon le type d'utilisateur
    dashboardLink = `<li><a href="/dashboard.html" class="nav-link">Tableau de bord</a></li>`;

    // Badge de vérification CNI à afficher à côté de l'utilisateur
    let badgeHtml = '';
    if (user.cniStatus === 'Verified') {
      badgeHtml = `<span class="cni-badge verified">CNI Vérifié</span>`;
    } else if (user.cniStatus === 'Pending') {
      badgeHtml = `<span class="cni-badge pending">CNI En Cours</span>`;
    } else {
      badgeHtml = `<span class="cni-badge not-submitted">CNI Non Vérifié</span>`;
    }

    navLinks.innerHTML = `
      <li><a href="/index.html" class="nav-link">Accueil</a></li>
      <li><a href="/recherche.html" class="nav-link" style="display: flex; align-items: center; gap: 4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Commencer</a></li>
      ${dashboardLink}
      <li><a href="/chat.html" class="nav-link">Discussions</a></li>
      <li style="display: flex; align-items: center; gap: 8px;">
        <span style="font-weight: 600; color: var(--text-primary);">${user.prenom} (${user.type})</span>
        ${badgeHtml}
      </li>
      <li><button onclick="logout()" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">Déconnexion</button></li>
    `;
  } else {
    navLinks.innerHTML = `
      <li><a href="/index.html" class="nav-link">Accueil</a></li>
      <li><a href="/recherche.html" class="nav-link" style="display: flex; align-items: center; gap: 4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Commencer</a></li>
      <li><a href="/auth.html" class="btn btn-secondary">Connexion</a></li>
      <li><a href="/auth.html?mode=register" class="btn btn-primary">S'inscrire</a></li>
    `;
  }
}

// Déconnexion
function logout() {
  clearAuth();
  showToast('Déconnecté avec succès', 'success');
  setTimeout(() => {
    window.location.href = '/index.html';
  }, 1000);
}

// Initialisation globale de la page
document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
});
