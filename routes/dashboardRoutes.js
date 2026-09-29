const router = require('express').Router();
const c = require('../controllers/dashboardController');

router.get('/', c.dashboard);
router.get('/live', c.live);
router.get('/history', c.history);
router.get('/analytics', c.analytics);
router.get('/food-types', c.foodTypes);
router.get('/device', c.device);
router.get('/settings', c.settings);
router.get('/about', c.about);
router.get('/reading/:id', c.detail);

module.exports = router;
