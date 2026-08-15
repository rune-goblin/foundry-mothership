<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'SkillPopup',
    path: 'module/ui/generator/SkillPopup.svelte',
    note: 'The body both generator popups share: a centred description over whatever the popup asks for. BonusOption and SkillPicker each hand-wrote it until it became one component.',
  };
</script>

<script>
  import SkillPopup from '../../module/ui/generator/SkillPopup.svelte';
</script>

<SkillPopup description="Choose the skills your class grants.">
  <p>Whatever the popup asks for goes here.</p>
</SkillPopup>
