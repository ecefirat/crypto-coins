<script>
import { onMount } from "svelte";
import Nav from "./nav.svelte"

	let coins = [];
	let search = '';
	let searchResult = [];

	onMount(async () => {
		const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=aud&order=market_cap_desc&per_page=20&page=1&sparkline=false`)
		coins = await response.json()
		searchResult = coins;
	})

	const handleSearch = () => {
		if (search) {
			searchResult = coins.filter((coin) =>
				coin.name.toLowerCase().includes(search.toLowerCase())
			);
			
		} else {
			searchResult = [...coins];
		}
	};


</script>

<svelte:head>
	<title>Crypto-Coins</title>
</svelte:head>

<main class="p-8 max-w-6xl mx-auto bg-gray-600">
	<!-- <Nav /> -->
	<h1 class="text-gray-100 text-4xl text-center my-8 uppercase">Crypto-Tracker</h1>

<input
	type="text"
	class="w-full rounded-md text-lg p-4 border-2 border-gray-200 my-4"
	placeholder="Search a currency..."
	bind:value={search}
	on:input={handleSearch}
/>


<div class="grid gap-4 grid-cols-2 md:grid-cols-4">
	{#each searchResult as coin}
	<a
	class="p-6 bg-red-200 text-gray-800 text-center rounded-md shadow-sm hover:shadow-md flex flex-col items-center"
	href="/coin/${coin.id}"
>
	<img width="50" src={coin.image} alt={coin.name} />
	<h2>{coin.name}</h2>
	<p>$ {coin.current_price}</p>
</a>
	{/each}
</div>
	
</main>



<style global lang="postcss">
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
</style>