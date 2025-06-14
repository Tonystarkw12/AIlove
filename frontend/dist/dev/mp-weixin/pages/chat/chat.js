"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  __name: "chat",
  setup(__props) {
    const chatTarget = common_vendor.reactive({
      id: null,
      name: "对方",
      avatar: "/static/logo.png"
    });
    const myAvatar = common_vendor.ref("/static/my-avatar.png");
    const messages = common_vendor.ref([]);
    const inputText = common_vendor.ref("");
    const scrollTop = common_vendor.ref(0);
    const keyboardHeight = common_vendor.ref(0);
    const windowHeight = common_vendor.index.getSystemInfoSync().windowHeight;
    const headerHeight = common_vendor.index.upx2px(100 + common_vendor.index.getSystemInfoSync().statusBarHeight);
    const inputAreaHeight = common_vendor.index.upx2px(120);
    const scrollViewHeight = common_vendor.computed(() => {
      return windowHeight - headerHeight - inputAreaHeight - keyboardHeight.value;
    });
    common_vendor.onLoad((options) => {
      if (options.userId) {
        chatTarget.id = options.userId;
      }
      if (options.name) {
        chatTarget.name = decodeURIComponent(options.name);
        common_vendor.index.setNavigationBarTitle({ title: chatTarget.name });
      }
      if (options.avatar) {
        chatTarget.avatar = decodeURIComponent(options.avatar);
      }
      messages.value.push({ sender: "other", content: `你好，我是${chatTarget.name}！很高兴认识你。` });
      scrollToBottom();
    });
    common_vendor.onMounted(() => {
      common_vendor.index.onKeyboardHeightChange((res) => {
        keyboardHeight.value = res.height;
        scrollToBottom();
      });
      scrollToBottom();
    });
    const onInputFocus = (e) => {
      scrollToBottom();
    };
    const onInputBlur = () => {
      scrollToBottom();
    };
    const sendMessage = () => {
      if (!inputText.value.trim())
        return;
      messages.value.push({
        sender: "me",
        content: inputText.value.trim()
      });
      const myMessage = inputText.value.trim();
      inputText.value = "";
      scrollToBottom();
      setTimeout(() => {
        let reply = "嗯嗯";
        if (myMessage.includes("你好")) {
          reply = "你好呀！😊";
        } else if (myMessage.includes("在吗")) {
          reply = "在的，有什么可以帮你的吗？";
        } else if (myMessage.includes("微信")) {
          reply = "交换微信可以呀，我的微信号是：fake_wechat_id 😉";
        } else if (myMessage.length > 10) {
          reply = "你说的好有道理！";
        }
        messages.value.push({
          sender: "other",
          content: reply
        });
        scrollToBottom();
      }, 1e3 + Math.random() * 1e3);
    };
    const scrollToBottom = () => {
      common_vendor.nextTick$1(() => {
        scrollTop.value = messages.value.length * common_vendor.index.upx2px(200);
      });
    };
    const goBack = () => {
      common_vendor.index.navigateBack();
    };
    return (_ctx, _cache) => {
      return {
        a: common_assets._imports_0$2,
        b: common_vendor.o(goBack),
        c: common_vendor.t(chatTarget.name || "聊天中"),
        d: common_vendor.f(messages.value, (message, index, i0) => {
          return common_vendor.e({
            a: message.sender === "other"
          }, message.sender === "other" ? {
            b: chatTarget.avatar || "/static/logo.png"
          } : {}, {
            c: common_vendor.t(message.content),
            d: message.sender === "me"
          }, message.sender === "me" ? {
            e: myAvatar.value || "/static/logo.png"
          } : {}, {
            f: common_vendor.n(message.sender === "me" ? "sent" : "received"),
            g: index
          });
        }),
        e: scrollTop.value,
        f: scrollViewHeight.value + "px",
        g: common_vendor.o(sendMessage),
        h: common_vendor.o(onInputFocus),
        i: common_vendor.o(onInputBlur),
        j: inputText.value,
        k: common_vendor.o(($event) => inputText.value = $event.detail.value),
        l: common_vendor.o(sendMessage),
        m: !inputText.value.trim()
      };
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-a041b13f"]]);
wx.createPage(MiniProgramPage);
