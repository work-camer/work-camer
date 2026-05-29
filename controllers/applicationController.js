const Application = require('../models/Application');
const Job = require('../models/Job');

// @desc    Postuler à une offre d'emploi
// @route   POST /api/applications
// @access  Private (Vérifié uniquement)
exports.applyJob = async (req, res) => {
  try {
    // Vérifier si l'utilisateur a validé sa CNI
    if (req.user.cniStatus !== 'Verified') {
      return res.status(403).json({
        success: false,
        message: 'Vous devez faire vérifier votre CNI avant de postuler à une offre.'
      });
    }

    const { jobId, motivation } = req.body;

    // Vérifier si le job existe
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Offre d\'emploi introuvable' });
    }

    // Vérifier si le candidat est l'auteur de l'offre
    if (job.auteur.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas postuler à votre propre offre' });
    }

    // Vérifier si déjà postulé
    const alreadyApplied = await Application.findOne({ job: jobId, candidat: req.user._id });
    if (alreadyApplied) {
      return res.status(400).json({ success: false, message: 'Vous avez déjà postulé à cette offre' });
    }

    // Créer la candidature
    const application = await Application.create({
      job: jobId,
      candidat: req.user._id,
      motivation
    });

    res.status(201).json({
      success: true,
      message: 'Votre candidature a été envoyée avec succès',
      application
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Obtenir toutes les candidatures d'une offre d'emploi spécifique (Pour le Recruteur/Auteur)
// @route   GET /api/applications/job/:jobId
// @access  Private
exports.getJobApplications = async (req, res) => {
  try {
    const jobId = req.params.jobId;

    // Vérifier si l'utilisateur est bien l'auteur du job
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Offre d\'emploi introuvable' });
    }

    if (job.auteur.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Non autorisé à voir ces candidatures' });
    }

    // Récupérer les candidatures et peupler les détails du candidat (avec son statut CNI)
    const applications = await Application.find({ job: jobId })
      .populate('candidat', 'nom prenom email telephone cniStatus geoloc biometrics')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mettre à jour le statut d'une candidature (Accepter / Refuser)
// @route   PUT /api/applications/:id
// @access  Private
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { statut } = req.body; // 'Accepté' ou 'Refusé'
    
    if (!['Accepté', 'Refusé'].includes(statut)) {
      return res.status(400).json({ success: false, message: 'Statut invalide' });
    }

    const application = await Application.findById(req.params.id).populate('job');
    if (!application) {
      return res.status(404).json({ success: false, message: 'Candidature introuvable' });
    }

    // Vérifier si l'utilisateur est le propriétaire du Job correspondant
    if (application.job.auteur.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Non autorisé à modifier cette candidature' });
    }

    // Modifier le statut
    application.statut = statut;
    await application.save();

    // Si accepté, marquer automatiquement l'offre comme "En cours"
    if (statut === 'Accepté') {
      await Job.findByIdAndUpdate(application.job._id, { statut: 'En cours' });
    }

    res.status(200).json({
      success: true,
      message: `Candidature ${statut.toLowerCase()} avec succès`,
      application
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Obtenir les candidatures envoyées par l'utilisateur connecté (Candidat)
// @route   GET /api/applications/my/submissions
// @access  Private
exports.getMySubmissions = async (req, res) => {
  try {
    const submissions = await Application.find({ candidat: req.user._id })
      .populate({
        path: 'job',
        populate: {
          path: 'auteur',
          select: 'nom prenom email telephone cniStatus'
        }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: submissions.length,
      submissions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
