// App shell — Emergency Operations Center / Mission Control layout.
// Map band ≈60% · operations column ≈40% · analytics + timeline full width.

import { SimBar } from '@/features/chrono/SimBar';
import { MapView } from '@/features/map/MapView';
import { TimelineZone } from '@/features/chrono/TimelineZone';
import { AnalyticsBar } from '@/features/analytics/AnalyticsBar';
import { OpsColumn } from '@/features/ops/OpsColumn';
import { CitizenPortal } from '@/features/citizen/CitizenPortal';

export default function App() {
  return (
    <div className="app">
      <SimBar />
      <div className="layout">
        <div className="map-col">
          <MapView />
          <CitizenPortal />
        </div>
        <OpsColumn />
      </div>
      <AnalyticsBar />
      <TimelineZone />
    </div>
  );
}