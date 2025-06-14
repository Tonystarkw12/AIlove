"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const API_BASE_URL = "https://zkbdeainnjcy.sealoshzh.site";
const maxPhotos = 6;
const _sfc_main = {
  __name: "edit",
  setup(__props) {
    let authToken = "";
    const profile = common_vendor.reactive({
      user_id: "",
      nickname: "",
      email: "",
      gender: "",
      birth_date: "",
      height_cm: null,
      weight_kg: null,
      occupation: "",
      salary_range: "",
      orientation: "",
      bio: "",
      avatar_url: "",
      photos: []
      // Array of { photo_id, url, is_avatar, localPath (optional) }
      // Fields not in current form but in API:
      // location_geohash: '',
      // location_latitude: null,
      // location_longitude: null,
      // preferred_age_min: null,
      // preferred_age_max: null,
      // preferred_gender: '',
      // tags: [],
      // values_description: '',
      // q_and_a: {},
    });
    const genderOptions = common_vendor.ref([
      { value: "男", label: "男" },
      { value: "女", label: "女" },
      { value: "其他", label: "其他" }
    ]);
    const genderIndex = common_vendor.computed(() => genderOptions.value.findIndex((opt) => opt.value === profile.gender));
    const salaryOptions = common_vendor.ref([
      { value: "5千以下", label: "5千以下" },
      // Assuming API uses these exact strings
      { value: "5k-10k", label: "5千-1万" },
      { value: "10k-20k", label: "1万-2万" },
      { value: "20k-30k", label: "2万-3万" },
      { value: "30k-50k", label: "3万-5万" },
      { value: "50k+", label: "5万以上" }
    ]);
    const salaryIndex = common_vendor.computed(() => salaryOptions.value.findIndex((opt) => opt.value === profile.salary_range));
    const orientationOptions = common_vendor.ref([
      { value: "异性恋", label: "异性恋" },
      { value: "同性恋", label: "同性恋" },
      { value: "双性恋", label: "双性恋" },
      { value: "无性恋", label: "无性恋" },
      { value: "泛性恋", label: "泛性恋" },
      { value: "其他", label: "其他/不确定" }
    ]);
    const orientationIndex = common_vendor.computed(() => orientationOptions.value.findIndex((opt) => opt.value === profile.orientation));
    const makeApiRequest = async (url, method, data, headers = {}) => {
      if (!authToken) {
        common_vendor.index.showToast({ title: "用户未登录", icon: "none" });
        return Promise.reject("No auth token");
      }
      return common_vendor.index.request({
        url: `${API_BASE_URL}${url}`,
        method,
        data,
        header: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
          ...headers
        }
      });
    };
    const makeApiUploadRequest = async (url, filePath, fileName, formData = {}) => {
      if (!authToken) {
        common_vendor.index.showToast({ title: "用户未登录", icon: "none" });
        return Promise.reject("No auth token");
      }
      return common_vendor.index.uploadFile({
        url: `${API_BASE_URL}${url}`,
        filePath,
        name: fileName,
        formData,
        header: {
          "Authorization": `Bearer ${authToken}`
        }
      });
    };
    common_vendor.onMounted(async () => {
      var _a, _b;
      authToken = common_vendor.index.getStorageSync("token");
      if (!authToken) {
        common_vendor.index.showToast({ title: "请先登录", icon: "none" });
        common_vendor.index.navigateTo({ url: "/pages/login/login" });
        return;
      }
      common_vendor.index.showLoading({ title: "加载中..." });
      try {
        const response = await makeApiRequest("/users/me/profile", "GET");
        if (response.statusCode === 200) {
          const apiProfile = response.data;
          Object.keys(profile).forEach((key) => {
            if (apiProfile[key] !== void 0) {
              profile[key] = apiProfile[key];
            }
          });
          if (apiProfile.photos && Array.isArray(apiProfile.photos)) {
            profile.photos = apiProfile.photos.map((p) => ({
              ...p,
              is_avatar: p.url === apiProfile.avatar_url || p.is_avatar
              // Prioritize is_avatar if present
            }));
          } else {
            profile.photos = [];
          }
          profile.avatar_url = apiProfile.avatar_url || "";
        } else {
          common_vendor.index.showToast({ title: `加载资料失败: ${((_b = (_a = response.data) == null ? void 0 : _a.error) == null ? void 0 : _b.message) || response.statusCode}`, icon: "none" });
        }
      } catch (error) {
        console.error("Fetch profile error:", error);
        common_vendor.index.showToast({ title: "网络错误，加载资料失败", icon: "none" });
      } finally {
        common_vendor.index.hideLoading();
      }
    });
    const bindPickerChange = (e, type) => {
      var _a, _b, _c;
      const index = parseInt(e.detail.value);
      if (type === "gender") {
        profile.gender = ((_a = genderOptions.value[index]) == null ? void 0 : _a.value) || "";
      } else if (type === "salary_range") {
        profile.salary_range = ((_b = salaryOptions.value[index]) == null ? void 0 : _b.value) || "";
      } else if (type === "orientation") {
        profile.orientation = ((_c = orientationOptions.value[index]) == null ? void 0 : _c.value) || "";
      }
    };
    const bindDateChange = (e) => {
      profile.birth_date = e.detail.value;
    };
    const chooseImage = () => {
      common_vendor.index.chooseImage({
        count: maxPhotos - profile.photos.length,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: async (res) => {
          var _a;
          common_vendor.index.showLoading({ title: "上传中..." });
          for (const tempFilePath of res.tempFilePaths) {
            try {
              const uploadResponse = await makeApiUploadRequest("/users/me/photos", tempFilePath, "photos");
              if (uploadResponse.statusCode === 201) {
                const responseData = JSON.parse(uploadResponse.data);
                if (responseData.uploadedPhotos && responseData.uploadedPhotos.length > 0) {
                  const newPhoto = responseData.uploadedPhotos[0];
                  profile.photos.push({ ...newPhoto, is_avatar: false });
                }
              } else {
                const errorData = JSON.parse(uploadResponse.data);
                common_vendor.index.showToast({ title: `上传失败: ${((_a = errorData == null ? void 0 : errorData.error) == null ? void 0 : _a.message) || uploadResponse.statusCode}`, icon: "none" });
              }
            } catch (error) {
              console.error("Upload error:", error);
              common_vendor.index.showToast({ title: "上传图片失败", icon: "none" });
            }
          }
          common_vendor.index.hideLoading();
        }
      });
    };
    const previewImage = (index) => {
      const urls = profile.photos.map((p) => p.url.startsWith("http") || p.url.startsWith("/") ? p.url : API_BASE_URL + p.url);
      common_vendor.index.previewImage({
        urls,
        current: index
      });
    };
    const deleteImage = async (photoToDelete, index) => {
      if (!photoToDelete.photo_id) {
        profile.photos.splice(index, 1);
        return;
      }
      common_vendor.index.showModal({
        title: "确认",
        content: "确定要删除这张照片吗？",
        success: async (res) => {
          var _a, _b;
          if (res.confirm) {
            common_vendor.index.showLoading({ title: "删除中..." });
            try {
              const response = await makeApiRequest(`/users/me/photos/${photoToDelete.photo_id}`, "DELETE");
              if (response.statusCode === 200) {
                profile.photos.splice(index, 1);
                if (photoToDelete.is_avatar) {
                  profile.avatar_url = "";
                }
                common_vendor.index.showToast({ title: "照片已删除", icon: "success" });
              } else {
                common_vendor.index.showToast({ title: `删除失败: ${((_b = (_a = response.data) == null ? void 0 : _a.error) == null ? void 0 : _b.message) || response.statusCode}`, icon: "none" });
              }
            } catch (error) {
              console.error("Delete photo error:", error);
              common_vendor.index.showToast({ title: "删除照片失败", icon: "none" });
            } finally {
              common_vendor.index.hideLoading();
            }
          }
        }
      });
    };
    const setAsAvatar = async (photoToSet) => {
      var _a, _b;
      if (!photoToSet.photo_id) {
        common_vendor.index.showToast({ title: "照片尚未上传", icon: "none" });
        return;
      }
      common_vendor.index.showLoading({ title: "设置中..." });
      try {
        const response = await makeApiRequest("/users/me/avatar", "PUT", { photoId: photoToSet.photo_id });
        if (response.statusCode === 200) {
          profile.avatar_url = response.data.avatarUrl;
          profile.photos.forEach((p) => {
            p.is_avatar = p.photo_id === photoToSet.photo_id;
          });
          common_vendor.index.showToast({ title: "头像设置成功", icon: "success" });
        } else {
          common_vendor.index.showToast({ title: `设置头像失败: ${((_b = (_a = response.data) == null ? void 0 : _a.error) == null ? void 0 : _b.message) || response.statusCode}`, icon: "none" });
        }
      } catch (error) {
        console.error("Set avatar error:", error);
        common_vendor.index.showToast({ title: "设置头像失败", icon: "none" });
      } finally {
        common_vendor.index.hideLoading();
      }
    };
    const saveProfile = async () => {
      var _a, _b;
      if (!profile.nickname) {
        common_vendor.index.showToast({ title: "请输入昵称", icon: "none" });
        return;
      }
      if (profile.photos.length === 0) {
        common_vendor.index.showToast({ title: "请至少上传一张照片", icon: "none" });
        return;
      }
      common_vendor.index.showLoading({ title: "保存中..." });
      const profileDataToUpdate = {
        nickname: profile.nickname,
        gender: profile.gender,
        birth_date: profile.birth_date,
        height_cm: profile.height_cm ? Number(profile.height_cm) : null,
        weight_kg: profile.weight_kg ? Number(profile.weight_kg) : null,
        occupation: profile.occupation,
        salary_range: profile.salary_range,
        orientation: profile.orientation,
        bio: profile.bio
        // Add other fields from API doc if they are in the form and updatable
        // e.g. tags: profile.tags, q_and_a: profile.q_and_a
      };
      Object.keys(profileDataToUpdate).forEach((key) => {
        if (profileDataToUpdate[key] === null || profileDataToUpdate[key] === void 0 || profileDataToUpdate[key] === "") {
          if (profileDataToUpdate[key] === "")
            ;
        }
      });
      try {
        const updateResponse = await makeApiRequest("/users/me/profile", "PUT", profileDataToUpdate);
        if (updateResponse.statusCode === 200) {
          common_vendor.index.showToast({
            title: "资料保存成功",
            icon: "success",
            duration: 1500
          });
          if (updateResponse.data.updatedProfile) {
            Object.assign(profile, updateResponse.data.updatedProfile);
            if (updateResponse.data.updatedProfile.photos && Array.isArray(updateResponse.data.updatedProfile.photos)) {
              profile.photos = updateResponse.data.updatedProfile.photos.map((p) => ({
                ...p,
                is_avatar: p.url === updateResponse.data.updatedProfile.avatar_url || p.is_avatar
              }));
            } else {
              profile.photos = [];
            }
            profile.avatar_url = updateResponse.data.updatedProfile.avatar_url || "";
          }
          setTimeout(() => {
            common_vendor.index.navigateBack();
          }, 1500);
        } else {
          common_vendor.index.showToast({ title: `保存失败: ${((_b = (_a = updateResponse.data) == null ? void 0 : _a.error) == null ? void 0 : _b.message) || updateResponse.statusCode}`, icon: "none" });
        }
      } catch (error) {
        console.error("Save profile error:", error);
        common_vendor.index.showToast({ title: "保存资料失败", icon: "none" });
      } finally {
        common_vendor.index.hideLoading();
      }
    };
    return (_ctx, _cache) => {
      var _a, _b, _c;
      return common_vendor.e({
        a: profile.nickname,
        b: common_vendor.o(($event) => profile.nickname = $event.detail.value),
        c: common_vendor.t(((_a = genderOptions.value[genderIndex.value]) == null ? void 0 : _a.label) || "请选择性别"),
        d: common_assets._imports_0$1,
        e: common_vendor.o(($event) => bindPickerChange($event, "gender")),
        f: genderIndex.value,
        g: genderOptions.value,
        h: common_vendor.t(profile.birth_date || "请选择出生日期"),
        i: common_assets._imports_0$1,
        j: profile.birth_date,
        k: common_vendor.o(bindDateChange),
        l: profile.height_cm,
        m: common_vendor.o(common_vendor.m(($event) => profile.height_cm = $event.detail.value, {
          number: true
        })),
        n: profile.weight_kg,
        o: common_vendor.o(common_vendor.m(($event) => profile.weight_kg = $event.detail.value, {
          number: true
        })),
        p: profile.occupation,
        q: common_vendor.o(($event) => profile.occupation = $event.detail.value),
        r: common_vendor.t(((_b = salaryOptions.value[salaryIndex.value]) == null ? void 0 : _b.label) || "请选择月薪范围"),
        s: common_assets._imports_0$1,
        t: common_vendor.o(($event) => bindPickerChange($event, "salary_range")),
        v: salaryIndex.value,
        w: salaryOptions.value,
        x: common_vendor.t(((_c = orientationOptions.value[orientationIndex.value]) == null ? void 0 : _c.label) || "请选择性取向"),
        y: common_assets._imports_0$1,
        z: common_vendor.o(($event) => bindPickerChange($event, "orientation")),
        A: orientationIndex.value,
        B: orientationOptions.value,
        C: profile.bio,
        D: common_vendor.o(($event) => profile.bio = $event.detail.value),
        E: common_vendor.f(profile.photos, (photo, index, i0) => {
          return common_vendor.e({
            a: photo.url.startsWith("http") || photo.url.startsWith("/") ? photo.url : API_BASE_URL + photo.url,
            b: common_vendor.o(($event) => previewImage(index), photo.photo_id || index),
            c: photo.is_avatar ? 1 : "",
            d: photo.is_avatar
          }, photo.is_avatar ? {} : {}, {
            e: common_vendor.o(($event) => deleteImage(photo, index), photo.photo_id || index),
            f: !photo.is_avatar && photo.photo_id
          }, !photo.is_avatar && photo.photo_id ? {
            g: common_vendor.o(($event) => setAsAvatar(photo), photo.photo_id || index)
          } : {}, {
            h: photo.photo_id || index
          });
        }),
        F: profile.photos.length < maxPhotos
      }, profile.photos.length < maxPhotos ? {
        G: common_vendor.o(chooseImage)
      } : {}, {
        H: common_vendor.t(maxPhotos),
        I: common_vendor.o(saveProfile)
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-7e5a80f3"]]);
wx.createPage(MiniProgramPage);
