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
- Scenario comparison chart (A/B/C return assumptions)
- Monte Carlo preview:
  - simulation count + volatility + tax drag controls
  - P10 / P50 / P90 confidence outcomes
- Scenario profile save/load (local, Pro-gated)
- PDF export: "Wealth Projection Report" (Pro-gated)
- True scenario A/B/C independent input sets (return, savings rate, raise %, raise-invested %)
- FI countdown widget output
- Tax model selector with tax-drag sync
- In-app Pro mode gate UI for advanced modules
- Profile management actions: rename/delete selected profile
- Enhanced multi-section PDF report formatting
- FI milestone marker text + vertical chart marker
- Scenario summary cards on dashboard
- CSV export for disciplined vs drift trajectory series

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
