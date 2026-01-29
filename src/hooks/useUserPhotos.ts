/**
 * Hook to fetch user photos from Office365 connector
 * 
 * Uses Office365UsersService.UserPhoto to get profile photos by email.
 * Photos are cached to avoid redundant API calls.
 */

import { useState, useEffect } from 'react';
import { Office365UsersService } from '../generated/services/Office365UsersService';

// Cache for user photos to avoid refetching
const photoCache = new Map<string, string | null>();

/**
 * Fetches a single user's photo from Office365
 * Returns base64 data URL or null if no photo available
 */
export async function fetchUserPhoto(email: string): Promise<string | null> {
  if (!email) return null;
  
  // Check cache first
  if (photoCache.has(email)) {
    return photoCache.get(email) ?? null;
  }

  try {
    const result = await Office365UsersService.UserPhoto(email);
    if (result.data) {
      // The photo comes as base64 string, convert to data URL
      const photoUrl = `data:image/jpeg;base64,${result.data}`;
      photoCache.set(email, photoUrl);
      return photoUrl;
    }
    photoCache.set(email, null);
    return null;
  } catch (error) {
    // User may not have a photo, this is expected
    console.debug(`No photo available for ${email}`);
    photoCache.set(email, null);
    return null;
  }
}

/**
 * Hook to get a single user's photo
 */
export function useUserPhoto(email: string | undefined): {
  photoUrl: string | null;
  isLoading: boolean;
} {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      setPhotoUrl(null);
      return;
    }

    // Check cache synchronously
    if (photoCache.has(email)) {
      setPhotoUrl(photoCache.get(email) ?? null);
      return;
    }

    setIsLoading(true);
    fetchUserPhoto(email)
      .then(url => setPhotoUrl(url))
      .finally(() => setIsLoading(false));
  }, [email]);

  return { photoUrl, isLoading };
}

/**
 * Hook to batch fetch photos for multiple employees
 * Fetches photos progressively to avoid blocking the UI
 */
export function useUserPhotos(emails: string[]): {
  photos: Map<string, string | null>;
  isLoading: boolean;
} {
  const [photos, setPhotos] = useState<Map<string, string | null>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (emails.length === 0) {
      setPhotos(new Map());
      return;
    }

    // Filter out emails we already have in cache
    const emailsToFetch = emails.filter(email => email && !photoCache.has(email));
    
    // Start with cached values
    const initialPhotos = new Map<string, string | null>();
    for (const email of emails) {
      if (email && photoCache.has(email)) {
        initialPhotos.set(email, photoCache.get(email) ?? null);
      }
    }
    setPhotos(initialPhotos);

    if (emailsToFetch.length === 0) {
      return;
    }

    setIsLoading(true);

    // Fetch photos in batches to avoid overwhelming the API
    const batchSize = 5;
    let cancelled = false;

    const fetchBatch = async () => {
      for (let i = 0; i < emailsToFetch.length; i += batchSize) {
        if (cancelled) break;
        
        const batch = emailsToFetch.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(email => fetchUserPhoto(email).then(url => ({ email, url })))
        );

        if (cancelled) break;

        setPhotos(prev => {
          const next = new Map(prev);
          for (const result of results) {
            if (result.status === 'fulfilled') {
              next.set(result.value.email, result.value.url);
            }
          }
          return next;
        });
      }
      setIsLoading(false);
    };

    fetchBatch();

    return () => {
      cancelled = true;
    };
  }, [emails.join(',')]); // Use join to create stable dependency

  return { photos, isLoading };
}

/**
 * Clears the photo cache (useful for refresh scenarios)
 */
export function clearPhotoCache(): void {
  photoCache.clear();
}
