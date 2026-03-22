const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class ApiError extends Error {
	status: number;
	constructor(message: string, status: number) {
		super(message);
		this.status = status;
		this.name = 'ApiError'
	}
}

// A generic fetcher that handlers the boilerplate
export async function fetcher<T>(endpoint: string, options?: RequestInit): Promise<T> {
	// 1. Safely initialize a native Headers object with any passed-in headers
	const headers = new Headers(options?.headers);

	// 2. Attach the token directly if we have one
	const token = localStorage.getItem('token');
	if (token) {
		headers.set('Authorization', `Bearer ${token}`)
	}

	// 3. Execute the fetch with our perfectly typed headers
	const response = await fetch(`${BASE_URL}${endpoint}`, {
		...options, 
		headers 
	});

	if (!response.ok) {
		const errData = await response.json().catch(() => ({}));
		throw new ApiError (
			errData.error || `An error occurred`,
			response.status
		);
	}

	return response.json();
}
