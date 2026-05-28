const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  expediteur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  destinataire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  texte: {
    type: String,
    required: [true, 'Le contenu du message ne peut pas être vide'],
    trim: true
  }
}, {
  timestamps: true
});

// Indexer pour optimiser les requêtes de chargement d'historique entre deux utilisateurs
messageSchema.index({ expediteur: 1, destinataire: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
