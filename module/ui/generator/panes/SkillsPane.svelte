<script>
  import MainStat from '../../parts/MainStat.svelte';
  import SkillSelector from '../SkillSelector.svelte';
  import { localize } from '../../../i18n.ts';

  let { draft } = $props();
</script>

<!-- The whole tree at once: every rank's remaining picks live in one place, so taking a
     Trained skill can open an Expert one in the same glance rather than behind a slot the
     player has to think to reopen. Which bonus package those picks come from was settled a
     pane earlier, with the rest of what the class hands out. -->
<SkillSelector
  skills={draft.skillTree}
  budget={draft.skillBudget}
  onchoose={(uuid) => draft.toggleSkill(uuid)}
/>

<MainStat key="skills" label={localize('Mothership.Skills')} labelClass="fulllabel" wrapper={false}>
  {#snippet control()}
    <input class="circle-input" type="text" readonly data-value="skills" value={draft.skills.length} />
  {/snippet}
</MainStat>
<ul class="wizard-list" data-list="skills">
  {#each draft.skills as skill (skill.uuid)}
    <li>{skill.name}</li>
  {/each}
</ul>
