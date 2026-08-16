<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'SkillSlot',
    path: 'module/ui/generator/SkillSlot.svelte',
    standIn: 'The skill catalog, which comes from a compendium scan.',
    note: 'One skill a class promises. Closed it is a line — the rank and the pick standing in it; open it is the list to browse, each candidate with the sentence the book prints under it. A skill the draft already holds stays listed and cannot be picked twice.',
  };
</script>

<script>
  import SkillSlot from '../../module/ui/generator/SkillSlot.svelte';

  const OPTIONS = [
    {
      uuid: 'sk-linguistics',
      name: 'Linguistics',
      bonus: 10,
      summary: 'The study of languages, ancient and modern.',
      prerequisiteNames: [],
      disabled: true,
    },
    {
      uuid: 'sk-archaeology',
      name: 'Archaeology',
      bonus: 10,
      summary: 'Ancient cultures and artifacts.',
      prerequisiteNames: [],
      disabled: false,
    },
    {
      uuid: 'sk-xenoesotericism',
      name: 'Xenoesotericism',
      bonus: 15,
      summary: 'Beliefs and rituals of alien cultures.',
      prerequisiteNames: ['Linguistics'],
      disabled: false,
    },
  ];

  let chosen = $state('sk-archaeology');
  let open = $state(true);
</script>

<SkillSlot
  pick="class:trained:0:Trained"
  label="Trained"
  options={OPTIONS}
  {chosen}
  chosenName={OPTIONS.find((option) => option.uuid === chosen)?.name ?? ''}
  {open}
  ontoggle={() => (open = !open)}
  onchoose={(uuid) => (chosen = uuid)}
/>
