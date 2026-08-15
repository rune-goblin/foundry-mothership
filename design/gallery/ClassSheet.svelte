<script module>
  export const meta = {
    group: 'Windows',
    title: 'ClassSheet',
    path: 'module/ui/class/ClassSheet.svelte',
    width: 820,
    note: 'Both class adjustments are real SchemaFields: the flat `base_adjustment` on the first tab, and the authored `selected_adjustment` options on the second.',
  };
</script>

<script>
  import ClassSheet from '../../module/ui/class/ClassSheet.svelte';
  import { store, classDocument, skills } from './fixtures.js';

  const sheetStore = store(classDocument, {
    enriched: { description: '<p>The backbone of every haul.</p>' },
    grantedSkills: skills.map((item) => ({ key: item.id, uuid: item.uuid, item })),
    skillGroups: [
      {
        key: 'group-0',
        index: 0,
        options: [
          {
            key: 'option-0',
            index: 0,
            option: { name: 'Mechanic', trained: 2, expert: 1, master: 0 },
            fromList: [{ uuid: skills[0].uuid, item: skills[0] }],
          },
        ],
      },
    ],
  });
</script>

<ClassSheet store={sheetStore} />
