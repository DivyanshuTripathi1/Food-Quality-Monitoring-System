const router = require('express').Router();
const c = require('../controllers/apiController');

router.get('/status', c.status);
router.get('/history', c.history);
router.get('/history/export-csv', c.exportCSV);
router.get('/device', c.device);
router.post('/device/ping', c.devicePing);

router.get('/foods', c.foods);
router.post('/foods', c.addFood);
router.put('/foods/:key', c.updateFood);
router.delete('/foods/:key', c.deleteFood);

router.post('/sensor-data', c.sensorData);
router.post('/demo/food', c.setFood);
router.post('/simulate/reading', c.simulateReading);
router.post('/simulate/anomaly', c.simulateAnomaly);

router.get('/settings', c.getSettings);
router.post('/settings', c.updateSettings);

router.get('/analytics', c.analytics);
router.get('/readings/:id', c.getReading);
router.delete('/readings/:id', c.deleteReading);
router.post('/readings/clear', c.clearReadings);
router.post('/readings/seed', c.seedReadings);
router.post('/camera/analyze', c.cameraAnalyze);

module.exports = router;
