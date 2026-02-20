# Project-App-Finance (App 2)

Initial WealthArc prototype build.

## WealthArc
**Tagline:** _See how your decisions shift your freedom date._

A FIRE-focused financial trajectory visualizer for professionals 20–40.

## Current MVP Implemented
- Dark-mode premium dashboard UI
- Interactive trajectory graph (Disciplined vs Lifestyle Drift)
- Opportunity-cost shaded gap visualization
- Time horizon switcher (5/10/20/30 years)
- Raise Impact simulation inputs
- FI Calculator outputs:
  - FI target net worth
  - Estimated FI age
  - Years remaining
- Lifestyle Creep Analyzer outputs:
  - Monthly creep
  - Annual opportunity cost
  - 10-year compounded loss

## Files
- `index.html` — app layout/screen composition
- `styles.css` — premium dark visual system
- `app.js` — simulation logic + chart rendering

## Run Locally
Open `index.html` directly, or run a local static server:

```bash
python -m http.server 4173
```
Then open `http://localhost:4173`

## Next Build Items
- Monte Carlo simulation + confidence bands
- Scenario comparison (A/B/C)
- Tax-adjusted raise modeling
- PDF export report
- FI countdown widget
