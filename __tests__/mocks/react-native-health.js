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
  }
};
