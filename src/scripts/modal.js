import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";
 
// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyBPtb60dthvTPLmaRlL_E7YOsBDIAK-vKw",
  authDomain: "sample-79b30.firebaseapp.com",
  projectId: "sample-79b30",
  storageBucket: "sample-79b30.firebasestorage.app",
  messagingSenderId: "12884863424",
  appId: "1:12884863424:web:277b044f4005f7d80fc025",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
 
// --- Elements ---
const newMessageBtn = document.getElementById("newMessageBtn");
const announcementModal = document.getElementById("announcementModal");
const cancelBtn = document.getElementById("cancelBtn");
const saveBtn = document.getElementById("saveBtn");
const messagesTable = document.getElementById("announcementTableBody");
const messageCount = document.querySelector("main p");
 
const titleInput = document.getElementById("announcementTitle");
const categoryInput = document.getElementById("announcementCategory");
const messageInput = document.getElementById("announcementMessage");
const fileInput = document.getElementById("fileInput");
const imagePreview = document.getElementById("imagePreview");
 
const createTitle = document.getElementById("create-announcement-title");
 
let currentEditingDocId = null;
 
// --- Modal Functions ---
function openModal(editing = false) {
  announcementModal.classList.remove("hidden");
  setTimeout(() => announcementModal.classList.add("opacity-100"), 10);
 
  if (!editing) {
    titleInput.value = "";
    categoryInput.value = "";
    messageInput.value = "";
    fileInput.value = "";
    imagePreview.src = "";
    imagePreview.classList.add("hidden");
    currentEditingDocId = null;
    createTitle.textContent = "Create New Announcement";
    saveBtn.textContent = "Save";
  } else {
    createTitle.textContent = "Update Announcement";
    saveBtn.textContent = "Update";
  }
}
 
function closeModal() {
  announcementModal.classList.add("hidden");
  currentEditingDocId = null;
}
 
// --- Update Message Count ---
function updateMessageCount() {
  messageCount.textContent = `${messagesTable.rows.length} Messages`;
}
 
// --- View Message ---
function viewMessage(title, category, message, fileURL) {
  let msg = `Title: ${title}\nCategory: ${category}\nMessage: ${message}`;
  if (fileURL) msg += `\nImage URL: ${fileURL}`;
  alert(msg);
}
 
// --- Show Actions Menu ---
function showActionsMenu(row, button, docId) {
  const existingMenu = document.querySelector(".actions-menu");
  if (existingMenu) existingMenu.remove();
 
  const menu = document.createElement("div");
  menu.className =
    "actions-menu absolute bg-white dark:bg-gray-800 shadow-md rounded-md p-2 z-50";
  menu.innerHTML = `
    <button class="block w-full text-left p-1 updateBtn hover:bg-gray-100 dark:hover:bg-gray-700 rounded">Update</button>
    <button class="block w-full text-left p-1 deleteBtn hover:bg-gray-100 dark:hover:bg-gray-700 rounded">Delete</button>
  `;
  document.body.appendChild(menu);
 
  const rect = button.getBoundingClientRect();
  menu.style.top = rect.bottom + window.scrollY + "px";
  menu.style.left = rect.left + window.scrollX + "px";
 
  menu.querySelector(".updateBtn").addEventListener("click", () => {
    currentEditingDocId = docId;
    titleInput.value = row.querySelector("td.titleCell").textContent;
    categoryInput.value = row.querySelector("td.categoryCell").textContent;
    messageInput.value = row.querySelector("td.messageCell").dataset.message;
    if (row.querySelector("img")) {
      imagePreview.src = row.querySelector("img").src;
      imagePreview.classList.remove("hidden");
    } else {
      imagePreview.src = "";
      imagePreview.classList.add("hidden");
    }
    openModal(true);
    menu.remove();
  });
 
  menu.querySelector(".deleteBtn").addEventListener("click", async () => {
    await deleteDoc(doc(db, "announcements", docId));
    menu.remove();
  });
 
  document.addEventListener(
    "click",
    (e) => {
      if (!menu.contains(e.target) && e.target !== button) menu.remove();
    },
    { once: true }
  );
}
 
