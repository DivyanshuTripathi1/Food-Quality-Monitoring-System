const path = require('path');
const fs = require('fs');

const sendSpa = (req, res) => {
  const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
  if (fs.existsSync(distIndex)) {
    return res.sendFile(distIndex);
  }
  return res.sendFile(path.join(__dirname, '..', 'index.html'));
};

exports.dashboard = sendSpa;
exports.live = sendSpa;
exports.history = sendSpa;
exports.analytics = sendSpa;
exports.foodTypes = sendSpa;
exports.device = sendSpa;
exports.settings = sendSpa;
exports.about = sendSpa;
exports.detail = sendSpa;
