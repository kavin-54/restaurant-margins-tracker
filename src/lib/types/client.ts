export interface Client {
  id: string;
  name: string;
  organization: string;
  phone: string;
  email: string;
  address: string;
  dietaryPreferences: string;
  notes: string;
  eventCount: number;
  createdAt: Date;
  updatedAt: Date;
}
