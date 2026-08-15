<script module>
  export const meta = {
    group: 'Windows',
    title: 'SkillSheet',
    path: 'module/ui/skill/SkillSheet.svelte',
    width: 600,
    note: 'Rank, bonus, description, and the prerequisite list that only receives drops — its rows pass `draggable={false}` so they do not offer a drag no handler is listening for.',
  };
</script>

<script>
  import SkillSheet from '../../module/ui/skill/SkillSheet.svelte';
  import { store, skillDocument, skills, say } from './fixtures.js';

  const sheetStore = store(skillDocument, {
    enriched: { description: '<p>Moving in free fall without spinning off into the dark.</p>' },
    prerequisites: skills.slice(1).map((item) => ({ key: item.id, uuid: item.uuid, item })),
  });
</script>

<SkillSheet store={sheetStore} />
