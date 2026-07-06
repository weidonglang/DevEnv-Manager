import { navigateTo, workbenchRoutes } from "./router";

type PaletteCommand = {
  id: string;
  title: string;
  run: () => void;
};

function commands(): PaletteCommand[] {
  return [
    ...workbenchRoutes.map((route) => ({
      id: `view:${route.id}`,
      title: route.label,
      run: () => navigateTo(route.id),
    })),
    {
      id: "doctor:run",
      title: "Run Doctor",
      run: () => document.querySelector<HTMLButtonElement>("#run-doctor")?.click(),
    },
    {
      id: "snapshot:refresh",
      title: "Refresh Snapshot",
      run: () => document.querySelector<HTMLButtonElement>("#refresh")?.click(),
    },
  ];
}

export function registerCommandPalette(): void {
  let palette: HTMLDivElement | null = null;

  const close = () => {
    palette?.remove();
    palette = null;
  };

  const open = () => {
    close();
    palette = document.createElement("div");
    palette.className = "command-palette";
    palette.innerHTML = `
      <div class="command-palette__panel" role="dialog" aria-modal="true" aria-label="Command palette">
        <input class="command-palette__search" type="search" placeholder="Search commands" autofocus />
        <div class="command-palette__list" role="listbox"></div>
      </div>
    `;
    document.body.appendChild(palette);

    const input = palette.querySelector<HTMLInputElement>(".command-palette__search");
    const list = palette.querySelector<HTMLDivElement>(".command-palette__list");
    const allCommands = commands();

    const render = () => {
      const query = input?.value.trim().toLowerCase() ?? "";
      const visible = allCommands.filter((command) => command.title.toLowerCase().includes(query)).slice(0, 12);
      if (list) {
        list.innerHTML = visible
          .map((command) => `<button class="command-palette__item" data-command="${command.id}">${command.title}</button>`)
          .join("");
      }
    };

    input?.addEventListener("input", render);
    list?.addEventListener("click", (event) => {
      const item = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("[data-command]") : null;
      const command = allCommands.find((entry) => entry.id === item?.dataset.command);
      if (command) {
        command.run();
        close();
      }
    });
    palette.addEventListener("click", (event) => {
      if (event.target === palette) {
        close();
      }
    });
    render();
    input?.focus();
  };

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && palette) {
      close();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "p") {
      event.preventDefault();
      open();
    }
  });
}
