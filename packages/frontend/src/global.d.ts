/// <reference types="@sveltejs/kit" />

interface SolanaWindow extends Window {
	solana: providers.ExternalProvider;
}
