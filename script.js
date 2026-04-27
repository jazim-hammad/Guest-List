const { guestGroups, tables } = window.APP_DATA;

const STRINGS = {
  en: {
    heroCopy: "Find your seat in seconds. Search your name, tap once, and follow the route to your table.",
    lookupCopy: "Search by first or last name, then we will also show related family members at the same table.",
    directoryCopy: "Tables can now group related family members together for easier wayfinding.",
    searchPlaceholder: "Search first or last name",
    selectedGuest: "Selected Guest",
    quickView: "Quick View",
    familyLabel: "Family Group",
    tableCompanionsLabel: "Also at this table",
    helperOff: "I'm helping someone else",
    helperOn: "Helping family mode is on",
    findButton: "Find My Table",
    showFamily: "Show My Family",
    hideFamily: "Hide Family Highlight",
    textOnly: "Text Only View",
    showMap: "Show Map View",
    idleName: "Choose Your Name",
    idleDirection: "Select your guest name, then press Find My Table to draw the route from the entrance.",
    idleFamily: "Family-aware lookup is ready.",
    idleMembers: "When you search one guest, we will also show related family members at the same table.",
    noMatchName: "No matching guest",
    noMatchDirection: "Try a different search, then press Find My Table.",
    noMatchFamily: "No family group match yet.",
    noMatchMembers: "Try another spelling or search by a related first or last name.",
    guestNotFound: "Guest not found",
    guestNotFoundDirection: "Try another guest name from the list.",
    fallbackMembers: "This guest is currently listed on this table without another related guest.",
    suggestionFamilyPrefix: "Family: ",
    quickDirection: (table) => `${table.side} side, ${table.position}.`,
    routeDirection: (table) => `${table.name} is on the ${table.side.toLowerCase()} side, in the ${table.position.toLowerCase()} position. Follow the line from the entrance.`
  }
};

const guestSelect = document.querySelector("#guestSelect");
const searchInput = document.querySelector("#searchInput");
const suggestions = document.querySelector("#suggestions");
const guestName = document.querySelector("#guestName");
const tableHero = document.querySelector("#tableHero");
const guestDirection = document.querySelector("#guestDirection");
const familyGroup = document.querySelector("#familyGroup");
const familyMembers = document.querySelector("#familyMembers");
const leftWing = document.querySelector("#leftWing");
const rightWing = document.querySelector("#rightWing");
const directoryGrid = document.querySelector("#directoryGrid");
const tableCardTemplate = document.querySelector("#tableCardTemplate");
const routeSvg = document.querySelector("#routeSvg");
const routePath = document.querySelector("#routePath");
const routeTraveler = document.querySelector("#routeTraveler");
const entranceMarker = document.querySelector("#entranceMarker");
const findButton = document.querySelector("#findButton");
const helperModeToggle = document.querySelector("#helperModeToggle");
const showFamilyButton = document.querySelector("#showFamilyButton");
const textOnlyToggle = document.querySelector("#textOnlyToggle");
const textOnlyCard = document.querySelector("#textOnlyCard");
const textOnlyGuest = document.querySelector("#textOnlyGuest");
const textOnlyTable = document.querySelector("#textOnlyTable");
const textOnlyDirection = document.querySelector("#textOnlyDirection");
const largeTextToggle = document.querySelector("#largeTextToggle");
const highContrastToggle = document.querySelector("#highContrastToggle");
const heroCopy = document.querySelector(".hero-copy");
const lookupCopy = document.querySelector(".lookup .panel-header p");
const directoryCopy = document.querySelector(".directory .panel-header p");
const resultLabel = document.querySelector(".result-label");
const familyLabels = document.querySelectorAll(".family-label");

const allGuests = tables.flatMap((table) => table.guests);
const guestFamilyListMap = new Map();

guestGroups.forEach((group) => {
  group.members.forEach((member) => {
    if (!guestFamilyListMap.has(member)) {
      guestFamilyListMap.set(member, []);
    }
    guestFamilyListMap.get(member).push(group.family);
  });
});

