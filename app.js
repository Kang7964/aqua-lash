const STORAGE_KEYS = {
  slots: "aqua-lash-slots",
  reservations: "aqua-lash-reservations",
  services: "aqua-lash-services",
  ownerUnlocked: "aqua-lash-owner-unlocked",
};

const OWNER_PASSWORD = "939393";
const CLOUD_API_URL = window.AQUA_LASH_API_URL || "";

const defaultServices = [
  {
    id: "natural",
    name: "自然日式嫁接",
    duration: "約 90 分鐘",
    price: "NT$1,280",
    description: "乾淨、柔和，適合第一次嘗試美睫。",
  },
  {
    id: "volume",
    name: "濃密仙女款",
    duration: "約 120 分鐘",
    price: "NT$1,680",
    description: "睫毛存在感更明顯，拍照也有精神。",
  },
  {
    id: "remove",
    name: "卸睫 / 補睫",
    duration: "約 45-75 分鐘",
    price: "NT$300 起",
    description: "適合需要整理舊睫或局部補強。",
  },
];

const defaultSlots = [
  slotForOffset(3, "14:00", "台北"),
  slotForOffset(3, "17:00", "台北"),
  slotForOffset(5, "13:30", "板橋"),
  slotForOffset(6, "16:00", "西門"),
  slotForOffset(8, "19:00", "晚間加開"),
];

let services = load(STORAGE_KEYS.services, defaultServices);
let slots = load(STORAGE_KEYS.slots, defaultSlots);
let reservations = load(STORAGE_KEYS.reservations, []);
let selectedDate = "";
let ownerMode = sessionStorage.getItem(STORAGE_KEYS.ownerUnlocked) === "true";

const serviceSelect = document.querySelector("#service");
const dateSelect = document.querySelector("#dateSelect");
const slotGrid = document.querySelector("#slotGrid");
const bookingForm = document.querySelector("#bookingForm");
const formMessage = document.querySelector("#formMessage");
const serviceList = document.querySelector("#serviceList");
const ownerToggle = document.querySelector("#ownerToggle");
const passwordModal = document.querySelector("#passwordModal");
const passwordForm = document.querySelector("#passwordForm");
const ownerPassword = document.querySelector("#ownerPassword");
const passwordMessage = document.querySelector("#passwordMessage");
const closePasswordModal = document.querySelector("#closePasswordModal");
const ownerPanel = document.querySelector("#ownerPanel");
const servicePanel = document.querySelector("#servicePanel");
const reservationPanel = document.querySelector("#reservationPanel");
const slotForm = document.querySelector("#slotForm");
const ownerSlotList = document.querySelector("#ownerSlotList");
const reservationList = document.querySelector("#reservationList");
const ownerServiceList = document.querySelector("#ownerServiceList");
const serviceForm = document.querySelector("#serviceForm");
const serviceId = document.querySelector("#serviceId");
const serviceName = document.querySelector("#serviceName");
const serviceDuration = document.querySelector("#serviceDuration");
const servicePrice = document.querySelector("#servicePrice");
const serviceDescription = document.querySelector("#serviceDescription");
const saveServiceButton = document.querySelector("#saveServiceButton");
const cancelServiceEdit = document.querySelector("#cancelServiceEdit");
const ownerDate = document.querySelector("#ownerDate");

renderServices();
renderBookingControls();
renderOwnerSlots();
renderOwnerServices();
renderReservations();
resetServiceForm();
syncOwnerMode();
loadCloudState();

dateSelect.addEventListener("change", () => {
  selectedDate = dateSelect.value;
  renderSlots();
});

ownerToggle.addEventListener("click", () => {
  if (!ownerMode) {
    openPasswordModal();
  } else {
    ownerMode = false;
    sessionStorage.removeItem(STORAGE_KEYS.ownerUnlocked);
    syncOwnerMode();
  }
});

passwordForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (ownerPassword.value !== OWNER_PASSWORD) {
    passwordMessage.textContent = "密碼不正確，請再試一次。";
    ownerPassword.select();
    return;
  }
  ownerMode = true;
  sessionStorage.setItem(STORAGE_KEYS.ownerUnlocked, "true");
  closeOwnerPasswordModal();
  syncOwnerMode();
});

