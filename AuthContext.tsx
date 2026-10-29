// Who is logged in, plus sign in / sign out. Any screen can use: const { user, signIn, signOut, refreshUser } = useAuth();
// This file gives functionality to the AuthContext, which is used by the app to manage user authentication. 
// It provides the current user, signIn and signOut functions, and checks for a saved session on startup.
import {
	createContext,
	useContext,
	useEffect,
	useState,
	ReactNode,
} from "react";
import { View, ActivityIndicator } from "react-native";
import { api, clearToken, getToken, ApiError, User } from "./lib/api";

type AuthContextValue = {
	user: User | null; // null = logged out
	signIn: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
	refreshUser: () => Promise<void>; // re-fetch the user from the server, e.g. after verifying
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// gets the auth token for the user session
export const useAuth = () => {
	const auth = useContext(AuthContext);
	if (!auth) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return auth;
};

// Provides authentication context to the app
export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [checkingSession, setCheckingSession] = useState(true);

	// On startup, if a token was saved from an earlier login, ask the server who it belongs to.
	useEffect(() => {
		(async () => {
			try {
				if (await getToken()) {
					setUser(await api.me());
				}
			} catch (e) {
				// Expired or invalid session: forget the token so the login screen shows.
				if (e instanceof ApiError && e.status === 401)
					await clearToken();
			} finally {
				setCheckingSession(false);
			}
		})();
	}, []);

	const signIn = async (email: string, password: string) => {
		setUser(await api.login(email, password));
	};

	// Asks the server for the latest user. After /verify succeeds this flips user.verified to true,
	// which makes App.tsx switch from the verification screen to the main tabs.
	const refreshUser = async () => {
		setUser(await api.me());
	};

	const signOut = async () => {
		try {
			await api.logout();
		} catch {
			// Token is cleared locally either way; nothing else to do.
		}
		setUser(null);
	};

	if (checkingSession) {
		// Avoids flashing the login screen while the saved session is checked
		return (
			<View
				style={{
					flex: 1,
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				<ActivityIndicator />
			</View>
		);
	}

	return (
		<AuthContext.Provider value={{ user, signIn, signOut, refreshUser }}>
			{children}
		</AuthContext.Provider>
	);
}
