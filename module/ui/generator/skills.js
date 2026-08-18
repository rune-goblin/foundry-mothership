/**
 * The skill catalog the generator's pickers offer, and the rule for what a pick may offer.
 * Flattened off the documents on purpose: the pickers are then pure functions over plain data,
 * which is what makes them testable outside Foundry.
 */

/**
 * The book prints a sentence under every skill and the wizard asks the player to pick one, so the
 * sentence travels with it. Descriptions are stored as HTML; the picker prints them as a line of
 * text beside the name, which is what the tags come off for.
 */
const sentence = (html) =>
  (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export async function loadSkills() {
  const documents = game.items.filter((item) => item.type === 'skill');
  for (const pack of game.packs) {
    documents.push(...(await pack.getDocuments({ type: 'skill' })));
  }
  return documents.map((skill) => ({
    uuid: skill.uuid,
    name: skill.name,
    rank: skill.system.rank,
    bonus: skill.system.bonus,
    summary: sentence(skill.system.description),
    prerequisites: skill.system.prerequisite_ids ?? [],
  }));
}

/**
 * What each class brings, so the pane can be read before one is pressed rather than after: the
 * adjustments it applies outright, and the ones it hands the player to place.
 */
const brings = (klass) => ({
  description: sentence(klass.system.description),
  adjustments: Object.entries(klass.system.base_adjustment)
    .filter(([key, value]) => key !== 'skills_granted' && value !== 0)
    .map(([key, value]) => ({ key, value })),
  choices: klass.system.selected_adjustment.choose_stat
    .filter((entry) => entry.modification)
    .map((entry) => ({ modification: entry.modification, stats: [...entry.stats] })),
});

/** Every class document in the world and in the compendia, as the class pane's options. */
export async function loadClasses() {
  const options = game.items
    .filter((item) => item.type === 'class')
    .map((klass) => ({
      uuid: klass.uuid,
      name: klass.name,
      img: klass.img,
      source: 'world.Item',
      ...brings(klass),
    }));

  for (const pack of game.packs) {
    for (const klass of await pack.getDocuments({ type: 'class' })) {
      options.push({
        uuid: klass.uuid,
        name: klass.name,
        img: klass.img,
        source: klass.pack.replace(/\..*$/, ''),
        ...brings(klass),
      });
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
