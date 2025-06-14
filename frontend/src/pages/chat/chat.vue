<template>
  <view class="chat-container">
    <view class="chat-header">
      <view class="back-button" @click="goBack">
        <image src="/static/arrow-left.png" class="back-icon" mode="aspectFit"></image>
      </view>
      <text class="chat-title">{{ chatTarget.name || '聊天中' }}</text>
      <view class="placeholder-view"></view> <!-- 用于平衡标题居中 -->
    </view>

    <scroll-view
      scroll-y
      class="message-list"
      :scroll-top="scrollTop"
      :scroll-with-animation="true"
      :style="{ height: scrollViewHeight + 'px' }"
    >
      <view v-for="(message, index) in messages" :key="index" class="message-item-wrapper">
        <view :class="['message-item', message.sender === 'me' ? 'sent' : 'received']">
          <image
            v-if="message.sender === 'other'"
            :src="chatTarget.avatar || '/static/logo.png'"
            class="avatar other-avatar"
            mode="aspectFill"
          ></image>
          <view class="message-content">
            <text>{{ message.content }}</text>
          </view>
          <image
            v-if="message.sender === 'me'"
            :src="myAvatar || '/static/logo.png'"
            class="avatar my-avatar"
            mode="aspectFill"
          ></image>
        </view>
      </view>
      <view :style="{ height: '10rpx' }"></view> <!-- 底部留白，确保最后一条消息可见 -->
    </scroll-view>

    <view class="input-area">
      <input
        type="text"
        v-model="inputText"
        placeholder="说点什么吧..."
        class="chat-input"
        @confirm="sendMessage"
        confirm-type="send"
        :adjust-position="false"
        @focus="onInputFocus"
        @blur="onInputBlur"
      />
      <button class="send-button" @click="sendMessage" :disabled="!inputText.trim()">发送</button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const chatTarget = reactive({
  id: null,
  name: '对方',
  avatar: '/static/logo.png',
});

const myAvatar = ref('/static/my-avatar.png'); // 假设自己的头像路径

const messages = ref([]);
const inputText = ref('');
const scrollTop = ref(0);
const keyboardHeight = ref(0);

// 计算 scroll-view 的高度
const windowHeight = uni.getSystemInfoSync().windowHeight;
const headerHeight = uni.upx2px(100 + uni.getSystemInfoSync().statusBarHeight); // 估算头部高度
const inputAreaHeight = uni.upx2px(120); // 估算输入区域高度

const scrollViewHeight = computed(() => {
  return windowHeight - headerHeight - inputAreaHeight - keyboardHeight.value;
});

onLoad((options) => {
  if (options.userId) {
    chatTarget.id = options.userId;
  }
  if (options.name) {
    chatTarget.name = decodeURIComponent(options.name);
    uni.setNavigationBarTitle({ title: chatTarget.name }); // 动态设置导航栏标题
  }
  if (options.avatar) {
    chatTarget.avatar = decodeURIComponent(options.avatar);
  }
  // 模拟加载历史消息或欢迎消息
  messages.value.push({ sender: 'other', content: `你好，我是${chatTarget.name}！很高兴认识你。` });
  scrollToBottom();
});

onMounted(() => {
  // #ifdef MP-WEIXIN
  uni.onKeyboardHeightChange(res => {
    keyboardHeight.value = res.height;
    scrollToBottom();
  });
  // #endif
  scrollToBottom();
});

const onInputFocus = (e) => {
  // #ifndef MP-WEIXIN
  // 对于非微信小程序，可能需要手动处理键盘高度
  // keyboardHeight.value = e.detail.height || uni.upx2px(500); // 估算键盘高度
  // #endif
  scrollToBottom();
};

const onInputBlur = () => {
  // #ifndef MP-WEIXIN
  // keyboardHeight.value = 0;
  // #endif
  scrollToBottom();
};


const sendMessage = () => {
  if (!inputText.value.trim()) return;

  messages.value.push({
    sender: 'me',
    content: inputText.value.trim(),
  });
  const myMessage = inputText.value.trim();
  inputText.value = '';
  scrollToBottom();

  // 模拟对方回复
  setTimeout(() => {
    let reply = '嗯嗯';
    if (myMessage.includes('你好')) {
      reply = '你好呀！😊';
    } else if (myMessage.includes('在吗')) {
      reply = '在的，有什么可以帮你的吗？';
    } else if (myMessage.includes('微信')) {
        reply = '交换微信可以呀，我的微信号是：fake_wechat_id 😉';
    } else if (myMessage.length > 10) {
        reply = '你说的好有道理！';
    }
    messages.value.push({
      sender: 'other',
      content: reply,
    });
    scrollToBottom();
  }, 1000 + Math.random() * 1000);
};

