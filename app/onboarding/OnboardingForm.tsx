'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  ATLUS_SUBTOPICS,
  GEOGRAPHIES,
  IPTC_TOPICS,
  ONBOARDING_SOURCES,
  goalSuggestionsForSelection
} from '@/lib/iptc';
import { saveOnboarding } from './actions';

const KNOWLEDGE = [
  { value: '0', label: 'New to this' },
  { value: '1', label: 'Know the basics' },
  { value: '2', label: 'Read about it regularly' },
  { value: '3', label: 'Know it well' }
];

const LEARNING_MODES = [
  { value: 'foundations', label: 'Start with the foundations', copy: 'Prefer clear introductions and pieces that build the prerequisites.' },
  { value: 'deepen', label: 'Help me go deeper', copy: 'Prefer articles that push beyond what you already know.' },
  { value: 'keep_up', label: 'Keep me up to date', copy: 'Prefer timely reporting and analysis that assumes the basics.' }
];

const TOPIC_ICONS: Record<string, string> = {
  '01000000': '🎭',
  '02000000': '⚖️',
  '03000000': '🚨',
  '04000000': '📈',
  '05000000': '🎓',
  '06000000': '🌱',
  '07000000': '🩺',
  '08000000': '👥',
  '09000000': '💼',
  '10000000': '✨',
  '11000000': '🏛️',
  '12000000': '🕊️',
  '13000000': '🔬',
  '14000000': '🧭',
  '15000000': '⚽',
  '16000000': '🌐',
  '17000000': '☁️'
};

const perspectiveTopics = ['Politics', 'Economics & business', 'Society', 'Environment & climate'];

function toggle(set: Set<string>, value: string) {
  const next = new Set(set);
  next.has(value) ? next.delete(value) : next.add(value);
  return next;
}

function parseCustomGoals(value: string) {
  return value.split(/[\n;]+/).map((goal) => goal.trim()).filter(Boolean);
}

function CreateEditionButton() {
  const { pending } = useFormStatus();

  return (
    <div className="mt-6" aria-live="polite" aria-busy={pending}>
      <button className="btn-primary w-full sm:w-auto" type="submit" disabled={pending}>
        {pending ? (
          <>
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/45 border-t-white" aria-hidden="true" />
            Creating your first edition…
          </>
        ) : 'Create my first edition'}
      </button>
      {pending && (
        <p className="mt-3 max-w-md text-sm leading-6 text-muted">
          Saving your reading profile and selecting your first articles. This may take a moment.
        </p>
      )}
    </div>
  );
}

type OnboardingFormProps = {
  initialDeliveryTime?: string;
  initialTimezone?: string;
  detectTimezone?: boolean;
};

