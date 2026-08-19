export type ProviderType = "individual" | "company";

export type ListingCategory =
  | "cleaning"
  | "handyman"
  | "moving"
  | "junk_removal"
  | "yard_work"
  | "painting"
  | "organizing";

export type PriceUnit = "flat" | "hourly";

export type ListingStatus = "active" | "paused";

export type BookingStatus =
  | "requested"
  | "confirmed"
  | "completed"
  | "cancelled";

export type ReviewerRole = "customer" | "provider";

export interface Provider {
  id: string;
  name: string;
  city: string;
  contact: string;
  providerType: ProviderType;
  serviceArea: string[];
}

export interface Listing {
  id: string;
  providerId: string;
  category: ListingCategory;
  title: string;
  description: string;
  price: number;
  priceUnit: PriceUnit;
  status: ListingStatus;
}

export interface Customer {
  id: string;
  name: string;
  city: string;
  contact: string;
}

export interface Booking {
  id: string;
  listingId: string;
  customerId: string;
  providerId: string;
  status: BookingStatus;
  priceAtBooking: number;
  requestedAt: string;
  serviceDate: string | null;
}

export interface Review {
  id: string;
  bookingId: string;
  reviewerRole: ReviewerRole;
  rating: number;
  comment: string;
  flag: boolean;
  reason: string;
  handled: boolean;
  createdAt: string;
}

export type ProviderInsert = Omit<Provider, "id"> & { id?: string };
export type ListingInsert = Omit<Listing, "id"> & { id?: string };
export type CustomerInsert = Omit<Customer, "id"> & { id?: string };
export type BookingInsert = Omit<Booking, "id"> & { id?: string };
export type ReviewInsert = Omit<Review, "id"> & { id?: string };

export type TableName =
  | "Provider"
  | "Listing"
  | "Customer"
  | "Booking"
  | "Review";
