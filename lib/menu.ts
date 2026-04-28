export type Category = "pijet" | "birra" | "koktej";

export type MenuItem = {
  id: string;
  name: string;
  category: Category;
};

export const SECTIONS: { key: Category; label: string; emoji: string }[] = [
  { key: "pijet", label: "Pijet", emoji: "🥤" },
  { key: "birra", label: "Birra", emoji: "🍺" },
  { key: "koktej", label: "Koktej", emoji: "🍹" },
];

export const MENU: Record<Category, MenuItem[]> = {
  pijet: [
    { id: "p1", name: "Coca Cola", category: "pijet" },
    { id: "p2", name: "Fanta", category: "pijet" },
    { id: "p3", name: "Sprite", category: "pijet" },
    { id: "p4", name: "Schweppes", category: "pijet" },
    { id: "p5", name: "Ujë", category: "pijet" },
  ],
  birra: [
    { id: "b1", name: "Birra Peja", category: "birra" },
    { id: "b2", name: "Birra Lasco", category: "birra" },
    { id: "b3", name: "Panashe", category: "birra" },
  ],
  koktej: [
    { id: "k1", name: "Sex on the Beach", category: "koktej" },
    { id: "k2", name: "Tequila Sunrise", category: "koktej" },
    { id: "k3", name: "Russian White", category: "koktej" },
    { id: "k4", name: "Mojito Classic", category: "koktej" },
    { id: "k5", name: "Mojito Strawberry", category: "koktej" },
    { id: "k6", name: "Aperol Spritz", category: "koktej" },
    { id: "k7", name: "Daiquiri", category: "koktej" },
    { id: "k8", name: "Margarita", category: "koktej" },
    { id: "k9", name: "Pina Colada", category: "koktej" },
    { id: "k10", name: "Coctail pa Alkool (i Ëmbël)", category: "koktej" },
    { id: "k11", name: "Coctail pa Alkool (Normal)", category: "koktej" },
    { id: "k12", name: "Coctail pa Alkool (i Thartë)", category: "koktej" },
  ],
};

export const ALL_ITEMS: MenuItem[] = [
  ...MENU.pijet,
  ...MENU.birra,
  ...MENU.koktej,
];

export function findItem(id: string): MenuItem | undefined {
  return ALL_ITEMS.find((i) => i.id === id);
}