const scrollToBottom = () => {
  nextTick(() => {
    // uni.pageScrollTo 不适用于 scroll-view 内的滚动
    // 需要设置 scroll-view 的 scrollTop 为一个很大的值
    scrollTop.value = messages.value.length * uni.upx2px(200); // 估算每条消息高度
  });
};

const goBack = () => {
  uni.navigateBack();
};
</script>

<style scoped lang="scss">
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f0f2f5; // 聊天背景色
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20rpx;
  height: 100rpx; /* 包含状态栏的高度由padding-top处理 */
  padding-top: var(--status-bar-height);
  background-color: #ffffff;
  border-bottom: 1rpx solid #e0e0e0;
  box-shadow: 0 1rpx 5rpx rgba(0,0,0,0.05);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;

  .back-button {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .back-icon {
    width: 36rpx;
    height: 36rpx;
  }
  .chat-title {
    font-size: 34rpx;
    font-weight: 500;
    color: #333;
    flex: 1;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .placeholder-view {
    width: 60rpx; /* 与返回按钮宽度一致，用于平衡标题 */
  }
}

.message-list {
  flex: 1;
  padding: 20rpx;
  padding-top: calc(100rpx + var(--status-bar-height) + 20rpx); /* 避开固定头部 */
  padding-bottom: 120rpx; /* 避开固定输入框 */
  box-sizing: border-box;
  width: 100%;
}

.message-item-wrapper {
  margin-bottom: 30rpx;
  display: flex; /* 用于控制消息左右对齐 */
}

.message-item {
  display: flex;
  align-items: flex-end; /* 头像和气泡底部对齐 */
  max-width: 70%;

  &.sent {
    margin-left: auto; /* 自己发送的消息靠右 */
    flex-direction: row-reverse; /* 头像在右 */
    .message-content {
      background-color: #6e8efb; // 我的消息颜色
      color: white;
      border-radius: 20rpx 20rpx 4rpx 20rpx;
      margin-right: 15rpx;
    }
  }

  &.received {
    margin-right: auto; /* 对方发送的消息靠左 */
    flex-direction: row; /* 头像在左 */
    .message-content {
      background-color: #ffffff;
      color: #333;
      border-radius: 20rpx 20rpx 20rpx 4rpx;
      margin-left: 15rpx;
    }
  }
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.message-content {
  padding: 18rpx 24rpx;
  font-size: 30rpx;
  line-height: 1.5;
  word-break: break-all;
  box-shadow: 0 2rpx 5rpx rgba(0,0,0,0.05);
}

.input-area {
  display: flex;
  align-items: center;
  padding: 15rpx 20rpx;
  background-color: #f7f7f7;
  border-top: 1rpx solid #e0e0e0;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding-bottom: calc(15rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(15rpx + env(safe-area-inset-bottom));
  z-index: 100;
}

.chat-input {
  flex: 1;
  height: 70rpx;
  background-color: #ffffff;
  border-radius: 35rpx;
  padding: 0 30rpx;
  font-size: 28rpx;
  margin-right: 20rpx;
  border: 1rpx solid #ddd;
}

.send-button {
  width: 120rpx;
  height: 70rpx;
  line-height: 70rpx;
  background: #6e8efb;
  color: white;
  border: none;
  border-radius: 35rpx;
  font-size: 28rpx;
  padding: 0;
  margin: 0;
  text-align: center;

  &[disabled] {
    background-color: #b3c6fc;
    color: #e0e0e0;
  }
}
</style>
```
请注意：
*   我假设您在 `/static/` 目录下有一个返回箭头图标 `arrow-left.png` 和一个您自己的头像 `my-avatar.png`。如果不存在，请替换为有效路径或移除。
*   聊天页面的头部是自定义的，以便更好地控制返回按钮和标题。
*   键盘弹起时，输入框和聊天列表的适配在不同小程序平台和H5中可能需要微调，我加入了一些基本的处理（特别是针对微信小程序的 `uni.onKeyboardHeightChange`）。
*   消息滚动到底部的实现 (`scrollToBottom`) 是通过设置 `scroll-view` 的 `scrollTop` 属性。
*   对方回复是随机延迟和内容的简单模拟。
