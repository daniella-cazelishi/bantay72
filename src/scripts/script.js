document.addEventListener("DOMContentLoaded", function () {
  const currentUserId = sessionStorage.getItem("user_id");
  const ADMIN_ID = "fGR7io5X2YfXcNqKA65HE8zYQfA2";
  const SUPER_ADMIN_ID = "tUQcIT3O8vWtovCRCsDiOcIqY4V2";

  // Hide tabs for Admin
  if (currentUserId === ADMIN_ID) {
    // Find sidebar links by their href because the IDs might be missing
    const analyticsLink = document.querySelector('a[href*="analytics_and_reports.html"]');
    const userMgmtLink = document.querySelector('a[href*="user-management.html"]');

    if (analyticsLink) analyticsLink.style.display = "none";
    if (userMgmtLink) userMgmtLink.style.display = "none";
  }

  // Auto-change Profile text for Super Admin
  if (currentUserId === SUPER_ADMIN_ID) {
    // Look for h1 and h2 tags in the profile section
    const profileH1 = document.querySelector("main h1");
    const profileH2 = document.querySelector("main h2");
    
    if (profileH1 && profileH1.textContent.includes("Admin Account")) {
      profileH1.textContent = "Super Admin Account";
    }
    if (profileH2 && profileH2.textContent.trim() === "Admin") {
      profileH2.textContent = "Super Admin";
    }
  }
});