closePasswordModal.addEventListener("click", closeOwnerPasswordModal);

passwordModal.addEventListener("click", (event) => {
  if (event.target === passwordModal) {
    closeOwnerPasswordModal();
  }
});

slotForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const date = document.querySelector("#ownerDate").value;
  const time = document.querySelector("#ownerTime").value;
  const label = document.querySelector("#ownerLabel").value.trim();

  if (!date || !time) return;

  slots.push({
    id: crypto.randomUUID(),
    date,
    time,
    label,
    available: true,
  });
  sortSlots();
  persistState();
  slotForm.reset();
  ownerDate.value = date;
  renderBookingControls(date);
  renderOwnerSlots();
});

serviceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const serviceData = {
    id: serviceId.value || crypto.randomUUID(),
    name: serviceName.value.trim(),
    duration: serviceDuration.value.trim(),
    price: servicePrice.value.trim(),
    description: serviceDescription.value.trim(),
  };

  if (!serviceData.name || !serviceData.duration || !serviceData.price || !serviceData.description) return;

  if (serviceId.value) {
    services = services.map((service) => (service.id === serviceId.value ? serviceData : service));
  } else {
    services.push(serviceData);
  }

  persistState();
  resetServiceForm();
  renderServices();
  renderOwnerServices();
});

cancelServiceEdit.addEventListener("click", resetServiceForm);

bookingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const selectedSlot = document.querySelector("input[name='slot']:checked");
  if (!selectedSlot) {
    formMessage.textContent = "請先選擇一個可預約時間。";
    return;
  }

  const data = new FormData(bookingForm);
  const slot = slots.find((item) => item.id === selectedSlot.value);
  const service = services.find((item) => item.id === data.get("service"));

  reservations.push({
    id: crypto.randomUUID(),
    slotId: slot.id,
    serviceId: service.id,
    serviceName: service.name,
    date: slot.date,
    time: slot.time,
    label: slot.label,
    customerName: data.get("customerName").trim(),
    contact: data.get("contact").trim(),
    note: data.get("note").trim(),
    createdAt: new Date().toISOString(),
  });

  slots = slots.map((item) => (item.id === slot.id ? { ...item, available: false } : item));
  persistState();

  bookingForm.reset();
  formMessage.textContent = "已收到預約，請等待店家確認。";
  renderBookingControls(slot.date);
  renderOwnerSlots();
  renderReservations();
});

function renderServices() {
  serviceSelect.innerHTML = services.length
    ? services.map((service) => `<option value="${service.id}">${service.name}｜${service.price}</option>`).join("")
    : `<option value="">尚未建立服務項目</option>`;

  serviceList.innerHTML = services.length
    ? services
        .map(
          (service) => `
            <article class="service-card">
              <strong>${escapeHtml(service.name)}</strong>
              <span>${escapeHtml(service.duration)} · ${escapeHtml(service.price)}</span>
              <span>${escapeHtml(service.description)}</span>
            </article>
          `
        )
        .join("")
    : `<div class="empty-state">尚未建立服務項目。</div>`;
}

function renderOwnerServices() {
  if (!services.length) {
    ownerServiceList.innerHTML = `<div class="empty-state">尚未建立服務項目。</div>`;
    return;
  }

  ownerServiceList.innerHTML = services
    .map(
      (service) => `
        <article class="owner-item service-editor-item">
          <div>
            <strong>${escapeHtml(service.name)}</strong>
            <span>${escapeHtml(service.duration)} · ${escapeHtml(service.price)}</span>
            <span>${escapeHtml(service.description)}</span>
          </div>
          <div class="item-actions">
            <button class="small-button" type="button" data-edit-service="${service.id}">編輯</button>
            <button class="danger-button" type="button" data-delete-service="${service.id}">刪除</button>
          </div>
        </article>
      `
    )
    .join("");

  ownerServiceList.querySelectorAll("[data-edit-service]").forEach((button) => {
    button.addEventListener("click", () => {
      const service = services.find((item) => item.id === button.dataset.editService);
      if (!service) return;
      serviceId.value = service.id;
      serviceName.value = service.name;
      serviceDuration.value = service.duration;
      servicePrice.value = service.price;
      serviceDescription.value = service.description;
      saveServiceButton.textContent = "儲存修改";
      cancelServiceEdit.classList.remove("is-hidden");
      serviceName.focus();
    });
  });

  ownerServiceList.querySelectorAll("[data-delete-service]").forEach((button) => {
    button.addEventListener("click", () => {
      if (services.length <= 1) {
        alert("至少需要保留一個服務項目。");
        return;
      }
      services = services.filter((service) => service.id !== button.dataset.deleteService);
      persistState();
      resetServiceForm();
      renderServices();
      renderOwnerServices();
    });
  });
}

