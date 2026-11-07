/**
 * PushkarPath Global Application Configuration & Runtime Demo State
 */

let sampleOccupancy = process.env.DEMO_MODE !== 'false';

module.exports = {
  isDemoMode: () => process.env.DEMO_MODE === 'true',
  getSampleOccupancy: () => sampleOccupancy,
  setSampleOccupancy: (val) => {
    sampleOccupancy = Boolean(val);
    return sampleOccupancy;
  }
};

