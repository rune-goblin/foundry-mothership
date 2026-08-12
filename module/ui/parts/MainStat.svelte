<script>
  // The label-plus-circle pair the class sheet and both actor sheets use for a stat. It is not
  // CircleStat: that one stacks a circle over a caption, this one sets a black label bar beside
  // it (.mainstatwrapper / .mainstat / .mainstatlabel in css/mosh.css).
  let { name, value, label, key, dtype = 'Number', type = 'text', checked } = $props();
</script>

<div class="mainstatwrapper">
  <div class="resource mainstat">
    <div class="mainstatlabel">
      <span class="mainstattext" data-key={key} data-label={label}>{label}</span>
    </div>
    <input class="circle-input" {type} {name} {value} {checked} data-dtype={dtype} />
  </div>
</div>
