self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('fetch', function(event) {
  // Esse bloco vazio é o segredo! O Chrome exige que ele exista para liberar o botão de "Instalar Aplicativo".
});
