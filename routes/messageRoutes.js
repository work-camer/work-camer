const express = require('express');
const router = express.Router();
const { getConversationHistory, getActiveChats } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.get('/active/chats', protect, getActiveChats);
router.get('/:userId', protect, getConversationHistory);

module.exports = router;
