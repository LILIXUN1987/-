/**
 * 危险品模块配色常量（避免 Tailwind JIT 动态类名问题）
 */
import { Plane, Ship, Truck, type LucideIcon } from 'lucide-react';

export interface DgColorConfig {
  icon: LucideIcon;
  label: string;
  text: string;
  bg: string;
  bgBold: string;
  textDeeper: string;
  border: string;
  borderLight: string;
  ring: string;
  from: string;
  btn: string;
}

export const AC: Record<string, DgColorConfig> = {
  air: {
    icon: Plane, label: '空运危险品', text: 'text-orange-600',
    bg: 'bg-orange-100', bgBold: 'bg-orange-200', textDeeper: 'text-orange-800',
    border: 'border-orange-200', borderLight: 'border-orange-100',
    ring: 'ring-orange-300', from: 'from-orange-50', btn: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
  },
  sea: {
    icon: Ship, label: '海运危险品', text: 'text-blue-600',
    bg: 'bg-blue-100', bgBold: 'bg-blue-200', textDeeper: 'text-blue-800',
    border: 'border-blue-200', borderLight: 'border-blue-100',
    ring: 'ring-blue-300', from: 'from-blue-50', btn: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
  },
  land: {
    icon: Truck, label: '陆运危险品', text: 'text-amber-600',
    bg: 'bg-amber-100', bgBold: 'bg-amber-200', textDeeper: 'text-amber-800',
    border: 'border-amber-200', borderLight: 'border-amber-100',
    ring: 'ring-amber-300', from: 'from-amber-50', btn: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
  },
};
