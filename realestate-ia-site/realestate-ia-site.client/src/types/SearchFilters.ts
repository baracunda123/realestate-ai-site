export interface SearchFilters {
  priceRange: [number, number];
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string;
  location: string;
  sortBy: 'price' | 'date' | 'size';
}