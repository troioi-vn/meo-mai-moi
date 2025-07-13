export interface Cat {
  id: number;
  name: string;
  breed: string;
  age: number;
  location: string;
  description: string;
  user_id: number;
  status: 'available' | 'fostered' | 'adopted';
  created_at: string;
  updated_at: string;
}
