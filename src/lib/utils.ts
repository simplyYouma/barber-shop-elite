import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Fusionner les classes Tailwind efficacement */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Focus ring pour l'accessibilité */
export const focusRing = cn(
  'focus-visible:outline-none focus-visible:ring-2',
  'focus-visible:ring-ring focus-visible:ring-offset-2'
);
