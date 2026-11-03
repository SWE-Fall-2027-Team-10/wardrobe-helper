import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
const TOKEN_KEY = "session_token";

export const errorMessage = (error: unknown): string =>
	error instanceof Error ? error.message : "Something went wrong.";

// Types

export type User = {
	user_id: number;
	first_name: string;
	last_name: string;
	email: string;
	role: string;
	verified: boolean;
	two_factor_enabled: boolean;
	date_of_birth: string | null;
};

export type Clothing = {
	clothing_id: number;
	user_id: number;
	name: string;
	category: string | null;
	color: string | null;
	size: string | null;
	brand: string | null;
	image_url: string | null;
	created_at: string;
};

export type ClothingInput = {
	name: string;
	category: string;
	color?: string;
	size?: string;
	brand?: string;
	image_url?: string;
};

export type Outfit = {
	outfit_id: number;
	user_id: number;
	outfit_name: string;
	description: string | null;
	items: Clothing[];
	created_at: string;
};

export type SharedOutfit = {
	share_id: number;
	outfit_id: number;
	outfit_name: string;
	visibility: "public" | "private";
	shared_at: string;
};

export type RegisterInput = {
	first_name: string;
	last_name: string;
	email: string;
	password: string;
	date_of_birth?: string;
};

// Error handling

export class ApiError extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message);
		this.name = "ApiError";
	}
}

// Token management (iOS Keychain)

export const getToken = async (): Promise<string | null> => {
	return SecureStore.getItemAsync(TOKEN_KEY);
};

