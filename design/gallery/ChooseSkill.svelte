<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'ChooseSkill',
    path: 'module/dialogs/ChooseSkill.svelte',
    width: 600,
    note: 'Descriptions arrive enriched, so links in them resolve here as they do anywhere. This is the body the `dialog-skill-check` baseline renders.',
  };
</script>

<script>
  import ChooseSkill from '../../module/dialogs/ChooseSkill.svelte';
  import { say } from './fixtures.js';

  const skills = [
    { id: 'a', name: 'Zero-G', img: 'icons/svg/upgrade.svg', bonus: 10, description: '<p>Moving in free fall.</p>' },
    { id: 'b', name: 'Piloting', img: 'icons/svg/upgrade.svg', bonus: 15, description: '<p>Flying anything with a stick.</p>' },
    { id: 'c', name: 'Hacking', img: 'icons/svg/upgrade.svg', bonus: 20, description: '<p>Talking a system into cooperating.</p>' },
  ];
</script>

<div class="mothership macro-popup-dialog">
  <ChooseSkill {skills} note="Phobia: Fear Save [-]" prompt value={null} onchange={say('skill')} />
</div>
