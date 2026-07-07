import client from './client';

export interface ReviewStats {
  total: number;
  average: number;
  list: ReviewItem[];
}

export interface ReviewItem {
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string;
  reviewer_company: string | null;
}

export const reviewsApi = {
  create: (revieweeId: string, rating: number, comment?: string) =>
    client.post('/reviews', { reviewee_id: revieweeId, rating, comment }).then(r => r.data),

  stats: (userId: string) =>
    client.get<ReviewStats>(`/reviews/stats/${userId}`).then(r => r.data),
};
