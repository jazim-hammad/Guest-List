const guestGroups = [
  {
    family: "Hammad Khan Family",
    members: ["Jazim Hammad Khan", "Hammad Amjad Khan", "Farina Hammad Khan", "Azlan Hammad Khan", "Aleeza Noor"]
  },
  {
    family: "Vanees Family",
    members: ["Vanees Karim", "Abdul Aziz Vanees", "Affan Vanees", "Hafsa Vanees", "Atika Vanees", "Aleeza Noor"]
  },
  {
    family: "Athar Family",
    members: ["Basmah Athar", "Athar Mohsin", "Ayesha Athar", "Hamza Athar"]
  },
  {
    family: "Babar Family",
    members: ["Babar Rauf", "Izza Babar", "Moeez Babar", "Rayan Babar"]
  },
  {
    family: "Bhatti Family",
    members: ["Faisal Bhatti", "Arshia Faisal", "Imaan Bhatti", "Sameen Bhatti", "Aiza Bhatti"]
  },
  {
    family: "Qureshi Family",
    members: ["Nouman Qureshi", "Samiha Nouman", "Azaan Qureshi", "Inaya Qureshi", "Hannan Qureshi"]
  },
  {
    family: "Azhar Khan Family",
    members: ["Jawad Azhar Khan", "Nazish Jawad", "Zoha Jawad", "Roumaisa Jawad"]
  },
  {
    family: "Noor Family",
    members: ["Maria Noor", "Ayesha Noor"]
  }
];

const tables = [
  { id: 1, name: "Table 1", side: "Left", position: "Front Left", guests: ["Jazim Hammad Khan", "Hammad Amjad Khan", "Farina Hammad Khan", "Azlan Hammad Khan"] },
  { id: 2, name: "Table 2", side: "Left", position: "Front Right", guests: ["Vanees Karim", "Abdul Aziz Vanees", "Affan Vanees"] },
  { id: 3, name: "Table 3", side: "Left", position: "Back Left", guests: ["Hafsa Vanees", "Atika Vanees", "Aleeza Noor", "Maria Noor", "Ayesha Noor"] },
  { id: 4, name: "Table 4", side: "Left", position: "Back Right", guests: ["Basmah Athar", "Athar Mohsin", "Ayesha Athar", "Hamza Athar"] },
  { id: 5, name: "Table 5", side: "Right", position: "Front Left", guests: ["Babar Rauf", "Izza Babar", "Moeez Babar", "Rayan Babar"] },
  { id: 6, name: "Table 6", side: "Right", position: "Front Right", guests: ["Faisal Bhatti", "Arshia Faisal", "Imaan Bhatti"] },
  { id: 7, name: "Table 7", side: "Right", position: "Back Left", guests: ["Sameen Bhatti", "Aiza Bhatti", "Jawad Azhar Khan", "Nazish Jawad", "Zoha Jawad", "Roumaisa Jawad"] },
  { id: 8, name: "Table 8", side: "Right", position: "Back Right", guests: ["Nouman Qureshi", "Samiha Nouman", "Azaan Qureshi", "Inaya Qureshi", "Hannan Qureshi"] }
];

const guestSelect = document.querySelector("#guestSelect");
const searchInput = document.querySelector("#searchInput");
const guestName = document.querySelector("#guestName");
const guestDirection = document.querySelector("#guestDirection");
const familyGroup = document.querySelector("#familyGroup");
const familyMembers = document.querySelector("#familyMembers");
const leftWing = document.querySelector("#leftWing");
const rightWing = document.querySelector("#rightWing");
const directoryGrid = document.querySelector("#directoryGrid");
const tableCardTemplate = document.querySelector("#tableCardTemplate");
const routeSvg = document.querySelector("#routeSvg");
const routePath = document.querySelector("#routePath");
const entranceMarker = document.querySelector("#entranceMarker");
const findButton = document.querySelector("#findButton");

const allGuests = tables.flatMap((table) => table.guests);
const guestFamilyMap = new Map();
const guestFamilyListMap = new Map();

guestGroups.forEach((group) => {
  group.members.forEach((member) => {
    if (!guestFamilyListMap.has(member)) {
      guestFamilyListMap.set(member, []);
    }
    guestFamilyListMap.get(member).push(group.family);
  });
});

guestFamilyListMap.forEach((families, guest) => {
  guestFamilyMap.set(guest, families[0]);
});

let selectedGuest = allGuests[0];
let foundGuest = null;

function findTableByGuest(guest) {
  return tables.find((table) => table.guests.includes(guest));
}

function familyForGuest(guest) {
  return guestFamilyMap.get(guest) || "Guest Group";
}

function allFamiliesForGuest(guest) {
  return guestFamilyListMap.get(guest) || ["Guest Group"];
}

