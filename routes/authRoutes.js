const express = require('express');
const router = express.Router();
const { register, login, verifyCNI, getMe, getUserProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-cni', protect, verifyCNI);
router.get('/me', protect, getMe);
router.get('/profile/:userId', protect, getUserProfile);

module.exports = router;

