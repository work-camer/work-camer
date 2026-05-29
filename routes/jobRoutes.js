const express = require('express');
const router = express.Router();
const { createJob, getJobs, getJobById, getMyOffers, updateJobStatus } = require('../controllers/jobController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', getJobs);
router.post('/', protect, createJob);
router.get('/my/offers', protect, getMyOffers);
router.put('/:id/status', protect, updateJobStatus);
router.get('/:id', getJobById);

module.exports = router;
