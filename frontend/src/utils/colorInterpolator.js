/**
 * Returns the CSS linear-gradient string based on the AQI tier.
 */
export function getSkyGradient(tierName) {
  switch (tierName) {
    case 'Good':
      return 'linear-gradient(135deg, #E6F1FB, #378ADD)';
    case 'Moderate':
      return 'linear-gradient(135deg, #378ADD, #1D9E75)';
    case 'Unhealthy Sensitive':
    case 'Unhealthy':
      return 'linear-gradient(135deg, #EF9F27, #BA7517)';
    case 'Hazardous':
    case 'Very Unhealthy':
      return 'linear-gradient(135deg, #993C1D, #4A1B0C)';
    default:
      return 'linear-gradient(135deg, #E6F1FB, #378ADD)';
  }
}
