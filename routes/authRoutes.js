const express = require('express');
const router = express.Router();
const { register, login, verifyCNI, getMe, getUserProfile, updateProfile, deleteAccount } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-cni', protect, verifyCNI);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.delete('/account', protect, deleteAccount);
router.get('/profile/:userId', protect, getUserProfile);

module.exports = router;

