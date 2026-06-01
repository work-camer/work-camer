const Application = require('../models/Application');
const Job = require('../models/Job');
const Message = require('../models/Message');

exports.getStats = async (req, res) => {
  try {
    const userId = req.user._id;
    let candidatures = 0;
    let notificationsArray = [];

    if (req.user.type === 'Recruteur' || req.user.type === 'Particulier') {
      // Recruteur: nombre de candidatures sur ses offres (En attente)
      const jobs = await Job.find({ auteur: userId });
      const jobIds = jobs.map(j => j._id);
      candidatures = await Application.countDocuments({ job: { $in: jobIds }, statut: 'En attente' });

      // Notifications: les dernières candidatures reçues
      const recentApps = await Application.find({ job: { $in: jobIds } })
        .populate('candidat', 'prenom nom')
        .populate('job', 'titre')
        .sort({ createdAt: -1 })
        .limit(5);

      notificationsArray = recentApps.map(app => {
        return {
          id: app._id,
          text: `Nouvelle candidature de ${app.candidat ? app.candidat.prenom : 'Un candidat'} pour ${app.job ? app.job.titre : 'une offre'}`,
          date: app.createdAt
        };
      });

    } else {
      // Candidat: candidatures actives
      candidatures = await Application.countDocuments({ candidat: userId, statut: 'En attente' });

      // Notifications: les statuts des dernières candidatures
      const recentApps = await Application.find({ candidat: userId })
        .populate('job', 'titre')
        .sort({ createdAt: -1 })
        .limit(5);

      notificationsArray = recentApps.map(app => {
        if (app.statut === 'En attente') {
          return { id: app._id, text: `Vous avez postulé à ${app.job ? app.job.titre : 'une offre'}. En attente de réponse.`, date: app.createdAt };
        } else {
          return { id: app._id, text: `Votre candidature pour ${app.job ? app.job.titre : 'une offre'} a été ${app.statut.toLowerCase()}.`, date: app.updatedAt };
        }
      });
    }

    // Discussions: count distinct contacts from messages
    const sent = await Message.distinct('destinataire', { expediteur: userId });
    const received = await Message.distinct('expediteur', { destinataire: userId });
    const uniqueContacts = new Set([...sent.map(id => id.toString()), ...received.map(id => id.toString())]);
    const discussions = uniqueContacts.size;

    // Notifications count
    const notifications = notificationsArray.length;

    res.status(200).json({
      success: true,
      candidatures,
      discussions,
      notifications,
      notificationsList: notificationsArray
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
