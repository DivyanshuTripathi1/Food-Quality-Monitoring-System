require('dotenv').config();
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const dashboardRoutes = require('./routes/dashboardRoutes');
const apiRoutes = require('./routes/apiRoutes');
const { startMockEsp32 } = require('./services/mockEsp32Service');

const app = express();
const PORT = process.env.PORT || 8080;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'));

app.use('/', dashboardRoutes);
app.use('/api', apiRoutes);

app.use((req, res) => res.status(404).render('pages/404', {
  title: 'Page Not Found',
  active: '',
  device: require('./models/deviceModel').get(),
  foods: require('./models/foodModel').getAll()
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`\nFoodGuard running at http://localhost:${PORT}`);
  console.log(`ESP32 API: POST http://localhost:${PORT}/api/sensor-data`);
  console.log(`Mock ESP32: ${process.env.MOCK_ESP32 !== 'false' ? 'ON' : 'OFF'}\n`);
});

if (process.env.MOCK_ESP32 !== 'false') startMockEsp32();
