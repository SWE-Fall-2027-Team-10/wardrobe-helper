import { useState } from "react";
import {
	StyleSheet,
	Text,
	Pressable,
	TextInput,
	ActivityIndicator,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, ParamListBase } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../../AuthContext";
import { useTheme } from "../../themes/ThemeContext";
import { api, errorMessage } from "../../lib/api";

export default function VerificationScreen() {
    const { signOut } = useAuth();
    const theme = useTheme();
    const navigation =
        useNavigation<NativeStackNavigationProp<ParamListBase>>();

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const onSendVerification = async () => {
        setError("");
        setLoading(true);

        try {
            await api.sendVerification(email.trim());
            alert("Verification email sent. Please check your inbox.");
        } catch (e) {
            const message = errorMessage(e);
            console.error("SEND VERIFICATION ERROR:", e);
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView
            style={[styles.container, { backgroundColor: theme.background }]}
        >
            <Text style={[styles.title, { color: theme.text }]}>
                Account Verification, please enter the code sent to your email below.
            </Text>
            <Text style={[styles.instructions, { color: theme.text }]}>
                Please check your email for a verification link. If you haven't received it, you can request a new verification email below.
            </Text>
            <TextInput
                style={[
                    styles.input,
                    {
                        borderColor: theme.border,
                        backgroundColor: theme.surface,
                        color: theme.text,
                    },
                ]}
                placeholder="Verification Code"
                placeholderTextColor={theme.text}
                autoCapitalize="none"
                keyboardType="numeric"
            />
            {error ? (
                <Text style={[styles.error, { color: "#d32f2f" }]}>{error}</Text>
            ) : null}

            // TODO: Create a "Verify" button that sends the verification code to the backend for verification. If successful, sign the user in and navigate to the main app. If unsuccessful, show an error message.

            <Pressable
                style={[styles.button, { backgroundColor: theme.primary }]}
                onPress={onSendVerification}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color={theme.primary} />
                ) : (
                    <Text style={[styles.buttonText, { color: theme.primary }]}>
                        Resend Verification Email
                    </Text>
                )}
            </Pressable>

            <Pressable
                style={[styles.button, { backgroundColor: theme.primary }]}
                onPress={() => signOut().then(() => navigation.navigate("Login"))}
            >
                <Text style={[styles.buttonText, { color: theme.primary }]}>
                    Back to Login
                </Text>
            </Pressable>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: "center",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
        textAlign: "center",
    },
    instructions: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: "center",
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    button: {
        height: 50,
        borderRadius: 5,
        justifyContent: "center",
        alignItems: "center",
    },
    buttonText: {
        fontSize: 16,
        fontWeight: "bold",
    },
    error: {
        marginBottom: 10,
        textAlign: "center",
    },
}); 