const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Générer un Token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret_work_camer_123', {
    expiresIn: '30d'
  });
};

// @desc    Enregistrer un nouvel utilisateur
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { nom, prenom, email, telephone, password, type, ville, quartier, latitude, longitude } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Un utilisateur existe déjà avec cet email' });
    }

    // Coordonnées GPS par défaut (si non fournies, exemple Yaoundé Centre : 3.848, 11.502)
    const lat = latitude ? parseFloat(latitude) : 3.8480;
    const lng = longitude ? parseFloat(longitude) : 11.5021;

    // Création de l'utilisateur
    const user = await User.create({
      nom,
      prenom,
      email,
      telephone,
      password,
      type,
      geoloc: {
        ville: ville || 'Yaoundé',
        quartier: quartier || 'Mvan',
        latitude: lat,
        longitude: lng
      }
    });

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
        type: user.type,
        cniStatus: user.cniStatus,
        geoloc: user.geoloc
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authentifier un utilisateur & obtenir un token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérifier si l'email et le mot de passe sont fournis
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Veuillez fournir un email et un mot de passe' });
    }

    // Récupérer l'utilisateur avec son mot de passe
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Identifiants invalides' });
    }

    // Vérifier le mot de passe
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Identifiants invalides' });
    }

    res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
        type: user.type,
        cniStatus: user.cniStatus,
        geoloc: user.geoloc
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Simuler la vérification biométrique et OCR de la CNI
// @route   POST /api/auth/verify-cni
// @access  Private
exports.verifyCNI = async (req, res) => {
  try {
    const { cniPhoto, selfiePhoto } = req.body;

    if (!cniPhoto || !selfiePhoto) {
      return res.status(400).json({
        success: false,
        message: 'La photo de la CNI et le selfie sont obligatoires pour la vérification'
      });
    }

    // Mettre le statut en cours (Pending)
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    user.cniStatus = 'Pending';
    await user.save();

    // Lancement de la logique de simulation biométrique (OCR + Comparaison Faciale)
    // Nous simulons un délai de traitement de 2 secondes au niveau du client ou du serveur.
    // Ici, nous faisons l'analyse immédiatement et renvoyons le résultat simulé.

    // 1. Simulation de l'OCR de la CNI Camerounaise
    const simulatedCniNumber = 'CNI-CMR-' + Math.floor(100000000 + Math.random() * 900000000);
    const ocrSuccess = true; // simulation toujours positive si les images sont envoyées

    // 2. Simulation de la comparaison faciale
    // Génère un score entre 92% et 99%
    const simulatedFaceMatchScore = parseFloat((92 + Math.random() * 7).toFixed(2));

    // Simulation de l'extraction des données
    const extractedData = {
      nationality: 'CAMEROUNAISE',
      cniNumber: simulatedCniNumber,
      nomExtrait: user.nom.toUpperCase(),
      prenomExtrait: user.prenom.toUpperCase(),
      faceMatchScore: simulatedFaceMatchScore
    };

    // Mise à jour de l'utilisateur en base de données
    user.cniStatus = 'Verified';
    user.biometrics = {
      cniNumber: simulatedCniNumber,
      cniPhoto: cniPhoto.substring(0, 100) + '...', // On sauvegarde une version tronquée pour éviter de saturer MongoDB en démo
      selfiePhoto: selfiePhoto.substring(0, 100) + '...',
      faceMatchScore: simulatedFaceMatchScore,
      verifiedAt: new Date(),
      rejectionReason: null
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Vérification biométrique réussie à 100%',
      cniStatus: 'Verified',
      extractedData
    });
  } catch (error) {
    // En cas d'erreur, restaurer le statut
    if (req.user) {
      try {
        const user = await User.findById(req.user._id);
        if (user) {
          user.cniStatus = 'Rejected';
          user.biometrics.rejectionReason = error.message;
          await user.save();
        }
      } catch (innerErr) {}
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Obtenir le profil de l'utilisateur connecté
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Obtenir le profil d'un autre utilisateur (pour le chat)
// @route   GET /api/auth/profile/:userId
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const profile = await User.findById(req.params.userId).select('nom prenom email telephone type cniStatus geoloc');
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    res.status(200).json({
      success: true,
      profile
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