let selectedGuest = allGuests[0];
let foundGuest = null;
let helperMode = false;
let highlightFamily = false;
let textOnlyMode = false;
let travelerAnimationId = null;

function t() {
  return STRINGS.en;
}

function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function levenshtein(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function familyListForGuest(guest) {
  return guestFamilyListMap.get(guest) || ["Guest Group"];
}

function relatedFamilyMembers(guest) {
  const related = new Set();

  familyListForGuest(guest).forEach((family) => {
    const group = guestGroups.find((item) => item.family === family);
    if (!group) return;
    group.members.forEach((member) => {
      if (member !== guest) related.add(member);
    });
  });

  return Array.from(related);
}

function findTableByGuest(guest) {
  return tables.find((table) => table.guests.includes(guest));
}

function searchCandidates(query) {
  const q = normalize(query);
  if (!q) {
    return allGuests.slice(0, 8).map((guest) => ({ guest, score: 0 }));
  }

  return allGuests
    .map((guest) => {
      const guestNameValue = normalize(guest);
      const familyValue = normalize(familyListForGuest(guest).join(" "));
      const guestTokens = guestNameValue.split(/\s+/);
      const familyTokens = familyValue.split(/\s+/);
      let score = 999;

      if (guestNameValue.includes(q)) score = Math.min(score, 0);
      if (familyValue.includes(q)) score = Math.min(score, 1);
      if (guestTokens.some((token) => token.startsWith(q))) score = Math.min(score, 0);
      if (familyTokens.some((token) => token.startsWith(q))) score = Math.min(score, 1);

      guestTokens.forEach((token) => {
        score = Math.min(score, levenshtein(q, token));
      });

      familyTokens.forEach((token) => {
        score = Math.min(score, levenshtein(q, token) + 1);
      });

      return { guest, score };
    })
    .filter((item) => item.score <= Math.max(3, Math.floor(q.length / 2) + 1))
    .sort((a, b) => a.score - b.score || a.guest.localeCompare(b.guest))
    .slice(0, 8);
}

function populateGuestSelect(guestList) {
  guestSelect.innerHTML = "";

  guestList.forEach((guest) => {
    const option = document.createElement("option");
    option.value = guest;
    option.textContent = guest;
    guestSelect.append(option);
  });

  if (!guestList.includes(selectedGuest)) {
    selectedGuest = guestList[0] || allGuests[0];
  }

  guestSelect.value = selectedGuest;
}

function renderSuggestions(query) {
  suggestions.innerHTML = "";
  const matches = searchCandidates(query);
  const guestList = query.trim() ? matches.map((item) => item.guest) : allGuests;

  populateGuestSelect(guestList);

  if (!query.trim()) return;

  matches.forEach(({ guest }) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "suggestion-chip";
    chip.innerHTML = `<span>${guest}</span><span class="suggestion-meta">${t().suggestionFamilyPrefix}${familyListForGuest(guest).join(" / ")}</span>`;
      chip.addEventListener("click", () => {
        selectedGuest = guest;
        guestSelect.value = guest;
        searchInput.value = guest;
        suggestions.innerHTML = "";
        findButton.disabled = false;
    });
    suggestions.append(chip);
  });
}

function createTableCard(table, context) {
  const fragment = tableCardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".table-card");
  const badge = fragment.querySelector(".table-badge");
  const name = fragment.querySelector(".table-name");
  const location = fragment.querySelector(".table-location");
  const guestTags = fragment.querySelector(".guest-tags");
  const familySet = foundGuest ? new Set([foundGuest, ...relatedFamilyMembers(foundGuest)]) : new Set();

  badge.textContent = table.id;
  name.textContent = table.name;
  location.textContent = `${table.side} side - ${table.position}`;
  card.dataset.tableId = String(table.id);
  card.dataset.context = context;

  table.guests.forEach((guest) => {
    const item = document.createElement("li");
    item.textContent = guest;

    if (foundGuest && guest === foundGuest) {
      item.classList.add("match");
      card.classList.add("active");
    }

    if (highlightFamily && familySet.has(guest)) {
      item.classList.add("family-match");
      card.classList.add("family-active");
    }

    guestTags.append(item);
  });

  return fragment;
}

