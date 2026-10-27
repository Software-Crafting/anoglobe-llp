// Overlays: placement, tooltip, hover card, popover, menus (with submenus), context menu,
// command palette, dialogs and sheets. Keyboard: Escape closes and returns focus, menus use arrows.
(() => {
  const GAP = 6;
  const EDGE = 8;

  // Place a fixed-position layer next to an anchor rect, flipping and clamping inside the viewport.
  function place(layer, anchor, side = "bottom", align = "start") {
    const rect = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : anchor;
    layer.style.left = "0px";
    layer.style.top = "0px";
    const box = layer.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top;
    let left;
    if (side === "right" || side === "left") {
      left = side === "right" ? rect.right + GAP : rect.left - box.width - GAP;
      if (left + box.width > vw - EDGE) left = rect.left - box.width - GAP;
      if (left < EDGE) left = rect.right + GAP;
      top = rect.top + rect.height / 2 - box.height / 2;
    } else {
      top = side === "top" ? rect.top - box.height - GAP : rect.bottom + GAP;
      if (side !== "top" && top + box.height > vh - EDGE && rect.top - box.height - GAP > EDGE) top = rect.top - box.height - GAP;
      if (side === "top" && top < EDGE) top = rect.bottom + GAP;
      left = align === "end" ? rect.right - box.width : align === "center" ? rect.left + rect.width / 2 - box.width / 2 : rect.left;
    }
    left = Math.min(Math.max(EDGE, left), vw - box.width - EDGE);
    top = Math.min(Math.max(EDGE, top), vh - box.height - EDGE);
    layer.style.left = `${Math.round(left)}px`;
    layer.style.top = `${Math.round(top)}px`;
  }

  const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), textarea, [tabindex]:not([tabindex="-1"])';

  /* ---------- Tooltip: [data-tooltip="text"], optional data-tooltip-side ---------- */
  const tooltip = document.createElement("div");
  tooltip.className = "a-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.id = "a-tooltip";
  tooltip.hidden = true;
  let tooltipTimer = 0;
  let tooltipOwner = null;

  function showTooltip(owner, delay) {
    clearTimeout(tooltipTimer);
    tooltipTimer = setTimeout(() => {
      if (!owner.isConnected) return;
      // Collapsed admin sidebar only: labels are hidden there, so the tooltip carries the name.
      if (owner.dataset.tooltipWhen === "collapsed" && !owner.closest(".is-collapsed")) return;
      if (!tooltip.isConnected) document.body.append(tooltip);
      tooltip.textContent = owner.dataset.tooltip;
      tooltip.hidden = false;
      tooltipOwner = owner;
      if (!owner.hasAttribute("aria-label") && !owner.textContent.trim()) owner.setAttribute("aria-describedby", tooltip.id);
      place(tooltip, owner, owner.dataset.tooltipSide || "top", "center");
    }, delay);
  }

  function hideTooltip() {
    clearTimeout(tooltipTimer);
    tooltip.hidden = true;
    tooltipOwner = null;
  }

  document.addEventListener("pointerover", (event) => {
    const owner = event.target.closest("[data-tooltip]");
    if (owner && owner !== tooltipOwner) showTooltip(owner, 400);
    if (!owner) hideTooltip();
  });
  document.addEventListener("focusin", (event) => {
    const owner = event.target.closest?.("[data-tooltip]");
    if (owner && event.target.matches(":focus-visible")) showTooltip(owner, 200);
    else hideTooltip();
  });
  document.addEventListener("focusout", hideTooltip);
  window.addEventListener("scroll", hideTooltip, { passive: true, capture: true });

  /* ---------- Hover card: [data-hovercard="id"] on a link ---------- */
  let hoverTimer = 0;
  function openHovercard(trigger) {
    const card = document.getElementById(trigger.dataset.hovercard);
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      card.hidden = false;
      place(card, trigger, "bottom", "start");
    }, 300);
  }
  function closeHovercard(trigger) {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => (document.getElementById(trigger.dataset.hovercard).hidden = true), 200);
  }
  document.addEventListener("pointerover", (event) => {
    const trigger = event.target.closest("[data-hovercard]");
    if (trigger) openHovercard(trigger);
    const card = event.target.closest(".a-hovercard");
    if (card) clearTimeout(hoverTimer);
  });
  document.addEventListener("pointerout", (event) => {
    const trigger = event.target.closest("[data-hovercard]") || document.querySelector(`[data-hovercard="${event.target.closest(".a-hovercard")?.id}"]`);
    if (trigger && !event.relatedTarget?.closest?.(".a-hovercard, [data-hovercard]")) closeHovercard(trigger);
  });
  document.addEventListener("focusin", (event) => {
    const trigger = event.target.closest?.("[data-hovercard]");
    if (trigger) openHovercard(trigger);
  });
  document.addEventListener("focusout", (event) => {
    const trigger = event.target.closest?.("[data-hovercard]");
    if (trigger) closeHovercard(trigger);
  });

  /* ---------- Popover: <button data-popover-trigger aria-controls="id" aria-expanded> ---------- */
  let openPopover = null;
  function togglePopover(trigger, force) {
    const layer = document.getElementById(trigger.getAttribute("aria-controls"));
    const open = force ?? layer.hidden;
    if (openPopover && openPopover.trigger !== trigger) closePopover(false);
    layer.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    if (open) {
      place(layer, trigger, trigger.dataset.side || "bottom", trigger.dataset.align || "end");
      openPopover = { trigger, layer };
      (layer.querySelector("[autofocus]") || layer.querySelector(focusableSelector))?.focus();
    } else {
      openPopover = null;
    }
  }
  function closePopover(returnFocus = true) {
    if (!openPopover) return;
    const { trigger } = openPopover;
    togglePopover(trigger, false);
    if (returnFocus) trigger.focus();
  }

  /* ---------- Menus ---------- */
  const openMenus = [];
  const items = (menu) => [...menu.querySelectorAll(":scope > [role^=menuitem], :scope > div > [role^=menuitem]")].filter((item) => item.getAttribute("aria-disabled") !== "true");

  function openMenu(menu, anchor, { side = "bottom", align = "start", focus = "first", point } = {}) {
    menu.hidden = false;
    if (point) place(menu, { top: point.y, bottom: point.y, left: point.x, right: point.x, width: 0, height: 0 }, "bottom", "start");
    else place(menu, anchor, side, align);
    openMenus.push({ menu, anchor });
    if (anchor?.setAttribute) anchor.setAttribute("aria-expanded", "true");
    const list = items(menu);
    for (const item of list) item.tabIndex = -1;
    const target = focus === "last" ? list.at(-1) : list[0];
    target?.focus();
  }

  function closeMenusFrom(index, returnFocus) {
    while (openMenus.length > index) {
      const { menu, anchor } = openMenus.pop();
      menu.hidden = true;
      anchor?.setAttribute?.("aria-expanded", "false");
      if (returnFocus && openMenus.length === index) anchor?.focus?.();
    }
  }

  function activate(item) {
    const role = item.getAttribute("role");
    if (item.getAttribute("aria-haspopup") === "menu") {
      const sub = document.getElementById(item.getAttribute("aria-controls"));
      return openMenu(sub, item, { side: "right" });
    }
    if (role === "menuitemcheckbox") {
      item.setAttribute("aria-checked", String(item.getAttribute("aria-checked") !== "true"));
      return;
    }
    if (role === "menuitemradio") {
      for (const other of item.parentElement.querySelectorAll("[role=menuitemradio]")) other.setAttribute("aria-checked", String(other === item));
      return;
    }
    const label = item.textContent.trim();
    closeMenusFrom(0, true);
    if (item.tagName === "A") return;
    item.dispatchEvent(new CustomEvent("a-menu-select", { bubbles: true, detail: { label } }));
    if (item.dataset.toast) window.Anoglobe?.toast?.(item.dataset.toast);
  }

  function onMenuKey(event) {
    const item = event.target.closest("[role^=menuitem]");
    const menu = event.target.closest("[role=menu]");
    if (!item || !menu) return;
    const list = items(menu);
    const index = list.indexOf(item);
    const level = openMenus.findIndex((entry) => entry.menu === menu);
    const go = (target) => {
      event.preventDefault();
      target?.focus();
    };
    switch (event.key) {
      case "ArrowDown":
        return go(list[(index + 1) % list.length]);
      case "ArrowUp":
        return go(list[(index - 1 + list.length) % list.length]);
      case "Home":
        return go(list[0]);
      case "End":
        return go(list.at(-1));
      case "ArrowRight":
        if (item.getAttribute("aria-haspopup") === "menu") {
          event.preventDefault();
          activate(item);
        }
        return;
      case "ArrowLeft":
        if (level > 0) {
          event.preventDefault();
          closeMenusFrom(level, true);
        }
        return;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        return closeMenusFrom(Math.max(0, level), true);
      case "Tab":
        return closeMenusFrom(0, false);
      case "Enter":
      case " ":
        event.preventDefault();
        return item.tagName === "A" && event.key === "Enter" ? item.click() : activate(item);
      default:
        if (event.key.length === 1) {
          const match = list.slice(index + 1).concat(list.slice(0, index + 1)).find((entry) => entry.textContent.trim().toLowerCase().startsWith(event.key.toLowerCase()));
          if (match) go(match);
        }
    }
  }

  /* ---------- Dialogs: <dialog class="a-dialog">, open with [data-dialog-open="id"], close with [data-dialog-close] ---------- */
  function openDialog(id, opener) {
    const dialog = document.getElementById(id);
    dialog.opener = opener;
    dialog.showModal();
    const body = dialog.querySelector(".a-dialog__body");
    (dialog.querySelector("[autofocus]") || body?.querySelector(focusableSelector) || dialog.querySelector(focusableSelector))?.focus();
  }

  /* ---------- Command palette ---------- */
  function initCommand(dialog) {
    const input = dialog.querySelector(".a-command__input");
    const list = dialog.querySelector("[role=listbox]");
    const options = () => [...list.querySelectorAll("[role=option]")];
    const visible = () => options().filter((option) => !option.hidden);
    const empty = list.querySelector(".a-listbox__empty");
    let active = null;
    const setActive = (option) => {
      for (const item of options()) item.classList.toggle("is-active", item === option);
      active = option;
      if (option) {
        input.setAttribute("aria-activedescendant", option.id);
        option.scrollIntoView({ block: "nearest" });
      } else input.removeAttribute("aria-activedescendant");
    };
    const filter = () => {
      const query = input.value.trim().toLowerCase();
      for (const option of options()) option.hidden = query !== "" && !option.textContent.toLowerCase().includes(query);
      for (const group of list.querySelectorAll("[role=group]")) group.parentElement.hidden = !group.querySelector("[role=option]:not([hidden])");
      if (empty) empty.hidden = visible().length > 0;
      setActive(visible()[0] || null);
    };
    const go = (option) => {
      if (!option) return;
      dialog.close();
      if (option.dataset.href) window.location.href = option.dataset.href;
      else if (option.dataset.toast) window.Anoglobe?.toast?.(option.dataset.toast);
    };
    input.addEventListener("input", filter);
    input.addEventListener("keydown", (event) => {
      const list = visible();
      const index = list.indexOf(active);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setActive(list[(index + (event.key === "ArrowDown" ? 1 : -1) + list.length) % list.length]);
      }
      if (event.key === "Enter") {
        event.preventDefault();
        go(active);
      }
    });
    list.addEventListener("click", (event) => go(event.target.closest("[role=option]")));
    list.addEventListener("mousedown", (event) => event.preventDefault());
    dialog.addEventListener("close", () => {
      input.value = "";
      filter();
    });
    dialog.resetCommand = filter;
    filter();
  }

  /* ---------- Wiring ---------- */
  document.addEventListener("click", (event) => {
    const dialogOpen = event.target.closest("[data-dialog-open]");
    if (dialogOpen) return openDialog(dialogOpen.dataset.dialogOpen, dialogOpen);
    const dialogClose = event.target.closest("[data-dialog-close]");
    if (dialogClose) {
      const dialog = dialogClose.closest("dialog");
      dialog.close(dialogClose.dataset.dialogClose || "");
      if (dialogClose.dataset.toast) window.Anoglobe?.toast?.(dialogClose.dataset.toast, dialogClose.dataset.toastVariant);
      return;
    }
    // Click on the dialog backdrop closes it.
    if (event.target.matches?.("dialog.a-dialog") && event.target.dataset.dismissable !== "false") {
      const rect = event.target.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close();
    }

    const commandOpen = event.target.closest("[data-command-open]");
    if (commandOpen) {
      const command = document.getElementById("command-palette");
      if (command) {
        command.showModal();
        command.querySelector(".a-command__input").focus();
      }
      return;
    }

    const popoverTrigger = event.target.closest("[data-popover-trigger]");
    if (popoverTrigger) return togglePopover(popoverTrigger);
    if (openPopover && !openPopover.layer.contains(event.target)) closePopover(false);

    const menuTrigger = event.target.closest("[data-menu-trigger]");
    if (menuTrigger) {
      const menu = document.getElementById(menuTrigger.getAttribute("aria-controls"));
      const wasOpen = !menu.hidden;
      closeMenusFrom(0, false);
      if (!wasOpen) openMenu(menu, menuTrigger, { align: menuTrigger.dataset.align || "start" });
      return;
    }
    const menuItem = event.target.closest("[role^=menuitem]");
    if (menuItem) return activate(menuItem);
    if (openMenus.length && !event.target.closest("[role=menu]")) closeMenusFrom(0, false);
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      const command = document.getElementById("command-palette");
      if (command) {
        event.preventDefault();
        if (command.open) command.close();
        else {
          command.showModal();
          command.querySelector(".a-command__input").focus();
        }
      }
      return;
    }
    const trigger = event.target.closest?.("[data-menu-trigger]");
    if (trigger && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      openMenu(document.getElementById(trigger.getAttribute("aria-controls")), trigger, { focus: event.key === "ArrowUp" ? "last" : "first", align: trigger.dataset.align || "start" });
      return;
    }
    const contextArea = event.target.closest?.("[data-context-menu]");
    if (contextArea && (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) {
      event.preventDefault();
      const rect = contextArea.getBoundingClientRect();
      closeMenusFrom(0, false);
      openMenu(document.getElementById(contextArea.dataset.contextMenu), contextArea, { point: { x: rect.left + 24, y: rect.top + 24 } });
      openMenus.at(-1).anchor = contextArea;
      return;
    }
    if (event.target.closest?.("[role=menu]")) return onMenuKey(event);
    if (event.key === "Escape") {
      if (openPopover) closePopover(true);
      hideTooltip();
    }
  });

  document.addEventListener("contextmenu", (event) => {
    const area = event.target.closest("[data-context-menu]");
    if (!area) return;
    event.preventDefault();
    closeMenusFrom(0, false);
    openMenu(document.getElementById(area.dataset.contextMenu), null, { point: { x: event.clientX, y: event.clientY } });
    openMenus.at(-1).anchor = area;
  });

  window.addEventListener("resize", () => {
    closeMenusFrom(0, false);
    if (openPopover) place(openPopover.layer, openPopover.trigger, openPopover.trigger.dataset.side || "bottom", openPopover.trigger.dataset.align || "end");
  });

  document.addEventListener("DOMContentLoaded", () => {
    const command = document.getElementById("command-palette");
    if (command) initCommand(command);
  });

  window.Anoglobe = Object.assign(window.Anoglobe || {}, { place, openDialog });
})();
