import { localize } from '../i18n.js';
import { candidates } from './skills.js';

/**
 * The generator's three sub-dialogs. Each is a DialogV2 that resolves a value and touches nothing
 * else — the AppV1 versions rendered Handlebars templates and then wrote their result straight
 * back into the parent window's DOM through `this._element`, which is what made the form the
 * source of truth. Closing one now resolves empty instead of hanging the promise for good.
 */

const { DialogV2 } = foundry.applications.api;

// The rank a pick draws from, in the order the dialog stacks its dropdowns. A *_full_set pick is
// one skill plus the prerequisite chain beneath it, so it offers every rank at once and gates
// none of them; a bare Expert or Master pick is gated on already owning a prerequisite.
const SETS = {
  master_full_set: [
    { rank: 'Master', gated: false },
    { rank: 'Expert', gated: false },
    { rank: 'Trained', gated: false },
  ],
  expert_full_set: [
    { rank: 'Expert', gated: false },
    { rank: 'Trained', gated: false },
  ],
  trained: [{ rank: 'Trained', gated: false }],
  expert: [{ rank: 'Expert', gated: true }],
  master: [{ rank: 'Master', gated: true }],
};

export const PICK_KINDS = Object.keys(SETS);

const DESCRIPTION = {
  master_full_set: 'Mosh.CharacterGenerator.SkillOption.PopupFullMasterDescription',
  expert_full_set: 'Mosh.CharacterGenerator.SkillOption.PopupFullExpertDescription',
  trained: 'Mosh.CharacterGenerator.SkillOption.PopupTrainedDescription',
  expert: 'Mosh.CharacterGenerator.SkillOption.PopupExpertDescription',
  master: 'Mosh.CharacterGenerator.SkillOption.PopupMasterDescription',
};

const RANK_LABEL = {
  Trained: 'Mosh.SkillRankTrained',
  Expert: 'Mosh.SkillRankExpert',
  Master: 'Mosh.SkillRankMaster',
};

// Skill and option names come out of documents anyone can author, so they are interpolated
// escaped. The AppV1 templates got this from Handlebars.
const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

const dropdown = (rank, options) => `
  <div class="dropdownSkill">
    <label for="skill-${rank}">${localize(RANK_LABEL[rank])}:</label>
    <select id="skill-${rank}" name="skill-${rank}">
      <option value="" selected>---</option>
      ${options
        .map(
          (skill) =>
            `<option value="${esc(skill.uuid)}"${skill.disabled ? ' disabled' : ''}>${esc(skill.name)}</option>`,
        )
        .join('')}
    </select>
  </div>`;

/**
 * One skill pick. Resolves the chosen UUIDs — up to three for a master full set, none if the
 * dialog is closed or every dropdown is left on `---`.
 */
export function pickSkills(kind, catalog, owned) {
  const lists = SETS[kind].map(({ rank, gated }) => ({
    rank,
    options: candidates(catalog, rank, owned, { requirePrerequisite: gated }),
  }));

  const content = `
    <div class="mosh">
      <form class="characterGeneratorSkillPopup">
        <p class="skillpopupDescription">${localize(DESCRIPTION[kind])}</p>
        <div class="grid grid-1col widegap center">
          ${lists.map(({ rank, options }) => dropdown(rank, options)).join('')}
        </div>
      </form>
    </div>`;

  return new Promise((resolve) => {
    new DialogV2({
      window: { title: localize('Mosh.CharacterGenerator.SkillOption.PopupTitle') },
      classes: ['macro-popup-dialog'],
      content,
      buttons: [
        {
          icon: 'fas fa-check',
          action: 'save',
          label: 'Save',
          callback: (event, button) =>
            resolve(
              [...button.form.querySelectorAll('select')].map((select) => select.value).filter(Boolean),
            ),
        },
      ],
      default: 'save',
      close: () => resolve([]),
    }).render({ force: true });
  });
}

const countLine = (label, count) =>
  count ? `<li>${localize(label)}: ${count}</li>` : '';

/**
 * The `choose_skill_or` branch: the class offers several bonus-skill packages and the player takes
 * one. Resolves the chosen option, or null if the dialog is closed.
 */
export function pickBonusOption(options) {
  const content = `
    <div class="mosh">
      <div class="characterGeneratorSkillPopup">
        <p class="skillpopupDescription">${localize('Mosh.CharacterGenerator.SkillOption.ChoiceText')}</p>
        <div class="grid grid-2col widegap">
          ${options
            .map(
              (option) => `
            <div style="border:3px solid #111;border-radius: 1em;padding: 0.5em;">
              <p style="text-decoration: underline;">${esc(option.name)}:</p>
              <ul>
                ${countLine('Mosh.SkillRankMaster', option.master)}
                ${countLine('Mosh.SkillRankExpert', option.expert)}
                ${countLine('Mosh.SkillRankTrained', option.trained)}
                ${countLine('Mosh.CharacterGenerator.SkillOption.PopupFullMasterName', option.master_full_set)}
                ${countLine('Mosh.CharacterGenerator.SkillOption.PopupFullExpertName', option.expert_full_set)}
                ${option.fromListNames.length ? `<li>${esc(option.fromListNames.join(', '))}</li>` : ''}
              </ul>
            </div>`,
            )
            .join('')}
        </div>
      </div>
    </div>`;

  return new Promise((resolve) => {
    new DialogV2({
      window: { title: localize('Mosh.CharacterGenerator.SkillOption.PopupTitle'), width: 500 },
      classes: ['macro-popup-dialog'],
      content,
      buttons: options.map((option, index) => ({
        icon: 'fas fa-check',
        action: `option-${index}`,
        label: option.name,
        callback: () => resolve(option),
      })),
      close: () => resolve(null),
    }).render({ force: true });
  });
}

/**
 * One `choose_stat` entry: the class grants a modification the player spends on one of a set of
 * stats or saves. Resolves the chosen key, or null if the dialog is closed.
 */
export function pickStat(entry) {
  const content = `<div class="macro_desc"><h4>${localize(
    'Mosh.CharacterGenerator.StatOptionPopupText',
  )} (${entry.modification})</h4></div>`;

  return new Promise((resolve) => {
    new DialogV2({
      window: { title: localize('Mosh.CharacterGenerator.StatOptionPopupTitle') },
      classes: ['macro-popup-dialog'],
      content,
      buttons: entry.stats.map((stat) => ({
        icon: 'fas fa-check',
        action: stat,
        label: stat,
        callback: () => resolve(stat),
      })),
      close: () => resolve(null),
    }).render({ force: true });
  });
}
