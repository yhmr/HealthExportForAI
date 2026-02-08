export default {
  Constants: {
    Permissions: {
      Steps: 'Steps',
      HeartRate: 'HeartRate',
      Weight: 'Weight',
      BodyMassIndex: 'BodyMassIndex',
      BodyFatPercentage: 'BodyFatPercentage',
      ActiveEnergyBurned: 'ActiveEnergyBurned',
      BasalEnergyBurned: 'BasalEnergyBurned',
      SleepAnalysis: 'SleepAnalysis',
      AppleExerciseTime: 'AppleExerciseTime',
      Workout: 'Workout',
      EnergyConsumed: 'EnergyConsumed',
      Protein: 'Protein',
      FatTotal: 'FatTotal',
      Carbohydrates: 'Carbohydrates',
      Fiber: 'Fiber',
      FatSaturated: 'FatSaturated',
      DietaryEnergyConsumed: 'DietaryEnergyConsumed',
      DietaryProtein: 'DietaryProtein',
      DietaryCarbohydrates: 'DietaryCarbohydrates',
      DietaryFatTotal: 'DietaryFatTotal',
      Water: 'Water'
    },
    Observers: {}
  },
  isAvailable: (callback) => {
    callback(null, true);
  },
  initHealthKit: (options, callback) => {
    callback(null);
  },
  getDailyStepCountSamples: (options, callback) => {
    callback(null, []);
  },
  getWeightSamples: (options, callback) => {
    callback(null, []);
  },
  getBodyFatPercentageSamples: (options, callback) => {
    callback(null, []);
  },
  getActiveEnergyBurned: (options, callback) => {
    callback(null, []);
  },
  getBasalEnergyBurned: (options, callback) => {
    callback(null, []);
  },
  getActiveEnergyBurnedSamples: (options, callback) => {
    callback(null, []);
  },
  getBasalEnergyBurnedSamples: (options, callback) => {
    callback(null, []);
  },
  getSleepSamples: (options, callback) => {
    callback(null, []);
  },
  getSamples: (options, callback) => {
    callback(null, []);
  },
  getEnergyConsumedSamples: (options, callback) => {
    callback(null, []);
  },
  getProteinSamples: (options, callback) => {
    callback(null, []);
  },
  getFiberSamples: (options, callback) => {
    callback(null, []);
  },
  getTotalFatSamples: (options, callback) => {
    callback(null, []);
  },
  getCarbohydratesSamples: (options, callback) => {
    callback(null, []);
  }
};
