// auth.js
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";



const allowedUIDs = {
  super: "tUQcIT3O8vWtovCRCsDiOcIqY4V2",
  admin: "fGR7io5X2YfXcNqKA65HE8zYQfA2",
};

// Global Role-Based UI update for ALL pages that import auth.js
setTimeout(() => {
  try {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // Save to localStorage for instant NO-BLINK CSS hiding on next page loads
        localStorage.setItem("user_email", user.email);

        if (user.email === "bantayteam72.admin@gmail.com") {
          document.querySelectorAll('a[href*="analytics_and_reports.html"]').forEach(el => el.style.display = "none");
          document.querySelectorAll('a[href*="user-management.html"]').forEach(el => el.style.display = "none");
        }
      } else {
        localStorage.removeItem("user_email");
      }
    });
  } catch (e) {
    console.warn("Auth check skipped", e);
  }
}, 1000);

export function protectPage(allowedRoles, callback) {
  const auth = getAuth();
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "login.html"; // redirect if not logged in
      return;
    }

    let role = "none";
    if (user.uid === allowedUIDs.super) role = "super";
    else if (user.uid === allowedUIDs.admin) role = "admin";

    if (!allowedRoles.includes(role)) {
      alert("Access denied. Redirecting to login.");
      signOut(auth);
      window.location.href = "login.html";
      return;
    }

    callback(role, user.uid);
  });
}

export function setupUI(role) {
  const analyticsLink = document.getElementById("analytics-link");
  const userManagementLink = document.getElementById("user-management-link");

  if (role === "admin") {
    if (analyticsLink) {
      analyticsLink.style.pointerEvents = "none";
      analyticsLink.style.opacity = "0.5";
      analyticsLink.title = "Access restricted for Admin role";
    }
    if (userManagementLink) {
      userManagementLink.style.pointerEvents = "none";
      userManagementLink.style.opacity = "0.5";
      userManagementLink.title = "Access restricted for Admin role";
    }
  } else if (role === "super") {
    if (analyticsLink) {
      analyticsLink.style.pointerEvents = "auto";
      analyticsLink.style.opacity = "1";
      analyticsLink.removeAttribute("title");
    }
    if (userManagementLink) {
      userManagementLink.style.pointerEvents = "auto";
      userManagementLink.style.opacity = "1";
      userManagementLink.removeAttribute("title");
    }
  }
}
