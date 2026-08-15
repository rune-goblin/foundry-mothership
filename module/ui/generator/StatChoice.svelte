<script>
  // Which stat the class's adjustment is spent on is the dialog's buttons; this is the question.
  //
  // No <style> block: `macro_desc` is the dialog family's body text, written by nine components
  // and declared under `.mothership.macro-popup-dialog` in css/mothership.css.
  let { text } = $props();
</script>

<div class="macro_desc"><h4>{text}</h4></div>
