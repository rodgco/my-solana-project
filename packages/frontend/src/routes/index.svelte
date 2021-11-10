<script lang="ts">
	import { onMount } from 'svelte';

	import { Writable, writable } from 'svelte/store';
	import ConnectWallet from '$lib/ConnectWalletButton.svelte';

	import { Connection, PublicKey, clusterApiUrl, ConfirmOptions } from '@solana/web3.js';
	import { Idl, Program, Provider, web3 } from '@project-serum/anchor';

	import idl from '$lib/idl.json';
	import kp from '$lib/keypair.json';

	// SystemProgram is a reference to the Solana runtime!
	const { SystemProgram /*, Keypair */ } = web3;

	// Create a keypair for the account that will hold the GIF data.
	// let baseAccount = Keypair.generate();
	const arr = Object.values(kp._keypair.secretKey);
	const secret = new Uint8Array(arr);
	const baseAccount = web3.Keypair.fromSecretKey(secret);

	// Get our program's id form the IDL file.
	const programID = new PublicKey(idl.metadata.address);

	// Set our network to devent.
	const network = clusterApiUrl('devnet');

	// Control's how we want to acknowledge when a trasnaction is "done".
	const opts: ConfirmOptions = {
		preflightCommitment: 'processed'
	};

	const TWITTER_LINK = 'https://twitter.com/rodg_co';
	const TWITTER_HANDLE = 'rodg_co';

	let gifList: Writable<{ gifLink: string }[] | null> = writable(null);

	let walletAddress = writable(null);
	let value = '';

	$: if ($walletAddress) {
		console.log('Connected with Public Key:', $walletAddress);
		getGifList().then((value) => ($gifList = value));
	}

	async function createGifAccount() {
		try {
			const provider = getProvider();
			const program = new Program(idl as Idl, programID, provider);
			await program.rpc.startStuffOff({
				accounts: {
					baseAccount: baseAccount.publicKey,
					user: provider.wallet.publicKey,
					systemProgram: SystemProgram.programId
				},
				signers: [baseAccount]
			});
			console.log('Created a new BaseAccount w/ address', baseAccount.publicKey.toString());
			$gifList = await getGifList();
		} catch (error) {
			console.log('Error creating BaseAccount account:', error);
		}
	}

	async function getGifList() {
		try {
			const provider = getProvider();
			const program = new Program(idl as Idl, programID, provider);
			const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
			console.log('GIF List ==>', account.gifList);
			return account.gifList;
		} catch (error) {
			await createGifAccount();
			console.log('Error getting gif list', error);
		}
		return null;
	}

	function getProvider() {
		const { solana } = window as any;

		const connection = new Connection(network, opts.preflightCommitment);
		const provider = new Provider(connection, solana, opts);
		return provider;
	}

	async function checkIfWalletIsConnected() {
		try {
			const { solana } = window as any;

			if (solana) {
				if (solana.isPhantom) {
					console.log('Phantom wallet found!');
					const response = await solana.connect({ onlyIfTrusted: true });

					$walletAddress = response.publicKey.toString();
				}
			} else {
				alert('Solana object not found! Get a Phantom Wallet 👻');
			}
		} catch (error) {
			console.error(error);
		}
	}

	function connectWallet(e: CustomEvent) {
		$walletAddress = e.detail;
	}

	function addGif(gif) {
		gifList.update((current) => [...current, { gifLink: gif }]);
	}

	async function sendGif() {
		if (value.length === 0) {
			console.log('No gif link given!');
			return;
		}
		console.log('Gif link:', value);
		try {
			const provider = getProvider();
			const program = new Program(idl as Idl, programID, provider);

			await program.rpc.addGif(value, {
				accounts: {
					baseAccount: baseAccount.publicKey,
					user: provider.wallet.publicKey
				}
			});
			console.log('GIF sucesfully sent to program', value);

			addGif(value);
			value = '';
		} catch (error) {
			console.log('Error sending GIF:', error);
		}
	}
	onMount(async () => {
		const { Buffer } = await import('buffer');
		window.Buffer = Buffer;
		//		console.log('Buffer ==>', Buffer);
		await checkIfWalletIsConnected();
	});
</script>

<div class="App">
	<div class="container">
		<div class="header-container">
			<p class="header">My Awesome Rick &amp; Morty GIF Collection</p>
			<p class="sub-text">Hosted in Solana ✨</p>
			{#if !$walletAddress}
				<ConnectWallet on:connect={connectWallet} />
			{:else}
				<div class="connected-container">
					{#if $gifList === null}
						<button class="cta-button submit-gif-button" on:click={createGifAccount}>
							Do One-Time Initialization for GIF Program Account
						</button>
					{:else}
						<input type="text" placeholder="Enter gif link!" bind:value />
						<button class="cta-button submit-gif-button" on:click|preventDefault={sendGif}
							>Submit</button
						>
						<div class="gif-grid">
							{#each $gifList as gif}
								<div class="gif-item">
									<img src={gif.gifLink} alt={gif.gifLink} />
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
	<div class="footer-container">
		<img alt="Twitter Logo" class="twitter-logo" src="/twitter-logo.svg" />
		<a class="footer-text" href={TWITTER_LINK} target="_blank" rel="noreferrer"
			>built by @{TWITTER_HANDLE}</a
		>
	</div>
</div>

<style>
	.App {
		background-color: #1a202c;
		color: white;
		text-align: center;
		min-height: 100vh;
	}

	.container {
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 0 30px 0 30px;
	}

	.authed-container {
		height: 100%;
		display: flex;
		flex-direction: column;
		padding: 30px;
	}

	.header {
		padding-top: 45px;
		margin: 0;
		font-size: 30px;
		font-weight: bold;
		color: white;
	}

	.sub-text {
		font-size: 25px;
		color: white;
	}

	.gradient-text {
		background: -webkit-linear-gradient(left, #60c657 30%, #35aee2 60%);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.cta-button {
		height: 45px;
		border: 0;
		width: auto;
		padding-left: 40px;
		padding-right: 40px;
		border-radius: 10px;
		cursor: pointer;
		font-size: 16px;
		font-weight: bold;
		color: white;
	}

	.connect-wallet-button {
		background: -webkit-linear-gradient(left, #60c657, #35aee2);
		background-size: 200% 200%;
		animation: gradient-animation 4s ease infinite;
	}

	.submit-gif-button {
		background: -webkit-linear-gradient(left, #4e44ce, #35aee2);
		background-size: 200% 200%;
		animation: gradient-animation 4s ease infinite;
		margin-left: 10px;
	}

	.footer-container {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 45px;
	}

	.twitter-logo {
		width: 35px;
		height: 35px;
	}

	.footer-text {
		color: white;
		font-size: 16px;
		font-weight: bold;
	}

	.gif-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		grid-gap: 1.5rem;
		justify-items: center;
		margin: 0;
		padding: 0;
	}

	.gif-grid .gif-item {
		display: flex;
		flex-direction: column;
		position: relative;
		justify-self: center;
		align-self: center;
	}

	.gif-item img {
		width: 100%;
		border-radius: 10px;
		object-fit: cover;
	}

	.connected-container input[type='text'] {
		display: inline-block;
		color: white;
		padding: 10px;
		width: 50%;
		height: 60px;
		font-size: 16px;
		box-sizing: border-box;
		background-color: rgba(0, 0, 0, 0.25);
		border: none;
		border-radius: 10px;
		margin: 50px auto;
	}

	.connected-container button {
		height: 50px;
	}
</style>
