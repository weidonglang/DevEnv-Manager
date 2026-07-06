export function searchbox(id: string, placeholder = "Search"): string {
  return `<input id="${id}" class="searchbox" type="search" placeholder="${placeholder}" />`;
}
