// Variables globales du dashboard
let currentActiveTab = '';
let myOffers = [];
let mySubmissions = [];

document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  if (!user) {
    showToast('Veuillez vous connecter pour accéder au tableau de bord.', 'error');
    window.location.href = '/auth.html';
    return;
  }
  
  initDashboardMenu(user);
});

// Initialiser le menu latéral selon le type d'utilisateur
function initDashboardMenu(user) {
  const menuContainer = document.getElementById('dashboard-menu');
  
  if (user.type === 'Candidat') {
    menuContainer.innerHTML = `
      <li class="sidebar-item" id="menu-ongoing" onclick="switchTab('ongoing')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg> Emplois en cours
      </li>
      <li class="sidebar-item" id="menu-submissions" onclick="switchTab('submissions')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg> Mes candidatures
      </li>
    `;
    switchTab('ongoing');
  } else {
    // Recruteur ou Particulier
    menuContainer.innerHTML = `
      <li class="sidebar-item" id="menu-ongoing" onclick="switchTab('ongoing')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg> Missions en cours
      </li>
      <li class="sidebar-item" id="menu-my-offers" onclick="switchTab('my-offers')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg> Mes offres publiées
      </li>
      <li class="sidebar-item" id="menu-publish" onclick="switchTab('publish')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg> Publier une offre
      </li>
    `;
    
    // Auto-remplir la localisation du recruteur par défaut
    if (document.getElementById('job-ville')) document.getElementById('job-ville').value = user.geoloc.ville;
    if (document.getElementById('job-quartier')) document.getElementById('job-quartier').value = user.geoloc.quartier;
    if (document.getElementById('job-lat')) document.getElementById('job-lat').value = user.geoloc.latitude;
    if (document.getElementById('job-lng')) document.getElementById('job-lng').value = user.geoloc.longitude;

    switchTab('ongoing');
  }
}

// Changer d'onglet de dashboard
function switchTab(tabName) {
  currentActiveTab = tabName;
  
  // Désactiver tous les onglets de menu et masquer les sections
  const menuItems = document.querySelectorAll('.sidebar-item');
  menuItems.forEach(item => item.classList.remove('active'));
  
  if (document.getElementById('section-publish')) document.getElementById('section-publish').style.display = 'none';
  if (document.getElementById('section-my-offers')) document.getElementById('section-my-offers').style.display = 'none';
  if (document.getElementById('section-my-submissions')) document.getElementById('section-my-submissions').style.display = 'none';
  if (document.getElementById('section-ongoing')) document.getElementById('section-ongoing').style.display = 'none';
  
  // Activer l'élément courant
  if (tabName === 'publish') {
    document.getElementById('menu-publish').classList.add('active');
    document.getElementById('section-publish').style.display = 'block';
  } else if (tabName === 'my-offers') {
    document.getElementById('menu-my-offers').classList.add('active');
    document.getElementById('section-my-offers').style.display = 'block';
    loadMyOffers();
  } else if (tabName === 'submissions') {
    document.getElementById('menu-submissions').classList.add('active');
    document.getElementById('section-my-submissions').style.display = 'block';
    loadMySubmissions();
  } else if (tabName === 'ongoing') {
    document.getElementById('menu-ongoing').classList.add('active');
    document.getElementById('section-ongoing').style.display = 'block';
    loadOngoingJobs();
  }
}

