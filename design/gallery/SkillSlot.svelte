<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'SkillSlot',
    path: 'module/ui/generator/SkillSlot.svelte',
    standIn: 'The skill catalog, which comes from a compendium scan.',
    note: 'One skill a class promises. Closed it is a line; open it shows the possible picks as explicit, self-contained prerequisite paths.',
  };
</script>

<script>
  import SkillSlot from '../../module/ui/generator/SkillSlot.svelte';

  const SKILLS = [
    {
      uuid: 'sk-linguistics',
      name: 'Linguistics',
      rank: 'Trained',
      bonus: 10,
      summary: 'The study of languages, ancient and modern.',
      prerequisites: [],
      state: 'selected',
    },
    {
      uuid: 'sk-archaeology',
      name: 'Archaeology',
      rank: 'Trained',
      bonus: 10,
      summary: 'Ancient cultures and artifacts.',
      prerequisites: [],
      state: 'unavailable',
    },
    {
      uuid: 'sk-psychology',
      name: 'Psychology',
      rank: 'Expert',
      bonus: 15,
      summary: 'The study of behavior and the mind.',
      prerequisites: ['sk-linguistics'],
      state: 'available',
    },
    {
      uuid: 'sk-sophontology',
      name: 'Sophontology',
      rank: 'Master',
      bonus: 20,
      summary: 'The study of intelligent beings.',
      prerequisites: ['sk-psychology'],
      state: 'unavailable',
    },
  ];

  let chosen = $state('sk-archaeology');
  let open = $state(true);
</script>

<SkillSlot
  pick="class:trained:0:Trained"
  rank="Trained"
  label="Trained"
  skills={SKILLS.map((skill) => ({ ...skill, state: skill.uuid === chosen ? 'selected' : skill.state }))}
  {chosen}
  chosenName={SKILLS.find((skill) => skill.uuid === chosen)?.name ?? ''}
  {open}
  ontoggle={() => (open = !open)}
  onchoose={(uuid) => (chosen = uuid)}
/>
