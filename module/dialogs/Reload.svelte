<script>
  // Both ammunition prompts: the one offering a reload and the one with nothing left to offer.
  // The buttons are the dialog's, so the message is the whole window.
  let { message } = $props();
</script>

<div class="macro_prompt">{message}</div>