function renderBookingControls(preferredDate = selectedDate) {
  sortSlots();
  const dates = unique(slots.filter((slot) => slot.available).map((slot) => slot.date));
  dateSelect.innerHTML = dates.length
    ? dates.map((date) => `<option value="${date}">${formatDate(date)}</option>`).join("")
    : `<option value="">目前尚未開放時段</option>`;

  selectedDate = dates.includes(preferredDate) ? preferredDate : dates[0] || "";
  dateSelect.value = selectedDate;
  renderSlots();
}

function renderSlots() {
  const daySlots = slots.filter((slot) => slot.available && slot.date === selectedDate);
  if (!daySlots.length) {
    slotGrid.innerHTML = `<div class="empty-state">這天還沒有可預約時段。</div>`;
    return;
  }

  slotGrid.innerHTML = daySlots
    .map(
      (slot) => `
        <label class="slot-option">
          <input type="radio" name="slot" value="${slot.id}" required />
          <span>${escapeHtml(slot.time)}${slot.label ? `<br>${escapeHtml(slot.label)}` : ""}</span>
        </label>
      `
    )
    .join("");
}

function renderOwnerSlots() {
  if (!slots.length) {
    ownerSlotList.innerHTML = `<div class="empty-state">尚未建立任何時段。</div>`;
    return;
  }

  ownerSlotList.innerHTML = slots
    .map(
      (slot) => `
        <article class="owner-item">
          <div>
            <strong>${formatDate(slot.date)} ${escapeHtml(slot.time)}</strong>
            <span>${escapeHtml(slot.label || "無標籤")} · ${slot.available ? "開放中" : "已被預約"}</span>
          </div>
          <button class="danger-button" type="button" data-delete-slot="${slot.id}">移除</button>
        </article>
      `
    )
    .join("");

  ownerSlotList.querySelectorAll("[data-delete-slot]").forEach((button) => {
    button.addEventListener("click", () => {
      slots = slots.filter((slot) => slot.id !== button.dataset.deleteSlot);
      persistState();
      renderBookingControls();
      renderOwnerSlots();
    });
  });
}

function renderReservations() {
  if (!reservations.length) {
    reservationList.innerHTML = `<div class="empty-state">目前還沒有預約紀錄。</div>`;
    return;
  }

  reservationList.innerHTML = reservations
    .slice()
    .reverse()
    .map(
      (reservation) => `
        <article class="reservation-item">
          <div>
            <strong>${escapeHtml(reservation.customerName)} · ${escapeHtml(reservation.serviceName)}</strong>
            <span>${formatDate(reservation.date)} ${escapeHtml(reservation.time)} · ${escapeHtml(reservation.contact)}</span>
            ${reservation.note ? `<span>${escapeHtml(reservation.note)}</span>` : ""}
          </div>
          <button class="danger-button" type="button" data-delete-reservation="${reservation.id}">刪除</button>
        </article>
      `
    )
    .join("");

  reservationList.querySelectorAll("[data-delete-reservation]").forEach((button) => {
    button.addEventListener("click", () => {
      const reservation = reservations.find((item) => item.id === button.dataset.deleteReservation);
      reservations = reservations.filter((item) => item.id !== button.dataset.deleteReservation);
      if (reservation) {
        slots = slots.map((slot) => (slot.id === reservation.slotId ? { ...slot, available: true } : slot));
        persistState();
        renderBookingControls(reservation.date);
        renderOwnerSlots();
      }
      persistState();
      renderReservations();
    });
  });
}