export function OnboardingForm({
  initialDeliveryTime = '08:00',
  initialTimezone = 'Europe/London',
  detectTimezone = true
}: OnboardingFormProps) {
  const [step, setStep] = useState(0);
  const [broad, setBroad] = useState<Set<string>>(new Set());
  const [subtopics, setSubtopics] = useState<Set<string>>(new Set());
  const [goals, setGoals] = useState<Set<string>>(new Set());
  const [customGoals, setCustomGoals] = useState('');
  const [goalKnowledge, setGoalKnowledge] = useState<Record<string, string>>({});
  const [goalMode, setGoalMode] = useState<Record<string, string>>({});
  const [focusGoal, setFocusGoal] = useState('');
  const [knowledge, setKnowledge] = useState<Record<string, string>>({});
  const [sources, setSources] = useState<Set<string>>(new Set());
  const [sourceExclusions, setSourceExclusions] = useState<Set<string>>(new Set());
  const [customSourceExclusions, setCustomSourceExclusions] = useState('');
  const [perspective, setPerspective] = useState<Record<string, string>>(
    Object.fromEntries(perspectiveTopics.map((topic) => [topic, 'balance']))
  );
  const [geography, setGeography] = useState<Record<string, string>>(
    Object.fromEntries(GEOGRAPHIES.map((geo) => [geo, 'normal']))
  );
  const [discovery, setDiscovery] = useState('balanced');
  const [exclusions, setExclusions] = useState<Set<string>>(new Set());
  const [readingMode, setReadingMode] = useState('standard');
  const [deliveryTime, setDeliveryTime] = useState(String(initialDeliveryTime || '08:00').slice(0, 5));
  const [timezone, setTimezone] = useState(initialTimezone || 'Europe/London');

  useEffect(() => {
    if (!detectTimezone) return;
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTimezone(detected);
    } catch { }
  }, [detectTimezone]);

  const selectedSubtopics = useMemo(
    () => ATLUS_SUBTOPICS.filter((topic) => broad.has(topic.parentQcode)),
    [broad]
  );
  const chosenSubtopics = selectedSubtopics.filter((topic) => subtopics.has(topic.slug));
  const chosenBroad = IPTC_TOPICS.filter((topic) => broad.has(topic.qcode));
  const knowledgeTargets = chosenSubtopics.length
    ? chosenSubtopics.map((topic) => ({ key: `subtopic-${topic.slug}`, label: topic.label }))
    : chosenBroad.map((topic) => ({ key: `qcode-${topic.qcode}`, label: topic.uiLabel }));

  const suggestedGoals = useMemo(
    () => goalSuggestionsForSelection([...broad], [...subtopics], 10),
    [broad, subtopics]
  );
  const customGoalLines = useMemo(() => parseCustomGoals(customGoals), [customGoals]);
  const rawGoalTexts = useMemo(
    () => Array.from(new Set([...goals, ...customGoalLines])),
    [goals, customGoalLines]
  );
  const selectedGoalTexts = rawGoalTexts.slice(0, 3);
  const goalDetails = selectedGoalTexts.map((goal) => ({
    text: goal,
    knowledge: Number(goalKnowledge[goal] ?? '1'),
    mode: goalMode[goal] || 'deepen',
    focus: focusGoal === goal
  }));

  const steps = [
    'Interests',
    'Refine',
    'Goals',
    'Goal setup',
    'Reading style',
    'Sources & exclusions',
    'Perspectives',
    'World',
    'Delivery'
  ];
  const canContinue = step === 0 ? broad.size >= 3 : step === 2 ? selectedGoalTexts.length >= 1 : true;

  function toggleBroadTopic(qcode: string) {
    const removing = broad.has(qcode);
    setBroad(toggle(broad, qcode));
    if (removing) {
      const childSlugs = new Set(
        ATLUS_SUBTOPICS.filter((topic) => topic.parentQcode === qcode).map((topic) => topic.slug)
      );
      setSubtopics(new Set([...subtopics].filter((slug) => !childSlugs.has(slug))));
    }
  }

  function toggleGoal(goal: string) {
    if (!goals.has(goal) && rawGoalTexts.length >= 3) return;
    setGoals(toggle(goals, goal));
    if (goals.has(goal) && focusGoal === goal) setFocusGoal('');
  }

  return (
    <form action={saveOnboarding} className="onboarding-flow space-y-6">
      {[...broad].map((value) => <input key={`b-${value}`} type="hidden" name="broad_topics" value={value} />)}
      {[...subtopics].map((value) => <input key={`s-${value}`} type="hidden" name="subtopics" value={value} />)}
      <input type="hidden" name="goal_details" value={JSON.stringify(goalDetails)} />
      {[...sources].map((value) => <input key={`src-${value}`} type="hidden" name="source_exposure" value={value} />)}
      {[...new Set([...sourceExclusions, ...customSourceExclusions.split(/[\n;,]+/).map((source) => source.trim()).filter(Boolean)])].map((value) => <input key={`omit-${value}`} type="hidden" name="source_exclusions" value={value} />)}
      {Object.entries(perspective).map(([key, value]) => <input key={`p-${key}`} type="hidden" name={`perspective:${key}`} value={value} />)}
      {Object.entries(geography).map(([key, value]) => <input key={`geo-${key}`} type="hidden" name={`geography:${key}`} value={value} />)}
      {knowledgeTargets.map(({ key }) => <input key={`k-${key}`} type="hidden" name={`knowledge:${key}`} value={knowledge[key] ?? '1'} />)}
      {[...exclusions].map((value) => <input key={`x-${value}`} type="hidden" name="topic_exclusions" value={value} />)}
      <input type="hidden" name="discovery_level" value={discovery} />
      <input type="hidden" name="reading_mode" value={readingMode} />
      <input type="hidden" name="delivery_time" value={deliveryTime} />
      <input type="hidden" name="timezone" value={timezone} />

      <div className="onboarding-progress px-1 py-1">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold">Step {step + 1} of {steps.length}</p>
          <p className="text-sm text-muted">{steps[step]}</p>
        </div>
        <div className="progress-track mt-3">
          <div className="progress-fill" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      {step === 0 && (
        <section className="onboarding-step card p-6 sm:p-8">
          <p className="eyebrow">Your interests</p>
          <h2 className="mt-2 text-3xl font-bold">What do you want to read more about?</h2>
          <p className="mt-2 text-muted">Pick at least three. You can make them more specific on the next screen.</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {IPTC_TOPICS.map((topic) => {
              const selected = broad.has(topic.qcode);
              return (
                <label key={topic.qcode} className={`choice-tile flex cursor-pointer items-center gap-3 p-4 ${selected ? 'border-brand bg-brand/5' : ''}`}>
                  <input className="sr-only" type="checkbox" checked={selected} onChange={() => toggleBroadTopic(topic.qcode)} />
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-wash text-xl" aria-hidden="true">{TOPIC_ICONS[topic.qcode] || '•'}</span>
                  <span className="font-medium leading-snug">{topic.uiLabel}</span>
                  {selected && <span className="ml-auto text-sm font-bold text-brand" aria-hidden="true">✓</span>}
                </label>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-muted">{broad.size < 3 ? `${3 - broad.size} more to go` : `${broad.size} selected`}</p>
        </section>
      )}

      {step === 1 && (
        <section className="onboarding-step card p-6 sm:p-8">
          <p className="eyebrow">Refine your interests</p>
          <h2 className="mt-2 text-3xl font-bold">What within those areas matters most?</h2>
          <p className="mt-2 text-muted">Subtopics are optional. Then set your familiarity so Atlus starts at the right depth.</p>

          <div className="mt-7 space-y-7">
            {chosenBroad.map((parent) => {
              const children = selectedSubtopics.filter((topic) => topic.parentQcode === parent.qcode);
              if (!children.length) return null;
              return (
                <div key={parent.qcode}>
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">{TOPIC_ICONS[parent.qcode]}</span>
                    <h3 className="font-semibold">{parent.uiLabel}</h3>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {children.map((topic) => {
                      const selected = subtopics.has(topic.slug);
                      return (
                        <label key={topic.slug} className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition ${selected ? 'border-brand bg-brand text-white' : 'border-line bg-wash hover:border-brand'}`}>
                          <input className="sr-only" type="checkbox" checked={selected} onChange={() => setSubtopics(toggle(subtopics, topic.slug))} />
                          {topic.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-9 border-t border-line pt-7">
            <h3 className="text-xl font-bold">How familiar are you with these?</h3>
            <p className="mt-1 text-sm text-muted">If you picked subtopics, set those. Otherwise set the broad interests.</p>
            <div className="mt-5 space-y-4">
              {knowledgeTargets.map(({ key, label }) => (
                <div key={key} className="grid gap-2 sm:grid-cols-[1fr_14rem] sm:items-center">
                  <span className="font-medium">{label}</span>
                  <select value={knowledge[key] ?? '1'} onChange={(event) => setKnowledge({ ...knowledge, [key]: event.target.value })}>
                    {KNOWLEDGE.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="onboarding-step card p-6 sm:p-8">
          <p className="eyebrow">What you want to learn</p>
          <h2 className="mt-2 text-3xl font-bold">What do you want to understand better?</h2>
          <p className="mt-2 text-muted">Choose 1–3 goals. You’ll set the level and type of reading on the next screen.</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {suggestedGoals.map((goal) => {
              const selected = goals.has(goal);
              const disabled = !selected && rawGoalTexts.length >= 3;
              return (
                <label key={goal} className={`choice-tile p-4 text-sm ${selected ? 'border-brand bg-brand/5' : ''} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                  <input className="mr-2" type="checkbox" checked={selected} disabled={disabled} onChange={() => toggleGoal(goal)} />
                  {goal}
                </label>
              );
            })}
          </div>

          <label className="mt-6 block font-medium" htmlFor="custom-goals">Or add your own</label>
          <p className="mt-1 text-sm text-muted">One goal per line.</p>
          <textarea
            id="custom-goals"
            className="mt-3"
            rows={3}
            value={customGoals}
            onChange={(event) => setCustomGoals(event.target.value)}
            placeholder={'I want to understand why Britain has low productivity.\nI want to understand how LLM pretraining works.'}
          />
          <p className={`mt-3 text-sm ${rawGoalTexts.length > 3 ? 'font-medium' : 'text-muted'}`}>
            {selectedGoalTexts.length}/3 selected{rawGoalTexts.length > 3 ? ' - only the first three will be used.' : ''}
          </p>
        </section>
      )}

      {step === 3 && (
        <section className="onboarding-step card p-6 sm:p-8">
          <p className="eyebrow">Set the right level</p>
          <h2 className="mt-2 text-3xl font-bold">How should Atlus help with each goal?</h2>
          <p className="mt-2 text-muted">This keeps recommendations useful rather than too basic or too advanced.</p>

          <div className="mt-6 space-y-4">
            {selectedGoalTexts.map((goal) => (
              <div key={goal} className="rounded-2xl border border-line bg-wash/45 p-4">
                <p className="font-medium">{goal}</p>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div>
                    <label>Where are you starting from?</label>
                    <select
                      className="mt-2"
                      value={goalKnowledge[goal] ?? '1'}
                      onChange={(event) => setGoalKnowledge({ ...goalKnowledge, [goal]: event.target.value })}
                    >
                      {KNOWLEDGE.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>What are you looking for?</label>
                    <select
                      className="mt-2"
                      value={goalMode[goal] ?? 'deepen'}
                      onChange={(event) => setGoalMode({ ...goalMode, [goal]: event.target.value })}
                    >
                      {LEARNING_MODES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <p className="mt-2 text-xs text-muted">{LEARNING_MODES.find((option) => option.value === (goalMode[goal] ?? 'deepen'))?.copy}</p>
                  </div>
                </div>
                <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <input type="radio" name="focus-goal" checked={focusGoal === goal} onChange={() => setFocusGoal(goal)} />
                  Prioritise this goal for now
                </label>
              </div>
            ))}
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
              <input type="radio" name="focus-goal" checked={!focusGoal} onChange={() => setFocusGoal('')} />
              No single priority - rotate between my goals
            </label>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="onboarding-step card p-6 sm:p-8">
          <p className="eyebrow">Your reading style</p>
          <h2 className="mt-2 text-3xl font-bold">Shape your daily edition</h2>
          <p className="mt-2 text-muted">Choose how much you want and how adventurous the recommendations should be.</p>

          <div className="mt-7">
            <h3 className="text-xl font-bold">How much each day?</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[["light", "Light", "1 article"], ["standard", "Standard", "3 articles"], ["deep", "Deep", "5 articles"]].map(([value, label, copy]) => (
                <label key={value} className={`choice-tile cursor-pointer p-4 ${readingMode === value ? 'border-brand bg-brand/5' : ''}`}>
                  <input className="mr-2" type="radio" name="reading-mode-ui" checked={readingMode === value} onChange={() => setReadingMode(value)} />
                  <strong>{label}</strong>
                  <p className="mt-1 text-sm text-muted">{copy}</p>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-line pt-7">
            <h3 className="text-xl font-bold">How adventurous should the picks be?</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[["gentle", "Gentle", "Mostly close to what you already enjoy."], ["balanced", "Balanced", "Familiar interests plus worthwhile surprises."], ["adventurous", "Adventurous", "Regularly take me into adjacent subjects."]].map(([value, label, copy]) => (
                <label key={value} className={`choice-tile cursor-pointer p-4 ${discovery === value ? 'border-brand bg-brand/5' : ''}`}>
                  <input className="mr-2" type="radio" name="discovery-ui" checked={discovery === value} onChange={() => setDiscovery(value)} />
                  <strong>{label}</strong>
                  <p className="mt-1 text-sm text-muted">{copy}</p>
                </label>
              ))}
            </div>
          </div>
        </section>
      )}

      {step === 5 && (
        <section className="onboarding-step card p-6 sm:p-8">
          <p className="eyebrow">Your existing reading</p>
          <h2 className="mt-2 text-3xl font-bold">What should Atlus complement or avoid?</h2>
          <p className="mt-2 text-muted">Both are optional, but they help the first editions feel more personal.</p>

          <div className="mt-7">
            <h3 className="text-xl font-bold">What do you already read?</h3>
            <p className="mt-1 text-sm text-muted">This is about exposure, not agreement with a source.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {ONBOARDING_SOURCES.map((source) => (
                <label key={source} className={`choice-tile cursor-pointer p-3 text-sm ${sources.has(source) ? 'border-brand bg-brand/5' : ''}`}>
                  <input className="mr-2" type="checkbox" checked={sources.has(source)} onChange={() => setSources(toggle(sources, source))} />
                  {source}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-line pt-7">
            <h3 className="text-xl font-bold">Anything you’d rather keep out?</h3>
            <p className="mt-1 text-sm text-muted">These are treated as explicit exclusions.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {IPTC_TOPICS.filter((topic) => ['15000000', '03000000', '02000000', '16000000', '08000000', '17000000', '10000000'].includes(topic.qcode)).map((topic) => {
                const selected = exclusions.has(topic.qcode);
                return (
                  <label key={topic.qcode} className={`cursor-pointer rounded-full border px-4 py-2 text-sm ${selected ? 'border-brand bg-brand text-white' : 'border-line bg-wash hover:border-brand'}`}>
                    <input className="sr-only" type="checkbox" checked={selected} onChange={() => setExclusions(toggle(exclusions, topic.qcode))} />
                    {topic.uiLabel}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mt-8 border-t border-line pt-7">
            <h3 className="text-xl font-bold">Any news sources we should omit?</h3>
            <p className="mt-1 text-sm text-muted">We won’t recommend articles from these publishers.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {ONBOARDING_SOURCES.filter((source) => !['Substack newsletters', 'Podcasts', 'Reddit', 'YouTube'].includes(source)).map((source) => (
                <label key={source} className={`choice-tile cursor-pointer p-3 text-sm ${sourceExclusions.has(source) ? 'border-brand bg-brand/5' : ''}`}>
                  <input className="mr-2" type="checkbox" checked={sourceExclusions.has(source)} onChange={() => setSourceExclusions(toggle(sourceExclusions, source))} />
                  {source}
                </label>
              ))}
            </div>
            <label className="mt-5 block" htmlFor="other-excluded-sources">Other publishers to omit</label>
            <textarea id="other-excluded-sources" className="mt-2" rows={2} value={customSourceExclusions} onChange={(event) => setCustomSourceExclusions(event.target.value)} placeholder="One publisher per line" />
          </div>
        </section>
      )}

      {step === 6 && (
        <section className="onboarding-step card p-6 sm:p-8">
          <p className="eyebrow">Perspective</p>
          <h2 className="mt-2 text-3xl font-bold">How should Atlus handle different viewpoints?</h2>
          <p className="mt-2 text-muted">These are recommendation preferences, not assumptions about your own views.</p>

          <div className="mt-6 space-y-4">
            {perspectiveTopics.map((topic) => (
              <div key={topic} className="grid gap-2 sm:grid-cols-[1fr_14rem] sm:items-center">
                <span className="font-medium">{topic}</span>
                <select value={perspective[topic]} onChange={(event) => setPerspective({ ...perspective, [topic]: event.target.value })}>
                  <option value="match">Mostly familiar viewpoints</option>
                  <option value="balance">A balanced mix</option>
                  <option value="challenge">More challenging viewpoints</option>
                </select>
              </div>
            ))}
          </div>
        </section>
      )}

      {step === 7 && (
        <section className="onboarding-step card p-6 sm:p-8">
          <p className="eyebrow">Around the world</p>
          <h2 className="mt-2 text-3xl font-bold">Where do you want to read about?</h2>
          <p className="mt-2 text-muted">This controls the mix of places in your recommendations. It does not assume where you live.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {GEOGRAPHIES.map((geo) => (
              <div key={geo}>
                <label>{geo}</label>
                <select className="mt-2" value={geography[geo]} onChange={(event) => setGeography({ ...geography, [geo]: event.target.value })}>
                  <option value="more">More often</option>
                  <option value="normal">Balanced</option>
                  <option value="less">Less often</option>
                </select>
              </div>
            ))}
          </div>
        </section>
      )}

      {step === 8 && (
        <section className="onboarding-step card p-6 sm:p-8">
          <p className="eyebrow">Delivery</p>
          <h2 className="mt-2 text-3xl font-bold">When should your daily edition arrive?</h2>
          <p className="mt-2 text-muted">Choose the local time you want Atlus to aim for. You can change this at any time in Settings.</p>

          <div className="mt-6 max-w-sm">
            <label htmlFor="delivery-time-ui">Delivery time</label>
            <input
              id="delivery-time-ui"
              className="mt-2"
              type="time"
              value={deliveryTime}
              onChange={(event) => setDeliveryTime(event.target.value)}
              required
            />
            <p className="mt-2 text-sm text-muted">Timezone: {timezone.replaceAll('_', ' ')}</p>
          </div>

          <div className="mt-8 rounded-2xl border border-line bg-wash/45 p-5">
            <h3 className="text-lg font-bold">Your setup</h3>
            <p className="mt-3"><strong>Interests:</strong> {chosenBroad.map((topic) => topic.uiLabel).join(', ') || 'None yet'}</p>
            <p className="mt-2"><strong>More specific:</strong> {chosenSubtopics.map((topic) => topic.label).join(', ') || 'No deeper topics selected'}</p>
            <div className="mt-2">
              <strong>Learning goals:</strong>
              {goalDetails.length ? (
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                  {goalDetails.map((goal) => (
                    <li key={goal.text}>
                      {goal.text} · {KNOWLEDGE.find((item) => Number(item.value) === goal.knowledge)?.label || 'Know the basics'} · {LEARNING_MODES.find((item) => item.value === goal.mode)?.label || 'Help me go deeper'}{goal.focus ? ' · priority' : ''}
                    </li>
                  ))}
                </ul>
              ) : ' None'}
            </div>
            <p className="mt-2"><strong>Daily edition:</strong> {readingMode === 'light' ? '1 article' : readingMode === 'deep' ? '5 articles' : '3 articles'} · {discovery} discovery · delivery around {deliveryTime}</p>
            <p className="mt-2"><strong>Sources already read:</strong> {sources.size || 'None selected'} · <strong>Exclusions:</strong> {exclusions.size || 'None'}</p>
            <p className="mt-2"><strong>Perspective settings:</strong> saved for {perspectiveTopics.length} areas · <strong>Geography settings:</strong> saved for {GEOGRAPHIES.length} regions</p>
          </div>

          <CreateEditionButton />
        </section>
      )}

      <div className="flex justify-between gap-3">
        <button className="btn-secondary" type="button" disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}>Back</button>
        {step < steps.length - 1 && (
          <button className="btn-primary" type="button" disabled={!canContinue} onClick={() => setStep(Math.min(steps.length - 1, step + 1))}>Continue</button>
        )}
      </div>
    </form>
  );
}
