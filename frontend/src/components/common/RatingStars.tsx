import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  max?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export default function RatingStars({ rating, max = 5, size = 16, interactive, onChange }: RatingStarsProps) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
          size={size}
          fill={i < rating ? '#f59e0b' : 'none'}
          stroke={i < rating ? '#f59e0b' : '#d1d5db'}
          onClick={() => interactive && onChange?.(i + 1)}
        />
      ))}
    </span>
  );
}
