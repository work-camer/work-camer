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
        🚀 Emplois en cours
      </li>
      <li class="sidebar-item" id="menu-submissions" onclick="switchTab('submissions')">
        💼 Mes candidatures
      </li>
    `;
    switchTab('ongoing');
  } else {
    // Recruteur ou Particulier
    menuContainer.innerHTML = `
      <li class="sidebar-item" id="menu-ongoing" onclick="switchTab('ongoing')">
        🚀 Missions en cours
      </li>
      <li class="sidebar-item" id="menu-my-offers" onclick="switchTab('my-offers')">
        📋 Mes offres publiées
      </li>
      <li class="sidebar-item" id="menu-publish" onclick="switchTab('publish')">
        ➕ Publier une offre
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
          <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="openApplicantsDrawer('${job._id}', '${job.titre.replace(/'/g, "\\'")}')">
            👥 Voir les postulants
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
            <span style="color: var(--primary); font-weight: 700; font-size: 0.85rem;">✅ Candidature Acceptée</span>
            <button class="btn btn-primary animate-pulse" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: var(--secondary); color: #000;" onclick="startChat('${c._id}')">
              💬 Discuter
            </button>
          </div>
        `;
      } else {
        actionButtons = `<span style="color: var(--danger); font-weight: 700; font-size: 0.85rem;">❌ Candidature Refusée</span>`;
      }

      card.innerHTML = `
        <div class="header">
          <span style="font-weight: 700; font-size: 1.05rem;">${c.prenom} ${c.nom}</span>
          ${cniBadgeHtml}
        </div>
        <div style="font-size: 0.85rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 2px;">
          <span>📞 Tél : ${c.telephone}</span>
          <span>📧 Email : ${c.email}</span>
          <span>📍 Localisation : ${c.geoloc.quartier}, ${c.geoloc.ville}</span>
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
          <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: var(--secondary); color: #000;" onclick="startChat('${rec._id}')">
            💬 Discuter
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
            <div style="font-size: 0.85rem;">📞 ${rec.telephone}</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">📧 ${rec.email}</div>
          </td>
          <td style="font-weight: 700; color: var(--primary);">${formattedBudget}</td>
          <td>
            <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: var(--secondary); color: #000;" onclick="startChat('${rec._id}')">
              💬 Discuter
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
              <div style="font-size: 0.85rem;">📞 ${cand.telephone}</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary);">📧 ${cand.email}</div>
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
              <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: var(--secondary); color: #000;" onclick="startChat('${candidateId}')">
                💬 Discuter
              </button>
              <button class="btn btn-danger" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="closeJob('${job._id}')">
                ✅ Terminer
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
