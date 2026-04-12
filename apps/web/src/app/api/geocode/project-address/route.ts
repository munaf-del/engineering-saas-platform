import { NextRequest, NextResponse } from 'next/server';

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_TIMEOUT_MS = 5_000;

type NominatimSearchResult = {
  lat?: string;
  lon?: string;
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ message: 'q is required' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

  try {
    for (const candidateQuery of buildCandidateQueries(query)) {
      const searchUrl = new URL(NOMINATIM_SEARCH_URL);
      searchUrl.searchParams.set('q', candidateQuery);
      searchUrl.searchParams.set('format', 'json');
      searchUrl.searchParams.set('limit', '1');

      const response = await fetch(searchUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'EngPlatform/1.0',
        },
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!response.ok) {
        return NextResponse.json(
          { message: 'Geocoding request failed' },
          { status: response.status },
        );
      }

      const payload = (await response.json()) as NominatimSearchResult[];
      const firstResult = Array.isArray(payload) ? payload[0] : null;
      const latitude = Number(firstResult?.lat);
      const longitude = Number(firstResult?.lon);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        continue;
      }

      return NextResponse.json({
        result: {
          lat: latitude,
          lon: longitude,
        },
      });
    }

    return NextResponse.json({ result: null });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        { message: 'Geocoding request timed out' },
        { status: 504 },
      );
    }

    console.error('Project address geocoding failed', error);
    return NextResponse.json({ message: 'Geocoding request failed' }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}

function buildCandidateQueries(query: string) {
  const normalized = query.replace(/\s+/g, ' ').trim();
  const parts = normalized
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const candidates = [normalized];

  if (parts.length > 1) {
    candidates.push(parts.slice(1).join(', '));
  }

  return Array.from(new Set(candidates));
}
