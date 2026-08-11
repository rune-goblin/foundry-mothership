// The sheets' clickable controls are <a> and <div> elements, which get no keyboard activation
// from the browser -- this is the Enter/Space half that a11y (and svelte-check) demands.
export const onActivate = (handler) => (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  handler(event);
};
