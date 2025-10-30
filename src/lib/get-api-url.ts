'use client';

/**
 * Determines the API base URL based on the current window hostname.
 * This ensures the app points to the correct backend.
 * @returns The appropriate base URL for the API.
 */
export const getApiBaseUrl = (): string => {
    if (typeof window === 'undefined') {
        // Return the default from environment variables for server-side rendering or build-time
        return process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api/v2';
    }

    const { protocol, hostname } = window.location;

    // Dynamically handle all *.towerbuddy.tel subdomains
    if (hostname.endsWith('.towerbuddy.tel')) {
        return `${protocol}//${hostname}:8000/api/v2`;
    }

    // For localhost or any other domain, use the value from the .env file.
    return process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api/v2';
};
