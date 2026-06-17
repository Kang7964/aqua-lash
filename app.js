const STORAGE_KEYS = {
  slots: "aqua-lash-slots",
  reservations: "aqua-lash-reservations",
  services: "aqua-lash-services",
  siteContent: "aqua-lash-site-content",
  ownerUnlocked: "aqua-lash-owner-unlocked",
};

const OWNER_PASSWORD = "939393";
const CLOUD_API_URL = window.AQUA_LASH_API_URL || "";

const defaultSiteContent = {
  eyebrow: "Aqua Lash Lab",
  title: "讓眼神乾淨、有光，像剛睡飽一樣自然。",
  description: "日式睫毛嫁接與補睫服務，選擇想要的款式與時段後留下聯絡方式，我們會再與你確認細節。",
  primaryButton: "立即預約",
  secondaryButton: "查看服務",
  imageUrl: "https://images.pexels.com/photos/34930118/pexels-photo-34930118.jpeg?auto=compress&cs=tinysrgb&w=1800",
};

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

let siteContent = loadObject(STORAGE_KEYS.siteContent, defaultSiteContent);
let services = loadArray(STORAGE_KEYS.services, defaultServices);
let slots = loadArray(STORAGE_KEYS.slots, defaultSlots);
let reservations = loadArray(STORAGE_KEYS.reservations, []);
let selectedDate = "";
let ownerMode = sessionStorage.getItem(STORAGE_KEYS.ownerUnlocked) === "true";

const hero = document.querySelector(".hero");
const heroEyebrow = document.querySelector("#heroEyebrow");
const heroTitle = document.querySelector("#heroTitle");
const heroDescription = document.querySelector("#heroDescription");
const heroPrimaryButton = document.querySelector("#heroPrimaryButton");
const heroSecondaryButton = document.querySelector("#heroSecondaryButton");
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
const contentPanel = document.querySelector("#contentPanel");
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
const contentForm = document.querySelector("#contentForm");
const contentEyebrow = document.querySelector("#contentEyebrow");
const contentTitle = document.querySelector("#contentTitle");
const contentDescription = document.querySelector("#contentDescription");
const contentPrimaryButton = document.querySelector("#contentPrimaryButton");
const contentSecondaryButton = document.querySelector("#contentSecondaryButton");
const contentImageFile = document.querySelector("#contentImageFile");
const contentImageStatus = document.querySelector("#contentImageStatus");
const contentMessage = document.querySelector("#contentMessage");
const resetContentButton = document.querySelector("#resetContentButton");

renderSiteContent();
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
  if (event.target === passwordModal) closeOwnerPasswordModal();
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

contentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  siteContent = getContentFormState();
  renderSiteContent();
  persistState();
  contentMessage.textContent = "首頁內容已儲存。";
});

contentImageFile.addEventListener("change", async () => {
  const file = contentImageFile.files && contentImageFile.files[0];
  if (!file) return;

  contentImageStatus.textContent = "正在處理圖片...";
  try {
    siteContent = getContentFormState();
    siteContent.imageUrl = await compressImageToDataUrl(file);
    renderSiteContent();
    persistState();
    contentImageStatus.textContent = "圖片已上傳並套用，請等 3 秒再重新整理。";
  } catch (error) {
    contentImageStatus.textContent = "圖片處理失敗，請換一張較小的圖片再試。";
  } finally {
    contentImageFile.value = "";
  }
});

