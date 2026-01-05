const API_URL =
  "https://script.google.com/macros/s/AKfycbxyDCo_V-LXSWRPNkKGTGZWIODNBIbQGb5cClfKMwTXosGiqHaLmIQCC_ogYpmt2NcP/exec";

export async function fetchProdutos() {
  const res = await fetch(`${API_URL}?path=produtos`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Erro ao buscar produtos");
  }

  const json = await res.json();
  return json.data;
}
