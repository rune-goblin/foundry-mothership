<script>
  // No <style> block: these classes are the dialog shell's shared vocabulary, declared in
  // css/mothership.css.
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
