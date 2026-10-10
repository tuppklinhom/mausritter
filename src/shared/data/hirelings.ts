export interface HirelingType {
  id: string;
  name: string;
  /** Dice for how many are looking for work. */
  number: string;
  wage: number;
}

export const HIRELING_TYPES: HirelingType[] = [
  { id: "torchbearer", name: "Torchbearer", number: "d6", wage: 1 },
  { id: "labourer", name: "Labourer", number: "d6", wage: 2 },
  { id: "tunnel-digger", name: "Tunnel digger", number: "d4", wage: 5 },
  { id: "blacksmith", name: "Armourer/blacksmith", number: "d2", wage: 8 },
  { id: "guide", name: "Local guide", number: "d4", wage: 10 },
  { id: "mouse-at-arms", name: "Mouse-at-arms", number: "d6", wage: 10 },
  { id: "scholar", name: "Scholar", number: "d2", wage: 20 },
  { id: "knight", name: "Knight", number: "d3", wage: 25 },
  { id: "interpreter", name: "Interpreter", number: "d2", wage: 30 },
];
