const foodModel = require('../models/foodModel');

module.exports = {
  get FOOD_PROFILES() {
    return foodModel.getMap();
  }
};
