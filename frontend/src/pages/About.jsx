import React from 'react';

function About() {
  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2>Methodology & System Architecture</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
        <section>
          <h3>1. Data Sources</h3>
          <p>
            Data is sourced from five official air quality monitoring stations covering the period 2022-2026.
            The primary pollutant measured is Carbon Monoxide (CO), which has been standardized to <strong>ppm</strong> (parts per million).
          </p>
          <ul>
            <li>Canberra, Australia</li>
            <li>Bangkok, Thailand</li>
            <li>Causeway Bay, Hong Kong SAR</li>
            <li>London, United Kingdom</li>
            <li>Philadelphia, USA</li>
          </ul>
        </section>

        <section>
          <h3>2. Machine Learning Models</h3>
          <p>We utilize two distinct machine learning models for forecasting CO levels depending on the horizon.</p>
          
          <h4>Short-Term: XGBoost</h4>
          <p>
            XGBoost is used for 1-hour, 6-hour, and 24-hour predictions. It uses 19 engineered features including time features, lag variables, and rolling statistics.
          </p>

          <h4>Long-Term: Facebook Prophet</h4>
          <p>
            Prophet handles daily and monthly forecasts. It is highly robust to missing data and shifts in the trend, modeling both yearly and weekly seasonality.
          </p>
        </section>

        <section>
          <h3>3. Design System (AQI Sky Gradient)</h3>
          <p>
            The user interface leverages a unique design system called "AQI Sky Gradient." The header of the application changes its gradient dynamically to reflect the current air quality of the selected city, mimicking the sky's appearance at different pollution levels.
          </p>
        </section>
      </div>
    </div>
  );
}

export default About;
