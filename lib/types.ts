export type OrderItem = {
  id: string;
  name: string;
  qty: number;
};

export type Order = {
  id: string;
  table: number;
  items: OrderItem[];
  createdAt: number;
};
