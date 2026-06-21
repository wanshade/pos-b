export type PosVariant = {
  id: string;
  name: string;
  priceDelta: string; // decimal string
};

export type PosModifier = {
  id: string;
  groupName: string;
  name: string;
  priceDelta: string;
};

export type PosItem = {
  id: string;
  name: string;
  price: string;
  categoryId: string;
  categoryName: string;
  imageUrl: string | null;
  trackStock: boolean;
  variants: PosVariant[];
  modifiers: PosModifier[];
};
