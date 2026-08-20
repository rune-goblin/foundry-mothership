import { pickPhrases } from './picks.js';

// Flattened off the documents on purpose: pickers stay pure functions over plain data, testable
// outside Foundry.

// Descriptions are stored as HTML; strip tags for the picker's plain-text line.
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

// So the class pane can be read before pressing one: prints the skills a class grants even
// though the picking itself happens two panes later, matching how the book's class card reads.
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
    groups: klass.system.selected_adjustment.choose_skill_or
      .filter((group) => group.length > 0)
      .map((group) => group.map((option) => ({ name: option.name, picks: pickPhrases(option) }))),
  },
});

// catalog resolves the UUIDs a class stores its granted skills as, to names the pane can print;
// an unresolved UUID prints as itself rather than as a blank.
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

// Owned skills stay listed and disabled rather than vanishing, so a closed branch stays visible.
export function candidates(catalog, rank, owned, { requirePrerequisite = false } = {}) {
  return catalog
    .filter((skill) => skill.rank === rank)
    .filter(
      (skill) => !requirePrerequisite || skill.prerequisites.some((id) => owned.includes(id)),
    )
    .map((skill) => ({ ...skill, disabled: owned.includes(skill.uuid) }));
}
