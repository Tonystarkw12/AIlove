"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("./common/vendor.js");
if (!Math) {
  "./pages/login/login.js";
  "./pages/register/register.js";
  "./pages/index/index.js";
  "./pages/profile/edit.js";
  "./pages/chat/chat.js";
}
const _sfc_main = {
  onLaunch: function() {
    console.log("App Launch");
    const userInfo = common_vendor.index.getStorageSync("userInfo");
    const currentPage = thisgetCurrentPages();
    const currentRoute = currentPage.length ? currentPage[currentPage.length - 1].route : "";
    console.log("Current route on launch:", currentRoute);
    if (!userInfo || !userInfo.loggedIn) {
      if (currentRoute !== "pages/login/login" && currentRoute !== "pages/register/register") {
        common_vendor.index.reLaunch({
          url: "/pages/login/login",
          success: () => {
            console.log("Redirected to login page");
          },
          fail: (err) => {
            console.error("Failed to redirect to login page", err);
          }
        });
      }
    } else {
      console.log("User already logged in or on auth pages.");
    }
  },
  onShow: function() {
    console.log("App Show");
    const userInfo = common_vendor.index.getStorageSync("userInfo");
    const currentPage = thisgetCurrentPages();
    const currentRoute = currentPage.length ? currentPage[currentPage.length - 1].route : "";
    if (!userInfo || !userInfo.loggedIn) {
      if (currentRoute !== "pages/login/login" && currentRoute !== "pages/register/register") {
        console.log("App Show: User not logged in and not on auth pages. Consider redirecting if necessary.");
      }
    }
  },
  onHide: function() {
    console.log("App Hide");
  },
  methods: {
    getCurrentPages() {
      return getCurrentPages();
    }
  }
};
function createApp() {
  const app = common_vendor.createSSRApp(_sfc_main);
  return {
    app
  };
}
createApp().app.mount("#app");
exports.createApp = createApp;
