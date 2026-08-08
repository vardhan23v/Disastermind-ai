// Right rail — tabs for collaboration feed, mission control, chief AI, SITREP.

import { useSimulation } from '@/store/simulationStore';
import { AgentFeed } from '@/features/feed/AgentFeed';
import { MissionPanel } from '@/features/mission/MissionPanel';
import { ChiefPanel } from '@/features/chief/ChiefPanel';
import { SitrepPanel } from '@/features/sitrep/SitrepPanel';

const TABS = [
  { id: 'agents', label: 'AGENTS' },
  { id: 'mission', label: 'MISSION' },
  { id: 'chief', label: 'CHIEF AI' },
  { id: 'sitrep', label: 'SITREP' },
] as const;

export function Rail() {
  const tab = useSimulation((s) => s.ui.tab);
  const setTab = useSimulation((s) => s.setTab);

  return (
    <aside className="rail">
      <div className="rail-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="rail-body">
        {tab === 'agents' && <AgentFeed />}
        {tab === 'mission' && <MissionPanel />}
        {tab === 'chief' && <ChiefPanel />}
        {tab === 'sitrep' && <SitrepPanel />}
      </div>
    </aside>
  );
}