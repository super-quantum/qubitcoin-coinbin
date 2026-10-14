/* Service worker for the installable (PWA) version of the wallet.
 *
 * Strategy is network-first: while online the wallet files always come from
 * the server, so an installed wallet never runs stale code. The cache is only
 * used as a fallback, which lets the offline tools (key generation, signing,
 * decoding...) keep working without a connection.
 *
 * Only same-origin GET requests are handled. Calls to external APIs (balance,
 * unspent outputs, broadcast) are left untouched and are never cached. */
var CACHE = 'qubitcoin-wallet-v1';

var FILES = [
	'./',
	'manifest.json',
	'css/bootstrap-datetimepicker.min.css',
	'css/bootstrap.min.css',
	'css/style.css',
	'js/aes.js',
	'js/bootstrap-datetimepicker.min.js',
	'js/bootstrap.min.js',
	'js/coinbin.js',
	'js/coin.js',
	'js/collapse.js',
	'js/crypto-min.js',
	'js/crypto-sha256-hmac.js',
	'js/crypto-sha256.js',
	'js/ellipticcurve.js',
	'js/jquery-1.9.1.min.js',
	'js/jsbn.js',
	'js/moment.min.js',
	'js/qcode-decoder.min.js',
	'js/qrcode.js',
	'js/ripemd160.js',
	'js/sha512.js',
	'js/transition.js',
	'fonts/glyphicons-halflings-regular.eot',
	'fonts/glyphicons-halflings-regular.svg',
	'fonts/glyphicons-halflings-regular.ttf',
	'fonts/glyphicons-halflings-regular.woff',
	'fonts/glyphicons-halflings-regular.woff2',
	'images/apple-touch-icon.png',
	'images/exbitron16x.png',
	'images/favicon.ico',
	'images/icon-192.png',
	'images/icon-512.png',
	'images/icon-maskable-512.png',
	'images/loader.gif',
	'images/qubitcoin.png',
	'images/safetrade16x.png'
];

self.addEventListener('install', function(event) {
	event.waitUntil(caches.open(CACHE).then(function(cache) {
		return cache.addAll(FILES);
	}).then(function() {
		return self.skipWaiting();
	}));
});

self.addEventListener('activate', function(event) {
	event.waitUntil(caches.keys().then(function(keys) {
		return Promise.all(keys.filter(function(key) {
			return key !== CACHE;
		}).map(function(key) {
			return caches.delete(key);
		}));
	}).then(function() {
		return self.clients.claim();
	}));
});

self.addEventListener('fetch', function(event) {
	var request = event.request;
	if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
		return;
	}

	event.respondWith(fetch(request).then(function(response) {
		if (response.ok) {
			var copy = response.clone();
			caches.open(CACHE).then(function(cache) {
				cache.put(request, copy);
			});
		}
		return response;
	}).catch(function() {
		return caches.match(request, {ignoreSearch: true}).then(function(cached) {
			return cached || Response.error();
		});
	}));
});
