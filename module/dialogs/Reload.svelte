<script>
  // No <style> block: `macro_prompt` carries no CSS rule — test/dialogs.test.ts locates the
  // window by it.
  let { message } = $props();
</script>

<div class="macro_prompt">{message}</div>
