const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');

// Charge les variables d'environnement
dotenv.config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const Message = require('./models/Message');
const User = require('./models/User');

// Connexion à la base de données
connectDB();

const app = express();
const server = http.createServer(app);

// Configuration de Socket.io avec authentification JWT
const io = socketio(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware Express
app.use(express.json({ limit: '10mb' })); // Supporte les envois de photos base64
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir les fichiers statiques du front-end
app.use(express.static(path.join(__dirname, 'public')));

// Enregistrer les routes API
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/messages', messageRoutes);

// Rediriger toutes les autres requêtes vers la page d'accueil
app.get('{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io Middleware pour l'authentification
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;

  if (!token) {
    return next(new Error('Erreur d\'authentification : Token manquant'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_work_camer_123');
    socket.userId = decoded.id;
    next();
  } catch (err) {
    return next(new Error('Erreur d\'authentification : Token invalide ou expiré'));
  }
});

// Gestion des connexions Socket.io en temps réel
io.on('connection', async (socket) => {
  console.log(`Nouvelle connexion temps réel initiée pour l'utilisateur : ${socket.userId}`);

  // Mettre l'utilisateur dans son propre salon nommé par son ID
  // Cela permet de lui envoyer des messages de n'importe où
  socket.join(socket.userId);

  // Mettre à jour le statut en ligne (optionnel)
  try {
    const user = await User.findById(socket.userId);
    if (user) {
      console.log(`L'utilisateur ${user.prenom} ${user.nom} est en ligne`);
    }
  } catch (err) {
    console.error(err);
  }

  // Écouter l'envoi d'un message
  socket.on('send_message', async (data) => {
    try {
      const { destinataire, texte } = data;

      if (!destinataire || !texte || texte.trim() === '') {
        return;
      }

      // Enregistrer le message en base de données
      const nouveauMessage = await Message.create({
        expediteur: socket.userId,
        destinataire,
        texte: texte.trim()
      });

      // Envoyer le message au destinataire
      io.to(destinataire).emit('receive_message', nouveauMessage);

      // Renvoyer également le message à l'expéditeur pour confirmation en direct
      io.to(socket.userId).emit('receive_message', nouveauMessage);

      console.log(`Message envoyé de ${socket.userId} à ${destinataire}`);
    } catch (err) {
      console.error('Erreur lors de l\'envoi du message via Socket :', err.message);
    }
  });

  // Gérer l'événement "en train d'écrire"
  socket.on('typing', (data) => {
    const { destinataire } = data;
    socket.to(destinataire).emit('user_typing', { expediteur: socket.userId });
  });

  // Déconnexion
  socket.on('disconnect', () => {
    console.log(`Utilisateur déconnecté du chat : ${socket.userId}`);
  });
});

// Port d'écoute
const PORT = process.env.PORT || 5100;
server.listen(PORT, () => {
  console.log(`Serveur démarré en mode production sur le port ${PORT}`);
});