function renderTables() {
  leftWing.innerHTML = "";
  rightWing.innerHTML = "";
  directoryGrid.innerHTML = "";

  tables.forEach((table) => {
    const targetWing = table.side === "Left" ? leftWing : rightWing;
    targetWing.append(createTableCard(table, "map"));
    directoryGrid.append(createTableCard(table, "directory"));
  });
}

function renderTextOnly(table) {
  if (!table || !foundGuest || !textOnlyMode) {
    textOnlyCard.hidden = true;
    return;
  }

  textOnlyCard.hidden = false;
  textOnlyGuest.textContent = foundGuest;
  textOnlyTable.textContent = table.name;
  textOnlyDirection.textContent = t().quickDirection(table);
}

function renderResult() {
  const table = findTableByGuest(foundGuest);

  if (!table || !foundGuest) {
    guestName.textContent = t().guestNotFound;
    tableHero.textContent = "";
    guestDirection.textContent = t().guestNotFoundDirection;
    familyGroup.textContent = t().idleFamily;
    familyMembers.textContent = t().idleMembers;
    renderTextOnly(null);
    return;
  }

  const tableCompanions = table.guests.filter((guest) => guest !== foundGuest);
  const relatedOnTable = relatedFamilyMembers(foundGuest).filter((guest) => table.guests.includes(guest));
  const relatedPool = helperMode ? relatedFamilyMembers(foundGuest) : relatedOnTable;
  const companionText = relatedPool.length > 0 ? relatedPool.join(", ") : (tableCompanions.length > 0 ? tableCompanions.join(", ") : t().fallbackMembers);

  guestName.textContent = foundGuest;
  tableHero.textContent = table.name;
  guestDirection.textContent = t().routeDirection(table);
  familyGroup.textContent = familyListForGuest(foundGuest).join(" / ");
  familyMembers.textContent = companionText;
  renderTextOnly(table);
}

function clearRoute() {
  routePath.setAttribute("d", "");
  routePath.classList.remove("visible");
  routeTraveler.classList.remove("visible");

  if (travelerAnimationId) {
    cancelAnimationFrame(travelerAnimationId);
    travelerAnimationId = null;
  }
}

function getCenterPoint(element, relativeTo) {
  const elementRect = element.getBoundingClientRect();
  const relativeRect = relativeTo.getBoundingClientRect();

  return {
    x: elementRect.left - relativeRect.left + elementRect.width / 2,
    y: elementRect.top - relativeRect.top + elementRect.height / 2
  };
}

function animateTraveler() {
  const totalLength = routePath.getTotalLength();
  const duration = 1200;
  const start = performance.now();
  routeTraveler.classList.add("visible");

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const point = routePath.getPointAtLength(totalLength * progress);
    routeTraveler.setAttribute("cx", point.x);
    routeTraveler.setAttribute("cy", point.y);

    if (progress < 1) {
      travelerAnimationId = requestAnimationFrame(step);
    }
  }

  travelerAnimationId = requestAnimationFrame(step);
}

function drawRoute() {
  const activeMapCard = document.querySelector('.table-card.active[data-context="map"]');
  const activeBadge = activeMapCard ? activeMapCard.querySelector(".table-badge") : null;
  const mapStage = routeSvg.parentElement;

  if (!activeMapCard || !activeBadge || !mapStage || textOnlyMode) {
    clearRoute();
    return;
  }

  const stageWidth = mapStage.clientWidth;
  const stageHeight = mapStage.clientHeight;
  routeSvg.setAttribute("viewBox", `0 0 ${stageWidth} ${stageHeight}`);

  const entrance = getCenterPoint(entranceMarker, mapStage);
  const target = getCenterPoint(activeBadge, mapStage);
  const badgeRect = activeBadge.getBoundingClientRect();
  const aisleX = stageWidth / 2;
  const badgeRadius = badgeRect.width / 2;
  const targetLaneY = Math.min(Math.max(target.y + badgeRadius + 18, 150), stageHeight - 150);

  const d = [
    `M ${entrance.x} ${entrance.y}`,
    `L ${aisleX} ${entrance.y - 24}`,
    `L ${aisleX} ${targetLaneY}`,
    `L ${target.x} ${targetLaneY}`,
    `L ${target.x} ${target.y}`
  ].join(" ");

  routePath.setAttribute("d", d);
  routePath.classList.remove("visible");
  routeTraveler.classList.remove("visible");
  void routePath.getBoundingClientRect();
  routePath.classList.add("visible");
  animateTraveler();
}

