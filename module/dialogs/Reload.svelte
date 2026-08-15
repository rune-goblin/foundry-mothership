<script>
  // Both ammunition prompts: the one offering a reload and the one with nothing left to offer.
  // The buttons are the dialog's, so the message is the whole window.
  //
  // No <style> block: `macro_prompt` carries no rule at all — it is structure the shell tier
  // leaves alone and test/dialogs.test.ts locates by.
  let { message } = $props();
</script>

<div class="macro_prompt">{message}</div>
