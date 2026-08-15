<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'NewSkill',
    path: 'module/ui/actor/NewSkill.svelte',
    note: 'Name and rank are one answer, so what the user changed is held here and reported over what the dialog opened with; the fields themselves keep their own live values.',
  };
</script>

<script>
  import NewSkill from '../../module/ui/actor/NewSkill.svelte';
  import { SKILL_RANKS } from '../../module/rules.ts';
  import { say } from './fixtures.js';

  const ranks = SKILL_RANKS.map((rank) => ({ value: rank, label: rank }));
</script>

<div class="mothership macro-popup-dialog">
  <NewSkill
    nameLabel="Skill Name"
    rankLabel="Rank"
    {ranks}
    value={{ name: 'Zero-G', rank: 'trained' }}
    onchange={say('new skill')}
  />
</div>