function renderFoundGuest() {
  renderResult();
  renderTables();
  window.requestAnimationFrame(drawRoute);
}

function renderIdleState() {
  guestName.textContent = t().idleName;
  tableHero.textContent = "";
  guestDirection.textContent = t().idleDirection;
  familyGroup.textContent = t().idleFamily;
  familyMembers.textContent = t().idleMembers;
  renderTables();
  renderTextOnly(null);
  clearRoute();
}

function updateCopy() {
  heroCopy.textContent = t().heroCopy;
  lookupCopy.textContent = t().lookupCopy;
  directoryCopy.textContent = t().directoryCopy;
  searchInput.placeholder = t().searchPlaceholder;
  resultLabel.textContent = t().selectedGuest;
  familyLabels[0].textContent = t().familyLabel;
  familyLabels[1].textContent = t().tableCompanionsLabel;
  findButton.textContent = t().findButton;
  helperModeToggle.textContent = helperMode ? t().helperOn : t().helperOff;
  showFamilyButton.textContent = highlightFamily ? t().hideFamily : t().showFamily;
  textOnlyToggle.textContent = textOnlyMode ? t().showMap : t().textOnly;
  document.querySelector("#textOnlyCard .result-label").textContent = t().quickView;
}

function applySearch(query) {
  renderSuggestions(query);
  const matches = query.trim() ? searchCandidates(query).map((item) => item.guest) : allGuests;

  if (matches.length === 0) {
    guestName.textContent = t().noMatchName;
    tableHero.textContent = "";
    guestDirection.textContent = t().noMatchDirection;
    familyGroup.textContent = t().noMatchFamily;
    familyMembers.textContent = t().noMatchMembers;
    textOnlyCard.hidden = true;
    findButton.disabled = true;
    return;
  }

  findButton.disabled = false;
}

guestSelect.addEventListener("change", () => {
  selectedGuest = guestSelect.value;
});

searchInput.addEventListener("input", () => {
  applySearch(searchInput.value);
});

findButton.addEventListener("click", () => {
  selectedGuest = guestSelect.value;
  foundGuest = selectedGuest;
  suggestions.innerHTML = "";
  renderFoundGuest();
});

helperModeToggle.addEventListener("click", () => {
  helperMode = !helperMode;
  helperModeToggle.setAttribute("aria-pressed", String(helperMode));
  helperModeToggle.classList.toggle("active", helperMode);
  updateCopy();
  if (foundGuest) renderFoundGuest();
});

showFamilyButton.addEventListener("click", () => {
  highlightFamily = !highlightFamily;
  showFamilyButton.classList.toggle("active", highlightFamily);
  updateCopy();
  if (foundGuest) renderFoundGuest();
  else renderTables();
});

textOnlyToggle.addEventListener("click", () => {
  textOnlyMode = !textOnlyMode;
  document.body.classList.toggle("text-only-mode", textOnlyMode);
  textOnlyToggle.classList.toggle("active", textOnlyMode);
  updateCopy();
  if (foundGuest) renderFoundGuest();
  else renderIdleState();
});

largeTextToggle.addEventListener("click", () => {
  document.body.classList.toggle("large-text");
  largeTextToggle.classList.toggle("active");
});

highContrastToggle.addEventListener("click", () => {
  document.body.classList.toggle("high-contrast");
  highContrastToggle.classList.toggle("active");
});

window.addEventListener("resize", () => {
  if (routePath.getAttribute("d")) {
    window.requestAnimationFrame(drawRoute);
  }
});

populateGuestSelect(allGuests);
updateCopy();
renderIdleState();
