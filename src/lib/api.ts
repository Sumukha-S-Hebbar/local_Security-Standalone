
import { getApiBaseUrl } from './get-api-url';

// A simple data fetching function
export async function fetchData<T>(url: string, token?: string): Promise<T | null> {
    try {
        const baseUrl = getApiBaseUrl();
        // Construct the full URL, handling both absolute and relative paths
        const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
        
        const response = await fetch(fullUrl, {
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error: ${response.status} ${response.statusText}`, errorText);
            // Throw an error to be caught by the caller
            throw new Error(errorText || `Request failed with status ${response.status}`);
        }

        if (response.status === 204) { // No Content
            return null;
        }

        return await response.json() as T;
    } catch (error) {
        console.error("Network or parsing error:", error);
        // re-throw the error so it can be handled by the calling component
        throw error;
    }
}
