export interface Vendor {
  id: string;
  name: string;
  phone: string;
  email: string;
  deliveryDays: string[];
  minimumOrder: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}
