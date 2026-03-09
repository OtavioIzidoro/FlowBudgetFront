import {
  BriefcaseBusiness,
  Car,
  GraduationCap,
  Film,
  Heart,
  House,
  ShoppingBag,
  Tag,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

const categoryIconMap: Record<string, LucideIcon> = {
  utensils: UtensilsCrossed,
  car: Car,
  heart: Heart,
  briefcase: BriefcaseBusiness,
  film: Film,
  home: House,
  education: GraduationCap,
  'shopping-bag': ShoppingBag,
};

const categoryIconAliases: Record<string, keyof typeof categoryIconMap> = {
  food: 'utensils',
  meal: 'utensils',
  meals: 'utensils',
  restaurant: 'utensils',
  restaurantes: 'utensils',
  alimentacao: 'utensils',
  alimentação: 'utensils',
  transport: 'car',
  transportation: 'car',
  commute: 'car',
  vehicle: 'car',
  health: 'heart',
  healthcare: 'heart',
  medical: 'heart',
  work: 'briefcase',
  job: 'briefcase',
  salary: 'briefcase',
  business: 'briefcase',
  entertainment: 'film',
  leisure: 'film',
  lazer: 'film',
  movie: 'film',
  movies: 'film',
  housing: 'home',
  house: 'home',
  moradia: 'home',
  shopping: 'shopping-bag',
  compras: 'shopping-bag',
  store: 'shopping-bag',
  supermarket: 'shopping-bag',
  market: 'shopping-bag',
  grocery: 'shopping-bag',
  school: 'education',
  study: 'education',
  estudos: 'education',
  bank: 'briefcase',
  banking: 'briefcase',
  finance: 'briefcase',
  bills: 'home',
  bill: 'home',
  utility: 'home',
  utilities: 'home',
  rent: 'home',
  travel: 'car',
  trip: 'car',
  fuel: 'car',
  gas: 'car',
  pharmacy: 'heart',
  fitness: 'heart',
  gym: 'heart',
  fun: 'film',
  games: 'film',
  gaming: 'film',
  music: 'film',
  other: 'shopping-bag',
  others: 'shopping-bag',
  misc: 'shopping-bag',
  miscellaneous: 'shopping-bag',
  general: 'shopping-bag',
};

export const CATEGORY_ICON_OPTIONS = Object.keys(categoryIconMap);

export function normalizeCategoryIconName(iconName?: string): string {
  const normalized = (iconName ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');

  if (!normalized) {
    return 'utensils';
  }

  if (normalized in categoryIconMap) {
    return normalized;
  }

  return categoryIconAliases[normalized] ?? normalized;
}

export function getCategoryIcon(iconName: string): LucideIcon {
  return categoryIconMap[normalizeCategoryIconName(iconName)] ?? Tag;
}
