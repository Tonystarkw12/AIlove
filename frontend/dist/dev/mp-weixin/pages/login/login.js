"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const API_BASE_URL = "http://localhost:3000";
const _sfc_main = {
  __name: "login",
  setup(__props) {
    const email = common_vendor.ref("");
    const password = common_vendor.ref("");
    const handleLogin = async () => {
      if (!email.value || !password.value) {
        common_vendor.index.showToast({ title: "请输入邮箱和密码", icon: "none" });
        return;
      }
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email.value)) {
        common_vendor.index.showToast({ title: "请输入有效的邮箱地址", icon: "none" });
        return;
      }
      common_vendor.index.showLoading({ title: "登录中..." });
      try {
        const response = await common_vendor.index.request({
          url: `${API_BASE_URL}/auth/login`,
          method: "POST",
          data: {
            email: email.value,
            password: password.value
          },
          header: {
            "Content-Type": "application/json"
          }
        });
        common_vendor.index.hideLoading();
        if (response.statusCode === 200) {
          const responseData = response.data;
          common_vendor.index.setStorageSync("token", responseData.token);
          common_vendor.index.setStorageSync("userId", responseData.userId);
          common_vendor.index.setStorageSync("nickname", responseData.nickname);
          common_vendor.index.showToast({
            title: responseData.message || "登录成功",
            icon: "success",
            duration: 1500
          });
          common_vendor.index.reLaunch({
            url: "/pages/index/index"
          });
        } else {
          const errorData = response.data;
          let errorMessage = "登录失败，请稍后再试";
          if (errorData && errorData.error && errorData.error.message) {
            errorMessage = errorData.error.message;
          } else if (response.statusCode === 400) {
            errorMessage = "输入信息不符合要求，请检查";
          } else if (response.statusCode === 401) {
            errorMessage = "邮箱或密码错误";
          }
          common_vendor.index.showToast({ title: errorMessage, icon: "none", duration: 2e3 });
        }
      } catch (error) {
        common_vendor.index.hideLoading();
        console.error("Login error:", error);
        common_vendor.index.showToast({ title: "网络错误或服务器无响应", icon: "none", duration: 2e3 });
      }
    };
    const goToRegister = () => {
      common_vendor.index.navigateTo({
        url: "/pages/register/register"
      });
    };
    const goToForgotPassword = () => {
      common_vendor.index.showToast({
        title: "“忘记密码”功能暂未开放",
        icon: "none"
      });
    };
    return (_ctx, _cache) => {
      return {
        a: common_assets._imports_1,
        b: email.value,
        c: common_vendor.o(($event) => email.value = $event.detail.value),
        d: password.value,
        e: common_vendor.o(($event) => password.value = $event.detail.value),
        f: common_vendor.o(handleLogin),
        g: common_vendor.o(goToForgotPassword),
        h: common_vendor.o(goToRegister)
      };
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-cdfe2409"]]);
wx.createPage(MiniProgramPage);
