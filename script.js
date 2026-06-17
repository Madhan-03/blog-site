// ========== JAVASCRIPT WITH LOGIN/SIGNUP AND LIKE FEATURE ==========
(function () {
  // Check if user is logged in
  let isLoggedIn = localStorage.getItem("mirchi_logged_in") === "true";
  let currentUser = localStorage.getItem("mirchi_current_user") || null;

  // DOM elements
  const authModal = document.getElementById("authModal");
  const mainContent = document.getElementById("mainContent");
  const loginFormContainer = document.getElementById("loginFormContainer");
  const signupFormContainer = document.getElementById("signupFormContainer");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const logoutBtn = document.getElementById("logoutBtn");
  const form = document.getElementById("commentForm");
  const commentContainer = document.getElementById("commentList");

  // Helper: escape XSS
  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/[&<>]/g, function (m) {
        if (m === "&") return "&amp;";
        if (m === "<") return "&lt;";
        if (m === ">") return "&gt;";
        return m;
      })
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, (c) => c);
  }

  // Avatar generator based on name
  function getAvatarIcon(name) {
    const icons = [
      "🍜",
      "🌶️",
      "🔥",
      "🍝",
      "🧄",
      "🍋",
      "🌿",
      "🍅",
      "🥘",
      "✨",
      "🍷",
      "🧀",
    ];
    if (!name) return icons[0];
    let index = 0;
    for (let i = 0; i < name.length; i++) index += name.charCodeAt(i);
    return icons[index % icons.length];
  }

  // Get readable timestamp
  function getCurrentTime() {
    const now = new Date();
    return `📅 ${now.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
  }

  // Get like count from comment card
  function getLikeCount(commentCard) {
    const likeSpan = commentCard.querySelector(".like-count");
    if (!likeSpan) return 0;
    const raw = likeSpan.textContent;
    const match = raw.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  // Set like count and button state
  function setLikeCount(commentCard, newCount, isLikedState) {
    const likeSpan = commentCard.querySelector(".like-count");
    if (likeSpan) {
      likeSpan.textContent = `❤️ ${newCount}`;
    }
    const likeBtn = commentCard.querySelector(".like-button");
    if (likeBtn) {
      if (isLikedState) {
        likeBtn.classList.add("liked");
        likeBtn.innerHTML = "❤️ Liked";
      } else {
        likeBtn.classList.remove("liked");
        likeBtn.innerHTML = "🤍 Like";
      }
    }
    commentCard.dataset.liked = isLikedState ? "true" : "false";
    commentCard.dataset.likeCount = newCount;
  }

  // Toggle like for a comment
  function toggleLike(commentCard) {
    let currentLikes = getLikeCount(commentCard);
    const isCurrentlyLiked = commentCard.dataset.liked === "true";

    let newLikes, newLikedState;
    if (!isCurrentlyLiked) {
      newLikes = currentLikes + 1;
      newLikedState = true;
    } else {
      newLikes = Math.max(0, currentLikes - 1);
      newLikedState = false;
    }

    setLikeCount(commentCard, newLikes, newLikedState);
    updateLocalStorage(); // persist like changes
  }

  // Build a comment card (with like button and counter)
  function buildCommentCard(
    name,
    text,
    timestamp = null,
    avatar = null,
    existingLikeCount = 0,
    alreadyLiked = false,
  ) {
    const finalTime = timestamp || getCurrentTime();
    const displayAvatar = avatar || getAvatarIcon(name);
    const cleanName = escapeHtml(name) || "Spicy Foodie";
    const cleanText = escapeHtml(text).replace(/\n/g, "<br>");
    const likeCount = existingLikeCount !== undefined ? existingLikeCount : 0;
    const likedStatus = alreadyLiked === true;

    const card = document.createElement("div");
    card.className = "comment-card";
    card.dataset.liked = likedStatus ? "true" : "false";
    card.dataset.likeCount = likeCount;

    card.innerHTML = `
      <div class="avatar">${displayAvatar}</div>
      <div class="comment-body">
        <div class="comment-meta">
          <span class="comment-name">${cleanName}</span>
          <span class="comment-time">${escapeHtml(finalTime)}</span>
        </div>
        <p class="comment-message">${cleanText}</p>
        <div class="comment-actions">
          <button class="like-button">${likedStatus ? "❤️ Liked" : "🤍 Like"}</button>
          <span class="like-count">❤️ ${likeCount}</span>
          <button class="delete-comment">🗑️ Delete</button>
        </div>
      </div>
    `;

    // Like button event
    const likeBtn = card.querySelector(".like-button");
    likeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleLike(card);
    });

    // Delete button event
    const delBtn = card.querySelector(".delete-comment");
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      card.style.transition = "opacity 0.2s ease, transform 0.2s";
      card.style.opacity = "0";
      card.style.transform = "scale(0.96)";
      setTimeout(() => {
        if (card.parentNode) card.remove();
        updateLocalStorage();
        updateEmptyPlaceholder();
      }, 180);
    });

    // Ensure button visual matches data-liked state
    if (likedStatus) {
      likeBtn.classList.add("liked");
    } else {
      likeBtn.classList.remove("liked");
    }

    return card;
  }

  // Load comments from localStorage (including like data)
  function loadCommentsFromStorage() {
    const stored = localStorage.getItem("mirchi_comments_data");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        commentContainer.innerHTML = "";
        if (parsed.length === 0) {
          updateEmptyPlaceholder();
        } else {
          parsed.forEach((comm) => {
            if (comm.name && comm.text) {
              const likeCount = comm.likeCount || 0;
              const liked = comm.likedByCurrentUser || false;
              const newCard = buildCommentCard(
                comm.name,
                comm.text,
                comm.time,
                comm.avatar,
                likeCount,
                liked,
              );
              commentContainer.appendChild(newCard);
            }
          });
        }
      } catch (e) {
        console.warn(e);
        seedDefaultComments();
      }
    } else {
      seedDefaultComments();
    }
    updateEmptyPlaceholder();
  }

  // Seed default comments with initial like counts (like feature included)
  function seedDefaultComments() {
    const defaultComments = [
      {
        name: "Sonali K.",
        text: "Just tried with extra chili and cherry tomatoes — FIREEEE! This is my new comfort pasta.",
        time: "📅 just now",
        avatar: "🍜",
        likeCount: 5,
        likedByCurrentUser: false,
      },
      {
        name: "Chef Rohan",
        text: "Finally a blog that respects spice balance. The garlicky kick is perfection. Subscribed!",
        time: "📅 3 hours ago",
        avatar: "👨‍🍳",
        likeCount: 12,
        likedByCurrentUser: false,
      },
      {
        name: "Anjali (vegan twist)",
        text: "Used tofu cream and it was stunning! Thank you Mirchi fam 💛🌶️",
        time: "📅 yesterday",
        avatar: "🌿",
        likeCount: 8,
        likedByCurrentUser: false,
      },
    ];
    localStorage.setItem(
      "mirchi_comments_data",
      JSON.stringify(defaultComments),
    );
    loadCommentsFromStorage();
  }

  // Update localStorage with current comments and their like states
  function updateLocalStorage() {
    const allComments = document.querySelectorAll("#commentList .comment-card");
    const commentsData = [];
    allComments.forEach((card) => {
      const avatarDiv = card.querySelector(".avatar");
      const nameSpan = card.querySelector(".comment-name");
      const timeSpan = card.querySelector(".comment-time");
      const msgPara = card.querySelector(".comment-message");
      const likeCountSpan = card.querySelector(".like-count");
      const likeBtn = card.querySelector(".like-button");
      let likeCount = 0;
      if (likeCountSpan) {
        const match = likeCountSpan.textContent.match(/\d+/);
        likeCount = match ? parseInt(match[0], 10) : 0;
      }
      const likedByCurrentUser =
        likeBtn && likeBtn.classList.contains("liked") ? true : false;
      if (nameSpan && msgPara && timeSpan) {
        commentsData.push({
          name: nameSpan.innerText,
          text: msgPara.innerText,
          time: timeSpan.innerText,
          avatar: avatarDiv ? avatarDiv.innerText : "🌶️",
          likeCount: likeCount,
          likedByCurrentUser: likedByCurrentUser,
        });
      }
    });
    localStorage.setItem("mirchi_comments_data", JSON.stringify(commentsData));
  }

  // Add fresh comment with 0 likes
  function addFreshComment(name, text) {
    const emptyMsg = document.querySelector("#commentList .empty-chat");
    if (emptyMsg) emptyMsg.remove();

    const newCommentCard = buildCommentCard(
      name,
      text,
      getCurrentTime(),
      getAvatarIcon(name),
      0,
      false,
    );
    commentContainer.appendChild(newCommentCard);
    newCommentCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    updateLocalStorage();
    updateEmptyPlaceholder();
  }

  // Show/hide empty placeholder
  function updateEmptyPlaceholder() {
    const comments = document.querySelectorAll("#commentList .comment-card");
    let emptyDiv = document.querySelector("#commentList .empty-chat");
    if (comments.length === 0) {
      if (!emptyDiv) {
        const placeholder = document.createElement("div");
        placeholder.className = "empty-chat";
        placeholder.innerText =
          "✨ No spicy takes yet — drop a comment & light up the conversation! 🌶️";
        commentContainer.appendChild(placeholder);
      }
    } else {
      if (emptyDiv) emptyDiv.remove();
    }
  }

  // ========== LOGIN/SIGNUP FUNCTIONS ==========

  // Validate email format
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Handle Login
  function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!isValidEmail(email)) {
      alert("Please enter a valid email address!");
      return;
    }

    if (password.length === 0) {
      alert("Please enter your password!");
      return;
    }

    // Get users from localStorage
    const users = JSON.parse(localStorage.getItem("mirchi_users") || "[]");
    const user = users.find(
      (u) => u.email === email && u.password === password,
    );

    if (user) {
      localStorage.setItem("mirchi_logged_in", "true");
      localStorage.setItem("mirchi_current_user", user.name);
      isLoggedIn = true;
      currentUser = user.name;
      authModal.style.display = "none";
      mainContent.style.display = "block";
      alert(`Welcome back, ${user.name}! 🌶️`);
      loginForm.reset();
    } else {
      alert("Invalid email or password! Please try again or sign up.");
    }
  }

  // Handle Signup
  function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById(
      "signupConfirmPassword",
    ).value;

    if (!name) {
      alert("Please enter your display name!");
      return;
    }

    if (!isValidEmail(email)) {
      alert("Please enter a valid email address!");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters long!");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    // Check if user already exists
    const users = JSON.parse(localStorage.getItem("mirchi_users") || "[]");
    if (users.find((u) => u.email === email)) {
      alert("Email already registered! Please login instead.");
      return;
    }

    // Save new user
    users.push({ name, email, password });
    localStorage.setItem("mirchi_users", JSON.stringify(users));

    // Auto login after signup
    localStorage.setItem("mirchi_logged_in", "true");
    localStorage.setItem("mirchi_current_user", name);
    isLoggedIn = true;
    currentUser = name;
    authModal.style.display = "none";
    mainContent.style.display = "block";
    alert(`Account created successfully! Welcome to Mirchi Blogs, ${name}! 🌶️`);
    signupForm.reset();
  }

  // Handle Logout
  function handleLogout() {
    localStorage.setItem("mirchi_logged_in", "false");
    localStorage.removeItem("mirchi_current_user");
    isLoggedIn = false;
    currentUser = null;
    authModal.style.display = "flex";
    mainContent.style.display = "none";
    alert("You have been logged out. See you soon! 👋");
  }

  // Show Signup Form
  window.showSignup = function () {
    loginFormContainer.style.display = "none";
    signupFormContainer.style.display = "block";
  };

  // Show Login Form
  window.showLogin = function () {
    signupFormContainer.style.display = "none";
    loginFormContainer.style.display = "block";
  };

  // Check login status on page load
  function checkLoginStatus() {
    if (isLoggedIn && currentUser) {
      authModal.style.display = "none";
      mainContent.style.display = "block";
    } else {
      authModal.style.display = "flex";
      mainContent.style.display = "none";
    }
  }

  // ========== EVENT LISTENERS ==========

  // Form submission handler for comments
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const nameInput = document.getElementById("name");
      const commentInput = document.getElementById("commentText");
      let nameVal = nameInput.value.trim();
      let commentVal = commentInput.value.trim();

      if (nameVal === "" || commentVal === "") {
        const btn = form.querySelector(".btn-spice");
        const originalText = btn.innerText;
        btn.innerText = "⚠️ both fields needed!";
        setTimeout(() => {
          btn.innerText = originalText;
        }, 1300);
        return;
      }
      if (nameVal.length > 35) nameVal = nameVal.slice(0, 35);
      if (commentVal.length > 600) commentVal = commentVal.slice(0, 600);

      addFreshComment(nameVal, commentVal);
      form.reset();
      nameInput.focus();

      const btn = form.querySelector(".btn-spice");
      btn.style.transform = "scale(0.97)";
      setTimeout(() => {
        btn.style.transform = "";
      }, 150);
    });
  }

  // Login form listener
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // Signup form listener
  if (signupForm) {
    signupForm.addEventListener("submit", handleSignup);
  }

  // Logout button listener
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  // Mutation observer to keep storage in sync
  if (commentContainer) {
    const observer = new MutationObserver(() => {
      updateLocalStorage();
      updateEmptyPlaceholder();
    });
    observer.observe(commentContainer, { childList: true, subtree: true });
  }

  // Initialize app
  checkLoginStatus();
  if (commentContainer) {
    loadCommentsFromStorage();
  }
})();
