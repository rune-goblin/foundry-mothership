export interface Quip {
  id: string;
  name: string;
  img: string;
  command: string;
}

export const QUIPS = [
  {
    id: 'plus-1-stress',
    name: '+1 Stress',
    img: 'systems/mothershiprpg/images/icons/ui/macros/stress.png',
    command: "game.mothershiprpg.modify('stress', { kind: 'amount', amount: 1 });",
  },
  {
    id: 'minus-1-stress',
    name: '-1 Stress',
    img: 'systems/mothershiprpg/images/icons/ui/macros/stress.png',
    command: "game.mothershiprpg.modify('stress', { kind: 'amount', amount: -1 });",
  },
] as const satisfies readonly Quip[];
