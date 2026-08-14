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

<div class="mothership mosh">
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
