<script>
  /**
   * What the dialog is holding while it is open. `svelteDialog` used to hand the body its `value`
   * as a plain prop and keep the answer in a closure, which worked only because every body of the
   * day was built on `<input type="radio">` — the browser held the selection, and the component
   * never had to render it. A body that draws its own state from `value` got the initial one and
   * nothing after it.
   *
   * So the state lives here, in the one place that can be reactive, and the closure is told rather
   * than asked.
   */
  let { component: Body, props, initial, report } = $props();

  // Capturing it once is the point: `initial` is where the dialog opens, not a channel it listens on.
  // svelte-ignore state_referenced_locally
  let value = $state(initial);
</script>

<Body
  {...props}
  {value}
  onchange={(next) => {
    value = next;
    report(next);
  }}
/>
