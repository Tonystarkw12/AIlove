"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const API_BASE_URL = "https://zkbdeainnjcy.sealoshzh.site";
const _sfc_main = {
  __name: "register",
  setup(__props) {
    const nickname = common_vendor.ref("");
    const email = common_vendor.ref("");
    const password = common_vendor.ref("");
    const confirmPassword = common_vendor.ref("");
    const handleRegister = async () => {
      if (!nickname.value || !email.value || !password.value || !confirmPassword.value) {
        common_vendor.index.showToast({ title: "请填写所有必填项！", icon: "none" });
        return;
      }
      if (password.value !== confirmPassword.value) {
        common_vendor.index.showToast({ title: "两次输入的密码不一致！", icon: "none" });
        return;
      }
      if (password.value.length < 8) {
        common_vendor.index.showToast({ title: "密码长度至少为8位！", icon: "none" });
        return;
      }
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email.value)) {
        common_vendor.index.showToast({ title: "请输入有效的邮箱地址！", icon: "none" });
        return;
      }
      common_vendor.index.showLoading({ title: "注册中..." });
      try {
        const response = await common_vendor.index.request({
          url: `${API_BASE_URL}/auth/register`,
          method: "POST",
          data: {
            nickname: nickname.value,
            email: email.value,
            password: password.value
          },
          header: {
            "Content-Type": "application/json"
          }
        });
        common_vendor.index.hideLoading();
        if (response.statusCode === 201) {
          const responseData = response.data;
          common_vendor.index.setStorageSync("token", responseData.token);
          common_vendor.index.setStorageSync("userId", responseData.userId);
          common_vendor.index.setStorageSync("nickname", nickname.value);
          common_vendor.index.showToast({
            title: responseData.message || "注册成功",
            icon: "success",
            duration: 1500
          });
          common_vendor.index.reLaunch({
            url: "/pages/index/index"
            // Or a profile completion page if that's the flow
          });
        } else {
          const errorData = response.data;
          let errorMessage = "注册失败，请稍后再试";
          if (errorData && errorData.error && errorData.error.message) {
            errorMessage = errorData.error.message;
          } else if (response.statusCode === 400) {
            errorMessage = "输入信息不符合要求，请检查。";
          } else if (response.statusCode === 409) {
            errorMessage = "邮箱或昵称已被占用。";
          }
          common_vendor.index.showToast({ title: errorMessage, icon: "none", duration: 2500 });
        }
      } catch (error) {
        common_vendor.index.hideLoading();
        console.error("Registration error:", error);
        common_vendor.index.showToast({ title: "网络错误或服务器无响应", icon: "none", duration: 2500 });
      }
    };
    const goToLogin = () => {
      common_vendor.index.navigateTo({
        url: "/pages/login/login"
      });
    };
    const viewTerms = () => {
      common_vendor.index.showToast({ title: "查看服务条款", icon: "none" });
    };
    const viewPrivacy = () => {
      common_vendor.index.showToast({ title: "查看隐私政策", icon: "none" });
    };
    return (_ctx, _cache) => {
      return {
        a: common_assets._imports_1,
        b: nickname.value,
        c: common_vendor.o(($event) => nickname.value = $event.detail.value),
        d: email.value,
        e: common_vendor.o(($event) => email.value = $event.detail.value),
        f: password.value,
        g: common_vendor.o(($event) => password.value = $event.detail.value),
        h: confirmPassword.value,
        i: common_vendor.o(($event) => confirmPassword.value = $event.detail.value),
        j: common_vendor.o(handleRegister),
        k: common_vendor.o(viewTerms),
        l: common_vendor.o(viewPrivacy),
        m: common_vendor.o(goToLogin)
      };
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-97bb96ad"]]);
wx.createPage(MiniProgramPage);