function resetServiceForm() {
  serviceForm.reset();
  serviceId.value = "";
  saveServiceButton.textContent = "新增服務";
  cancelServiceEdit.classList.add("is-hidden");
}

async function loadCloudState() {
  if (!CLOUD_API_URL) return;
  if (!isValidCloudUrl()) {
    formMessage.textContent = "雲端設定網址不正確，請使用 Apps Script Web App 的 /exec 網址。";
    return;
  }

  formMessage.textContent = "正在同步雲端資料...";
  try {
    const response = await cloudGet("state");
    if (!response.ok || !response.state) throw new Error(response.error || "同步失敗");

    services = Array.isArray(response.state.services) && response.state.services.length ? response.state.services : services;
    slots = Array.isArray(response.state.slots) && response.state.slots.length ? response.state.slots : slots;
    reservations = Array.isArray(response.state.reservations) ? response.state.reservations : reservations;

    save(STORAGE_KEYS.services, services);
    save(STORAGE_KEYS.slots, slots);
    save(STORAGE_KEYS.reservations, reservations);
    renderServices();
    renderBookingControls();
    renderOwnerSlots();
    renderOwnerServices();
    renderReservations();
    formMessage.textContent = "已同步雲端資料。";
  } catch (error) {
    formMessage.textContent = "雲端同步失敗，目前先使用本機資料。";
  }
}

function persistState() {
  save(STORAGE_KEYS.services, services);
  save(STORAGE_KEYS.slots, slots);
  save(STORAGE_KEYS.reservations, reservations);
  if (CLOUD_API_URL && isValidCloudUrl()) {
    cloudPost("saveState", { services, slots, reservations });
  } else if (CLOUD_API_URL) {
    formMessage.textContent = "雲端設定網址不正確，資料已先保存在這台裝置。";
  }
}

function isValidCloudUrl() {
  return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(CLOUD_API_URL);
}

function cloudGet(action) {
  return new Promise((resolve, reject) => {
    const callbackName = "aquaLashCallback_" + Date.now() + "_" + Math.random().toString(16).slice(2);
    const script = document.createElement("script");
    const url = new URL(CLOUD_API_URL);
    url.searchParams.set("action", action);
    url.searchParams.set("callback", callbackName);

    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Cloud request timeout"));
    }, 10000);

    window[callbackName] = (payload) => {
      cleanup();
      resolve(payload);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Cloud request failed"));
    };
    script.src = url.toString();
    document.body.appendChild(script);

    function cleanup() {
      window.clearTimeout(timer);
      delete window[callbackName];
      script.remove();
    }
  });
}

function cloudPost(action, payload) {
  const formData = new FormData();
  formData.append("action", action);
  formData.append("payload", JSON.stringify(payload));

  fetch(CLOUD_API_URL, {
    method: "POST",
    mode: "no-cors",
    body: formData,
  }).catch(() => {
    formMessage.textContent = "雲端儲存失敗，資料已先保存在這台裝置。";
  });
}

function openPasswordModal() {
  passwordModal.classList.remove("is-hidden");
  passwordMessage.textContent = "";
  ownerPassword.value = "";
  ownerPassword.focus();
}

function closeOwnerPasswordModal() {
  passwordModal.classList.add("is-hidden");
  passwordMessage.textContent = "";
  ownerPassword.value = "";
}

function syncOwnerMode() {
  ownerToggle.setAttribute("aria-pressed", String(ownerMode));
  ownerToggle.querySelector("span:last-child").textContent = ownerMode ? "關閉" : "店家";
  ownerPanel.classList.toggle("is-hidden", !ownerMode);
  servicePanel.classList.toggle("is-hidden", !ownerMode);
  reservationPanel.classList.toggle("is-hidden", !ownerMode);
}

function slotForOffset(offset, time, label) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return {
    id: crypto.randomUUID(),
    date: date.toISOString().slice(0, 10),
    time,
    label,
    available: true,
  };
}

function sortSlots() {
  slots.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function unique(items) {
  return [...new Set(items)];
}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function load(key, fallback) {
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    return Array.isArray(stored) && stored.length ? stored : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
