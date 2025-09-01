export interface Property {
    id: string;
    title: string;
    description: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    area: number;
    location: string;
    address: string;
    images: string[];
    features: string[];
    yearBuilt: number;
    propertyType: 'house' | 'apartment' | 'condo' | 'townhouse';
    listingAgent: {
        name: string;
        phone: string;
        email: string;
    };
    aiRelevanceScore?: number;
}