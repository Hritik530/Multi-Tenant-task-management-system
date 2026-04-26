const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { authenticate, requireMember } = require('../middleware/auth');
const { tenantIsolation, auditLogAccessControl } = require('../middleware/tenant');

// All audit log routes require authentication
router.use(authenticate);
router.use(tenantIsolation);
router.use(auditLogAccessControl);

// Audit log routes
router.get('/', requireMember, auditLogController.getAuditLogs);
router.get('/task/:taskId', requireMember, auditLogController.getTaskAuditLogs);

module.exports = router;