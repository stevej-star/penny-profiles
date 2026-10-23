import { useEffect } from 'react';
import { randomSeed } from '../lib/rng';
import { IbanTab, PersonaTab, type TabProps, UkTab, UsTab, WorldTab } from './generatorTabs';
import { BulkTab, ValidatorTab } from './toolTabs';
import { Pacs008Tab } from './pacs008Tab';
import { useUrlState } from './urlState';

const TABS: { id: string; label: string; component: (p: TabProps) => React.ReactElement }[] = [
  { id: 'uk', label: 'UK', component: UkTab },
  { id: 'us', label: 'US', component: UsTab },
  { id: 'iban', label: 'IBAN', component: IbanTab },
  { id: 'world', label: 'AU · CA · JP · CN · RU', component: WorldTab },
  { id: 'persona', label: 'Persona', component: PersonaTab },
  { id: 'pacs008', label: 'pacs.008', component: Pacs008Tab },
  { id: 'validate', label: 'Validator', component: ValidatorTab },
  { id: 'bulk', label: 'Bulk', component: BulkTab },
];

export default function App() {
  const [state, update] = useUrlState();
  const tab = TABS.find((t) => t.id === state.tab) ?? TABS[0];
  const seed = Number(state.seed);

  useEffect(() => {
    if (!state.seed) update({ seed: String(randomSeed()) });
  }, [state.seed, update]);

  const Tab = tab.component;
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-700">PennyProfiles</h1>
          <p className="text-sm text-slate-500">Valid-looking bank accounts and personas for testing. Not for real-world use.</p>
        </div>
      </header>
      <nav className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            data-tab={t.id}
            onClick={() => update({ tab: t.id, seed: String(randomSeed()), view: state.view ?? '' }, true)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              t.id === tab.id ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {state.seed && (
        <Tab key={tab.id} state={state} update={update} seed={seed} regenerate={() => update({ seed: String(randomSeed()) })} />
      )}
      <footer className="mt-auto pt-6 text-xs text-slate-400">
        Seed and options are kept in the URL, so you can share or bookmark an exact result. UK modulus checking uses the bundled
        Vocalink tables.
      </footer>
    </div>
  );
}
