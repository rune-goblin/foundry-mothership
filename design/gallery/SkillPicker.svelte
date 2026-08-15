<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'SkillPicker',
    path: 'module/ui/generator/SkillPicker.svelte',
    note: 'One dropdown per rank the pick draws from. The answer is composite, so the picks are held here and reported whole; the caller puts them back in rank order.',
  };
</script>

<script>
  import SkillPicker from '../../module/ui/generator/SkillPicker.svelte';
  import { say } from './fixtures.js';

  const lists = [
    {
      rank: 'trained',
      label: 'Trained',
      options: [
        { uuid: 'a', name: 'Zero-G' },
        { uuid: 'b', name: 'Linguistics' },
        { uuid: 'c', name: 'Heavy Machinery', disabled: true },
      ],
    },
    {
      rank: 'expert',
      label: 'Expert',
      options: [
        { uuid: 'd', name: 'Piloting' },
        { uuid: 'e', name: 'Mechanical Repair' },
      ],
    },
  ];
</script>

<SkillPicker description="Choose one Trained and one Expert skill." {lists} onchange={say('skills picked')} />
