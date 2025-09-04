const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticate: authenticateToken } = require('../middleware/auth'); // ✅ FIXED: Correct import
const { requirePermission, PERMISSIONS } = require('../middleware/rbac');
const { validateReport, handleValidationErrors } = require('../middleware/validation');
const { param } = require('express-validator');

const router = express.Router();

// Create report
router.post('/',
  authenticateToken,
  validateReport, // Use centralized validation
  reportController.createReport
);

// Get user's own reports
router.get('/my-reports',
  authenticateToken,
  reportController.getMyReports
);

// Get all reports (admin/moderator only)
router.get('/',
  authenticateToken,
  requirePermission(PERMISSIONS.VIEW_REPORTS),
  reportController.getReports
);

// Get specific report (admin/moderator only)
router.get('/:reportId',
  authenticateToken,
  requirePermission(PERMISSIONS.VIEW_REPORTS),
  [
    param('reportId').isUUID().withMessage('Invalid report ID'),
    handleValidationErrors
  ],
  reportController.getReportById
);

// Update report status (admin/moderator only)
router.patch('/:reportId/status',
  authenticateToken,
  requirePermission(PERMISSIONS.RESOLVE_REPORTS),
  [
    param('reportId').isUUID().withMessage('Invalid report ID'),
    handleValidationErrors
  ],
  reportController.updateReportStatus
);

module.exports = router;