// --- File Input Preview ---
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  } else {
    imagePreview.src = "";
    imagePreview.classList.add("hidden");
  }
});
 
// --- Save Announcement ---
saveBtn.addEventListener("click", async () => {
  const title = titleInput.value.trim();
  const category = categoryInput.value.trim();
  const message = messageInput.value.trim();
  const file = fileInput.files[0];
 
  if (!title || !category || !message)
    return alert("Please fill out all fields.");
 
  let fileURL = null;
 
  // Upload image safely
  if (file) {
    try {
      const storageRef = ref(
        storage,
        `announcements/${Date.now()}_${file.name}`
      );
      await uploadBytes(storageRef, file);
      fileURL = await getDownloadURL(storageRef);
    } catch (err) {
      console.error("File upload failed:", err);
      alert(
        "Image upload failed. The announcement will still save without image."
      );
      fileURL = null;
    }
  }
 
  // Save to Firestore
  try {
    if (currentEditingDocId) {
      await updateDoc(doc(db, "announcements", currentEditingDocId), {
        title,
        category,
        message,
        fileURL,
        timestamp: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, "announcements"), {
        title,
        category,
        message,
        fileURL,
        timestamp: serverTimestamp(),
      });
    }
 
    closeModal();
  } catch (err) {
    console.error("Saving announcement failed:", err);
    alert("Failed to save announcement. Check console for errors.");
  }
});
 
// --- Load Announcements in Real-Time ---
const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"));
onSnapshot(q, (querySnapshot) => {
  messagesTable.innerHTML = "";
 
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const row = messagesTable.insertRow();
 
    const formattedDate = data.timestamp
      ? data.timestamp.toDate().toLocaleString()
      : "Saving...";
 
    row.innerHTML = `
      <td class="px-6 py-4 titleCell">${data.title}</td>
      <td class="px-6 py-4 categoryCell">${data.category}</td>
      <td class="px-6 py-4 messageCell" data-message="${
        data.message
      }">${data.message}</td>
      <td class="px-6 flex justify-center py-4">
        ${
          data.fileURL
            ? `<img src="${data.fileURL}" class="h-12 w-12 object-cover rounded" />`
            : "No Image"
        }
      </td>
      <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">${formattedDate}</td>
      <td class="px-6 py-4 text-right">
        <button type="button" class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-xl font-bold leading-none" title="Actions">⋮</button>
      </td>
    `;
 
    // Click to view
    // row
    //   .querySelector("td.titleCell")
    //   .addEventListener("click", () =>
    //     viewMessage(data.title, data.category, data.message, data.fileURL)
    //   );
    // row
    //   .querySelector("td.categoryCell")
    //   .addEventListener("click", () =>
    //     viewMessage(data.title, data.category, data.message, data.fileURL)
    //   );
    // row
    //   .querySelector("td.messageCell")
    //   .addEventListener("click", () =>
    //     viewMessage(data.title, data.category, data.message, data.fileURL)
    //   );
 
    // Actions button
    const actionBtn = row.querySelector("button");
    actionBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showActionsMenu(row, actionBtn, docSnap.id);
    });
  });
 
  updateMessageCount();
});
 
// --- Modal Events ---
newMessageBtn.addEventListener("click", () => openModal());
cancelBtn.addEventListener("click", closeModal);
announcementModal.addEventListener("click", (e) => {
  if (e.target === announcementModal) closeModal();
});

// --- Role-based UI updates ---
const auth = getAuth(app);
onAuthStateChanged(auth, (user) => {
  if (user) {
    const ADMIN_EMAIL = "bantayteam72.admin@gmail.com";
    if (user.email === ADMIN_EMAIL) {
      document.querySelectorAll('a[href*="analytics_and_reports.html"]').forEach(el => el.style.display = "none");
      document.querySelectorAll('a[href*="user-management.html"]').forEach(el => el.style.display = "none");
    }
  }
});
 