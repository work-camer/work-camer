const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom est obligatoire']
  },
  prenom: {
    type: String,
    required: [true, 'Le prénom est obligatoire']
  },
  email: {
    type: String,
    required: [true, 'L\'adresse email est obligatoire'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Veuillez entrer un email valide'
    ]
  },
  telephone: {
    type: String,
    required: [true, 'Le numéro de téléphone est obligatoire']
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est obligatoire'],
    minlength: 6,
    select: false // Ne pas retourner le mot de passe par défaut
  },
  type: {
    type: String,
    enum: ['Candidat', 'Recruteur', 'Particulier'],
    required: [true, 'Le type d\'utilisateur est obligatoire']
  },
  // Statut de vérification de la CNI
  cniStatus: {
    type: String,
    enum: ['Not_Submitted', 'Pending', 'Verified', 'Rejected'],
    default: 'Not_Submitted'
  },
  // Données de simulation biométrique & OCR CNI
  biometrics: {
    cniNumber: { type: String, default: null },
    cniPhoto: { type: String, default: null }, // Stockage base64 de l'image CNI
    selfiePhoto: { type: String, default: null }, // Stockage base64 du selfie
    faceMatchScore: { type: Number, default: 0 }, // Score de comparaison faciale (%)
    verifiedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null }
  },
  // Géolocalisation
  geoloc: {
    ville: {
      type: String,
      required: [true, 'La ville est obligatoire']
    },
    quartier: {
      type: String,
      required: [true, 'Le quartier est obligatoire']
    },
    latitude: {
      type: Number,
      required: [true, 'La latitude GPS est obligatoire']
    },
    longitude: {
      type: Number,
      required: [true, 'La longitude GPS est obligatoire']
    }
  }
}, {
  timestamps: true
});

// Méthode pour crypter le mot de passe avant sauvegarde
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Méthode pour vérifier la correspondance du mot de passe
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
