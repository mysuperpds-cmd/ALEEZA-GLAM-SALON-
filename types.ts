export interface Service {
  id: string;
  name: string;
  price: number; // In PKR
  category: 'Hair' | 'Hair Studio' | 'Facials' | 'Makeup' | 'Manipedicure' | 'Spa' | 'Aesthetics' | 'Waxing';
  description: string;
}

export interface Booking {
  id: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  date: string;
  time: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface AudioVisualizerState {
  volume: number;
}