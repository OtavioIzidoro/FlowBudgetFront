import {
  BriefcaseBusiness,
  Car,
  Film,
  Heart,
  HelpCircle,
  House,
  ShoppingBag,
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
  'shopping-bag': ShoppingBag,
};

export function getCategoryIcon(iconName: string): LucideIcon {
  return categoryIconMap[iconName] ?? HelpCircle;
}
