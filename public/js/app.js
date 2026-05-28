let jobsData = [];
let selectedJobId = null;

// Charger les offres au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  loadJobs();
});

// Appeler l'API pour récupérer les jobs avec filtres
async function loadJobs(queryString = '') {
  try {
    const listContainer = document.getElementById('job-list');
    const noJobsBox = document.getElementById('no-jobs');
    
    listContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">Chargement des offres...</div>';
    noJobsBox.style.display = 'none';

    const data = await apiCall(`/jobs?${queryString}`, { method: 'GET' });
    jobsData = data.jobs;

    listContainer.innerHTML = '';

    if (jobsData.length === 0) {
      noJobsBox.style.display = 'block';
      return;
    }

    jobsData.forEach(job => {
      const card = document.createElement('div');
      card.className = 'glass-panel job-card';
      card.onclick = () => openJobModal(job._id);

      // Formater le budget
      const formattedBudget = new Intl.NumberFormat('fr-FR').format(job.budget) + ' XAF';

      card.innerHTML = `
        <span class="type-badge">${job.type}</span>
        <div class="budget-tag">${formattedBudget}</div>
        <h3 style="margin-top: 0.5rem;">${job.titre}</h3>
        <p style="font-size: 0.85rem; color: var(--primary); font-weight: 600; margin-bottom: 0.75rem;">${job.domaine}</p>
        <p class="description">${job.description}</p>
        <div class="meta">
          <div class="author">
            👤 <span>${job.auteur.prenom} ${job.auteur.nom[0]}.</span>
          </div>
          <div>📍 ${job.localisation.quartier}, ${job.localisation.ville}</div>
        </div>
      `;

      listContainer.appendChild(card);
    });
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Appliquer les filtres
function applyFilters() {
  const search = document.getElementById('search-keyword').value;
  const ville = document.getElementById('filter-ville').value;
  const quartier = document.getElementById('filter-quartier').value;
  const type = document.getElementById('filter-type').value;
  const domaine = document.getElementById('filter-domaine').value;
  const budgetMin = document.getElementById('filter-budget-min').value;
  const budgetMax = document.getElementById('filter-budget-max').value;

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (ville) params.append('ville', ville);
  if (quartier) params.append('quartier', quartier);
  if (type) params.append('type', type);
  if (domaine) params.append('domaine', domaine);
  if (budgetMin) params.append('budgetMin', budgetMin);
  if (budgetMax) params.append('budgetMax', budgetMax);

  loadJobs(params.toString());
}

// Réinitialiser les filtres
function resetFilters() {
  document.getElementById('filters-form').reset();
  document.getElementById('search-keyword').value = '';
  loadJobs();
}

// Ouvrir la modal de détail de l'offre
function openJobModal(jobId) {
  const job = jobsData.find(j => j._id === jobId);
  if (!job) return;

  selectedJobId = jobId;

  // Formater budget
  const formattedBudget = new Intl.NumberFormat('fr-FR').format(job.budget) + ' XAF';

  document.getElementById('modal-job-type').innerText = job.type;
  document.getElementById('modal-job-title').innerText = job.titre;
  document.getElementById('modal-job-budget').innerText = formattedBudget;
  document.getElementById('modal-job-desc').innerText = job.description;
  document.getElementById('modal-job-domaine').innerText = job.domaine;
  document.getElementById('modal-job-loc').innerText = `${job.localisation.quartier}, ${job.localisation.ville}`;
  document.getElementById('modal-job-author').innerText = `${job.auteur.prenom} ${job.auteur.nom}`;
  
  const cniBadgeHtml = job.auteur.cniStatus === 'Verified' 
    ? '<span class="cni-badge verified">Vérifié</span>' 
    : '<span class="cni-badge not-submitted">Non vérifié</span>';
  document.getElementById('modal-job-author-cni').innerHTML = cniBadgeHtml;

  // Gérer le bloc candidature
  const user = getUser();
  const appBlock = document.getElementById('application-block');

  if (!user) {
    appBlock.innerHTML = `
      <div style="text-align: center; padding: 1rem; border: 1px dashed var(--border-glass); border-radius: var(--radius-md);">
        <p style="color: var(--text-secondary); margin-bottom: 0.75rem;">Vous devez être connecté pour postuler à cette offre.</p>
        <a href="/auth.html" class="btn btn-primary">Se connecter / S'inscrire</a>
      </div>
    `;
  } else if (user._id === job.auteur._id) {
    appBlock.innerHTML = `
      <div style="background: rgba(34, 197, 94, 0.05); color: var(--primary); padding: 1rem; border-radius: var(--radius-md); text-align: center; font-weight: 600;">
        💡 Vous êtes l'auteur de cette offre d'emploi.
      </div>
    `;
  } else if (user.cniStatus !== 'Verified') {
    appBlock.innerHTML = `
      <div style="background: rgba(239, 68, 68, 0.05); color: var(--danger); padding: 1rem; border-radius: var(--radius-md); text-align: center; border: 1px solid rgba(239, 68, 68, 0.15);">
        <p style="margin-bottom: 0.75rem; font-weight: 600;">⚠️ Vérification CNI requise</p>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
          Pour la sécurité du marché, vous devez valider votre identité avant de postuler.
        </p>
        <a href="/auth.html" class="btn btn-danger" style="font-size: 0.85rem;">Faire valider ma CNI</a>
      </div>
    `;
  } else {
    // Connecté + CNI Validé + Pas l'auteur
    appBlock.innerHTML = `
      <form id="apply-form" onsubmit="submitApplication(event)">
        <div class="form-group">
          <label for="motivation-input">Message de motivation (Vos compétences, disponibilités, etc.)</label>
          <textarea id="motivation-input" class="form-control" rows="4" placeholder="Bonjour, je suis disponible immédiatement..." required></textarea>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Envoyer ma candidature</button>
      </form>
    `;
  }

  document.getElementById('job-modal').classList.add('active');
}

// Fermer la modal
function closeJobModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('job-modal').classList.remove('active');
}

// Soumettre une candidature
async function submitApplication(e) {
  e.preventDefault();
  
  const motivation = document.getElementById('motivation-input').value;

  try {
    await apiCall('/applications', {
      method: 'POST',
      body: JSON.stringify({
        jobId: selectedJobId,
        motivation
      })
    });

    showToast('Candidature soumise avec succès !', 'success');
    closeJobModal();
  } catch (error) {
    showToast(error.message, 'error');
  }
}