const saveToken = async (token: string): Promise<void> => {
	await SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const clearToken = async (): Promise<void> => {
	await SecureStore.deleteItemAsync(TOKEN_KEY);
};

// API request helper

async function request<T>(
	path: string,
	options: {
		method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
		body?: unknown;
	} = {},
): Promise<T> {
	if (!API_URL) {
		throw new ApiError(
			"EXPO_PUBLIC_API_URL is missing. Add it to your .env file and restart Expo.",
			0,
		);
	}

	const token = await getToken();

	let response: Response;

	try {
		response = await fetch(`${API_URL}${path}`, {
			method: options.method ?? "GET",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			...(options.body !== undefined
				? { body: JSON.stringify(options.body) }
				: {}),
		});
	} catch {
		throw new ApiError(
			`Unable to connect to ${API_URL}. Check that your backend is running and accessible from iOS.`,
			0,
		);
	}

	const responseText = await response.text();

	let data: unknown = {};

	if (responseText) {
		try {
			data = JSON.parse(responseText);
		} catch {
			if (response.ok) {
				throw new ApiError(
					"Server returned an invalid JSON response.",
					response.status,
				);
			}
		}
	}

	if (!response.ok) {
		const errorData =
			data !== null && typeof data === "object"
				? (data as Record<string, unknown>)
				: {};

		const message =
			typeof errorData.error === "string"
				? errorData.error
				: typeof errorData.message === "string"
					? errorData.message
					: `Request failed (${response.status})`;

		if (response.status === 401 && token) {
			await clearToken();
		}

		throw new ApiError(message, response.status);
	}

	return data as T;
}

// API endpoints

export const api = {
	// Authentication

	register: (input: RegisterInput) =>
		request<{ message: string; user_id: number }>("/auth/register", {
			method: "POST",
			body: input,
		}),

	// Logs in and stores the session token securely on the device.
	// With two-factor sign-in on, the first call (no code) returns { twoFactorRequired: true, message }
	// and the server emails a code; call again with the same email + password and that code.
	login: async (
		email: string,
		password: string,
		code?: string,
	): Promise<{ user: User } | { twoFactorRequired: true; message: string }> => {
		const data = await request<
			| { token: string; user: User }
			| { two_factor_required: true; message: string }
		>("/auth/login", {
			method: "POST",
			body: code ? { email, password, code } : { email, password },
		});

		if ("two_factor_required" in data) {
			return { twoFactorRequired: true, message: data.message };
		}

		await saveToken(data.token);

		return { user: data.user };
	},

	logout: async (): Promise<void> => {
		try {
			await request("/auth/logout", {
				method: "POST",
			});
		} finally {
			await clearToken();
		}
	},

	// Emails the logged-in user a new verification code (the server knows who from the session token).
	sendVerification: () =>
		request<{ message: string }>("/auth/send-verification", {
			method: "POST",
		}),

	// Checks the 6-digit code from the email. On success the account is verified.
	checkVerification: (code: string) =>
		request<{ message: string }>("/auth/verify", {
			method: "POST",
			body: { verification_code: code },
		}),
	
	// Changes the logged-in user's password. The server checks current_password first.
	changePassword: (currentPassword: string, newPassword: string) =>
		request<{ message: string }>("/auth/password", {
			method: "PUT",
			body: { current_password: currentPassword, new_password: newPassword },
		}),

	// Change email, step 1: checks the password and emails a code to the NEW address.
	requestEmailChange: (currentPassword: string, newEmail: string) =>
		request<{ message: string }>("/auth/email/change", {
			method: "POST",
			body: { current_password: currentPassword, new_email: newEmail },
		}),

	// Change email, step 2: the code from that email. On success the new address is the account's email.
	confirmEmailChange: (code: string) =>
		request<{ message: string; email: string }>("/auth/email/confirm", {
			method: "POST",
			body: { code },
		}),

	// Forgot password, step 1 (no login needed): emails a reset code if an account uses this address.
	forgotPassword: (email: string) =>
		request<{ message: string }>("/auth/password/forgot", {
			method: "POST",
			body: { email },
		}),

	// Forgot password, step 2: the code from that email plus the new password.
	resetPassword: (email: string, code: string, newPassword: string) =>
		request<{ message: string }>("/auth/password/reset", {
			method: "POST",
			body: { email, code, new_password: newPassword },
		}),

	// Turns two-factor sign-in (an emailed code at every login) on or off. Needs the password.
	setTwoFactor: (enabled: boolean, currentPassword: string) =>
		request<{ message: string; two_factor_enabled: boolean }>("/auth/2fa", {
			method: "PUT",
			body: { enabled, current_password: currentPassword },
		}),

	me: () => request<User & Record<string, unknown>>("/auth/me"),

	// Permanently deletes the account (server re-checks the password). The session is gone afterwards,
	// so the saved token is forgotten too. Call this through useAuth().deleteAccount so the app logs out.
	deleteAccount: async (password: string): Promise<void> => {
		await request<{ message: string }>("/auth/me", {
			method: "DELETE",
			body: { password },
		});
		await clearToken();
	},

	// Clothing

	clothing: {
		list: (q = "") =>
			request<Clothing[]>(
				`/clothing${q ? `?q=${encodeURIComponent(q)}` : ""}`,
			),

		create: (input: ClothingInput) =>
			request<{ clothing_id: number }>("/clothing", {
				method: "POST",
				body: input,
			}),

		update: (id: number, input: Partial<ClothingInput>) =>
			request(`/clothing/${id}`, {
				method: "PUT",
				body: input,
			}),

		remove: (id: number) =>
			request(`/clothing/${id}`, {
				method: "DELETE",
			}),
	},

	// Outfits

	outfits: {
		list: () => request<Outfit[]>("/outfits"),

		create: (
			outfit_name: string,
			clothing_ids: number[],
			description = "",
		) =>
			request<{ outfit_id: number }>("/outfits", {
				method: "POST",
				body: {
					outfit_name,
					clothing_ids,
					description,
				},
			}),

		remove: (id: number) =>
			request(`/outfits/${id}`, {
				method: "DELETE",
			}),
	},

	// Favorites

	favorites: {
		list: () => request<Clothing[]>("/favorites"),

		add: (id: number) =>
			request(`/favorites/${id}`, {
				method: "POST",
			}),

		remove: (id: number) =>
			request(`/favorites/${id}`, {
				method: "DELETE",
			}),
	},

	// Outfit sharing

	sharing: {
		list: () => request<SharedOutfit[]>("/sharing"),

		set: (id: number, visibility: "public" | "private") =>
			request(`/sharing/${id}`, {
				method: "POST",
				body: { visibility },
			}),

		remove: (id: number) =>
			request(`/sharing/${id}`, {
				method: "DELETE",
			}),
	},
};
