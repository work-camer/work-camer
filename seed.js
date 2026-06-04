const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/work-camer');
    console.log('MongoDB connecté pour l\'insertion.');

    // Crypter le mot de passe manuellement comme dans le schema/controller si nécessaire,
    // mais le modèle User le fait peut-être dans un middleware "pre('save')" ?
    // Vérifions si un middleware pre-save existe. 
    // Sinon, on le crypte manuellement ou on passe par User.create().
    
    // Nettoyer d'abord si les utilisateurs existent déjà
    await User.deleteMany({ email: { $in: ["paul.recruteur@workcamer.cm", "marie.candidat@email.com"] } });

    // Création du Recruteur
    const recruteur = new User({
      nom: "Kamga",
      prenom: "Paul",
      email: "paul.recruteur@workcamer.cm",
      telephone: "690123456",
      password: "password123",
      type: "Recruteur",
      cniStatus: "Verified",
      biometrics: {
        cniNumber: "CNI-CMR-123456789",
        faceMatchScore: 98.5,
        verifiedAt: new Date()
      },
      geoloc: {
        ville: "Douala",
        quartier: "Bonanjo",
        latitude: 4.0511,
        longitude: 9.7085
      }
    });

    // Création du Candidat
    const candidat = new User({
      nom: "Biloa",
      prenom: "Marie",
      email: "marie.candidat@email.com",
      telephone: "670987654",
      password: "password123",
      type: "Candidat",
      cniStatus: "Verified",
      biometrics: {
        cniNumber: "CNI-CMR-987654321",
        faceMatchScore: 99.2,
        verifiedAt: new Date()
      },
      geoloc: {
        ville: "Yaoundé",
        quartier: "Bastos",
        latitude: 3.8821,
        longitude: 11.5113
      }
    });

    await recruteur.save();
    await candidat.save();

    console.log('✅ Les deux utilisateurs ont été ajoutés avec succès dans la base de données !');
    process.exit();
  } catch (err) {
    console.error('Erreur lors de l\'insertion:', err);
    process.exit(1);
  }
};

seedUsers();
