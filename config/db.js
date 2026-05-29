const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/work-camer');
    console.log(`MongoDB Connecté : ${conn.connection.host}`);
  } catch (error) {
    console.error(`⚠️ Erreur de connexion MongoDB : ${error.message}`);
    console.log("Le serveur continue de tourner en mode dégradé (sans DB). Veuillez démarrer MongoDB sur le port 27017.");
  }
};

module.exports = connectDB;
