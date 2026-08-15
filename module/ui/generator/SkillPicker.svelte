<script>
  // One dropdown per rank the pick draws from. The answer is composite, so the picks are held here
  // and reported whole; the caller puts them back in rank order.
  let { description, lists, onchange } = $props();

  const picked = {};

  const choose = (rank) => (event) => {
    picked[rank] = event.currentTarget.value;
    onchange({ ...picked });
  };
</script>

<div class="mothership">
  <div class="characterGeneratorSkillPopup">
    <p class="skillpopupDescription">{description}</p>
    <div class="grid grid-1col widegap center">
      {#each lists as list (list.rank)}
        <div class="dropdownSkill">
          <label for="skill-{list.rank}">{list.label}:</label>
          <select id="skill-{list.rank}" name="skill-{list.rank}" onchange={choose(list.rank)}>
            <option value="" selected>---</option>
            {#each list.options as option (option.uuid)}
              <option value={option.uuid} disabled={option.disabled}>{option.name}</option>
            {/each}
          </select>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts this in the slot the rest of the system occupies.
     `center` is the one name this dialog alone writes -- and it was the most generic selector
     left in css/mothership.css, which is reason enough to take it. `characterGeneratorSkillPopup`
     and `skillpopupDescription` stay there: BonusOption builds the same popup body out of them,
     and neither dialog renders the other's markup. `dropdownSkill` carries no rule anywhere and
     no locator reads it -- a deletion candidate, not this unit's. No `--skillpicker-*` slot
     exists because `text-align` belongs to no token category. */
  @layer system {
    .center {
      text-align: center;
    }
  }
</style>