// --- LOGIQUE RECRUTEUR : CHARGER LES OFFRES PUBLIÉES ---
async function loadMyOffers() {
  try {
    const tbody = document.getElementById('my-offers-tbody');
    const msg = document.getElementById('no-offers-msg');
    
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Chargement de vos offres...</td></tr>';
    msg.style.display = 'none';

    const data = await apiCall('/jobs/my/offers', { method: 'GET' });
    myOffers = data.jobs;

    tbody.innerHTML = '';

    if (myOffers.length === 0) {
      msg.style.display = 'block';
      return;
    }

    myOffers.forEach(job => {
      const tr = document.createElement('tr');
      const dateStr = new Date(job.createdAt).toLocaleDateString('fr-FR');
      const formattedBudget = new Intl.NumberFormat('fr-FR').format(job.budget) + ' XAF';

      tr.innerHTML = `
        <td style="font-weight: 600;">${job.titre}</td>
        <td>${formattedBudget}</td>
        <td>${job.type}</td>
        <td>${dateStr}</td>
        <td><span class="status-pill accepted">${job.statut}</span></td>
        <td>
          <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;display:inline-flex;align-items:center;gap:4px" onclick="openApplicantsDrawer('${job._id}', '${job.titre.replace(/'/g, "\\'")}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> Voir les postulants
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// --- LOGIQUE RECRUTEUR : SOUUMETTRE UNE OFFRE ---
document.getElementById('create-job-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const titre = document.getElementById('job-title').value;
  const type = document.getElementById('job-type').value;
  const domaine = document.getElementById('job-domaine').value;
  const budget = document.getElementById('job-budget').value;
  const description = document.getElementById('job-desc').value;
  const ville = document.getElementById('job-ville').value;
  const quartier = document.getElementById('job-quartier').value;
  const latitude = document.getElementById('job-lat').value;
  const longitude = document.getElementById('job-lng').value;

  try {
    await apiCall('/jobs', {
      method: 'POST',
      body: JSON.stringify({
        titre, type, domaine, budget, description,
        ville, quartier, latitude, longitude
      })
    });

    showToast('Votre offre d\'emploi a été publiée avec succès !', 'success');
    document.getElementById('create-job-form').reset();
    switchTab('my-offers');
  } catch (error) {
    showToast(error.message, 'error');
  }
});

// --- DRAWER DES CANDIDATURES RECUES ---
async function openApplicantsDrawer(jobId, jobTitle) {
  try {
    const drawer = document.getElementById('applicants-drawer');
    const drawerTitle = document.getElementById('drawer-title');
    const drawerContent = document.getElementById('drawer-content');

    drawerTitle.innerText = `Candidats : ${jobTitle}`;
    drawerContent.innerHTML = '<p style="text-align: center; padding: 2rem;">Chargement des profils...</p>';
    drawer.classList.add('active');

    const data = await apiCall(`/applications/job/${jobId}`, { method: 'GET' });
    const applications = data.applications;

    drawerContent.innerHTML = '';

    if (applications.length === 0) {
      drawerContent.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">Aucun candidat n\'a encore postulé à cette offre.</p>';
      return;
    }

    applications.forEach(app => {
      const c = app.candidat;
      const card = document.createElement('div');
      card.className = 'applicant-card';

      // Badge CNI
      const cniBadgeHtml = c.cniStatus === 'Verified' 
        ? '<span class="cni-badge verified">CNI Vérifié</span>' 
        : '<span class="cni-badge not-submitted">Non Vérifié</span>';

      // Boutons selon l'état actuel de la candidature
      let actionButtons = '';
      if (app.statut === 'En attente') {
        actionButtons = `
          <div class="actions">
            <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="updateStatus('${app._id}', 'Accepté', '${jobId}', '${jobTitle.replace(/'/g, "\\'")}')">
              Accepter
            </button>
            <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="updateStatus('${app._id}', 'Refusé', '${jobId}', '${jobTitle.replace(/'/g, "\\'")}')">
              Refuser
            </button>
          </div>
        `;
      } else if (app.statut === 'Accepté') {
        actionButtons = `
          <div class="actions" style="align-items: center; justify-content: space-between;">
            <span style="color: var(--primary); font-weight: 700; font-size: 0.85rem;display:inline-flex;align-items:center;gap:4px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Candidature Acceptée</span>
            <button class="btn btn-primary animate-pulse" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: var(--secondary); color: #000;display:inline-flex;align-items:center;gap:4px" onclick="startChat('${c._id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Discuter
            </button>
          </div>
        `;
      } else {
        actionButtons = `<span style="color: var(--danger); font-weight: 700; font-size: 0.85rem;display:inline-flex;align-items:center;gap:4px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Candidature Refusée</span>`;
      }

      card.innerHTML = `
        <div class="header">
          <span style="font-weight: 700; font-size: 1.05rem;">${c.prenom} ${c.nom}</span>
          ${cniBadgeHtml}
        </div>
        <div style="font-size: 0.85rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 2px;">
          <span style="display:inline-flex;align-items:center;gap:4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> Tél : ${c.telephone}</span>
          <span style="display:inline-flex;align-items:center;gap:4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> Email : ${c.email}</span>
          <span style="display:inline-flex;align-items:center;gap:4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> Localisation : ${c.geoloc.quartier}, ${c.geoloc.ville}</span>
        </div>
        <p class="motivation">${app.motivation}</p>
        ${actionButtons}
      `;

      drawerContent.appendChild(card);
    });
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Fermer le tiroir latéral
function closeDrawer() {
  document.getElementById('applicants-drawer').classList.remove('active');
}

