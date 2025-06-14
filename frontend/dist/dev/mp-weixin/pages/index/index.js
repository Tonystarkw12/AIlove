"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const recommendations = common_vendor.ref([
      {
        id: 1,
        name: "晓彤",
        age: 26,
        location: "北京",
        occupation: "设计师",
        bio: "热爱生活，喜欢旅行和摄影，希望找到志同道合的你。",
        imageUrl: "https://images.pexels.com/photos/3764119/pexels-photo-3764119.jpeg?auto=compress&cs=tinysrgb&w=200",
        recommendationScore: 95
      },
      {
        id: 2,
        name: "子轩",
        age: 28,
        location: "上海",
        occupation: "工程师",
        bio: "工作认真，闲暇时喜欢看电影和运动。期待真诚的交往。",
        imageUrl: "https://images.pexels.com/photos/3778680/pexels-photo-3778680.jpeg?auto=compress&cs=tinysrgb&w=200",
        recommendationScore: 92
      },
      {
        id: 3,
        name: "嘉怡",
        age: 24,
        location: "广州",
        occupation: "教师",
        bio: "喜欢阅读和美食，性格开朗，希望遇见有趣的灵魂。",
        imageUrl: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200",
        recommendationScore: 98
      }
    ]);
    const sortedRecommendations = common_vendor.computed(() => {
      return [...recommendations.value].sort((a, b) => b.recommendationScore - a.recommendationScore);
    });
    const viewProfile = (personId) => {
      const person = recommendations.value.find((p) => p.id === personId);
      if (person) {
        common_vendor.index.navigateTo({
          url: `/pages/chat/chat?userId=${person.id}&name=${encodeURIComponent(person.name)}&avatar=${encodeURIComponent(person.imageUrl || "")}`
        });
      } else {
        common_vendor.index.showToast({
          title: "无法找到用户信息",
          icon: "none"
        });
      }
    };
    const goToEditProfile = () => {
      common_vendor.index.navigateTo({
        url: "/pages/profile/edit"
        // 跳转到个人信息编辑页
      });
    };
    common_vendor.onMounted(() => {
      const userProfile = common_vendor.index.getStorageSync("userProfile");
      if (!userProfile || Object.keys(userProfile).length === 0)
        ;
    });
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_assets._imports_0,
        b: common_vendor.o(goToEditProfile),
        c: sortedRecommendations.value.length === 0
      }, sortedRecommendations.value.length === 0 ? {
        d: common_assets._imports_1
      } : {
        e: common_vendor.f(sortedRecommendations.value, (person, k0, i0) => {
          return common_vendor.e({
            a: person.imageUrl || "/static/logo.png",
            b: common_vendor.t(person.recommendationScore),
            c: common_vendor.t(person.name),
            d: common_vendor.t(person.age),
            e: common_vendor.t(person.location),
            f: person.occupation
          }, person.occupation ? {
            g: common_vendor.t(person.occupation)
          } : {}, {
            h: common_vendor.t(person.bio),
            i: person.id,
            j: common_vendor.o(($event) => viewProfile(person.id), person.id)
          });
        })
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-83a5a03c"]]);
wx.createPage(MiniProgramPage);
