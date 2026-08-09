// Right operations column — agent collaboration feed, Chief AI, mission control.
// Three always-visible sections in the 40% band beside the digital twin map.

import { AgentFeed } from '@/features/feed/AgentFeed';
import { ChiefPanel } from '@/features/chief/ChiefPanel';
import { MissionPanel } from '@/features/mission/MissionPanel';
import { HazardOverview } from '@/features/hazard/HazardOverview';

export function OpsColumn() {
  return (
    <div className="ops-col">
      <section className="ops-card ops-hazard">
        <div className="ops-head amber">
          <span className="ops-dot" />
          SCENARIO OVERVIEW
          <span className="ops-sub">active hazard · playbook</span>
        </div>
        <div className="ops-scroll">
          <HazardOverview />
        </div>
      </section>

      <section className="ops-card ops-feed">
        <div className="ops-head">
          <span className="ops-dot" />
          AGENT COLLABORATION
          <span className="ops-sub">multi-agent intelligence bus</span>
        </div>
        <div className="ops-scroll">
          <AgentFeed compact />
        </div>
      </section>

      <section className="ops-card ops-chief">
        <div className="ops-head amber">
          <span className="ops-dot" />
          CHIEF AI
          <span className="ops-sub">decision support · commander</span>
        </div>
        <div className="ops-scroll">
          <ChiefPanel compact />
        </div>
      </section>

      <section className="ops-card ops-mission">
        <div className="ops-head">
          <span className="ops-dot green" />
          MISSION CONTROL
          <span className="ops-sub">SOS · resources · hospitals · shelters</span>
        </div>
        <div className="ops-scroll">
          <MissionPanel />
        </div>
      </section>
    </div>
  );
}