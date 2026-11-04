export async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "Не получилось выполнить запрос");
    error.status = response.status;
    throw error;
  }
  return data;
}
