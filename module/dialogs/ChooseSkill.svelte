<script>
  import { localize } from '../i18n.ts';

  // The rows are data. Legacy cloned an HTML string per skill and filled it in with chained
  // `replace` calls, injecting the skill's name as a DOM id and its stored description unescaped
  // (audit F23). Descriptions arrive enriched, so links in them resolve here as they do anywhere.
  let { skills, note = '', prompt = false, value, onchange } = $props();
</script>

{#if skills.length > 0}
  <div class="macro_window">
    <div class="macro_desc" style="padding-left: 8px;">
      <h4>{localize('Mosh.AddASkill')}</h4>
      {localize('Mosh.IfYouHaveARelevantSkill')}
      <em>{localize('Mosh.GivingYouAHigherNumber')}</em>
    </div>
  </div>

  <label for="skill-none">
    <div class="macro_window" style="vertical-align: middle; padding-left: 3px;">
      <div class="grid grid-2col" style="align-items: center; grid-template-columns: 20px auto">
        <input
          type="radio"
          id="skill-none"
          name="skill"
          value=""
          checked={value === null}
          onchange={() => onchange(null)}
        />
        <div class="macro_desc" style="display: table;">
          <span style="display: table-cell; vertical-align: middle;">
            <p>{localize('Mosh.DoNotAddASkillToThisRoll')}</p>
          </span>
        </div>
      </div>
    </div>
  </label>
{/if}

{#each skills as skill (skill.id)}
  <label for="skill-{skill.id}">
    <div class="macro_window" style="vertical-align: middle; padding-left: 3px;">
      <div class="grid grid-4col" style="align-items: center; grid-template-columns: 20px 60px 45px auto">
        <input
          type="radio"
          id="skill-{skill.id}"
          name="skill"
          value={skill.bonus}
          checked={value?.id === skill.id}
          onchange={() => onchange(skill)}
        />
        <div class="macro_img" style="padding-top: 5px; padding-bottom: 5px;">
          <img src={skill.img} alt={skill.name} style="border:none" />
        </div>
        <div class="macro_desc" style="display: table;">
          <span style="display: table-cell; vertical-align: middle; color: #888; font-weight:500; font-size: 14pt;">
            +{skill.bonus}
          </span>
        </div>
        <div class="macro_desc" style="display: table;">
          <span style="display: table-cell; vertical-align: middle;">
            <strong>{skill.name}</strong>
            {#if skill.description}
              <strong>:</strong>
              {@html skill.description}
            {/if}
          </span>
        </div>
      </div>
    </div>
  </label>
{/each}

{#if note}
  <div class="macro_prompt condition-modifier">{note}</div>
{/if}
{#if prompt}
  <div class="macro_prompt">{localize('Mosh.SelectYourRollType')}:</div>
{/if}
