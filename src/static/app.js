document.addEventListener("DOMContentLoaded", () => {

  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const searchInput = document.getElementById("search-input");
  const categoryFilter = document.getElementById("category-filter");
  const sortSelect = document.getElementById("sort-select");

  let allActivities = {};
  let categories = new Set();

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      allActivities = activities;
      categories = new Set();
      Object.values(activities).forEach((details) => {
        if (details.category) categories.add(details.category);
      });
      renderCategoryFilter();
      renderActivities();
      renderActivityOptions();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function renderCategoryFilter() {
    if (!categoryFilter) return;
    // Remove all except the first option
    while (categoryFilter.options.length > 1) {
      categoryFilter.remove(1);
    }
    Array.from(categories)
      .sort()
      .forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        categoryFilter.appendChild(option);
      });
  }

  function renderActivityOptions() {
    if (!activitySelect) return;
    // Remove all except the first option
    while (activitySelect.options.length > 1) {
      activitySelect.remove(1);
    }
    Object.keys(allActivities).forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });
  }

  function renderActivities() {
    let filtered = Object.entries(allActivities);
    // Filter by search
    const search = searchInput ? searchInput.value.trim().toLowerCase() : "";
    if (search) {
      filtered = filtered.filter(([name, details]) =>
        name.toLowerCase().includes(search) ||
        (details.description && details.description.toLowerCase().includes(search))
      );
    }
    // Filter by category
    const selectedCategory = categoryFilter ? categoryFilter.value : "";
    if (selectedCategory) {
      filtered = filtered.filter(([, details]) => details.category === selectedCategory);
    }
    // Sort
    const sortBy = sortSelect ? sortSelect.value : "name";
    filtered.sort((a, b) => {
      if (sortBy === "name") {
        return a[0].localeCompare(b[0]);
      } else if (sortBy === "schedule") {
        return (a[1].schedule || "").localeCompare(b[1].schedule || "");
      }
      return 0;
    });

    activitiesList.innerHTML = "";
    filtered.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";
      const spotsLeft = details.max_participants - details.participants.length;
      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;
      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
        <button class="register-btn" data-activity="${name}">Register Student</button>
      `;
      activitiesList.appendChild(activityCard);
    });
    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
    // Add event listeners for register buttons
    document.querySelectorAll(".register-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const activityName = e.target.getAttribute("data-activity");
        if (activitySelect) {
          activitySelect.value = activityName;
        }
        // Scroll to signup form
        signupForm.scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  // Event listeners for filters
  if (searchInput) searchInput.addEventListener("input", renderActivities);
  if (categoryFilter) categoryFilter.addEventListener("change", renderActivities);
  if (sortSelect) sortSelect.addEventListener("change", renderActivities);

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
