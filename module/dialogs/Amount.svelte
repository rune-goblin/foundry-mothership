<script>
  // The amount is the button, so this window is only the briefing that explains the choice.
  // `body` is our own lang string and carries the book's emphasis as markup.
  //
  // No <style> block: every class here is the dialog shell's vocabulary — fourteen components
  // write it, and css/mothership.css declares the tier.
  let { image, heading, body, prompt } = $props();
</script>

<div class="macro_window" style="margin-bottom: 7px;">
  <div class="grid grid-2col" style="grid-template-columns: 150px auto">
    <div>
      <img src={image} alt={heading} style="border:none" />
    </div>
    <div class="macro_desc">
      <h4>{heading}</h4>
      {@html body}
    </div>
  </div>
</div>

<div class="macro_prompt">{prompt}</div>
