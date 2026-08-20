<script>
  // Every prompt whose question is one sentence and whose answer is which button was pressed:
  // both ammunition prompts, and the one asking which damage a weapon is dealing. The buttons
  // are the dialog's, so the message is the whole window.
  //
  // No <style> block: `macro_prompt` carries no rule at all — it is structure the shell tier
  // leaves alone and test/dialogs.test.ts locates by.
  let { message } = $props();
</script>

<div class="macro_prompt">{message}</div>