resetContentButton.addEventListener("click", () => {
  siteContent = { ...defaultSiteContent };
  renderSiteContent();
  persistState();
  contentMessage.textContent = "已恢復預設首頁內容。";
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
    phone: (data.get("phone") || "").trim(),
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

function renderSiteContent() {
  heroEyebrow.textContent = siteContent.eyebrow || defaultSiteContent.eyebrow;
  heroTitle.textContent = siteContent.title || defaultSiteContent.title;
  heroDescription.textContent = siteContent.description || defaultSiteContent.description;
  heroPrimaryButton.textContent = siteContent.primaryButton || defaultSiteContent.primaryButton;
  heroSecondaryButton.textContent = siteContent.secondaryButton || defaultSiteContent.secondaryButton;
  hero.style.setProperty("--hero-image", `url("${siteContent.imageUrl || defaultSiteContent.imageUrl}")`);

  contentEyebrow.value = siteContent.eyebrow || "";
  contentTitle.value = siteContent.title || "";
  contentDescription.value = siteContent.description || "";
  contentPrimaryButton.value = siteContent.primaryButton || "";
  contentSecondaryButton.value = siteContent.secondaryButton || "";
  contentImageStatus.textContent = siteContent.imageUrl && siteContent.imageUrl.startsWith("data:")
    ? "目前使用已上傳圖片。重新選擇檔案即可更換。"
    : "可上傳 JPG、PNG，系統會自動壓縮並調整成適合手機與電腦的背景圖。";
}

function renderServices() {
  serviceSelect.innerHTML = services.length
    ? services.map((service) => `<option value="${service.id}">${escapeHtml(service.name)}｜${escapeHtml(service.price)}</option>`).join("")
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
          <div class="reservation-detail">
            <strong>${escapeHtml(reservation.customerName)} · ${escapeHtml(reservation.serviceName)}</strong>
            <div class="reservation-meta">
              <span>日期：${formatDate(reservation.date)} ${escapeHtml(reservation.time)}</span>
              <span>Line / IG：${escapeHtml(reservation.contact || "未填")}</span>
              <span>電話：${escapeHtml(reservation.phone || "未填")}</span>
              <span>地點：${escapeHtml(reservation.label || "未標註")}</span>
            </div>
            ${reservation.note ? `<span class="reservation-note">備註：${escapeHtml(reservation.note)}</span>` : ""}
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

    siteContent = response.state.siteContent && typeof response.state.siteContent === "object" ? { ...defaultSiteContent, ...response.state.siteContent } : siteContent;
    services = Array.isArray(response.state.services) && response.state.services.length ? response.state.services : services;
    slots = Array.isArray(response.state.slots) && response.state.slots.length ? response.state.slots : slots;
    reservations = Array.isArray(response.state.reservations) ? response.state.reservations : reservations;

    save(STORAGE_KEYS.siteContent, siteContent);
    save(STORAGE_KEYS.services, services);
    save(STORAGE_KEYS.slots, slots);
    save(STORAGE_KEYS.reservations, reservations);
    renderSiteContent();
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
  save(STORAGE_KEYS.siteContent, siteContent);
  save(STORAGE_KEYS.services, services);
  save(STORAGE_KEYS.slots, slots);
  save(STORAGE_KEYS.reservations, reservations);
  if (CLOUD_API_URL && isValidCloudUrl()) {
    cloudPost("saveState", { siteContent, services, slots, reservations });
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
  const iframeName = "aquaLashCloudFrame";
  let iframe = document.querySelector(`iframe[name="${iframeName}"]`);

  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.name = iframeName;
    iframe.className = "is-hidden";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = CLOUD_API_URL;
  form.target = iframeName;
  form.className = "is-hidden";
  appendHiddenInput(form, "action", action);
  appendHiddenInput(form, "payload", JSON.stringify(payload));
  document.body.appendChild(form);
  form.submit();
  window.setTimeout(() => form.remove(), 1000);
}

function appendHiddenInput(form, name, value) {
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = name;
  input.value = value;
  form.appendChild(input);
}

function getContentFormState() {
  return {
    eyebrow: contentEyebrow.value.trim(),
    title: contentTitle.value.trim(),
    description: contentDescription.value.trim(),
    primaryButton: contentPrimaryButton.value.trim(),
    secondaryButton: contentSecondaryButton.value.trim(),
    imageUrl: siteContent.imageUrl || defaultSiteContent.imageUrl,
  };
}

function compressImageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 1000;
        const maxHeight = 750;
        const context = canvas.getContext("2d");

        let ratio = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
        let dataUrl = "";

        do {
          canvas.width = Math.max(1, Math.round(image.width * ratio));
          canvas.height = Math.max(1, Math.round(image.height * ratio));
          context.drawImage(image, 0, 0, canvas.width, canvas.height);

          let quality = 0.78;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
          while (dataUrl.length > 32000 && quality > 0.3) {
            quality -= 0.08;
            dataUrl = canvas.toDataURL("image/jpeg", quality);
          }

          ratio *= 0.82;
        } while (dataUrl.length > 32000 && ratio > 0.2);

        if (dataUrl.length > 45000) throw new Error("Image is too large");
        resolve(dataUrl);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
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
  contentPanel.classList.toggle("is-hidden", !ownerMode);
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

function loadArray(key, fallback) {
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    return Array.isArray(stored) && stored.length ? stored : fallback;
  } catch {
    return fallback;
  }
}

function loadObject(key, fallback) {
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    return stored && typeof stored === "object" && !Array.isArray(stored) ? { ...fallback, ...stored } : fallback;
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
