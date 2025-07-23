const express = require('express');
const {
  uploadPreferences,
  uploadExcel,
  getAssignments,
  getBatchSpecificAssignments,
  uploadAssignments
} = require('../controllers/hodController'); // Reuse HOD logic

const router = express.Router();

router.post('/upload-preferences', uploadPreferences);
router.post('/upload-excel', uploadExcel);
router.get('/assignments', getAssignments);
router.get('/assignments/:courseCode', getBatchSpecificAssignments);
router.post('/assignments', uploadAssignments);

module.exports = router; 