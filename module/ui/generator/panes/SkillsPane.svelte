<script>
  import MainStat from '../../parts/MainStat.svelte';
  import SkillSelector from '../SkillSelector.svelte';
  import { localize } from '../../../i18n.ts';

  let { draft } = $props();
</script>

<SkillSelector
  skills={draft.skillTree}
  budget={draft.skillBudget}
  picks={draft.skillPicks}
  groups={draft.skillGroups}
  onchoose={(uuid) => draft.toggleSkill(uuid)}
  onswitch={(group, option) => draft.chooseSkillOption(group, option)}
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
