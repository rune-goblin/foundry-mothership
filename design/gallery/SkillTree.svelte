<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'SkillTree',
    path: 'module/ui/generator/SkillTree.svelte',
    wide: true,
    note: 'Explicit prerequisite paths for each possible pick. Shared prerequisites repeat by design, avoiding ambiguous joins in the many-to-many skill graph.',
  };
</script>

<script>
  import SkillTree from '../../module/ui/generator/SkillTree.svelte';
  import { say } from './fixtures.js';

  const skills = [
    {
      uuid: 'trained-linguistics', name: 'Linguistics', rank: 'Trained', bonus: 10,
      summary: 'The study of languages.', prerequisites: [], state: 'selected',
    },
    {
      uuid: 'trained-zoology', name: 'Zoology', rank: 'Trained', bonus: 10,
      summary: 'The study of animal life.', prerequisites: [], state: 'unavailable',
    },
    {
      uuid: 'expert-psychology', name: 'Psychology', rank: 'Expert', bonus: 15,
      summary: 'The study of behavior and the mind.', prerequisites: ['trained-linguistics'], state: 'available',
    },
    {
      uuid: 'expert-pathology', name: 'Pathology', rank: 'Expert', bonus: 15,
      summary: 'The study of disease.', prerequisites: ['trained-zoology'], state: 'unavailable',
    },
    {
      uuid: 'master-sophontology', name: 'Sophontology', rank: 'Master', bonus: 20,
      summary: 'The study of intelligent beings.', prerequisites: ['expert-psychology'], state: 'unavailable',
    },
    {
      uuid: 'master-exobiology', name: 'Exobiology', rank: 'Master', bonus: 20,
      summary: 'The study of alien biology.', prerequisites: ['expert-pathology'], state: 'unavailable',
    },
  ];
</script>

<div class="mothership">
  <SkillTree {skills} rank="Master" onchoose={say('choose skill')} />
</div>