function relatedFamilyMembers(guest) {
  const related = new Set();

  allFamiliesForGuest(guest).forEach((family) => {
    const group = guestGroups.find((item) => item.family === family);
    if (!group) {
      return;
    }

    group.members.forEach((member) => {
      if (member !== guest) {
        related.add(member);
      }
    });
  });

  return Array.from(related);
}

function directionText(table) {
  return `${table.name} is on the ${table.side.toLowerCase()} side, in the ${table.position.toLowerCase()} position. Follow the line from the entrance.`;
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

function createTableCard(table, context) {
  const fragment = tableCardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".table-card");
  const badge = fragment.querySelector(".table-badge");
  const name = fragment.querySelector(".table-name");
  const location = fragment.querySelector(".table-location");
  const guestTags = fragment.querySelector(".guest-tags");

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
    guestTags.append(item);
  });

  return fragment;
}

function renderTables() {
  leftWing.innerHTML = "";
  rightWing.innerHTML = "";
  directoryGrid.innerHTML = "";

  tables.forEach((table) => {
    const wingTarget = table.side === "Left" ? leftWing : rightWing;
    wingTarget.append(createTableCard(table, "map"));
    directoryGrid.append(createTableCard(table, "directory"));
  });
}

function renderResult() {
  const table = findTableByGuest(foundGuest);
  if (!table || !foundGuest) {
    guestName.textContent = "Guest not found";
    guestDirection.textContent = "Try another guest name from the list.";
    familyGroup.textContent = "Choose a guest to begin.";
    familyMembers.textContent = "We will show related names here after you search.";
    return;
  }

  const tableCompanions = table.guests.filter((guest) => guest !== foundGuest);
  const familyNames = allFamiliesForGuest(foundGuest);
  const relatedMembers = relatedFamilyMembers(foundGuest).filter((guest) => table.guests.includes(guest));
  const fallbackMembers = relatedMembers.length > 0 ? relatedMembers : tableCompanions;

  guestName.textContent = foundGuest;
  guestDirection.textContent = directionText(table);
  familyGroup.textContent = familyNames.join(" / ");
  familyMembers.textContent = fallbackMembers.length > 0
    ? fallbackMembers.join(", ")
    : "This guest is currently listed on this table without another related guest.";
}

function clearRoute() {
  routePath.setAttribute("d", "");
  routePath.classList.remove("visible");
}

function getCenterPoint(element, relativeTo) {
  const elementRect = element.getBoundingClientRect();
  const relativeRect = relativeTo.getBoundingClientRect();

  return {
    x: elementRect.left - relativeRect.left + elementRect.width / 2,
    y: elementRect.top - relativeRect.top + elementRect.height / 2
  };
}

function drawRoute() {
  const activeMapCard = document.querySelector('.table-card.active[data-context="map"]');
  const activeBadge = activeMapCard ? activeMapCard.querySelector(".table-badge") : null;
  const mapStage = routeSvg.parentElement;

  if (!activeMapCard || !activeBadge || !mapStage) {
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
  const targetLaneY = Math.min(
    Math.max(target.y + badgeRadius + 18, 150),
    stageHeight - 150
  );

  const d = [
    `M ${entrance.x} ${entrance.y}`,
    `L ${aisleX} ${entrance.y - 24}`,
    `L ${aisleX} ${targetLaneY}`,
    `L ${target.x} ${targetLaneY}`,
    `L ${target.x} ${target.y}`
  ].join(" ");

  routePath.setAttribute("d", d);
  routePath.classList.remove("visible");
  void routePath.getBoundingClientRect();
  routePath.classList.add("visible");
}

function renderFoundGuest() {
  renderResult();
  renderTables();
  window.requestAnimationFrame(drawRoute);
}

function renderIdleState() {
  guestName.textContent = "Choose Your Name";
  guestDirection.textContent = "Select your guest name, then press Find My Table to draw the route from the entrance.";
  familyGroup.textContent = "Family-aware lookup is ready.";
  familyMembers.textContent = "When you search one guest, we will also show related family members at the same table.";
  renderTables();
  clearRoute();
}

function applySearch(query) {
  const normalized = query.trim().toLowerCase();
  const filteredGuests = normalized
    ? allGuests.filter((guest) => guest.toLowerCase().includes(normalized))
    : allGuests;

  populateGuestSelect(filteredGuests);

  if (filteredGuests.length === 0) {
    guestName.textContent = "No matching guest";
    guestDirection.textContent = "Try a different search, then press Find My Table.";
    familyGroup.textContent = "No family group match yet.";
    familyMembers.textContent = "Try another spelling or search by a related first or last name.";
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
  renderFoundGuest();
});

window.addEventListener("resize", () => {
  if (routePath.getAttribute("d")) {
    window.requestAnimationFrame(drawRoute);
  }
});

populateGuestSelect(allGuests);
renderIdleState();
