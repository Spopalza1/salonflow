# Component Boundaries

Route files and legacy imports remain stable through compatibility facades. Feature implementations now live under `src/features`. Presentational components receive data and callbacks; feature hooks own orchestration; repositories own transport details.
