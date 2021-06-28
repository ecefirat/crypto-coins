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

	const getNumber = function(num) {
    var units = ["M","B","T","Q"]
    var unit = Math.floor((num / 1.0e+1).toFixed(0).toString().length)
    var r = unit%3
    var x =  Math.abs(Number(num))/Number('1.0e+'+(unit-r)).toFixed(0)
	const mc = x.toFixed(0)+ ' ' + units[Math.floor(unit / 3) - 2];
	return mc;
};


</script>

<svelte:head>
	<title>Crypto-Coins</title>
</svelte:head>

<main class="p-8 max-w-7xl mx-auto bg-gray-600 font-mono">
	<!-- <Nav /> -->
	<h1 class="text-gray-100 font-semibold md:text-4xl sm:text-xl text-center mt-8 uppercase">Crypto-Tracker</h1>
	<p class="text-gray-300 md:text-sm sm:text-xs italic text-center">for the highest 20 cryptocurrency</p>
	<h3 class="text-gray-200 md:text-2xl sm:text-sm text-center italic my-6">Market Cap Rank, Current Price, 24 Hour % Change and Market Cap Information</h3>

<input
	type="text"
	class="w-full rounded-md text-lg p-4 border-2 border-gray-200 my-4"
	placeholder="Search a currency..."
	bind:value={search}
	on:input={handleSearch}
/>


<div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
	{#each searchResult as coin}
	<div
	class="p-4 bg-red-200 text-gray-800 text-center rounded-md shadow-sm hover:shadow-md flex flex-col items-center"
	href="/coin/${coin.id}"
>	
<p class="mb-2">{coin.market_cap_rank}.</p>
<img class="w-16 h-16" src={coin.image} alt={coin.name} />
	<p class="text-lg">{coin.name}</p>
	<p>$ {coin.current_price.toFixed(2)}</p>
	{#if coin.price_change_percentage_24h > 0}
	<p class="text-green-500">%{coin.price_change_percentage_24h.toFixed(2)}</p>
	{:else}
	<p class="text-red-500">%{coin.price_change_percentage_24h.toFixed(2)}</p>
{/if}
<p class="font-semibold">{getNumber(coin.market_cap)}</p>

</div>
	{/each}
</div>
	
</main>



<style global lang="postcss">
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
</style>