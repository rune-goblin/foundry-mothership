import { pickPhrases } from './picks.js';

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
 * adjustments it applies outright, the ones it hands the player to place, and the skills — the
 * book's own class card prints those with the rest of what a class gives you, so the pane that asks
 * which class you are has to print them too, even though the picking itself happens two panes on.
 */
const brings = (klass, named) => ({
  description: sentence(klass.system.description),
  adjustments: Object.entries(klass.system.base_adjustment)
    .filter(([key, value]) => key !== 'skills_granted' && value !== 0)
    .map(([key, value]) => ({ key, value })),
  choices: klass.system.selected_adjustment.choose_stat
    .filter((entry) => entry.modification)
    .map((entry) => ({ modification: entry.modification, stats: [...entry.stats] })),
  skills: {
    granted: klass.system.base_adjustment.skills_granted.map(named),
    picks: pickPhrases(klass.system.selected_adjustment.choose_skill_and),
    // An option keeps the book's own wording where it has one; a homebrew package that named
    // itself nothing still describes what it hands out.
    groups: klass.system.selected_adjustment.choose_skill_or
      .filter((group) => group.length > 0)
      .map((group) => group.map((option) => ({ name: option.name, picks: pickPhrases(option) }))),
  },
});

/**
 * Every class document in the world and in the compendia, as the class pane's options. The skill
 * catalog comes in because a class stores the skills it grants as UUIDs and the pane prints their
 * names; a UUID the catalog does not carry prints as itself rather than as a blank.
 */
export async function loadClasses(catalog = []) {
  const named = (uuid) => catalog.find((skill) => skill.uuid === uuid)?.name ?? uuid;
  const options = game.items
    .filter((item) => item.type === 'class')
    .map((klass) => ({
      uuid: klass.uuid,
      name: klass.name,
      img: klass.img,
      source: 'world.Item',
      ...brings(klass, named),
    }));

  for (const pack of game.packs) {
    for (const klass of await pack.getDocuments({ type: 'class' })) {
      options.push({
        uuid: klass.uuid,
        name: klass.name,
        img: klass.img,
        source: klass.pack.replace(/\..*$/, ''),
        ...brings(klass, named),
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
