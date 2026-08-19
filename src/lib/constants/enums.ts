import type {
  BookingStatus,
  ListingCategory,
  ListingStatus,
  PriceUnit,
  ProviderType,
  ReviewerRole,
} from "@/lib/types/database";

export const PROVIDER_TYPES = ["individual", "company"] as const satisfies readonly ProviderType[];

export const LISTING_CATEGORIES = [
  "cleaning",
  "handyman",
  "moving",
  "junk_removal",
  "yard_work",
  "painting",
  "organizing",
] as const satisfies readonly ListingCategory[];

export const PRICE_UNITS = ["flat", "hourly"] as const satisfies readonly PriceUnit[];

export const LISTING_STATUSES = ["active", "paused"] as const satisfies readonly ListingStatus[];

export const BOOKING_STATUSES = [
  "requested",
  "confirmed",
  "completed",
  "cancelled",
] as const satisfies readonly BookingStatus[];

export const REVIEWER_ROLES = ["customer", "provider"] as const satisfies readonly ReviewerRole[];