// Mettre à jour le statut (Accepter ou Refuser)
async function updateStatus(appId, newStatus, jobId, jobTitle) {
  try {
    await apiCall(`/applications/${appId}`, {
      method: 'PUT',
      body: JSON.stringify({ statut: newStatus })
    });
    
    showToast(`Candidature mise à jour : ${newStatus}`, 'success');
    
    // Recharger le tiroir
    openApplicantsDrawer(jobId, jobTitle);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Démarrer la discussion
function startChat(userId) {
  // Rediriger vers la page de messagerie en passant l'ID du destinataire en paramètre
  window.location.href = `/chat.html?contact=${userId}`;
}

// --- LOGIQUE CANDIDAT : CHARGER SES CANDIDATURES SOUMISES ---
async function loadMySubmissions() {
  try {
    const tbody = document.getElementById('my-submissions-tbody');
    const msg = document.getElementById('no-submissions-msg');

    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Chargement de vos candidatures...</td></tr>';
    msg.style.display = 'none';

    const data = await apiCall('/applications/my/submissions', { method: 'GET' });
    mySubmissions = data.submissions;

    tbody.innerHTML = '';

    if (mySubmissions.length === 0) {
      msg.style.display = 'block';
      return;
    }

    mySubmissions.forEach(app => {
      const tr = document.createElement('tr');
      const rec = app.job.auteur;
      
      let actionBtn = '-';
      if (app.statut === 'Accepté') {
        actionBtn = `
          <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: var(--secondary); color: #000;display:inline-flex;align-items:center;gap:4px" onclick="startChat('${rec._id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Discuter
          </button>
        `;
      }

      let statusClass = 'pending';
      if (app.statut === 'Accepté') statusClass = 'accepted';
      if (app.statut === 'Refusé') statusClass = 'rejected';

      tr.innerHTML = `
        <td style="font-weight: 600;">${app.job.titre}</td>
        <td>${rec.prenom} ${rec.nom}</td>
        <td>${rec.telephone}</td>
        <td><span class="status-pill ${statusClass}">${app.statut}</span></td>
        <td>${actionBtn}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// --- LOGIQUE COMMUNE : CHARGER LES MISSIONS & EMPLOIS EN COURS ---
async function loadOngoingJobs() {
  const user = getUser();
  const tbody = document.getElementById('ongoing-tbody');
  const theadRow = document.getElementById('ongoing-thead-row');
  const msg = document.getElementById('no-ongoing-msg');
  
  if (!tbody || !theadRow || !msg) return;
  
  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Chargement des missions en cours...</td></tr>';
  msg.style.display = 'none';
  
  try {
    if (user.type === 'Candidat') {
      // Pour le candidat
      theadRow.innerHTML = `
        <th>Mission</th>
        <th>Recruteur</th>
        <th>Contact</th>
        <th>Budget</th>
        <th>Actions</th>
      `;
      
      const data = await apiCall('/applications/my/submissions', { method: 'GET' });
      const acceptedApps = data.submissions.filter(app => app.statut === 'Accepté');
      
      tbody.innerHTML = '';
      if (acceptedApps.length === 0) {
        msg.style.display = 'block';
        return;
      }
      
      acceptedApps.forEach(app => {
        const tr = document.createElement('tr');
        const job = app.job;
        const rec = job.auteur;
        const formattedBudget = new Intl.NumberFormat('fr-FR').format(job.budget) + ' XAF';
        
        tr.innerHTML = `
          <td style="font-weight: 600;">
            ${job.titre}
            <div style="font-size: 0.75rem; color: var(--primary); font-weight: normal; margin-top: 2px;">${job.domaine}</div>
          </td>
          <td>${rec.prenom} ${rec.nom}</td>
          <td>
            <div style="font-size: 0.85rem;display:flex;align-items:center;gap:4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> ${rec.telephone}</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);display:flex;align-items:center;gap:4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> ${rec.email}</div>
          </td>
          <td style="font-weight: 700; color: var(--primary);">${formattedBudget}</td>
          <td>
            <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: var(--secondary); color: #000;display:inline-flex;align-items:center;gap:4px" onclick="startChat('${rec._id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Discuter
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      // Pour le recruteur
      theadRow.innerHTML = `
        <th>Mission</th>
        <th>Prestataire Habilité</th>
        <th>Contact</th>
        <th>Budget</th>
        <th>Actions</th>
      `;
      
      const data = await apiCall('/jobs/my/offers', { method: 'GET' });
      const ongoingJobs = data.jobs.filter(job => job.statut === 'En cours');
      
      tbody.innerHTML = '';
      if (ongoingJobs.length === 0) {
        msg.style.display = 'block';
        return;
      }
      
      // Pour chaque job en cours, charger les candidats pour trouver celui qui est accepté
      for (const job of ongoingJobs) {
        let candidateName = 'Recherche...';
        let candidateContact = 'Chargement...';
        let candidateId = '';
        
        try {
          const appData = await apiCall(`/applications/job/${job._id}`, { method: 'GET' });
          const acceptedApp = appData.applications.find(app => app.statut === 'Accepté');
          
          if (acceptedApp) {
            const cand = acceptedApp.candidat;
            candidateId = cand._id;
            candidateName = `${cand.prenom} ${cand.nom}`;
            candidateContact = `
              <div style="font-size: 0.85rem;display:flex;align-items:center;gap:4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> ${cand.telephone}</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary);display:flex;align-items:center;gap:4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> ${cand.email}</div>
            `;
          } else {
            candidateName = 'Aucun (Erreur)';
            candidateContact = 'N/A';
          }
        } catch (err) {
          candidateName = 'Erreur de chargement';
          candidateContact = 'N/A';
        }
        
        const tr = document.createElement('tr');
        const formattedBudget = new Intl.NumberFormat('fr-FR').format(job.budget) + ' XAF';
        
        // Actions: chat avec le prestataire + marquer comme terminé (Clôturé)
        let actionButtons = '-';
        if (candidateId) {
          actionButtons = `
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: var(--secondary); color: #000;display:inline-flex;align-items:center;gap:4px" onclick="startChat('${candidateId}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Discuter
              </button>
              <button class="btn btn-danger" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;display:inline-flex;align-items:center;gap:4px" onclick="closeJob('${job._id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Terminer
              </button>
            </div>
          `;
        }
        
        tr.innerHTML = `
          <td style="font-weight: 600;">
            ${job.titre}
            <div style="font-size: 0.75rem; color: var(--primary); font-weight: normal; margin-top: 2px;">${job.domaine}</div>
          </td>
          <td>
            <span style="font-weight: 600;">${candidateName}</span>
            <div style="margin-top: 2px;"><span class="cni-badge verified" style="font-size: 0.65rem; padding: 0.1rem 0.4rem;">CNI OK</span></div>
          </td>
          <td>${candidateContact}</td>
          <td style="font-weight: 700; color: var(--primary);">${formattedBudget}</td>
          <td>${actionButtons}</td>
        `;
        tbody.appendChild(tr);
      }
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Clôturer une mission
async function closeJob(jobId) {
  if (!confirm('Voulez-vous vraiment marquer cette mission comme terminée et clôturée ?')) {
    return;
  }
  
  try {
    await apiCall(`/jobs/${jobId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ statut: 'Clôturé' })
    });
    
    showToast('La mission a été clôturée avec succès !', 'success');
    loadOngoingJobs();
  } catch (error) {
    showToast(error.message, 'error');
  }
}
