
'use client';

/**
 * Determines the API base URL based on the current window hostname.
 * This ensures the app points to the correct backend (localhost, are, ind, etc.).
 * @returns The appropriate base URL for the API.
 */
export const getApiBaseUrl = (): string => {
    if (typeof window === 'undefined') {
        // Return the default from environment variables for server-side rendering or build-time
        return process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api/v2';
    }

    const { protocol, hostname } = window.location;

    // For local development, use the URL from the .env file.
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api/v2';
    }

    // For any deployed environment (e.g., ken.towerbuddy.tel, are.towerbuddy.tel), construct the URL dynamically.
    return `${protocol}//${hostname}:8000/api/v2`;
};
