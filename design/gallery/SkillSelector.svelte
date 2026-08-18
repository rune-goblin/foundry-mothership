<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'SkillSelector',
    path: 'module/ui/generator/SkillSelector.svelte',
    wide: true,
    note: 'The flat three-column picker: every skill visible at once, replacing the old one-slot-at-a-time accordion. Hover a skill to see its route both ways; a route already granted or picked stays lit on its own.',
  };
</script>

<script>
  import SkillSelector from '../../module/ui/generator/SkillSelector.svelte';

  const BASE = [
    { uuid: 'sk-linguistics', name: 'Linguistics', rank: 'Trained', bonus: 10, summary: 'The study of languages, alive, dead, and undiscovered.', prerequisites: [] },
    { uuid: 'sk-zoology', name: 'Zoology', rank: 'Trained', bonus: 10, summary: 'The study of animal life.', prerequisites: [] },
    { uuid: 'sk-mathematics', name: 'Mathematics', rank: 'Trained', bonus: 10, summary: 'The study of numbers, quantity, and space.', prerequisites: [] },
    { uuid: 'sk-athletics', name: 'Athletics', rank: 'Trained', bonus: 10, summary: 'Physical fitness, sports, and games.', prerequisites: [] },
    { uuid: 'sk-psychology', name: 'Psychology', rank: 'Expert', bonus: 15, summary: 'The study of behavior and the mind.', prerequisites: ['sk-linguistics', 'sk-zoology'] },
    { uuid: 'sk-pathology', name: 'Pathology', rank: 'Expert', bonus: 15, summary: 'Study of the causes and effects of diseases.', prerequisites: ['sk-zoology'] },
    { uuid: 'sk-physics', name: 'Physics', rank: 'Expert', bonus: 15, summary: 'Study of matter, motion, energy, and their effects in space and time.', prerequisites: ['sk-mathematics'] },
    { uuid: 'sk-sophontology', name: 'Sophontology', rank: 'Master', bonus: 20, summary: 'The study of the behavior and mind of inhuman entities.', prerequisites: ['sk-psychology'] },
    { uuid: 'sk-exobiology', name: 'Exobiology', rank: 'Master', bonus: 20, summary: 'The study of and search for intelligent alien life.', prerequisites: ['sk-pathology'] },
  ];

  // Linguistics came with the class; Mathematics is this session's own pick, already spending the
  // one Trained slot the budget below still shows as granted. Master is left at zero so the
  // specimen carries both halves of "unavailable": a rank with no pick left, and a skill whose
  // prerequisite is unmet.
  const GRANTED = new Set(['sk-linguistics']);
  const BUDGET = { Trained: 1, Expert: 1, Master: 0 };
  let picked = $state(new Set(['sk-mathematics']));

  const skills = $derived(BASE.map((skill) => {
    const state = GRANTED.has(skill.uuid) ? 'granted'
      : picked.has(skill.uuid) ? 'picked'
      : BUDGET[skill.rank] > 0
        && (skill.prerequisites.length === 0 || skill.prerequisites.some((id) => GRANTED.has(id) || picked.has(id)))
        ? 'available'
        : 'unavailable';
    return {
      ...skill,
      state,
      reason: state !== 'unavailable' ? null : BUDGET[skill.rank] > 0 ? 'gated' : 'spent',
    };
  }));

  function onchoose(uuid) {
    const next = new Set(picked);
    if (next.has(uuid)) next.delete(uuid);
    else next.add(uuid);
    picked = next;
  }
</script>

<div class="mothership">
  <SkillSelector {skills} budget={BUDGET} {onchoose} />
</div>
