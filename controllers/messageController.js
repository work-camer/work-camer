const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Obtenir l'historique de chat entre deux utilisateurs
// @route   GET /api/messages/:userId
// @access  Private
exports.getConversationHistory = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    // Charger les messages échangés entre les deux parties
    const messages = await Message.find({
      $or: [
        { expediteur: currentUserId, destinataire: targetUserId },
        { expediteur: targetUserId, destinataire: currentUserId }
      ]
    }).sort({ createdAt: 1 }); // Trié par ordre chronologique

    res.status(200).json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Obtenir la liste des discussions actives (contacts de chat)
// @route   GET /api/messages/active/chats
// @access  Private
exports.getActiveChats = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Trouver tous les messages où l'utilisateur est expéditeur ou destinataire
    const messages = await Message.find({
      $or: [
        { expediteur: currentUserId },
        { destinataire: currentUserId }
      ]
    }).sort({ createdAt: -1 });

    // Extraire les identifiants uniques des contacts de chat
    const contactIds = new Set();
    messages.forEach(msg => {
      if (msg.expediteur.toString() !== currentUserId.toString()) {
        contactIds.add(msg.expediteur.toString());
      }
      if (msg.destinataire.toString() !== currentUserId.toString()) {
        contactIds.add(msg.destinataire.toString());
      }
    });

    // Charger les détails des profils de contact
    const contacts = await User.find({ _id: { $in: Array.from(contactIds) } })
      .select('nom prenom email telephone type cniStatus geoloc');

    // Associer le dernier message à chaque contact
    const chatList = contacts.map(contact => {
      const lastMsg = messages.find(
        msg => (msg.expediteur.toString() === contact._id.toString() && msg.destinataire.toString() === currentUserId.toString()) ||
               (msg.expediteur.toString() === currentUserId.toString() && msg.destinataire.toString() === contact._id.toString())
      );
      return {
        contact,
        lastMessage: lastMsg ? {
          texte: lastMsg.texte,
          createdAt: lastMsg.createdAt
        } : null
      };
    });

    // Trier les contacts par date de dernier message (les plus récents en premier)
    chatList.sort((a, b) => {
      const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt) : 0;
      const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt) : 0;
      return dateB - dateA;
    });

    res.status(200).json({
      success: true,
      count: chatList.length,
      chats: chatList
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
