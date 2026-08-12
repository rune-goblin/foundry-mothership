/**
 * The skill catalog the generator's pickers offer, and the rule for what a pick may offer.
 * Flattened off the documents on purpose: the pickers are then pure functions over plain data,
 * which is what makes them testable outside Foundry.
 */

export async function loadSkills() {
  const documents = game.items.filter((item) => item.type === 'skill');
  for (const pack of game.packs) {
    documents.push(...(await pack.getDocuments({ type: 'skill' })));
  }
  return documents.map((skill) => ({
    uuid: skill.uuid,
    name: skill.name,
    rank: skill.system.rank,
    prerequisites: skill.system.prerequisite_ids ?? [],
  }));
}

/** Every class document in the world and in the compendia, for the name field's datalist. */
export async function loadClasses() {
  const options = game.items
    .filter((item) => item.type === 'class')
    .map((klass) => ({ uuid: klass.uuid, name: klass.name, source: 'world.Item' }));

  for (const pack of game.packs) {
    for (const klass of await pack.getDocuments({ type: 'class' })) {
      options.push({ uuid: klass.uuid, name: klass.name, source: klass.pack.replace(/\..*$/, '') });
    }
  }
  return options;
}

/**
 * What a pick of `rank` may offer. Expert and Master picks made on their own are gated on already
 * owning a prerequisite — the book's rule, and the reason the *_full_set picks exist at all: those
 * hand out the whole chain in one dialog, so they are not gated. Owned skills stay listed and
 * disabled rather than vanishing, so a closed branch is visible.
 */
export function candidates(catalog, rank, owned, { requirePrerequisite = false } = {}) {
  return catalog
    .filter((skill) => skill.rank === rank)
    .filter(
      (skill) => !requirePrerequisite || skill.prerequisites.some((id) => owned.includes(id)),
    )
    .map((skill) => ({ ...skill, disabled: owned.includes(skill.uuid) }));
}
